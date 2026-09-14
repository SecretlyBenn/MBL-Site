import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logoKey } from "@/db/logos";
import { players, teamLogos, teams } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { EmptyState, SectionHeader } from "@/app/SiteNav";
import { CreateTeamForm, TeamRow } from "../AdminForms";

export const metadata: Metadata = { title: "Teams" };
export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  await requireRole(["ADMIN"], "/admin/teams");
  const db = getDb();

  const [allTeams, counts, uploads] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select({ teamId: players.teamId, n: sql<number>`count(*)` }).from(players).groupBy(players.teamId),
    db.select({ teamName: teamLogos.teamName }).from(teamLogos),
  ]);
  const playersOn = new Map(counts.map((row) => [row.teamId, Number(row.n)]));
  const uploaded = new Set(uploads.map((row) => row.teamName));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <section className="min-w-0">
        <SectionHeader title="Clubs" meta={`${allTeams.length} in the league`} />
        {allTeams.length === 0 ? (
          <EmptyState>No teams yet.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {allTeams.map((team) => (
              <TeamRow
                key={team.id}
                team={{ ...team, players: playersOn.get(team.id) ?? 0 }}
                hasUpload={uploaded.has(logoKey(team.name))}
              />
            ))}
          </ul>
        )}
      </section>
      <aside className="flex flex-col gap-4">
        <CreateTeamForm />
        <p className="text-xs leading-relaxed text-slate-500">
          Logos are resized to 256px in your browser before uploading, so any image works. An upload
          replaces the built-in logo everywhere the club appears, including past seasons.
        </p>
      </aside>
    </div>
  );
}
