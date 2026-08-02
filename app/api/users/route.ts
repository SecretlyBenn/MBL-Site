import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { ROLES, users, type Role } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type UserPayload = {
  email: string;
  displayName: string;
  role: Role;
  teamId?: number;
};

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as UserPayload;

    const email = payload.email?.trim().toLowerCase();
    const displayName = payload.displayName?.trim();
    if (!email || !displayName) {
      return Response.json(
        { error: "email and displayName are required" },
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
        email,
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
      detail: { email, role: payload.role, teamId: payload.teamId ?? null },
    });

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("UNIQUE constraint")) {
      return Response.json(
        { error: "A user with that email already exists." },
        { status: 409 },
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
