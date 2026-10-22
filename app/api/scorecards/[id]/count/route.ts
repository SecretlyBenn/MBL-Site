import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { scorecards } from "@/db/schema";
import { requireRoleForApi } from "@/app/roles";
import { apiError } from "@/app/api-errors";

type CountPayload = {
  balls: number;
  strikes: number;
};

/**
 * The count on the batter, for the scorebug on a stream.
 *
 * This site does not record pitches and this does not change that: nothing
 * derives from these two numbers, no box score reads them, and they are wiped
 * the moment a plate appearance is written. They exist because a bug on a
 * broadcast has to show a count and the umpire is the only person who knows
 * it.
 *
 * Deliberately not an action and deliberately not undoable. The undo stack is
 * for things that change the game, and a count that was briefly wrong is
 * corrected by typing the right one - putting two dozen ball-and-strike
 * entries into the change log would bury the plays an umpire actually needs
 * to find in there.
 *
 * An approved card is not locked against this the way it is against scoring,
 * because there is nothing here to protect; a finished game simply has nobody
 * watching its bug.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const scorecardId = Number((await params).id);
    if (!Number.isInteger(scorecardId)) {
      return Response.json({ error: "Not a scorecard." }, { status: 400 });
    }

    const payload = (await request.json()) as CountPayload;
    // Clamped rather than rejected. The buttons cannot produce anything else,
    // and a bug showing four balls because a request arrived twice is worse
    // than one that quietly refuses to go past three.
    const balls = clamp(payload.balls, 3);
    const strikes = clamp(payload.strikes, 2);

    const db = getDb();
    const [updated] = await db
      .update(scorecards)
      .set({ balls, strikes })
      .where(eq(scorecards.id, scorecardId))
      .returning({ balls: scorecards.balls, strikes: scorecards.strikes });
    if (!updated) return Response.json({ error: "No such scorecard." }, { status: 404 });

    return Response.json(updated);
  } catch (error) {
    return apiError(error, "Could not set the count.");
  }
}

function clamp(value: number, most: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(most, Math.floor(value)));
}
