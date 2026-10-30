import { env } from "cloudflare:workers";
import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { games, scorecards } from "@/db/schema";
import { apiError } from "@/app/api-errors";

/**
 * The ball-and-strike count, pushed from the Minecraft server.
 *
 * The count is the one thing on the scorebug this site cannot know. It is not
 * in the record - a plate appearance is the unit the whole archive is built on
 * and counting pitches would double an umpire's work for a number nobody looks
 * up afterwards - so for a while the umpire typed it a second time on the
 * scoring page. That was never going to hold: they are already typing `/ball`
 * and `/strike` at the plate, and nobody types the same thing twice all game.
 * So the plugin, which has had the real count in `Arena.Bar` all along, sends
 * it here instead and the bug on the stream follows the plate by itself.
 *
 * **Which bug a ground's count belongs to** is not a new question and gets no
 * new answer. A board pointed at `/scoreboard/8` is Philadelphia's by
 * definition, and `JumbotronFeed.siteTeamId` already reads that id out of the
 * screen's own address to decide whose lineups to fetch. The push reuses it
 * unchanged, so the count and the lineups at a ground can never disagree about
 * whose game it is. The club is then resolved to a scorecard exactly as the
 * scoreboard resolves it - home game first, away game as the fallback - and
 * since both sides of a game share the one card, it makes no difference which
 * of the two clubs the ground's board happens to name.
 *
 * Nothing here is part of the record. No box score reads these two numbers,
 * nothing derives from them, writing a plate appearance wipes them, and a
 * game nobody streamed simply carries two noughts.
 */

type CountPush = {
  /** The club whose ground this is, as the board's address numbers it. */
  teamId?: number;
  balls?: number;
  strikes?: number;
};

/**
 * Compared character by character to the end, so a wrong secret takes the same
 * time as a right one whatever it starts with. The same check the bot's route
 * makes, for the same reason.
 */
function sameSecret(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let differences = 0;
  for (let index = 0; index < given.length; index += 1) {
    differences |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return differences === 0;
}

/**
 * Clamped rather than rejected. A count cannot go past 3-2 in baseball, and a
 * bug showing four balls because a retry arrived twice is worse than one that
 * quietly refuses to.
 */
function clamp(value: unknown, most: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(most, Math.floor(number)));
}

export async function POST(request: Request) {
  try {
    const expected = (env as unknown as { PLUGIN_SECRET?: string }).PLUGIN_SECRET;
    if (!expected) {
      return Response.json({ error: "PLUGIN_SECRET is not set on this Worker." }, { status: 503 });
    }
    if (!sameSecret(request.headers.get("x-plugin-secret") ?? "", expected)) {
      return Response.json({ error: "Not authorised." }, { status: 401 });
    }

    const payload = (await request.json()) as CountPush;
    const teamId = Number(payload.teamId);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      return Response.json({ error: "Not a club." }, { status: 400 });
    }

    const db = getDb();
    const live = await db
      .select({ id: games.id, homeTeamId: games.homeTeamId })
      .from(games)
      .where(
        and(
          eq(games.status, "IN_PROGRESS"),
          or(eq(games.homeTeamId, teamId), eq(games.awayTeamId, teamId)),
        ),
      );
    // No game on is the ordinary case, not a fault: a ground sits there all day
    // and its screens keep talking. Saying so plainly stops the plugin treating
    // an empty evening as a broken connection and retrying at it.
    if (live.length === 0) return Response.json({ stored: false, reason: "no game" });

    const game = live.find((row) => row.homeTeamId === teamId) ?? live[0];
    const [updated] = await db
      .update(scorecards)
      .set({ balls: clamp(payload.balls, 3), strikes: clamp(payload.strikes, 2) })
      .where(and(eq(scorecards.gameId, game.id), eq(scorecards.status, "IN_PROGRESS")))
      .returning({ balls: scorecards.balls, strikes: scorecards.strikes });
    if (!updated) return Response.json({ stored: false, reason: "no card" });

    return Response.json({ stored: true, ...updated });
  } catch (error) {
    return apiError(error, "Could not store the count.");
  }
}
