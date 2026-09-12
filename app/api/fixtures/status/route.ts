import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { historicalGames } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RoleError, requireRoleForApi } from "@/app/roles";

type StatusPayload = {
  fixtureId: number;
  /**
   * "NOT_NEEDED" for a fixture the series never reached, "FORFEIT" for a game
   * a club quit, or null to clear either.
   */
  status: "NOT_NEEDED" | "FORFEIT" | null;
  /** Optional "4th"/"5th" - the inning play stopped in. */
  note?: string | null;
};

/**
 * Marks an archive fixture as one the season never reached, or undoes that.
 *
 * A best-of-three series publishes three games and stops as soon as a club
 * wins two, so the last fixture is real - it was scheduled - but was never
 * played and never will be. Deleting it would lose the fact that it was
 * scheduled, and leaving it alone shows it as upcoming forever, so it is
 * marked instead. A fixture that already has a score cannot be retired.
 */
export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN", "HEAD_UMPIRE"]);
    const { fixtureId, status, note } = (await request.json()) as StatusPayload;

    if (!Number.isInteger(fixtureId)) {
      return Response.json({ error: "fixtureId is required" }, { status: 400 });
    }
    if (status !== null && status !== "NOT_NEEDED" && status !== "FORFEIT") {
      return Response.json(
        { error: 'status must be "NOT_NEEDED", "FORFEIT" or null' },
        { status: 400 },
      );
    }

    const db = getDb();
    const fixture = await db.query.historicalGames.findFirst({
      where: eq(historicalGames.id, fixtureId),
    });
    if (!fixture) return Response.json({ error: "No such fixture" }, { status: 404 });

    // A game that was played cannot be one the season never reached; a game
    // that was never played cannot have been quit part way through.
    const played = fixture.homeScore !== null || fixture.awayScore !== null;
    if (status === "NOT_NEEDED" && played) {
      return Response.json(
        { error: "That game was played - clear its score first." },
        { status: 409 },
      );
    }
    if (status === "FORFEIT" && !played) {
      return Response.json(
        { error: "That game has no score, so mark it not needed instead." },
        { status: 409 },
      );
    }

    await db
      .update(historicalGames)
      .set(note === undefined ? { status } : { status, note })
      .where(eq(historicalGames.id, fixtureId));

    await logAudit({
      actingUserId: leagueUser.id,
      action: status === "NOT_NEEDED" ? "fixture.retire" : "fixture.restore",
      entityType: "historical_game",
      entityId: fixtureId,
      detail: { status },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
