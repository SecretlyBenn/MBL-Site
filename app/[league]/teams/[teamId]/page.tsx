import type { Metadata } from "next";
import { BackButton } from "@/app/BackButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { teams } from "@/db/schema";
import { getScheduleWithTeams, getStandings, getTeamRoster } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";
import { leagueFrom } from "../../league";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ league: string; teamId: string }> }): Promise<Metadata> {
  const { league, teamId: value } = await params;
  const teamId = Number(value);
  const team = Number.isInteger(teamId)
    ? await getDb().query.teams.findFirst({ where: eq(teams.id, teamId), columns: { name: true } })
    : null;
  if (!team) return { title: "Team not found", robots: { index: false } };
  return {
    title: team.name,
    description: `The ${team.name} of the Minecraft Baseball League: roster, schedule, results and standings.`,
    alternates: { canonical: `/${league}/teams/${teamId}` },
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ league: string; teamId: string }>;
}) {
  const { teamId: teamIdParam } = await params;
  const league = await leagueFrom(params);
  const teamId = Number(teamIdParam);
  if (!Number.isInteger(teamId)) notFound();

  const db = getDb();
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) notFound();

  const [roster, standings, schedule] = await Promise.all([
    getTeamRoster(teamId),
    getStandings(),
    getScheduleWithTeams(),
  ]);

  const record = standings.find((row) => row.teamId === teamId);
  const teamGames = schedule.filter(
    (game) => game.homeTeamId === teamId || game.awayTeamId === teamId,
  );
  const recentResults = teamGames.filter((game) => game.status === "FINAL").slice(-5).reverse();

  return (
    <PageShell
      title={team.name}
      subtitle={
        record
          ? `${record.wins}-${record.losses} · ${record.runsScored} RS / ${record.runsAllowed} RA`
          : team.abbreviation
      }
    >
      <TeamLogo teamName={team.name} className="mb-6 h-32 w-32" />
      <div className="mb-6"><BackButton /></div>
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Active roster
          </h2>
          {roster.length === 0 ? (
            <EmptyState>No active players.</EmptyState>
          ) : (
            <ul className="space-y-1 text-sm">
              {roster.map((player) => (
                <li key={player.id}>
                  <Link
                    href={`/${league.slug}/players/${player.id}`}
                    className="block rounded border border-slate-800/80 bg-slate-900/40 px-3 py-2 hover:bg-slate-800/60"
                  >
                    {player.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Recent results
          </h2>
          {recentResults.length === 0 ? (
            <EmptyState>No completed games yet.</EmptyState>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentResults.map((game) => {
                const isHome = game.homeTeamId === teamId;
                const us = isHome ? game.homeScore : game.awayScore;
                const them = isHome ? game.awayScore : game.homeScore;
                const opponent = isHome ? game.awayTeam : game.homeTeam;
                const won = (us ?? 0) > (them ?? 0);
                return (
                  <li
                    key={game.id}
                    className="flex items-center justify-between rounded border border-slate-800/80 bg-slate-900/40 px-3 py-2"
                  >
                    <span>
                      <span className={won ? "text-emerald-400" : "text-rose-400"}>
                        {won ? "W" : "L"}
                      </span>{" "}
                      {isHome ? "vs" : "@"} {opponent ? <Link href={`/${league.slug}/teams/${opponent.id}`} className="hover:underline">{opponent.name}</Link> : "Unknown"}
                    </span>
                    <span className="font-mono">
                      {us}-{them}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
