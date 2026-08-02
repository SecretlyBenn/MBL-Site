import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { teams } from "@/db/schema";
import { getScheduleWithTeams, getStandings, getTeamRoster } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdParam } = await params;
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
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
            Active roster
          </h2>
          {roster.length === 0 ? (
            <EmptyState>No active players.</EmptyState>
          ) : (
            <ul className="space-y-1 text-sm">
              {roster.map((player) => (
                <li key={player.id}>
                  <Link
                    href={`/players/${player.id}`}
                    className="block rounded border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                  >
                    {player.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
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
                    className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span>
                      <span className={won ? "text-green-400" : "text-red-400"}>
                        {won ? "W" : "L"}
                      </span>{" "}
                      {isHome ? "vs" : "@"} {opponent?.name ?? "Unknown"}
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
