import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { games, historicalGames, historicalTeams, scorecards, teams } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type SchedulePayload = {
  /** The archive fixture being given a date, e.g. "1926578". */
  sourceGameId: string;
  /** Local date and time, "2026-07-27T19:30". */
  scheduledAt?: string;
};

/**
 * Fixtures live in the archive as part of the published season schedule; this
 * records the date and time two clubs actually agreed on for one of them.
 *
 * The fixture and the arrangement are deliberately separate rows. A club can
 * change or withdraw a date without the game vanishing from the season - the
 * league still expects it to be played, so deleting an arrangement leaves the
 * fixture standing as upcoming.
 *
 * Only an arranged game reaches the umpires. That is the point of the step: an
 * umpire should see the games that are actually going to be played, not all
 * fifty still to come.
 */
async function fixtureFor(sourceGameId: string) {
  const db = getDb();
  const fixture = await db.query.historicalGames.findFirst({
    where: eq(historicalGames.sourceGameId, sourceGameId),
  });
  if (!fixture) throw new RoleError(404, "That game is not on the schedule.");
  if (fixture.homeScore !== null || fixture.awayScore !== null) {
    throw new RoleError(409, "That game has already been played.");
  }
  return fixture;
}

/** The live team rows for a fixture, matched to the archive by club name. */
async function liveTeamsFor(fixture: { awayTeamId: number | null; homeTeamId: number | null }) {
  const db = getDb();
  const archived = await db.select().from(historicalTeams);
  const live = await db.select().from(teams);
  const nameOf = new Map(archived.map((row) => [row.id, row.name]));

  const find = (id: number | null) => {
    const name = id === null ? null : nameOf.get(id);
    return name ? live.find((row) => row.name === name) ?? null : null;
  };
  return { away: find(fixture.awayTeamId), home: find(fixture.homeTeamId) };
}

/**
 * A general manager arranges their own club's games; head umpires and admins
 * arrange any of them.
 */
function assertMayArrange(
  role: string,
  teamId: number | null,
  sides: { away: { id: number } | null; home: { id: number } | null },
) {
  if (role !== "GM") return;
  const mine = teamId !== null && (sides.away?.id === teamId || sides.home?.id === teamId);
  if (!mine) throw new RoleError(403, "You can only schedule your own club's games.");
}

export async function POST(request: Request) {
  try {
    const user = await requireRoleForApi(["GM", "HEAD_UMPIRE", "ADMIN"]);
    const payload = (await request.json()) as SchedulePayload;
    if (!payload.sourceGameId) {
      return Response.json({ error: "Which game?" }, { status: 400 });
    }
    if (!payload.scheduledAt) {
      return Response.json({ error: "Pick a date and time." }, { status: 400 });
    }
    if (Number.isNaN(Date.parse(payload.scheduledAt))) {
      return Response.json({ error: "That date could not be read." }, { status: 400 });
    }

    const db = getDb();
    const fixture = await fixtureFor(payload.sourceGameId);
    const sides = await liveTeamsFor(fixture);
    if (!sides.away || !sides.home) {
      return Response.json(
        { error: "One of these clubs is not in the current league." },
        { status: 409 },
      );
    }
    assertMayArrange(user.role, user.teamId, sides);

    const existing = await db.query.games.findFirst({
      where: eq(games.sourceGameId, payload.sourceGameId),
    });

    if (existing) {
      await db
        .update(games)
        .set({ scheduledAt: payload.scheduledAt })
        .where(eq(games.id, existing.id));
    } else {
      await db.insert(games).values({
        awayTeamId: sides.away.id,
        homeTeamId: sides.home.id,
        scheduledAt: payload.scheduledAt,
        status: "SCHEDULED",
        sourceGameId: payload.sourceGameId,
      });
    }

    await logAudit({
      actingUserId: user.id,
      action: existing ? "game.reschedule" : "game.schedule",
      entityType: "game",
      entityId: existing?.id ?? 0,
      detail: { sourceGameId: payload.sourceGameId, scheduledAt: payload.scheduledAt },
    });

    return Response.json({ ok: true, rescheduled: Boolean(existing) });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not schedule the game." }, { status: 500 });
  }
}

/**
 * Withdraws the arrangement. Only the date and time go - the fixture stays on
 * the season's schedule as upcoming, because the league still expects it to be
 * played.
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireRoleForApi(["GM", "HEAD_UMPIRE", "ADMIN"]);
    const { searchParams } = new URL(request.url);
    const sourceGameId = searchParams.get("sourceGameId");
    if (!sourceGameId) return Response.json({ error: "Which game?" }, { status: 400 });

    const db = getDb();
    const existing = await db.query.games.findFirst({
      where: eq(games.sourceGameId, sourceGameId),
    });
    if (!existing) return Response.json({ error: "That game is not scheduled." }, { status: 404 });

    const fixture = await fixtureFor(sourceGameId);
    assertMayArrange(user.role, user.teamId, await liveTeamsFor(fixture));

    // Scoring has begun, so the arrangement is no longer just a date - taking
    // it away would strand the scorecard.
    const card = await db.query.scorecards.findFirst({
      where: and(eq(scorecards.gameId, existing.id)),
    });
    if (card) {
      return Response.json(
        { error: "An umpire has already started this game. Ask a head umpire to reopen it." },
        { status: 409 },
      );
    }

    await db.delete(games).where(eq(games.id, existing.id));

    await logAudit({
      actingUserId: user.id,
      action: "game.unschedule",
      entityType: "game",
      entityId: existing.id,
      detail: { sourceGameId },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not unschedule the game." }, { status: 500 });
  }
}
