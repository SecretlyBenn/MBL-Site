import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { teams, users } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { EmptyState, SectionHeader } from "@/app/SiteNav";
import { CreateUserForm } from "../AdminForms";
import { UserRoleRow } from "../UserRoleRow";

export const metadata: Metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  await requireRole(["ADMIN"], "/admin/accounts");
  const db = getDb();
  const [allUsers, allTeams] = await Promise.all([
    db.select().from(users).orderBy(asc(users.displayName)),
    db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.name)),
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <section className="min-w-0">
        <SectionHeader title="League accounts" meta={`${allUsers.length} people`} />
        {allUsers.length === 0 ? (
          <EmptyState>No accounts yet.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {allUsers.map((user) => (
              <UserRoleRow key={user.id} user={user} teams={allTeams} />
            ))}
          </ul>
        )}
      </section>
      <aside>
        <CreateUserForm teams={allTeams} />
      </aside>
    </div>
  );
}
