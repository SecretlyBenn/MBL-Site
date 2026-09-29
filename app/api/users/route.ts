import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { ROLES, leagues, userRoles, users, type Role } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type UserPayload = {
  discordId: string;
  displayName: string;
  roles: Role[];
  teamId?: number;
};

type UserUpdate = {
  userId: number;
  roles: Role[];
  teamId?: number | null;
  leagueId?: number | null;
  displayName?: string;
};

/**
 * The roles an account may hold, cleaned up.
 *
 * Duplicates are dropped and the order is fixed, because these are written to
 * an audit row and read back by a person: the same set should always read the
 * same way.
 */
function cleanRoles(value: unknown): { roles: Role[] } | { error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "Pick at least one role." };
  }
  const unknown = value.find((role) => !ROLES.includes(role as Role));
  if (unknown !== undefined) return { error: `There is no ${String(unknown)} role.` };
  return { roles: ROLES.filter((role) => value.includes(role)) };
}

/**
 * Replaces an account's roles with exactly this set.
 *
 * Written as a delete of what is no longer held plus an insert of what is new,
 * rather than clearing the lot and putting it back. Clearing first leaves a
 * moment where the account holds nothing, and a request arriving in that gap
 * would be turned away from a page the person has every right to be on.
 */
async function setRoles(userId: number, roles: Role[]) {
  const db = getDb();
  const held = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  const current = held.map((entry) => entry.role as Role);

  const gone = current.filter((role) => !roles.includes(role));
  if (gone.length > 0) {
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), inArray(userRoles.role, gone)));
  }

  const added = roles.filter((role) => !current.includes(role));
  if (added.length > 0) {
    await db.insert(userRoles).values(added.map((role) => ({ userId, role })));
  }
}

/**
 * Changes an existing account's name, roles, and which club a GM manages.
 *
 * Roles are a set rather than one value: people here wear more than one hat,
 * and a GM who also umpires other clubs' games is the ordinary case.
 */
export async function PATCH(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as UserUpdate;

    if (!Number.isInteger(payload.userId)) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }
    const cleaned = cleanRoles(payload.roles);
    if ("error" in cleaned) {
      return Response.json({ error: cleaned.error }, { status: 400 });
    }
    const roles = cleaned.roles;
    if (roles.includes("GM") && !payload.teamId) {
      return Response.json({ error: "A GM needs a team." }, { status: 400 });
    }
    // Left out entirely means "leave the name alone"; sent empty is a mistake.
    const displayName = payload.displayName?.trim();
    if (displayName !== undefined && displayName === "") {
      return Response.json({ error: "A name is required." }, { status: 400 });
    }

    const db = getDb();
    const target = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
    if (!target) return Response.json({ error: "User not found" }, { status: 404 });

    // An admin dropping their own admin would lock the league out of this
    // page, and there may be no other admin to undo it. Adding roles to
    // themselves is fine - it is only losing this one that cannot be undone.
    if (target.id === leagueUser.id && !roles.includes("ADMIN")) {
      return Response.json(
        { error: "You cannot remove your own admin role. Ask another admin." },
        { status: 409 },
      );
    }

    // Only a GM carries a club; an account that is no longer one holds none,
    // so a former GM does not keep authority over a roster.
    const teamId = roles.includes("GM") ? payload.teamId ?? null : null;

    // Only the roles with no club of their own are narrowed to a competition:
    // a GM takes theirs from the club, and an admin runs both. Null is both,
    // which is what an official is unless somebody says otherwise. Cleared
    // when no such role is held, so a former umpire's league cannot linger.
    const scopedByLeague = roles.some((role) =>
      ["UMPIRE", "HEAD_UMPIRE", "WRITER"].includes(role),
    );
    const leagueId = scopedByLeague ? payload.leagueId ?? null : null;
    if (leagueId !== null && !(await db.query.leagues.findFirst({ where: eq(leagues.id, leagueId) }))) {
      return Response.json({ error: "That league does not exist." }, { status: 400 });
    }

    // The name on the account is what the league calls this person; their
    // sessions carry the old one until they sign in again, which shows only in
    // the greeting, so there is nothing to invalidate here.
    await db
      .update(users)
      .set({ teamId, leagueId, ...(displayName ? { displayName } : {}) })
      .where(eq(users.id, payload.userId));

    await setRoles(payload.userId, roles);

    await logAudit({
      actingUserId: leagueUser.id,
      action: "user.update",
      entityType: "user",
      entityId: payload.userId,
      detail: {
        roles,
        teamId,
        ...(displayName && displayName !== target.displayName
          ? { renamedFrom: target.displayName, displayName }
          : {}),
      },
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
    const cleaned = cleanRoles(payload.roles);
    if ("error" in cleaned) {
      return Response.json({ error: cleaned.error }, { status: 400 });
    }
    const roles = cleaned.roles;
    if (roles.includes("GM") && !payload.teamId) {
      return Response.json({ error: "GM accounts require a teamId" }, { status: 400 });
    }

    const db = getDb();
    const [user] = await db
      .insert(users)
      .values({
        discordId,
        displayName,
        teamId: roles.includes("GM") ? payload.teamId : null,
      })
      .returning();

    await setRoles(user.id, roles);

    await logAudit({
      actingUserId: leagueUser.id,
      action: "user.create",
      entityType: "user",
      entityId: user.id,
      detail: { discordId, roles, teamId: payload.teamId ?? null },
    });

    return Response.json({ user: { ...user, roles } }, { status: 201 });
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
