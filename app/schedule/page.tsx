import Link from "next/link";
import { getHistoricalSchedule, getHistoricalSeasons } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";
import { StandingsSeasonSelect } from "@/app/standings/StandingsSeasonSelect";
import { isForfeit } from "@/app/formatStats";

export const dynamic = "force-dynamic";

/**
 * Only Season XII was played as a series schedule, where a block of games runs
 * against one opponent before the matchups rotate. Every other season is a
 * plain calendar of dates, so grouping those by series would invent structure
 * the league never had.
 */
const SERIES_SEASONS = /Season XII$/;

/**
 * Season XII's real series structure, as published by the league. Games inside
 * a series can be played on any date in its window, so the boundaries can't be
 * derived from the calendar or from matchup rotation - they're a fact about the
 * schedule. Counts sum to 110, which is the number of games on record.
 */
const SEASON_XII_SERIES = [
  { window: "June 15 – June 24", games: 12 },
  { window: "June 25 – July 1", games: 12 },
  { window: "July 2 – July 9", games: 12 },
  { window: "July 10 – July 15", games: 12 },
  { window: "July 16 – July 23", games: 12 },
  { window: "August 2 – August 9", games: 12 },
  { window: "August 10 – August 15", games: 12 },
  { window: "August 16 – August 22", games: 12 },
  { window: "August 23 – August 28", games: 14 },
];

/** Between series 5 and 6. Shown so the gap in play reads as intentional. */
const ALL_STAR_BREAK_AFTER_SERIES = 5;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;
  const seasons = await getHistoricalSeasons();
  if (seasons.length === 0) {
    return (
      <PageShell title="Schedule & Scores">
        <EmptyState>No seasons have been recorded yet.</EmptyState>
      </PageShell>
    );
  }

  const season = seasons.find((row) => String(row.id) === seasonParam) ?? seasons[0];
  const games = await getHistoricalSchedule(season.id);
  type Game = (typeof games)[number];

  /** "June 15" from "Monday June 15, 2026". */
  const shortDate = (value: string | null) =>
    value?.replace(/^\w+,?\s*/, "").replace(/,\s*\d{4}$/, "") ?? "";

  const groups: { label: string; detail: string; games: Game[] }[] = [];

  const seriesSeason = SERIES_SEASONS.test(season.name);

  if (seriesSeason) {
    // Walk the published series lengths in schedule order. Any games beyond the
    // published structure still get shown rather than silently dropped.
    let cursor = 0;
    for (const [index, series] of SEASON_XII_SERIES.entries()) {
      const block = games.slice(cursor, cursor + series.games);
      cursor += series.games;
      if (block.length === 0) continue;
      groups.push({ label: `Series ${index + 1}`, detail: series.window, games: block });
    }
    if (cursor < games.length) {
      groups.push({ label: "Additional games", detail: "", games: games.slice(cursor) });
    }
  } else {
    // Games arrive in schedule order, so a run of equal dates is one day.
    for (const game of games) {
      const label = shortDate(game.playedOn) || "Date unknown";
      const last = groups.at(-1);
      if (last && last.label === label) last.games.push(game);
      else groups.push({ label, detail: "", games: [game] });
    }
  }

  const played = games.filter((game) => game.homeScore !== null && game.awayScore !== null);

  return (
    <PageShell
      wide
      title="Schedule & Scores"
      subtitle={`${season.name} · ${games.length} games · ${played.length} played`}
    >
      <div className="mb-4">
        <StandingsSeasonSelect
          seasons={seasons.map((row) => ({ id: row.id, name: row.name }))}
          selected={String(season.id)}
        />
      </div>

      {games.length === 0 ? (
        <EmptyState>No games recorded for this season.</EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.map((group, groupIndex) => (
            <section key={group.label}>
              {/* The league pauses here, so the gap in play reads as a break
                  rather than a hole in the schedule. */}
              {seriesSeason && groupIndex === ALL_STAR_BREAK_AFTER_SERIES && (
                <p className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                  <span className="h-px flex-1 bg-amber-500/30" />
                  All-Star Break · July 24 – August 1
                  <span className="h-px flex-1 bg-amber-500/30" />
                </p>
              )}
              <h2 className="mb-2 flex items-baseline gap-2 border-b border-slate-800/80 pb-1.5 text-xs font-bold uppercase tracking-wider">
                <span className="text-slate-200">{group.label}</span>
                {group.detail && <span className="text-slate-500">{group.detail}</span>}
                <span className="text-slate-600">· {group.games.length} games</span>
              </h2>
              {/* Two games per row on wide screens: one card stretched across
                  1600px leaves a canyon between the score and the line score. */}
              <div className="grid gap-2 xl:grid-cols-2">
                {group.games.map((game) => (
                  /* A series game can be played on any date inside its window,
                     so a per-card date would imply a fixture that isn't real.
                     In date mode the heading already carries the date. */
                  <GameCard key={game.id} game={game} showDate={false} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

type Game = Awaited<ReturnType<typeof getHistoricalSchedule>>[number];

function GameCard({ game, showDate }: { game: Game; showDate: boolean }) {
  const isFinal = game.homeScore !== null && game.awayScore !== null;
  const forfeit = isForfeit(game);
  const awayWon = isFinal && (game.awayScore ?? 0) > (game.homeScore ?? 0);
  const homeWon = isFinal && (game.homeScore ?? 0) > (game.awayScore ?? 0);

  const cells = (value: string | null | undefined) => (value ?? "").split(",").filter(Boolean);
  const awayInnings = cells(game.away?.innings);
  const homeInnings = cells(game.home?.innings);
  const innings = Math.max(awayInnings.length, homeInnings.length);
  const hasLineScore = isFinal && !forfeit && innings > 0;

  const side = (
    name: string | null,
    score: number | null,
    won: boolean,
    label: "Away" | "Home",
  ) => (
    <div className="flex items-center gap-3">
      {name && <TeamLogo teamName={name} className="h-11 w-11 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p>
        <p className={`truncate text-base ${won ? "font-bold text-white" : "text-slate-300"}`}>
          {name ?? label}
        </p>
      </div>
      <p
        className={`w-10 text-right text-3xl leading-none tabular-nums ${
          won ? "font-black text-white" : "font-semibold text-slate-500"
        }`}
      >
        {isFinal ? score ?? "-" : "–"}
      </p>
    </div>
  );

  return (
    <Link
      href={`/games/${game.id}`}
      className="block rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 transition-colors hover:border-slate-700 hover:bg-slate-900"
    >
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
        <span>{showDate ? shortDateOf(game.playedOn) : ""}</span>
        <span className={forfeit ? "font-semibold text-amber-400" : ""}>
          {forfeit ? "Forfeit" : game.note ? `Ended ${game.note}` : isFinal ? "Final" : "Scheduled"}
        </span>
      </div>

      {/* The matchup and its score lead; the line score is supporting detail,
          so it sits to the right and drops away entirely on narrow screens. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="w-full min-w-0 flex-1 space-y-2 lg:max-w-xs">
          {side(game.awayName, game.awayScore, awayWon, "Away")}
          {side(game.homeName, game.homeScore, homeWon, "Home")}
        </div>

        <div className="lg:ml-auto">
          {hasLineScore ? (
            <table className="line-score">
              <thead>
                <tr>
                  <th />
                  {Array.from({ length: innings }, (_, index) => (
                    <th key={index}>{index + 1}</th>
                  ))}
                  <th className="is-total is-total-start">R</th>
                  <th className="is-total">H</th>
                  <th className="is-total">E</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { abbr: game.awayAbbr, name: game.awayName, per: awayInnings, line: game.away, won: awayWon },
                  { abbr: game.homeAbbr, name: game.homeName, per: homeInnings, line: game.home, won: homeWon },
                ].map((team, index) => (
                  <tr key={index} className={team.won ? "font-semibold text-white" : ""}>
                    <th scope="row">{team.abbr ?? team.name?.slice(0, 3).toUpperCase() ?? "—"}</th>
                    {Array.from({ length: innings }, (_, inning) => (
                      <td key={inning}>{team.per[inning] ?? ""}</td>
                    ))}
                    <td className="is-total is-total-start">{team.line?.runs ?? "-"}</td>
                    <td className="is-total">{team.line?.hits ?? "-"}</td>
                    <td className="is-total">{team.line?.errors ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-600">
              {forfeit ? "No game played" : isFinal ? "No line score recorded" : "Not yet played"}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function shortDateOf(value: string | null) {
  return value?.replace(/^\w+,?\s*/, "").replace(/,\s*\d{4}$/, "") ?? "";
}
