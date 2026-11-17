import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { ROLES, teams, userLeagues, userRoles, users } from "@/db/schema";
import { getLeagues } from "@/db/queries";
import { requireRole } from "@/app/roles";
import { EmptyState, SectionHeader } from "@/app/SiteNav";
import { CreateUserForm } from "../AdminForms";
import { AccountList } from "./AccountList";

export const metadata: Metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  await requireRole(["ADMIN"], "/admin/accounts");
  const db = getDb();
  const [allUsers, allTeams, allLeagues, held, covered] = await Promise.all([
    db.select().from(users).orderBy(asc(users.displayName)),
    db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.name)),
    getLeagues(),
    // Every account's roles in one read rather than one query per row. There
    // are a handful of accounts and at most a handful of roles each.
    db.select({ userId: userRoles.userId, role: userRoles.role }).from(userRoles),
    // And the competitions they cover, the same way and for the same reason.
    db.select({ userId: userLeagues.userId, leagueId: userLeagues.leagueId }).from(userLeagues),
  ]);

  const rolesOf = (userId: number) =>
    ROLES.filter((role) =>
      held.some((entry) => entry.userId === userId && entry.role === role),
    );

  // In the order the competitions themselves are in, so two accounts covering
  // the same pair read the same way.
  const leaguesOf = (userId: number) =>
    allLeagues
      .filter((league) => covered.some((entry) => entry.userId === userId && entry.leagueId === league.id))
      .map((league) => league.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <section className="min-w-0">
        <SectionHeader title="League accounts" meta={`${allUsers.length} people`} />
        {allUsers.length === 0 ? (
          <EmptyState>No accounts yet.</EmptyState>
        ) : (
          <AccountList
            accounts={allUsers.map((user) => ({
              ...user,
              roles: rolesOf(user.id),
              leagueIds: leaguesOf(user.id),
            }))}
            teams={allTeams}
            leagues={allLeagues}
          />
        )}
      </section>
      <aside>
        <CreateUserForm teams={allTeams} />
      </aside>
    </div>
  );
}
