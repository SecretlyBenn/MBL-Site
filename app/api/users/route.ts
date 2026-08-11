import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { ROLES, users, type Role } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type UserPayload = {
  discordId: string;
  displayName: string;
  role: Role;
  teamId?: number;
};

type UserUpdate = {
  userId: number;
  role: Role;
  teamId?: number | null;
};

/**
 * Changes an existing account's role, and which club a GM manages. A GM's team
 * could previously only be set when the account was created, so moving someone
 * to another club meant deleting and recreating them.
 */
export async function PATCH(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as UserUpdate;

    if (!Number.isInteger(payload.userId)) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }
    if (!ROLES.includes(payload.role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }
    if (payload.role === "GM" && !payload.teamId) {
      return Response.json({ error: "A GM needs a team." }, { status: 400 });
    }

    const db = getDb();
    const target = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
    if (!target) return Response.json({ error: "User not found" }, { status: 404 });

    // An admin demoting themselves would lock the league out of this page, and
    // there may be no other admin to undo it.
    if (target.id === leagueUser.id && payload.role !== "ADMIN") {
      return Response.json(
        { error: "You cannot change your own role. Ask another admin." },
        { status: 409 },
      );
    }

    // Only a GM carries a team; any other role holds none, so a former GM does
    // not keep authority over a roster.
    const teamId = payload.role === "GM" ? payload.teamId ?? null : null;

    await db.update(users).set({ role: payload.role, teamId }).where(eq(users.id, payload.userId));

    await logAudit({
      actingUserId: leagueUser.id,
      action: "user.update",
      entityType: "user",
      entityId: payload.userId,
      detail: { role: payload.role, teamId },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as UserPayload;

    const discordId = payload.discordId?.trim();
    const displayName = payload.displayName?.trim();
    if (!discordId || !displayName) {
      return Response.json(
        { error: "discordId and displayName are required" },
        { status: 400 },
      );
    }
    if (!ROLES.includes(payload.role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }
    if (payload.role === "GM" && !payload.teamId) {
      return Response.json({ error: "GM accounts require a teamId" }, { status: 400 });
    }

    const db = getDb();
    const [user] = await db
      .insert(users)
      .values({
        discordId,
        displayName,
        role: payload.role,
        teamId: payload.role === "GM" ? payload.teamId : null,
      })
      .returning();

    await logAudit({
      actingUserId: leagueUser.id,
      action: "user.create",
      entityType: "user",
      entityId: user.id,
      detail: { discordId, role: payload.role, teamId: payload.teamId ?? null },
    });

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("UNIQUE constraint")) {
      return Response.json(
        { error: "A user with that Discord ID already exists." },
        { status: 409 },
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
