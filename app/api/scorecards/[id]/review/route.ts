import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { games, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { publishScorecard } from "@/db/publish";

type ReviewPayload = {
  decision: "APPROVE" | "RETURN";
  note?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const leagueUser = await requireRoleForApi(["HEAD_UMPIRE", "ADMIN"]);
    const { id } = await params;
    const scorecardId = Number(id);
    if (!Number.isInteger(scorecardId)) {
      return Response.json({ error: "Invalid scorecard id" }, { status: 400 });
    }

    const payload = (await request.json()) as ReviewPayload;
    if (payload.decision !== "APPROVE" && payload.decision !== "RETURN") {
      return Response.json(
        { error: "decision must be APPROVE or RETURN" },
        { status: 400 },
      );
    }

    const db = getDb();
    const scorecard = await db.query.scorecards.findFirst({
      where: eq(scorecards.id, scorecardId),
    });
    if (!scorecard) {
      return Response.json({ error: "Scorecard not found" }, { status: 404 });
    }
    if (scorecard.status !== "PENDING") {
      return Response.json(
        { error: `Scorecard is already ${scorecard.status}` },
        { status: 409 },
      );
    }

    const newStatus = payload.decision === "APPROVE" ? "APPROVED" : "RETURNED";
    await db
      .update(scorecards)
      .set({
        status: newStatus,
        reviewedByUserId: leagueUser.id,
        reviewNote: payload.note ?? null,
        reviewedAt: new Date().toISOString(),
      })
      .where(eq(scorecards.id, scorecardId));

    if (payload.decision === "APPROVE") {
      await db
        .update(games)
        .set({
          status: "FINAL",
          homeScore: scorecard.homeScore,
          awayScore: scorecard.awayScore,
        })
        .where(eq(games.id, scorecard.gameId));

      // Publishing writes the game into the historical tables the public site
      // reads, so standings, statistics and leaders pick it up together.
      await publishScorecard(scorecardId);
    }

    await logAudit({
      actingUserId: leagueUser.id,
      action: payload.decision === "APPROVE" ? "scorecard.approve" : "scorecard.return",
      entityType: "scorecard",
      entityId: scorecardId,
      detail: { note: payload.note ?? null },
    });

    return Response.json({ ok: true, status: newStatus });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
