import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { getRoundRules, placeDraftedPlayer, removeDraftedPlayer } from "@/db/draft";
import { draftPicks, draftSignups, drafts, leagues, players, teams } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { hasRole, requireRoleForApi } from "@/app/roles";

/**
 * Making a pick, and taking one back.
 *
 * A GM picks for their own club when it is their turn; an admin picks for
 * anybody, which is what gets a draft past a GM who has gone to bed.
 */

/** The draft, its competition, and the pick being waited on. */
async function onTheClockFor(draftId: number) {
  const db = getDb();
  const draft = await db.query.drafts.findFirst({ where: eq(drafts.id, draftId) });
  if (!draft) return { error: "No such draft.", status: 404 } as const;

  const league = await db.query.leagues.findFirst({ where: eq(leagues.id, draft.leagueId) });
  if (!league) return { error: "That draft's competition is gone.", status: 409 } as const;

  // Nobody picks before an admin starts it. A board is usually set up days
  // ahead, and without this the first club could draft the night it appears.
  if (!draft.startedAt) {
    return { error: "This draft has not started yet.", status: 409 } as const;
  }

  const [pick] = await db
    .select()
    .from(draftPicks)
    .where(and(eq(draftPicks.draftId, draftId), isNull(draftPicks.playerId)))
    .orderBy(draftPicks.overall)
    .limit(1);
  if (!pick) return { error: "That draft is finished.", status: 409 } as const;

  return { draft, league, pick } as const;
}

export async function POST(request: Request) {
  try {
    const user = await requireRoleForApi(["GM", "ADMIN"]);
    const { draftId, playerId } = (await request.json()) as {
      draftId: number;
      playerId: number;
    };
    if (!Number.isInteger(draftId) || !Number.isInteger(playerId)) {
      return Response.json({ error: "Which draft, and which player?" }, { status: 400 });
    }

    const found = await onTheClockFor(draftId);
    if ("error" in found) {
      return Response.json({ error: found.error }, { status: found.status });
    }
    const { draft, league, pick } = found;

    const db = getDb();
    const club = await db.query.teams.findFirst({ where: eq(teams.id, pick.teamId) });
    if (!club) return Response.json({ error: "That club is gone." }, { status: 409 });

    // Whose turn it is, checked here and not only by which button is drawn.
    if (hasRole(user, "GM") && !hasRole(user, "ADMIN") && user.teamId !== pick.teamId) {
      return Response.json(
        { error: `It is ${club.name}'s pick.` },
        { status: 403 },
      );
    }

    const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
    if (!player) return Response.json({ error: "No such player." }, { status: 404 });
    // A competition that owns its players drafts the ones who have no club. A
    // tournament borrows everybody, so it asks nothing here.
    if (!league.isTournament && player.teamId !== null) {
      return Response.json(
        { error: `${player.displayName} is already on a club.` },
        { status: 400 },
      );
    }

    // A round tied to one competition takes only that competition's players.
    // Checked here and not only by what the picker offers, because the picker
    // is a convenience and this is the rule.
    const roundLeagues = (await getRoundRules(draftId)).get(pick.round)?.leagueIds ?? [];
    if (
      roundLeagues.length > 0 &&
      (player.leagueId === null || !roundLeagues.includes(player.leagueId))
    ) {
      const only = await db
        .select({ name: leagues.name })
        .from(leagues)
        .where(inArray(leagues.id, roundLeagues));
      return Response.json(
        {
          error: `Round ${pick.round} takes ${
            only.map((row) => row.name).join(" and ") || "another competition"
          } players.`,
        },
        { status: 400 },
      );
    }

    // A draft run off its sign-ups takes nobody else, however they were found.
    if (draft.poolSource === "SIGNUPS") {
      const signed = await db
        .select({ id: draftSignups.id })
        .from(draftSignups)
        .where(and(eq(draftSignups.draftId, draftId), eq(draftSignups.playerId, playerId)))
        .limit(1);
      if (signed.length === 0) {
        return Response.json(
          { error: `${player.displayName} did not sign up for this draft.` },
          { status: 400 },
        );
      }
    }

    // Written against the slot still being empty, so two clicks arriving
    // together cannot both take it - the second changes nothing and is told
    // so. The unique index on (draft, player) is the other half of that: it
    // stops the same man going to two clubs.
    const [taken] = await db
      .update(draftPicks)
      .set({ playerId, madeByUserId: user.id, madeAt: new Date().toISOString() })
      .where(and(eq(draftPicks.id, pick.id), isNull(draftPicks.playerId)))
      .returning();
    if (!taken) {
      return Response.json({ error: "That pick has just been made." }, { status: 409 });
    }

    await placeDraftedPlayer(
      playerId,
      club,
      league.isTournament,
      user.id,
      `Drafted, round ${pick.round}, pick ${pick.overall}`,
    );

    await logAudit({
      actingUserId: user.id,
      action: "draft.pick",
      entityType: "draft",
      entityId: draftId,
      detail: {
        overall: pick.overall,
        round: pick.round,
        teamId: pick.teamId,
        playerId,
        player: player.displayName,
      },
    });
    return Response.json({ ok: true, overall: pick.overall }, { status: 201 });
  } catch (error) {
    return apiError(error, "That player has already been drafted.");
  }
}

/**
 * Takes the last pick back.
 *
 * The last one only, because a draft is a queue: undoing one from the middle
 * would leave the clock pointing at a gap, and every club after it would have
 * picked out of turn. An admin's job rather than a GM's - the usual reason to
 * need it is that somebody picked for the wrong club.
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireRoleForApi(["ADMIN"]);
    const { draftId } = (await request.json()) as { draftId: number };
    if (!Number.isInteger(draftId)) {
      return Response.json({ error: "Which draft?" }, { status: 400 });
    }

    const db = getDb();
    const draft = await db.query.drafts.findFirst({ where: eq(drafts.id, draftId) });
    if (!draft) return Response.json({ error: "No such draft." }, { status: 404 });
    const league = await db.query.leagues.findFirst({ where: eq(leagues.id, draft.leagueId) });

    const [last] = await db
      .select()
      .from(draftPicks)
      .where(and(eq(draftPicks.draftId, draftId), isNotNull(draftPicks.playerId)))
      .orderBy(desc(draftPicks.overall))
      .limit(1);
    if (!last) return Response.json({ error: "No picks to take back." }, { status: 409 });

    const club = await db.query.teams.findFirst({ where: eq(teams.id, last.teamId) });

    // The slot is emptied first. If taking the player off the roster fails
    // after that, the draft is back where it was and the pick can be made
    // again, which is better than a pick nobody can redo.
    await db
      .update(draftPicks)
      .set({ playerId: null, madeByUserId: null, madeAt: null })
      .where(eq(draftPicks.id, last.id));

    if (club && last.playerId) {
      await removeDraftedPlayer(
        last.playerId,
        club,
        league?.isTournament ?? false,
        user.id,
        `Draft pick ${last.overall} taken back`,
      );
    }

    await logAudit({
      actingUserId: user.id,
      action: "draft.undo",
      entityType: "draft",
      entityId: draftId,
      detail: { overall: last.overall, round: last.round, teamId: last.teamId, playerId: last.playerId },
    });
    return Response.json({ ok: true, overall: last.overall });
  } catch (error) {
    return apiError(error);
  }
}
