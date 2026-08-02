import Link from "next/link";
import { getScheduleWithTeams } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const schedule = await getScheduleWithTeams();

  const byDate = new Map<string, typeof schedule>();
  for (const game of schedule) {
    const key = new Date(game.scheduledAt).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const bucket = byDate.get(key) ?? [];
    bucket.push(game);
    byDate.set(key, bucket);
  }

  return (
    <PageShell title="Schedule & Scores">
      {schedule.length === 0 ? (
        <EmptyState>No games have been scheduled yet.</EmptyState>
      ) : (
        <div className="space-y-6">
          {[...byDate.entries()].map(([date, dayGames]) => (
            <section key={date}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
                {date}
              </h2>
              <div className="space-y-2">
                {dayGames.map((game) => {
                  const isFinal = game.status === "FINAL";
                  const awayWon =
                    isFinal && (game.awayScore ?? 0) > (game.homeScore ?? 0);
                  return (
                    <div
                      key={game.id}
                      className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex flex-col gap-1 text-sm">
                        <span className={`flex items-center gap-2 ${awayWon ? "font-semibold" : ""}`}>
                          {game.awayTeam && <TeamLogo teamName={game.awayTeam.name} className="h-7 w-7" />}
                          {game.awayTeam ? (
                            <Link href={`/teams/${game.awayTeam.id}`} className="hover:underline">
                              {game.awayTeam.name}
                            </Link>
                          ) : (
                            "Away"
                          )}
                        </span>
                        <span className={`flex items-center gap-2 ${isFinal && !awayWon ? "font-semibold" : ""}`}>
                          {game.homeTeam && <TeamLogo teamName={game.homeTeam.name} className="h-7 w-7" />}
                          {game.homeTeam ? (
                            <Link href={`/teams/${game.homeTeam.id}`} className="hover:underline">
                              {game.homeTeam.name}
                            </Link>
                          ) : (
                            "Home"
                          )}
                        </span>
                      </div>
                      <div className="text-right">
                        {isFinal ? (
                          <div className="flex flex-col gap-1 text-sm font-mono">
                            <span className={awayWon ? "font-bold" : "text-white/60"}>
                              {game.awayScore}
                            </span>
                            <span className={!awayWon ? "font-bold" : "text-white/60"}>
                              {game.homeScore}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs uppercase tracking-wide text-white/40">
                            {game.status === "CANCELLED"
                              ? "Cancelled"
                              : new Date(game.scheduledAt).toLocaleTimeString(undefined, {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
