import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { players, plateAppearances, scorecardLineups, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { recordAction } from "@/db/undo";
import { POSITIONS, type Position } from "@/app/scoring";

type SubstitutionPayload = {
  /** The lineup row being replaced. */
  outPlayerId: number;
  /** Whoever comes in from the bench. */
  inPlayerId: number;
  /** Optional: the incoming player takes a different position. */
  position?: Position;
};

/**
 * Replaces a player in a lineup with someone from the bench, for either side
 * and at any point in the game.
 *
 * The lineup row keeps its batting order and simply changes hands, so the
 * incoming player bats where the outgoing one did - which is how a substitution
 * actually works. At-bats already taken are untouched: each one stores the slot
 * it belongs to, so the replaced player's earlier innings stay on the card
 * under their own name.
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

    const payload = (await request.json()) as SubstitutionPayload;
    if (!Number.isInteger(payload.outPlayerId) || !Number.isInteger(payload.inPlayerId)) {
      return Response.json({ error: "Pick who is coming out and who is going in." }, { status: 400 });
    }
    if (payload.position && !POSITIONS.includes(payload.position)) {
      return Response.json({ error: "Unknown position." }, { status: 400 });
    }

    const outRow = await db.query.scorecardLineups.findFirst({
      where: and(
        eq(scorecardLineups.scorecardId, scorecardId),
        eq(scorecardLineups.playerId, payload.outPlayerId),
      ),
    });
    if (!outRow) {
      return Response.json({ error: "That player is not in the lineup." }, { status: 404 });
    }

    // Someone already in the lineup cannot also come off the bench, and a
    // player cannot replace themselves.
    const alreadyIn = await db.query.scorecardLineups.findFirst({
      where: and(
        eq(scorecardLineups.scorecardId, scorecardId),
        eq(scorecardLineups.playerId, payload.inPlayerId),
      ),
    });
    if (alreadyIn) {
      return Response.json({ error: "That player is already in the game." }, { status: 409 });
    }

    const incoming = await db.query.players.findFirst({
      where: eq(players.id, payload.inPlayerId),
    });
    if (!incoming) return Response.json({ error: "No such player." }, { status: 404 });

    const outgoing = await db.query.players.findFirst({
      where: eq(players.id, payload.outPlayerId),
    });
    await recordAction(
      scorecardId,
      "SUBSTITUTION",
      `${incoming.displayName} in for ${outgoing?.displayName ?? "a player"}`,
      { lineups: [outRow] },
    );

    await db
      .update(scorecardLineups)
      .set({
        playerId: payload.inPlayerId,
        position: payload.position ?? outRow.position,
      })
      .where(eq(scorecardLineups.id, outRow.id));

    // How many the outgoing player had already taken, so the umpire is told
    // what the substitution left behind rather than having to check.
    const taken = await db
      .select({ id: plateAppearances.id })
      .from(plateAppearances)
      .where(
        and(
          eq(plateAppearances.scorecardId, scorecardId),
          eq(plateAppearances.batterPlayerId, payload.outPlayerId),
        ),
      );

    return Response.json({
      ok: true,
      battingOrder: outRow.battingOrder,
      position: payload.position ?? outRow.position,
      keptAtBats: taken.length,
    });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not make the substitution." }, { status: 500 });
  }
}
