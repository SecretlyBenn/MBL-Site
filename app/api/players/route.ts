import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { players } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type PlayerPayload = {
  minecraftUsername: string;
  displayName: string;
};

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as PlayerPayload;

    const minecraftUsername = payload.minecraftUsername?.trim();
    const displayName = payload.displayName?.trim();
    if (!minecraftUsername || !displayName) {
      return Response.json(
        { error: "minecraftUsername and displayName are required" },
        { status: 400 },
      );
    }

    const db = getDb();
    const [player] = await db
      .insert(players)
      .values({ minecraftUsername, displayName })
      .returning();

    await logAudit({
      actingUserId: leagueUser.id,
      action: "player.create",
      entityType: "player",
      entityId: player.id,
      detail: { minecraftUsername, displayName },
    });

    return Response.json({ player }, { status: 201 });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("UNIQUE constraint")) {
      return Response.json(
        { error: "A player with that Minecraft username already exists." },
        { status: 409 },
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
