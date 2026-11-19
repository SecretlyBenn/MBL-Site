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
   * Which competitions each scoped role covers, a row per pair. A role with
   * no row here covers every competition, which is what most officials are -
   * read it through `coveredLeagues` rather than testing it here.
   */
  scopes: { role: Role; leagueId: number }[];
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
 * The competitions these roles cover, or null for all of them.
 *
 * Asked a role at a time, because one account can hold two that are narrowed
 * differently: umpiring the MBL and writing for the MCBA is an ordinary thing
 * to be, and a single set per account could not say it. Pass the roles that
 * let somebody onto the page you are guarding - `/umpire` is for either
 * umpiring role, the newsroom is for WRITER - and the answer is their union.
 *
 * A role with nothing stored covers everything, so null wins over a list:
 * somebody who umpires both competitions and writes for one still sees every
 * game. An admin covers all of them, because the wider role wins where two
 * disagree - the same rule `assertMayArrange` follows for a head umpire who
 * also runs a club.
 *
 * Null rather than a list of every competition, so one added to the table
 * tomorrow is covered without anybody remembering this function exists.
 */
export function coveredLeagues(
  user: { roles: Role[]; scopes: { role: Role; leagueId: number }[] },
  roles: Role[],
): number[] | null {
  if (hasRole(user, "ADMIN")) return null;
  const held = roles.filter((role) => user.roles.includes(role));
  // None of these roles at all: nothing is covered, which is not the same as
  // everything. The page guard has usually refused them already.
  if (held.length === 0) return [];

  const ids = new Set<number>();
  for (const role of held) {
    const narrowed = user.scopes.filter((scope) => scope.role === role);
    if (narrowed.length === 0) return null;
    for (const scope of narrowed) ids.add(scope.leagueId);
  }
  return [...ids];
}

/**
 * Whether these roles reach this competition.
 *
 * A club with no competition at all reaches nobody who is narrowed to one:
 * the point of narrowing somebody is that each competition is somebody's, and
 * an unfiled club is nobody's.
 */
export function covers(
  user: { roles: Role[]; scopes: { role: Role; leagueId: number }[] },
  roles: Role[],
  leagueId: number | null | undefined,
): boolean {
  const allowed = coveredLeagues(user, roles);
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
      .select({ role: userLeagues.role, leagueId: userLeagues.leagueId })
      .from(userLeagues)
      .where(eq(userLeagues.userId, row.id)),
  ]);

  return {
    id: row.id,
    discordId: row.discordId,
    displayName: row.displayName,
    roles: held.map((entry) => entry.role as Role),
    teamId: row.teamId,
    scopes: covered.map((entry) => ({ role: entry.role as Role, leagueId: entry.leagueId })),
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
