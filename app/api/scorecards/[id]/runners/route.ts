import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { games, plateAppearances, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { currentBases, deriveBoxScore } from "@/app/derive-box-score";
import {
  BASE_NAMES,
  decodeRunners,
  encodeBases,
  encodeRunners,
  type BaseName,
} from "@/app/bases";

/** Why a runner moved between plays. */
export const ADVANCE_REASONS = ["STEAL", "ERROR", "OTHER"] as const;
export type AdvanceReason = (typeof ADVANCE_REASONS)[number];

type MovePayload = {
  playerId: number;
  to: BaseName | "home";
  reason?: AdvanceReason;
  /** Free text for OTHER - a balk, a wild pitch, defensive indifference. */
  note?: string;
};

/**
 * Moves a runner between plays - a steal, a wild pitch, a runner taking an
 * extra base after the throw.
 *
 * It is recorded against the play that is standing, rather than as a plate
 * appearance of its own: nobody batted, so inventing one would give a player an
 * appearance they never had. The play's end-state carries where the runners
 * now are, and a runner reaching home is added to that play's runs so the
 * score follows without a second path to keep in step.
 */
/** Keeps the play's existing note and adds what the runner did to it. */
function noteFor(existing: string | null, reason: AdvanceReason, given?: string) {
  const text =
    reason === "ERROR"
      ? "Runner advanced on an error"
      : reason === "OTHER"
        ? given?.trim() || "Runner advanced"
        : null;
  if (!text) return existing;
  return existing ? `${existing}; ${text}` : text;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const { id } = await params;
    const scorecardId = Number(id);

    const db = getDb();
    const scorecard = await db.query.scorecards.findFirst({
      where: eq(scorecards.id, scorecardId),
    });
    if (!scorecard) return Response.json({ error: "No such scorecard." }, { status: 404 });
    if (scorecard.status === "APPROVED") {
      return Response.json({ error: "This scorecard is approved and locked." }, { status: 409 });
    }

    const payload = (await request.json()) as MovePayload;
    if (!Number.isInteger(payload.playerId)) {
      return Response.json({ error: "Which runner?" }, { status: 400 });
    }
    if (payload.to !== "home" && !BASE_NAMES.includes(payload.to)) {
      return Response.json({ error: "Unknown base." }, { status: 400 });
    }

    const all = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));

    const bases = currentBases(all);
    const from = BASE_NAMES.find((base) => bases[base] === payload.playerId);
    if (!from) {
      return Response.json({ error: "That runner is not on base." }, { status: 409 });
    }

    // The play the runners are standing on. Without one there is nothing to
    // attach the move to - and with the bases empty there was no runner to
    // move in the first place.
    const box = deriveBoxScore(all);
    const [standing] = await db
      .select()
      .from(plateAppearances)
      .where(
        and(
          eq(plateAppearances.scorecardId, scorecardId),
          eq(plateAppearances.inning, box.currentInning),
          eq(plateAppearances.isHomeBatting, box.isHomeBatting),
        ),
      )
      .orderBy(desc(plateAppearances.sequence))
      .limit(1);

    if (!standing) {
      return Response.json({ error: "No play to attach the move to." }, { status: 409 });
    }

    const reason: AdvanceReason = ADVANCE_REASONS.includes(payload.reason as AdvanceReason)
      ? (payload.reason as AdvanceReason)
      : "OTHER";

    const next = { ...bases, [from]: null };
    const scoredNow = payload.to === "home";
    // Reaching home takes the runner off the bases entirely; anywhere else puts
    // them down on the bag they reached.
    if (payload.to !== "home") next[payload.to] = payload.playerId;

    // The batter of the play that is standing can come round to score too, and
    // their run belongs to them: recording it as another runner's leaves the
    // batter with no run to their name in the box score.
    const batterCameRound = scoredNow && payload.playerId === standing.batterPlayerId;

    await db
      .update(plateAppearances)
      .set({
        basesAfter: encodeBases(next),
        batterScored: standing.batterScored || batterCameRound,
        // A run here is not driven in by the batter, so it adds to the runs on
        // the play without touching the RBI.
        otherRunsScored:
          standing.otherRunsScored + (scoredNow && !batterCameRound ? 1 : 0),
        runnersScored:
          scoredNow && !batterCameRound
            ? encodeRunners([...decodeRunners(standing.runnersScored), payload.playerId])
            : standing.runnersScored,
        stolenBases: standing.stolenBases + (reason === "STEAL" ? 1 : 0),
        // A run that only came home because of a mistake is not earned, so it
        // does not go against the pitcher.
        unearnedRuns: standing.unearnedRuns + (scoredNow && reason === "ERROR" ? 1 : 0),
        note: noteFor(standing.note, reason, payload.note),
      })
      .where(eq(plateAppearances.id, standing.id));

    const rows = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));
    const updated = deriveBoxScore(rows);
    await db
      .update(scorecards)
      .set({ homeScore: updated.homeScore, awayScore: updated.awayScore })
      .where(eq(scorecards.id, scorecardId));
    await db
      .update(games)
      .set({ homeScore: updated.homeScore, awayScore: updated.awayScore })
      .where(eq(games.id, scorecard.gameId));

    return Response.json({ ok: true, scored: scoredNow });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not move the runner." }, { status: 500 });
  }
}
