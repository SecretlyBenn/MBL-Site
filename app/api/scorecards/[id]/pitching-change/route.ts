import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { plateAppearances, players, scorecardLineups, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { deriveBoxScore } from "@/app/derive-box-score";
import { recordAction } from "@/db/undo";

type PitchingChangePayload = {
  /** Who is taking the mound. */
  playerId: number;
};

/**
 * Brings a new pitcher into the game.
 *
 * This used to be a dropdown holding nothing but browser state: picking a name
 * changed who later at-bats were charged to and left no trace, so a refresh
 * put the old pitcher back and the card had no record that a change had
 * happened at all. A pitching change decides the win, the loss, the save and
 * every earned run after it - it is one of the largest things an umpire does,
 * and it was the least deliberate.
 *
 * The mound is now read from the lineup, where the highest pitching order is
 * whoever is on. Coming in is an action, so it is recorded, it survives a
 * refresh, it shows in the change log, and it can be undone.
 */
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

    const payload = (await request.json()) as PitchingChangePayload;
    if (!Number.isInteger(payload.playerId)) {
      return Response.json({ error: "Who is coming in?" }, { status: 400 });
    }

    const incoming = await db.query.scorecardLineups.findFirst({
      where: and(
        eq(scorecardLineups.scorecardId, scorecardId),
        eq(scorecardLineups.playerId, payload.playerId),
      ),
    });
    if (!incoming) {
      return Response.json({ error: "That player is not in the lineup." }, { status: 404 });
    }
    if (incoming.leftAtSequence !== null) {
      return Response.json(
        { error: "That player is away from the field. Put them back on first." },
        { status: 409 },
      );
    }

    // Everyone on that side, so the mound can be found and the new pitching
    // order can follow the last one.
    const side = await db
      .select()
      .from(scorecardLineups)
      .where(
        and(
          eq(scorecardLineups.scorecardId, scorecardId),
          eq(scorecardLineups.isHome, incoming.isHome),
        ),
      );

    const onMound = side
      .filter((row) => row.pitchingOrder !== null && row.leftAtSequence === null)
      .sort((a, b) => (b.pitchingOrder ?? 0) - (a.pitchingOrder ?? 0))[0];

    if (onMound?.playerId === payload.playerId) {
      return Response.json({ error: "That player is already pitching." }, { status: 409 });
    }

    const nameOf = new Map(
      (await db.select().from(players)).map((player) => [player.id, player.displayName]),
    );
    const appearances = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));
    const box = deriveBoxScore(appearances);

    // The rows about to change, as they stand. The outgoing pitcher's row is
    // untouched by this - he keeps his pitching order, which is what leaves
    // the line of relievers in the sequence they appeared.
    const summary = `${nameOf.get(payload.playerId) ?? "A pitcher"} came in${
      onMound ? ` for ${nameOf.get(onMound.playerId) ?? "the pitcher"}` : ""
    } in inning ${box.currentInning}`;

    await recordAction(scorecardId, "PITCHING_CHANGE", summary, { lineups: [incoming] });

    const highest = Math.max(0, ...side.map((row) => row.pitchingOrder ?? 0));
    await db
      .update(scorecardLineups)
      .set({ pitchingOrder: highest + 1 })
      .where(eq(scorecardLineups.id, incoming.id));

    return Response.json({
      ok: true,
      pitcherPlayerId: payload.playerId,
      inning: box.currentInning,
      summary,
    });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not change the pitcher." }, { status: 500 });
  }
}
