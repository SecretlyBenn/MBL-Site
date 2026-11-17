import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { rateLimit, sweepRateLimits } from "@/db/rate-limit";
import { ROLES, userLeagues, userRoles, users, type Role } from "@/db/schema";
import { getSession } from "./session";

export type LeagueUser = {
  id: number;
  discordId: string;
  displayName: string;
  /**
   * Every role this account holds. A plain array rather than a method, because
   * this object is handed to components and has to survive being serialised.
   */
  roles: Role[];
  teamId: number | null;
  /**
   * The competitions this account's roles cover. Empty means every one of
   * them, which is what most officials are - read it through `coveredLeagues`
   * rather than testing it here.
   */
  leagueIds: number[];
};

/** Whether an account holds a role. Safe on a null user, which most callers have. */
export function hasRole(user: { roles: Role[] } | null | undefined, role: Role) {
  return user?.roles.includes(role) ?? false;
}

/** Whether an account holds any of these roles - the check every guard makes. */
export function hasAnyRole(user: { roles: Role[] } | null | undefined, roles: Role[]) {
  return user ? roles.some((role) => user.roles.includes(role)) : false;
}

/**
 * The competitions an account's roles cover, or null for all of them.
 *
 * This is the one answer behind three questions: which games an umpire is
 * shown, which cards a head umpire reviews, and which competitions a writer
 * may file an article under. They were three copies of the same comparison,
 * and the one in the newsroom was missing entirely - it stamped every article
 * with whichever competition happened to be first in the table.
 *
 * An admin covers all of them, because the wider role wins where two disagree
 * - the same rule `assertMayArrange` follows for a head umpire who also runs a
 * club.
 *
 * Null rather than a list of every competition, so one added to the table
 * tomorrow is covered without anybody remembering this function exists.
 */
export function coveredLeagues(user: { roles: Role[]; leagueIds: number[] }): number[] | null {
  if (hasRole(user, "ADMIN") || user.leagueIds.length === 0) return null;
  return user.leagueIds;
}

/**
 * Whether this account's roles reach this competition.
 *
 * A club with no competition at all reaches nobody who is narrowed to one,
 * which is the same answer the three separate checks gave: an unfiled club
 * should not turn up in an MCBA umpire's list by default.
 */
export function covers(
  user: { roles: Role[]; leagueIds: number[] },
  leagueId: number | null | undefined,
): boolean {
  const allowed = coveredLeagues(user);
  if (allowed === null) return true;
  return leagueId != null && allowed.includes(leagueId);
}

/**
 * The roles written out for a page heading: "gm · umpire".
 *
 * Ordered by ROLES rather than by whatever order they came back in, so the
 * same account always reads the same way.
 */
export function describeRoles(roles: Role[]) {
  return ROLES.filter((role) => roles.includes(role))
    .map((role) => role.replace(/_/g, " ").toLowerCase())
    .join(" · ");
}

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

  // An account with no roles is recognised but holds nothing. That is on
  // purpose: taking someone's last role should leave them with no access, not
  // drop them to some lesser default.
  //
  // Both sets at once: this runs on every page an official opens, and two
  // round trips one after the other is one more than it needs.
  const [held, covered] = await Promise.all([
    db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, row.id)),
    db
      .select({ leagueId: userLeagues.leagueId })
      .from(userLeagues)
      .where(eq(userLeagues.userId, row.id)),
  ]);

  return {
    id: row.id,
    discordId: row.discordId,
    displayName: row.displayName,
    roles: held.map((entry) => entry.role as Role),
    teamId: row.teamId,
    leagueIds: covered.map((entry) => entry.leagueId),
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
  if (!leagueUser || !hasAnyRole(leagueUser, allowedRoles)) {
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
  if (!leagueUser || !hasAnyRole(leagueUser, allowedRoles)) {
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
