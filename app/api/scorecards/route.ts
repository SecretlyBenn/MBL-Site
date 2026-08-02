import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { games, scorecardLines, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type LinePayload = {
  playerId: number;
  atBats?: number;
  hits?: number;
  runs?: number;
  rbis?: number;
  homeRuns?: number;
  walks?: number;
  strikeouts?: number;
  inningsPitched?: number;
  earnedRuns?: number;
  strikeoutsPitched?: number;
  walksAllowed?: number;
};

type SubmitPayload = {
  gameId: number;
  homeScore: number;
  awayScore: number;
  lines?: LinePayload[];
};

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const payload = (await request.json()) as SubmitPayload;

    if (!Number.isInteger(payload.gameId)) {
      return Response.json({ error: "gameId is required" }, { status: 400 });
    }
    if (!Number.isInteger(payload.homeScore) || !Number.isInteger(payload.awayScore)) {
      return Response.json(
        { error: "homeScore and awayScore are required" },
        { status: 400 },
      );
    }

    const db = getDb();
    const game = await db.query.games.findFirst({
      where: eq(games.id, payload.gameId),
    });
    if (!game) {
      return Response.json({ error: "Game not found" }, { status: 404 });
    }

    const [scorecard] = await db
      .insert(scorecards)
      .values({
        gameId: payload.gameId,
        submittedByUserId: leagueUser.id,
        homeScore: payload.homeScore,
        awayScore: payload.awayScore,
      })
      .returning();

    const lines = payload.lines ?? [];
    if (lines.length > 0) {
      await db.insert(scorecardLines).values(
        lines.map((line) => ({
          scorecardId: scorecard.id,
          playerId: line.playerId,
          atBats: line.atBats ?? 0,
          hits: line.hits ?? 0,
          runs: line.runs ?? 0,
          rbis: line.rbis ?? 0,
          homeRuns: line.homeRuns ?? 0,
          walks: line.walks ?? 0,
          strikeouts: line.strikeouts ?? 0,
          inningsPitched: line.inningsPitched ?? 0,
          earnedRuns: line.earnedRuns ?? 0,
          strikeoutsPitched: line.strikeoutsPitched ?? 0,
          walksAllowed: line.walksAllowed ?? 0,
        })),
      );
    }

    await logAudit({
      actingUserId: leagueUser.id,
      action: "scorecard.submit",
      entityType: "scorecard",
      entityId: scorecard.id,
      detail: { gameId: payload.gameId, homeScore: payload.homeScore, awayScore: payload.awayScore },
    });

    return Response.json({ scorecard }, { status: 201 });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
