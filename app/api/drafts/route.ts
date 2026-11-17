import { and, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { clubsOf, layOutPicks, setRoundRules, type RoundRule } from "@/db/draft";
import {
  DRAFT_MODES,
  draftPicks,
  draftRounds,
  draftSignups,
  drafts,
  leagues,
  type DraftMode,
} from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { RoleError, requireRoleForApi } from "@/app/roles";

/**
 * Setting a draft up, changing it and removing it. Admins only: a draft is the
 * competition's, not a club's, and a GM changing the order is the one thing
 * nobody could be expected to notice.
 *
 * Making the picks is `/api/drafts/pick`, which GMs do use.
 */

/** Twenty rounds of ten clubs is a long evening; past that it is a mistake. */
const MAX_ROUNDS = 40;

type DraftPayload = {
  id?: number;
  leagueId?: number;
  name?: string;
  rounds?: number;
  mode?: DraftMode;
  /** The clubs in the order they pick in the first round. */
  teamIds?: number[];
  /** Seconds a club has to pick, or null for no clock. */
  pickSeconds?: number | null;
  /** ALL draws on everybody the competition could draft; SIGNUPS on the list. */
  poolSource?: "ALL" | "SIGNUPS";
  signupsOpen?: boolean;
  /** What each round does differently: whose players, and which way round. */
  rounds_?: { round: number; leagueId: number | null; reversed: boolean | null }[];
};

/** Half an hour a pick is already generous; past that it is a typo. */
const MAX_PICK_SECONDS = 3600;

/** The clock, the pool and the rounds that belong to one competition. */
async function settingsOf(payload: DraftPayload, rounds: number) {
  const asked = payload.pickSeconds;
  const pickSeconds =
    asked === null || asked === undefined || Number(asked) === 0 ? null : Number(asked);
  if (
    pickSeconds !== null &&
    (!Number.isInteger(pickSeconds) || pickSeconds < 10 || pickSeconds > MAX_PICK_SECONDS)
  ) {
    return { error: `A pick clock runs between 10 and ${MAX_PICK_SECONDS} seconds.` };
  }

  const poolSource = payload.poolSource ?? "ALL";
  if (poolSource !== "ALL" && poolSource !== "SIGNUPS") {
    return { error: "A pool is either everybody or the sign-ups." };
  }

  // A round tied to a competition that does not exist would quietly take
  // nobody, which looks like an empty pool rather than a mistake. The
  // off-season tournament is never one of them: it owns no players, so a round
  // asking for its players would ask for a set that cannot have anybody in it.
  const db = getDb();
  const known = await db
    .select({ id: leagues.id, isTournament: leagues.isTournament })
    .from(leagues);
  const draftable = new Set(known.filter((row) => !row.isTournament).map((row) => row.id));

  const rules: RoundRule[] = [];
  for (const rule of payload.rounds_ ?? []) {
    const round = Number(rule?.round);
    if (!Number.isInteger(round) || round < 1 || round > rounds) continue;
    const leagueId = rule.leagueId === null || rule.leagueId === undefined ? null : Number(rule.leagueId);
    if (leagueId !== null && !draftable.has(leagueId)) {
      return { error: "A round names a competition whose players cannot be drafted." };
    }
    const reversed = rule.reversed === null || rule.reversed === undefined ? null : Boolean(rule.reversed);
    rules.push({ round, leagueId, reversed });
  }

  return { pickSeconds, poolSource, signupsOpen: Boolean(payload.signupsOpen), rules };
}

/**
 * Everything a draft's shape needs, checked once for create and for change.
 *
 * A draft may have no shape at all yet. How many rounds it runs and which
 * clubs are in it both depend on how many people sign up, so a draft is
 * allowed to exist as nothing but a name and an open sign-up sheet, and be
 * filled in once the league knows what it is working with. Nothing can be
 * drafted out of one: with no rounds there are no picks, and with no picks
 * there is nobody on the clock and nothing to start.
 *
 * Half a shape is a mistake rather than a stage - rounds with no clubs, or
 * clubs with no rounds, is somebody who meant to give both.
 */
async function shapeOf(payload: DraftPayload, leagueId: number) {
  const mode = payload.mode ?? "STRAIGHT";
  if (!DRAFT_MODES.includes(mode)) {
    return { error: "A draft is either straight or a snake." };
  }

  const teamIds = Array.isArray(payload.teamIds)
    ? payload.teamIds.filter((id) => Number.isInteger(id))
    : [];
  const asked = Number(payload.rounds);
  const rounds = Number.isInteger(asked) && asked > 0 ? asked : 0;

  if (rounds === 0 && teamIds.length === 0) {
    return { rounds: 0, mode, teamIds: [] };
  }
  if (rounds < 1 || rounds > MAX_ROUNDS) {
    return { error: `A draft runs between 1 and ${MAX_ROUNDS} rounds.` };
  }
  if (teamIds.length < 2) {
    return { error: "Put at least two clubs in the order." };
  }
  if (new Set(teamIds).size !== teamIds.length) {
    return { error: "A club can only be in the order once." };
  }
  // Every club has to be one of this competition's, because a fixture takes
  // its competition from the clubs playing it and a draft that mixed them
  // would put a man on a club he can never play for.
  const found = await clubsOf(leagueId, teamIds);
  if (found.length !== teamIds.length) {
    return { error: "Those clubs are not all in this competition." };
  }

  return { rounds, mode, teamIds };
}

export async function POST(request: Request) {
  try {
    const user = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as DraftPayload;

    const name = payload.name?.trim();
    if (!name) return Response.json({ error: "Give the draft a name." }, { status: 400 });

    const db = getDb();
    const league = Number.isInteger(payload.leagueId)
      ? await db.query.leagues.findFirst({ where: eq(leagues.id, payload.leagueId!) })
      : null;
    if (!league) {
      return Response.json({ error: "Pick a competition to draft for." }, { status: 400 });
    }

    const shape = await shapeOf(payload, league.id);
    if ("error" in shape) return Response.json({ error: shape.error }, { status: 400 });

    const settings = await settingsOf(payload, shape.rounds);
    if ("error" in settings) return Response.json({ error: settings.error }, { status: 400 });

    const [draft] = await db
      .insert(drafts)
      .values({
        leagueId: league.id,
        name,
        rounds: shape.rounds,
        mode: shape.mode,
        pickSeconds: settings.pickSeconds,
        poolSource: settings.poolSource,
        signupsOpen: settings.signupsOpen,
      })
      .returning();

    const reversedByRound = new Map(settings.rules.map((rule) => [rule.round, rule.reversed]));
    await layOutPicks(draft.id, shape.teamIds, shape.rounds, shape.mode, reversedByRound);
    await setRoundRules(draft.id, settings.rules);

    await logAudit({
      actingUserId: user.id,
      action: "draft.create",
      entityType: "draft",
      entityId: draft.id,
      detail: {
        name,
        leagueId: league.id,
        rounds: shape.rounds,
        mode: shape.mode,
        teams: shape.teamIds,
        pickSeconds: settings.pickSeconds,
        poolSource: settings.poolSource,
      },
    });
    return Response.json({ draft }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Changes a draft that is already running.
 *
 * The picks already made are kept and the rest are laid out again, so a wrong
 * order can be corrected on the night without the draft starting over. A club
 * taken out of the order keeps whoever it has already drafted - releasing them
 * is a separate decision, and making it quietly here would lose the record of
 * the pick.
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as DraftPayload;
    if (!Number.isInteger(payload.id)) {
      return Response.json({ error: "Which draft?" }, { status: 400 });
    }

    const db = getDb();
    const draft = await db.query.drafts.findFirst({ where: eq(drafts.id, payload.id!) });
    if (!draft) return Response.json({ error: "No such draft." }, { status: 404 });

    const shape = await shapeOf(payload, draft.leagueId);
    if ("error" in shape) return Response.json({ error: shape.error }, { status: 400 });

    const settings = await settingsOf(payload, shape.rounds);
    if ("error" in settings) return Response.json({ error: settings.error }, { status: 400 });

    const name = payload.name?.trim() || draft.name;
    await db
      .update(drafts)
      .set({
        name,
        rounds: shape.rounds,
        mode: shape.mode,
        pickSeconds: settings.pickSeconds,
        poolSource: settings.poolSource,
        signupsOpen: settings.signupsOpen,
      })
      .where(eq(drafts.id, draft.id));
    const reversedByRound = new Map(settings.rules.map((rule) => [rule.round, rule.reversed]));
    await layOutPicks(draft.id, shape.teamIds, shape.rounds, shape.mode, reversedByRound);
    await setRoundRules(draft.id, settings.rules);

    await logAudit({
      actingUserId: user.id,
      action: "draft.update",
      entityType: "draft",
      entityId: draft.id,
      detail: {
        name,
        rounds: shape.rounds,
        mode: shape.mode,
        teams: shape.teamIds,
        pickSeconds: settings.pickSeconds,
        poolSource: settings.poolSource,
      },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Removes a draft and its picks.
 *
 * It does not undo the signings those picks made. A draft that has handed out
 * rosters and is then deleted leaves them where they are, because the clubs
 * have been playing with them - taking a drafted player back off a roster is
 * `/api/drafts/pick`'s undo, one at a time and on purpose.
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireRoleForApi(["ADMIN"]);
    const { id } = (await request.json()) as { id: number };
    if (!Number.isInteger(id)) return Response.json({ error: "Which draft?" }, { status: 400 });

    const db = getDb();
    const draft = await db.query.drafts.findFirst({ where: eq(drafts.id, id) });
    if (!draft) return Response.json({ error: "No such draft." }, { status: 404 });

    const made = await db
      .select({ id: draftPicks.id })
      .from(draftPicks)
      .where(and(eq(draftPicks.draftId, id), isNotNull(draftPicks.playerId)));

    await db.delete(draftPicks).where(eq(draftPicks.draftId, id));
    await db.delete(draftRounds).where(eq(draftRounds.draftId, id));
    await db.delete(draftSignups).where(eq(draftSignups.draftId, id));
    await db.delete(drafts).where(eq(drafts.id, id));

    await logAudit({
      actingUserId: user.id,
      action: "draft.delete",
      entityType: "draft",
      entityId: id,
      detail: { name: draft.name, picksMade: made.length },
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return apiError(error);
  }
}
