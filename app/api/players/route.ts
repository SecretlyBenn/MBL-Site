import { eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import {
  PLAYER_STATUSES,
  fieldingChanges,
  plateAppearances,
  players,
  rosterMoves,
  runnerOuts,
  scorecardLines,
  scorecardLineups,
  teams,
} from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

type PlayerPayload = {
  minecraftUsername: string;
  /** Defaults to the Minecraft username - they are almost always the same. */
  displayName?: string;
  teamId?: number | null;
  status?: string;
};

function failure(error: unknown) {
  return apiError(error, "A player with that Minecraft username already exists.");
}

/**
 * A player's status has to agree with their team: someone on a roster is
 * active or in Triple-A, and a free agent belongs to nobody. Returns the pair
 * to store, or an error message.
 */
async function placement(teamId: number | null | undefined, status: string | undefined) {
  const team = teamId ? Number(teamId) : null;
  const chosen = status ?? (team ? "ACTIVE" : "FREE_AGENT");
  if (!(PLAYER_STATUSES as readonly string[]).includes(chosen)) return { error: "Unknown status." };
  if (team) {
    const exists = await getDb().query.teams.findFirst({ where: eq(teams.id, team) });
    if (!exists) return { error: "That team does not exist." };
    if (chosen === "FREE_AGENT" || chosen === "RELEASED") {
      return { error: "A player on a team must be Active or Triple-A." };
    }
  } else if (chosen === "ACTIVE" || chosen === "TRIPLE_A") {
    return { error: "Pick a team for an Active or Triple-A player." };
  }
  return { teamId: team, status: chosen };
}

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as PlayerPayload;

    const minecraftUsername = payload.minecraftUsername?.trim();
    const displayName = payload.displayName?.trim() || minecraftUsername;
    if (!minecraftUsername) {
      return Response.json({ error: "Enter the player's Minecraft username." }, { status: 400 });
    }
    const placed = await placement(payload.teamId, payload.status);
    if ("error" in placed) return Response.json({ error: placed.error }, { status: 400 });

    const [player] = await getDb()
      .insert(players)
      .values({ minecraftUsername, displayName, teamId: placed.teamId, status: placed.status })
      .returning();

    await logAudit({
      actingUserId: leagueUser.id,
      action: "player.create",
      entityType: "player",
      entityId: player.id,
      detail: { minecraftUsername, displayName, teamId: placed.teamId, status: placed.status },
    });

    return Response.json({ player }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

/**
 * Moves a player to a team or status directly - for an admin fixing the pool,
 * as opposed to a GM's signing or release, which goes through roster moves and
 * is logged as a transaction.
 */
export async function PATCH(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as { playerId: number; teamId?: number | null; status?: string };

    const db = getDb();
    const player = await db.query.players.findFirst({ where: eq(players.id, Number(payload.playerId)) });
    if (!player) return Response.json({ error: "That player does not exist." }, { status: 404 });

    const placed = await placement(
      payload.teamId === undefined ? player.teamId : payload.teamId,
      payload.status ?? undefined,
    );
    if ("error" in placed) return Response.json({ error: placed.error }, { status: 400 });

    await db
      .update(players)
      .set({ teamId: placed.teamId, status: placed.status })
      .where(eq(players.id, player.id));

    await logAudit({
      actingUserId: leagueUser.id,
      action: "player.update",
      entityType: "player",
      entityId: player.id,
      detail: {
        from: { teamId: player.teamId, status: player.status },
        to: { teamId: placed.teamId, status: placed.status },
      },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

/**
 * Removes a player added by mistake.
 *
 * Anyone who has appeared in a scored game or a roster transaction is refused:
 * deleting them would tear holes in box scores. Releasing them is the way to
 * take a real player off a roster.
 */
export async function DELETE(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const playerId = Number(new URL(request.url).searchParams.get("playerId"));

    const db = getDb();
    const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
    if (!player) return Response.json({ error: "That player does not exist." }, { status: 404 });

    const n = sql<number>`count(*)`;
    const used = async (query: Promise<{ n: number }[]>) => ((await query)[0]?.n ?? 0) > 0;
    const history =
      (await used(
        db
          .select({ n })
          .from(scorecardLineups)
          .where(or(eq(scorecardLineups.playerId, playerId), eq(scorecardLineups.dhForPlayerId, playerId))),
      )) ||
      (await used(
        db
          .select({ n })
          .from(plateAppearances)
          .where(
            or(
              eq(plateAppearances.batterPlayerId, playerId),
              eq(plateAppearances.pitcherPlayerId, playerId),
              eq(plateAppearances.putoutPlayerId, playerId),
              eq(plateAppearances.errorPlayerId, playerId),
            ),
          ),
      )) ||
      (await used(
        db
          .select({ n })
          .from(runnerOuts)
          .where(or(eq(runnerOuts.runnerPlayerId, playerId), eq(runnerOuts.putoutPlayerId, playerId))),
      )) ||
      (await used(db.select({ n }).from(fieldingChanges).where(eq(fieldingChanges.playerId, playerId)))) ||
      (await used(db.select({ n }).from(scorecardLines).where(eq(scorecardLines.playerId, playerId)))) ||
      (await used(db.select({ n }).from(rosterMoves).where(eq(rosterMoves.playerId, playerId))));

    if (history) {
      return Response.json(
        {
          error: `${player.displayName} has played in scored games or roster moves, so they can't be deleted. Release them instead.`,
        },
        { status: 409 },
      );
    }

    await db.delete(players).where(eq(players.id, playerId));
    await logAudit({
      actingUserId: leagueUser.id,
      action: "player.delete",
      entityType: "player",
      entityId: playerId,
      detail: { minecraftUsername: player.minecraftUsername },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
