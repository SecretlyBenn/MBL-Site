import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { rateLimit, sweepRateLimits } from "@/db/rate-limit";
import { users, type Role } from "@/db/schema";
import { getSession } from "./session";

export type LeagueUser = {
  id: number;
  discordId: string;
  displayName: string;
  role: Role;
  teamId: number | null;
};

/** Where an anonymous visitor is sent to sign in, returning to `returnTo`. */
export function signInPath(returnTo: string) {
  return `/api/auth/discord?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * Being signed in with Discord only proves identity - it does not by itself
 * grant any league access. Access requires a matching row in `users`, created
 * ahead of time by an admin.
 */
export async function getLeagueUser(): Promise<LeagueUser | null> {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  const row = await db.query.users.findFirst({
    where: eq(users.discordId, session.discordId),
  });
  if (!row) return null;

  // Signed out everywhere since this cookie was written: it is no longer a way
  // in, whatever it says.
  if ((session.epoch ?? 0) !== row.sessionEpoch) return null;

  return {
    id: row.id,
    discordId: row.discordId,
    displayName: row.displayName,
    role: row.role as Role,
    teamId: row.teamId,
  };
}

/**
 * Sends anonymous visitors through Discord sign-in, then requires the signed-in
 * user to hold one of `allowedRoles`. Mark the calling page
 * `export const dynamic = "force-dynamic"` since this depends on the request.
 */
export async function requireRole(
  allowedRoles: Role[],
  returnTo: string,
): Promise<LeagueUser> {
  const session = await getSession();
  if (!session) redirect(signInPath(returnTo));

  const leagueUser = await getLeagueUser();
  if (!leagueUser || !allowedRoles.includes(leagueUser.role)) {
    redirect("/unauthorized");
  }

  return leagueUser;
}

/** Thrown by requireRoleForApi; carries the HTTP status a route handler should respond with. */
export class RoleError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Same access check as requireRole, but for API route handlers - throws
 * RoleError instead of redirecting, so the caller can return a clean JSON
 * error instead of a redirect-to-HTML response.
 */
export async function requireRoleForApi(
  allowedRoles: Role[],
): Promise<LeagueUser> {
  const session = await getSession();
  if (!session) throw new RoleError(401, "Not signed in.");

  const leagueUser = await getLeagueUser();
  if (!leagueUser || !allowedRoles.includes(leagueUser.role)) {
    throw new RoleError(403, "You do not have access to this action.");
  }

  // Every change to the league goes through here, so this is where a ceiling
  // on how fast one account can make them belongs. It is set well above what
  // scoring a game or filling in a roster needs, and far below what a script
  // could do with a borrowed session.
  const verdict = await rateLimit(`api:${leagueUser.id}`, { limit: 240, windowSeconds: 60 });
  if (!verdict.ok) {
    throw new RoleError(429, "That is happening too often. Wait a moment and try again.");
  }
  void sweepRateLimits();

  return leagueUser;
}
