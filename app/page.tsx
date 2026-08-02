import Link from "next/link";
import { getHistoricalSeasons, getScheduleWithTeams, getStandings } from "@/db/queries";
import { EmptyState, SiteNav } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [standings, schedule, seasons] = await Promise.all([
    getStandings(),
    getScheduleWithTeams(),
    getHistoricalSeasons(),
  ]);

  const recentResults = schedule.filter((game) => game.status === "FINAL").slice(-6).reverse();
  const upcoming = schedule
    .filter((game) => game.status === "SCHEDULED")
    .slice(0, 5);
  const topFive = standings.slice(0, 5);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <SiteNav />

      <section className="border-b border-white/10 bg-gradient-to-b from-neutral-900 to-neutral-950 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-4xl font-black tracking-tight">Minecraft Baseball League</h1>
          <p className="mt-2 max-w-xl text-white/60">
            Live standings, schedule, rosters, and {seasons.length > 0 ? `${seasons.length} seasons of ` : ""}
            league history.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        {recentResults.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
              Recent results
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentResults.map((game) => {
                const awayWon = (game.awayScore ?? 0) > (game.homeScore ?? 0);
                return (
                  <div
                    key={game.id}
                    className="min-w-[190px] rounded border border-white/10 bg-white/5 p-3 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className={awayWon ? "font-semibold" : "text-white/60"}>
                        {game.awayTeam?.abbreviation ?? "AWY"}
                      </span>
                      <span className={awayWon ? "font-bold" : "text-white/60"}>
                        {game.awayScore}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className={!awayWon ? "font-semibold" : "text-white/60"}>
                        {game.homeTeam?.abbreviation ?? "HOM"}
                      </span>
                      <span className={!awayWon ? "font-bold" : "text-white/60"}>
                        {game.homeScore}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-white/30">Final</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
                Standings
              </h2>
              <Link href="/standings" className="text-xs text-white/50 hover:text-white">
                Full standings →
              </Link>
            </div>
            {topFive.length === 0 ? (
              <EmptyState>No teams yet.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {topFive.map((row, index) => (
                    <tr key={row.teamId} className="border-b border-white/5">
                      <td className="py-2 pr-2 text-white/40">{index + 1}</td>
                      <td className="py-2">
                        <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2 hover:underline">
                          <TeamLogo teamName={row.name} className="h-8 w-8" />{row.name}
                        </Link>
                      </td>
                      <td className="py-2 text-right font-mono">
                        {row.wins}-{row.losses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
                Upcoming
              </h2>
              <Link href="/schedule" className="text-xs text-white/50 hover:text-white">
                Full schedule →
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState>No upcoming games scheduled.</EmptyState>
            ) : (
              <ul className="space-y-2 text-sm">
                {upcoming.map((game) => (
                  <li
                    key={game.id}
                    className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span>
                      {game.awayTeam?.name ?? "Away"} @ {game.homeTeam?.name ?? "Home"}
                    </span>
                    <span className="text-xs text-white/40">
                      {new Date(game.scheduledAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
