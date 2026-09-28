import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logoKey } from "@/db/logos";
import { players, teamLogos, teams } from "@/db/schema";
import { getLeagues } from "@/db/queries";
import { requireRole } from "@/app/roles";
import { EmptyState, SectionHeader } from "@/app/SiteNav";
import { CreateTeamForm, TeamRow } from "../AdminForms";

export const metadata: Metadata = { title: "Teams" };
export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  await requireRole(["ADMIN"], "/admin/teams");
  const db = getDb();

  const [allTeams, counts, uploads, allLeagues] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select({ teamId: players.teamId, n: sql<number>`count(*)` }).from(players).groupBy(players.teamId),
    db.select({ teamName: teamLogos.teamName }).from(teamLogos),
    getLeagues(),
  ]);
  const playersOn = new Map(counts.map((row) => [row.teamId, Number(row.n)]));
  const uploaded = new Set(uploads.map((row) => row.teamName));

  // Grouped by competition so it is obvious which clubs belong where, in the
  // leagues' own order. A club with no league should not exist - 0057 gave
  // every one a league and the API insists on one - so the last group is a
  // way of noticing if one ever does, rather than hiding it.
  const groups = [
    ...allLeagues.map((league) => ({
      key: league.slug,
      label: league.name,
      clubs: allTeams.filter((team) => team.leagueId === league.id),
    })),
    {
      key: "none",
      label: "No league",
      clubs: allTeams.filter((team) => !allLeagues.some((league) => league.id === team.leagueId)),
    },
  ].filter((group) => group.clubs.length > 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <section className="min-w-0">
        <SectionHeader title="Clubs" meta={`${allTeams.length} across the site`} />
        {allTeams.length === 0 ? (
          <EmptyState>No teams yet.</EmptyState>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="mb-6 last:mb-0">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                {group.label} <span className="font-medium text-slate-500">· {group.clubs.length}</span>
              </p>
              <ul className="flex flex-col gap-2">
                {group.clubs.map((team) => (
                  <TeamRow
                    key={team.id}
                    team={{ ...team, players: playersOn.get(team.id) ?? 0 }}
                    hasUpload={uploaded.has(logoKey(team.name))}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
      <aside className="flex flex-col gap-4">
        <CreateTeamForm leagues={allLeagues.map((league) => ({ id: league.id, name: league.name }))} />
        <p className="text-xs leading-relaxed text-slate-500">
          Logos are resized to 256px in your browser before uploading, so any image works. An upload
          replaces the built-in logo everywhere the club appears, including past seasons.
        </p>
      </aside>
    </div>
  );
}
