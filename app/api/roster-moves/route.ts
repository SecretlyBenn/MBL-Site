import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { leagues, players, rosterMoves, teams, ROSTER_MOVE_TYPES, type RosterMoveType } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type MovePayload = {
  playerId: number;
  moveType: RosterMoveType;
  teamId?: number;
  note?: string;
};

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["GM", "ADMIN"]);
    const payload = (await request.json()) as MovePayload;

    if (!Number.isInteger(payload.playerId)) {
      return Response.json({ error: "playerId is required" }, { status: 400 });
    }
    if (!ROSTER_MOVE_TYPES.includes(payload.moveType)) {
      return Response.json({ error: "Invalid moveType" }, { status: 400 });
    }

    const db = getDb();
    const player = await db.query.players.findFirst({
      where: eq(players.id, payload.playerId),
    });
    if (!player) {
      return Response.json({ error: "Player not found" }, { status: 404 });
    }

    // GMs may only act on their own team's players (or free agents, for SIGN).
    if (leagueUser.role === "GM") {
      const authError = checkGmAuthority(payload, player, leagueUser.teamId);
      if (authError) return Response.json({ error: authError }, { status: 403 });
    }

    // The club the move lands on, and the competition it plays in. Checked for
    // everyone, admins included: hiding a button is not a rule, and these two
    // would quietly produce a player in the wrong league or a college club
    // with a farm team.
    const landingTeamId = payload.moveType === "SIGN" ? payload.teamId ?? null : player.teamId;
    const landingTeam = landingTeamId
      ? await db.query.teams.findFirst({ where: eq(teams.id, landingTeamId) })
      : null;

    if (payload.moveType === "SIGN") {
      if (!landingTeam) {
        return Response.json({ error: "That club does not exist." }, { status: 404 });
      }
      // A player belongs to a competition even with no club, so one league
      // cannot sign the other's free agents.
      if (player.leagueId !== null && player.leagueId !== landingTeam.leagueId) {
        return Response.json(
          { error: `${player.displayName} is not a free agent in this competition.` },
          { status: 400 },
        );
      }
    }

    if (payload.moveType === "SEND_DOWN" || payload.moveType === "RECALL") {
      const league = landingTeam?.leagueId
        ? await db.query.leagues.findFirst({ where: eq(leagues.id, landingTeam.leagueId) })
        : null;
      if (!league?.hasMinorLeague) {
        return Response.json(
          { error: "This competition has no minor league to send players to." },
          { status: 400 },
        );
      }
    }

    const { newTeamId, newStatus } = applyMove(payload, player, leagueUser.teamId);

    await db
      .update(players)
      // A signing also settles which competition they are in - it is how a
      // player with no league yet gets one. A release leaves it alone, so a
      // free agent stays this league's free agent.
      .set({
        teamId: newTeamId,
        status: newStatus,
        ...(landingTeam?.leagueId ? { leagueId: landingTeam.leagueId } : {}),
      })
      .where(eq(players.id, payload.playerId));

    const [move] = await db
      .insert(rosterMoves)
      .values({
        playerId: payload.playerId,
        teamId: newTeamId,
        moveType: payload.moveType,
        actingUserId: leagueUser.id,
        note: payload.note ?? null,
      })
      .returning();

    await logAudit({
      actingUserId: leagueUser.id,
      action: `roster.${payload.moveType.toLowerCase()}`,
      entityType: "player",
      entityId: payload.playerId,
      detail: { moveType: payload.moveType, teamId: newTeamId, note: payload.note ?? null },
    });

    return Response.json({ move }, { status: 201 });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

function checkGmAuthority(
  payload: MovePayload,
  player: { teamId: number | null },
  gmTeamId: number | null,
): string | null {
  if (!gmTeamId) return "Your account has no team assigned.";

  if (payload.moveType === "SIGN") {
    if (payload.teamId !== gmTeamId) return "You can only sign players to your own team.";
    if (player.teamId !== null) return "This player is already on a team.";
    return null;
  }

  // RELEASE / SEND_DOWN / RECALL all require the player to already be on the GM's team.
  if (player.teamId !== gmTeamId) return "This player is not on your team.";
  return null;
}

function applyMove(
  payload: MovePayload,
  player: { teamId: number | null },
  gmTeamId: number | null,
): { newTeamId: number | null; newStatus: string } {
  switch (payload.moveType) {
    case "SIGN":
      return { newTeamId: payload.teamId ?? gmTeamId ?? null, newStatus: "ACTIVE" };
    case "RELEASE":
      return { newTeamId: null, newStatus: "FREE_AGENT" };
    case "SEND_DOWN":
      return { newTeamId: player.teamId, newStatus: "TRIPLE_A" };
    case "RECALL":
      return { newTeamId: player.teamId, newStatus: "ACTIVE" };
  }
}
