import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { games, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { publishScorecard, unpublishScorecard } from "@/db/publish";

type ReviewPayload = {
  /**
   * REOPEN un-approves a game that is already on the site: its stats come back
   * out and the umpire can correct it, then it goes through review again.
   */
  decision: "APPROVE" | "RETURN" | "REOPEN";
  note?: string;
};

const DECISIONS = ["APPROVE", "RETURN", "REOPEN"] as const;

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
    if (!DECISIONS.includes(payload.decision)) {
      return Response.json(
        { error: `decision must be one of ${DECISIONS.join(", ")}` },
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
    // Approving and returning act on a card awaiting review; reopening acts on
    // one that has already been approved and is live on the site.
    const wanted = payload.decision === "REOPEN" ? "APPROVED" : "PENDING";
    if (scorecard.status !== wanted) {
      return Response.json(
        {
          error:
            payload.decision === "REOPEN"
              ? `Only an approved game can be reopened - this one is ${scorecard.status.toLowerCase()}.`
              : `Scorecard is already ${scorecard.status}`,
        },
        { status: 409 },
      );
    }

    const newStatus =
      payload.decision === "APPROVE"
        ? "APPROVED"
        : payload.decision === "REOPEN"
          ? "IN_PROGRESS"
          : "RETURNED";
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

    if (payload.decision === "REOPEN") {
      await unpublishScorecard(scorecardId);

      // Back to a game in progress, so the umpire can correct it and submit it
      // for review again.
      await db
        .update(games)
        .set({ status: "IN_PROGRESS", homeScore: null, awayScore: null })
        .where(eq(games.id, scorecard.gameId));
    }

    // Status moves last. The stats are what the public sees, so if publishing
    // or withdrawing them fails the card keeps the status that matches what is
    // actually on the site, rather than claiming a state it never reached.
    await db
      .update(scorecards)
      .set({
        status: newStatus,
        reviewedByUserId: leagueUser.id,
        reviewNote: payload.note ?? null,
        reviewedAt: new Date().toISOString(),
      })
      .where(eq(scorecards.id, scorecardId));

    await logAudit({
      actingUserId: leagueUser.id,
      action: `scorecard.${payload.decision.toLowerCase()}`,
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
