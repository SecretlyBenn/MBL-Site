import Link from "next/link";
import {
  getHistoricalLeaders,
  getHistoricalSchedule,
  getHistoricalSeasonStandings,
  getHistoricalSeasons,
  getPlayerAvatars,
} from "@/db/queries";
import { EmptyState, SiteNav } from "@/app/SiteNav";
import { StandingsTable } from "@/app/standings/StandingsTable";
import { PlayerProfileLink } from "@/app/EntityLinks";
import { PlayerHead } from "@/app/PlayerHead";
import { ScoresStrip } from "@/app/ScoresStrip";

export const dynamic = "force-dynamic";

const LEADER_BOARDS = [
  { column: "homeRuns" as const, label: "Home runs", unit: "HR" },
  { column: "hits" as const, label: "Hits", unit: "H" },
  { column: "rbis" as const, label: "RBI", unit: "RBI" },
  { column: "runs" as const, label: "Runs", unit: "R" },
  { column: "strikeoutsPitched" as const, label: "Strikeouts", unit: "SO" },
  { column: "wins" as const, label: "Wins", unit: "W" },
];

export default async function Home() {
  const seasons = await getHistoricalSeasons();
  const latestSeason = seasons[0] ?? null;

  const [standings, leaders, seasonGames, avatars] = await Promise.all([
    latestSeason ? getHistoricalSeasonStandings(latestSeason.id) : Promise.resolve([]),
    Promise.all(
      LEADER_BOARDS.map(async (board) => ({
        ...board,
        rows: await getHistoricalLeaders(board.column, 4, latestSeason?.id),
      })),
    ),
    latestSeason ? getHistoricalSchedule(latestSeason.id) : Promise.resolve([]),
    getPlayerAvatars(),
  ]);

  // Archived games carry no status flag; a missing score marks one as unplayed.
  const isPlayed = (game: (typeof seasonGames)[number]) =>
    game.homeScore !== null && game.awayScore !== null;

  const played = seasonGames.filter(isPlayed).slice(-10).reverse();

  // "Next" means each team's own next fixture, not simply the next few games on
  // the schedule - otherwise teams deep in the order never appear. Games run in
  // schedule order, so a team's first unplayed game is the one to show, and the
  // Set collapses the duplicate when both sides of a matchup are up next.
  const nextByTeam = new Map<number, (typeof seasonGames)[number]>();
  for (const game of seasonGames) {
    if (isPlayed(game)) continue;
    for (const teamId of [game.awayTeamId, game.homeTeamId]) {
      if (teamId !== null && !nextByTeam.has(teamId)) nextByTeam.set(teamId, game);
    }
  }
  const upNext = [...new Set(nextByTeam.values())];

  const strip = [...played, ...upNext];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteNav />
      <ScoresStrip games={strip} />

      {/* The hero carries a photograph of a league ballpark behind it. The
          image is referenced rather than required: if public/stadium.png is
          absent the gradient underneath shows through on its own, so the page
          is never broken by a missing picture. */}
      <section className="relative overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,theme(colors.sky.900/45),transparent_60%)]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('/stadium.png')" }}
        />
        {/* Keeps the type legible whatever the photograph is doing behind it. */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />

        <div className="relative mx-auto max-w-[1600px] px-6 py-12">
          <div className="flex flex-wrap items-center gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mbl-logo.png" alt="" className="h-20 w-auto shrink-0 drop-shadow-lg" />
            <div className="min-w-0">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400">
                {latestSeason?.name ?? "Minecraft Baseball League"}
              </p>
              <h1 className="text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl">
                MINECRAFT BASEBALL
                <br />
                <span className="text-sky-400">LEAGUE.</span>
              </h1>
              <p className="mt-3 text-sm text-slate-300">
                Minecraft&apos;s most realistic baseball league.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { href: "/schedule", label: "Schedule" },
              { href: "/statistics/batting", label: "Stats" },
              { href: "/standings", label: "Standings" },
              { href: "/rosters", label: "Rosters" },
              // A "Join Discord" button belongs here too, but the league's
              // invite link is not recorded anywhere in the project and a wrong
              // one is worse than none.
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md bg-sky-600 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-sky-500"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] px-6 py-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="flex min-w-0 flex-col">
            <div className="mb-3 flex items-baseline justify-between border-b border-slate-800/80 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Standings
              </h2>
              <Link
                href="/standings"
                className="text-xs font-medium text-sky-400 transition-colors hover:text-sky-300"
              >
                Full standings →
              </Link>
            </div>
            {standings.length === 0 || !latestSeason ? (
              <EmptyState>No teams yet.</EmptyState>
            ) : (
              <StandingsTable
                teams={standings}
                seasonId={latestSeason.id}
                controls={false}
                compact
              />
            )}
          </section>

          <section className="min-w-0">
            <div className="mb-3 flex items-baseline justify-between border-b border-slate-800/80 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Leaders
              </h2>
              <Link
                href={`/statistics/batting${latestSeason ? `?season=${latestSeason.id}` : ""}`}
                className="text-xs font-medium text-sky-400 transition-colors hover:text-sky-300"
              >
                All statistics →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {leaders.map((board) => (
                <div key={board.column} className="data-table-shell">
                  <table className="data-table ranked w-full table-fixed">
                    <colgroup>
                      <col style={{ width: "2.75rem" }} />
                      <col />
                      <col style={{ width: "22%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>RNK</th>
                        <th>{board.label}</th>
                        <th>{board.unit}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.rows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center text-slate-600">
                            No data.
                          </td>
                        </tr>
                      ) : (
                        board.rows.map((row, index) => (
                          <tr key={row.playerName}>
                            <td>{index + 1}</td>
                            <td>
                              <span className="flex min-w-0 items-center gap-2">
                                <PlayerHead uuid={avatars[row.playerName]} name={row.playerName} size={18} />
                                <PlayerProfileLink name={row.playerName} className="truncate" />
                              </span>
                            </td>
                            <td>{row.total}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6">
          <div className="mb-3 flex items-baseline justify-between border-b border-slate-800/80 pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Seasons</h2>
            <Link
              href="/seasons"
              className="text-xs font-medium text-sky-400 transition-colors hover:text-sky-300"
            >
              All seasons →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {seasons.slice(0, 10).map((season) => (
              <Link
                key={season.id}
                href={`/seasons/${season.id}`}
                className="rounded-md border border-slate-800/80 bg-slate-900/40 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-sky-500/40 hover:bg-slate-900 hover:text-white"
              >
                {season.name}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
