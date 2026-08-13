"use client";

import { Fragment, useState } from "react";
import { TeamLogo } from "@/app/TeamLogo";
import { formatInnings } from "@/app/formatStats";

type SeasonRow = Record<string, string | number | null | undefined> & {
  seasonId: number;
  seasonName: string;
  teamName: string;
};

type GameRow = {
  gameId: number;
  playedOn: string | null;
  seasonName: string;
  opponent: string | null;
  won: boolean | null;
  scoreLine: string | null;
  kind: string;
} & Record<string, string | number | boolean | null | undefined>;

type Column = { key: string; label: string; rate?: boolean; innings?: boolean };

const BATTING: Column[] = [
  { key: "games", label: "G" }, { key: "atBats", label: "AB" }, { key: "runs", label: "R" },
  { key: "hits", label: "H" }, { key: "doubles", label: "2B" }, { key: "triples", label: "3B" },
  { key: "homeRuns", label: "HR" }, { key: "rbis", label: "RBI" }, { key: "walks", label: "BB" },
  { key: "strikeouts", label: "SO" }, { key: "stolenBases", label: "SB" },
  { key: "putouts", label: "PO" }, { key: "errors", label: "E" },
  { key: "battingAverage", label: "AVG", rate: true }, { key: "onBasePct", label: "OBP", rate: true },
  { key: "sluggingPct", label: "SLG", rate: true }, { key: "ops", label: "OPS", rate: true },
];

const PITCHING: Column[] = [
  { key: "wins", label: "W" }, { key: "losses", label: "L" }, { key: "era", label: "ERA", rate: true },
  { key: "pitchingGames", label: "G" }, { key: "gamesStarted", label: "GS" }, { key: "saves", label: "SV" },
  { key: "inningsPitched", label: "IP", innings: true }, { key: "hitsAllowed", label: "H" },
  { key: "earnedRuns", label: "ER" }, { key: "walksAllowed", label: "BB" },
  { key: "strikeoutsPitched", label: "SO" }, { key: "whip", label: "WHIP", rate: true },
];

const BATTING_LOG: Column[] = [
  { key: "atBats", label: "AB" }, { key: "runs", label: "R" }, { key: "hits", label: "H" },
  { key: "doubles", label: "2B" }, { key: "triples", label: "3B" }, { key: "homeRuns", label: "HR" },
  { key: "rbis", label: "RBI" }, { key: "walks", label: "BB" }, { key: "strikeouts", label: "SO" },
];

const PITCHING_LOG: Column[] = [
  { key: "inningsPitched", label: "IP", innings: true }, { key: "hitsAllowed", label: "H" },
  { key: "runsAllowed", label: "R" }, { key: "earnedRuns", label: "ER" },
  { key: "walksAllowed", label: "BB" }, { key: "strikeoutsPitched", label: "SO" },
];

function show(value: unknown, column: Column) {
  if (value === null || value === undefined) return "–";
  if (column.innings) return formatInnings(Number(value));
  if (column.rate) {
    const number = Number(value);
    // ERA and WHIP read as 3.86, rates as .312.
    return column.key === "era" || column.key === "whip"
      ? number.toFixed(2)
      : number.toFixed(3).replace(/^0/, "");
  }
  return String(value);
}

/** Sums a column across seasons; rates are recomputed, never averaged. */
function careerTotals(rows: SeasonRow[], columns: Column[]) {
  const sum = (key: string) => rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
  const result: Record<string, number | null> = {};
  for (const column of columns) result[column.key] = sum(column.key);

  const atBats = sum("atBats");
  const walks = sum("walks");
  const totalBases = sum("totalBases");
  const innings = sum("inningsPitched");

  result.battingAverage = atBats ? sum("hits") / atBats : null;
  result.onBasePct = atBats + walks ? (sum("hits") + walks) / (atBats + walks) : null;
  result.sluggingPct = atBats ? totalBases / atBats : null;
  result.ops = (result.onBasePct ?? 0) + (result.sluggingPct ?? 0);
  result.era = innings ? (sum("earnedRuns") * 9) / innings : null;
  result.whip = innings ? (sum("walksAllowed") + sum("hitsAllowed")) / innings : null;
  const putouts = sum("putouts");
  const errors = sum("errors");
  result.fieldingPct = putouts + errors ? putouts / (putouts + errors) : null;
  return result;
}

export function PlayerProfile({
  seasons,
  games,
  playedPitching,
}: {
  seasons: SeasonRow[];
  games: GameRow[];
  playedPitching: boolean;
}) {
  const [tab, setTab] = useState<"batting" | "pitching">("batting");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [allGames, setAllGames] = useState(false);

  const columns = tab === "batting" ? BATTING : PITCHING;
  const logColumns = tab === "batting" ? BATTING_LOG : PITCHING_LOG;

  // One row per season. A season split across teams collapses to the team the
  // player ended it with, with the parts available underneath.
  const bySeason = new Map<number, SeasonRow[]>();
  for (const row of seasons) {
    bySeason.set(row.seasonId, [...(bySeason.get(row.seasonId) ?? []), row]);
  }
  const seasonRows = [...bySeason.entries()]
    .map(([seasonId, rows]) => {
      const ended = rows.find((row) => row.isSeasonEndTeam) ?? rows.at(-1)!;
      const merged = rows.length === 1 ? rows[0] : { ...careerTotals(rows, columns), ...{
        seasonId, seasonName: ended.seasonName, teamName: ended.teamName,
      } } as SeasonRow;
      return { seasonId, seasonName: ended.seasonName, teamName: ended.teamName, merged, parts: rows };
    })
    .sort((a, b) => b.seasonId - a.seasonId);

  const career = careerTotals(seasons, columns);

  const relevantGames = games.filter((game) =>
    tab === "batting" ? game.kind === "BATTING" : game.kind === "PITCHING",
  );
  const shownGames = allGames ? relevantGames : relevantGames.slice(0, 5);

  const toggle = (seasonId: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(seasonId)) next.delete(seasonId);
      else next.add(seasonId);
      return next;
    });

  return (
    <div className="space-y-8">
      <div className="flex gap-1 border-b border-slate-800">
        {(["batting", "pitching"] as const).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => { setTab(name); setAllGames(false); }}
            disabled={name === "pitching" && !playedPitching}
            className={`px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === name
                ? "border-b-2 border-sky-500 text-white"
                : "text-slate-500 hover:text-slate-300 disabled:hover:text-slate-500 disabled:opacity-40"
            }`}
          >
            {name === "batting" ? "Batting Stats" : "Pitching"}
          </button>
        ))}
      </div>

      <section>
        <h2 className="section-title mb-3">Season {tab} stats</h2>
        <div className="data-table-shell overflow-x-auto">
          <table className="data-table stat-table has-two-labels w-full">
            <thead>
              <tr>
                <th className="w-24">Season</th>
                <th className="w-48">Team</th>
                {columns.map((column) => (
                  <th key={column.key} className="w-14">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seasonRows.map((season) => (
                // The key belongs on the fragment: a season can render two rows
                // when its splits are open, and keying the inner row instead
                // leaves the pair unidentified.
                <Fragment key={season.seasonId}>
                  <tr>
                    <td>{season.seasonName.replace("MBL Season ", "")}</td>
                    <td>
                      <span className="flex min-w-0 items-center gap-2">
                        <TeamLogo teamName={season.teamName} className="h-5 w-5 shrink-0" />
                        <span className="truncate">{season.teamName}</span>
                        {season.parts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggle(season.seasonId)}
                            className="shrink-0 rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 transition-colors hover:border-sky-600 hover:text-sky-300"
                          >
                            {season.parts.length}tm {expanded.has(season.seasonId) ? "▴" : "▾"}
                          </button>
                        )}
                      </span>
                    </td>
                    {columns.map((column) => (
                      <td key={column.key}>{show(season.merged[column.key], column)}</td>
                    ))}
                  </tr>
                  {expanded.has(season.seasonId) &&
                    season.parts.map((part, index) => (
                      <tr key={`${season.seasonId}-${index}`} className="bg-slate-900/60 text-slate-400">
                        <td />
                        <td className="pl-8 text-xs">{part.teamName}</td>
                        {columns.map((column) => (
                          <td key={column.key} className="text-xs">{show(part[column.key], column)}</td>
                        ))}
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Career stands on its own rather than as a footer row: it is a
          different claim from a season line, and reading it needs its own
          column headings rather than borrowing the ones above. */}
      <section>
        <h2 className="section-title mb-3">Career {tab} stats</h2>
        <div className="data-table-shell overflow-x-auto">
          <table className="data-table stat-table ranked w-full">
            <thead>
              <tr>
                <th className="w-72">Seasons</th>
                {columns.map((column) => (
                  <th key={column.key} className="w-14">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{seasonRows.length} season{seasonRows.length === 1 ? "" : "s"}</td>
                {columns.map((column) => (
                  <td key={column.key}>{show(career[column.key], column)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="section-title mb-3">Game log</h2>
        {relevantGames.length === 0 ? (
          <p className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5 text-center text-sm text-slate-500">
            No {tab} games recorded.
          </p>
        ) : (
          <>
            <div className="data-table-shell overflow-x-auto">
              <table className="data-table stat-table has-two-labels w-full">
                <thead>
                  <tr>
                    <th className="w-28">Date</th>
                    <th className="w-44">Opponent</th>
                    <th className="w-20">Result</th>
                    {logColumns.map((column) => (
                      <th key={column.key} className="w-14">{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shownGames.map((game) => (
                    <tr key={`${game.gameId}-${game.kind}`}>
                      <td className="text-slate-400">
                        {(game.playedOn ?? "").replace(/^\w+,?\s*/, "").replace(/,\s*\d{4}$/, "")}
                      </td>
                      <td>
                        <span className="flex min-w-0 items-center gap-2">
                          {game.opponent && <TeamLogo teamName={game.opponent} className="h-4 w-4 shrink-0" />}
                          <span className="truncate">{game.opponent ?? "—"}</span>
                        </span>
                      </td>
                      <td
                        className={
                          game.won === null ? "text-slate-500" : game.won ? "text-emerald-400" : "text-rose-400"
                        }
                      >
                        {game.won === null ? "–" : `${game.won ? "W" : "L"} ${game.scoreLine}`}
                      </td>
                      {logColumns.map((column) => (
                        <td key={column.key}>{show(game[column.key], column)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {relevantGames.length > 5 && (
              <button
                type="button"
                onClick={() => setAllGames(!allGames)}
                className="mx-auto mt-3 block rounded-md border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
              >
                {allGames ? "Show fewer" : `Show all ${relevantGames.length} games`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
