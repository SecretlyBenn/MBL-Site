"use client";

import { useState } from "react";
import { TeamLogo } from "../TeamLogo";
import { HistoricalTeamLink } from "../EntityLinks";

export type StandingsRow = {
  id: number; name: string; abbreviation: string | null; league: string | null;
  wins: number | null; losses: number | null; runsScored: number | null; runsAllowed: number | null;
};

function sorted(teams: StandingsRow[]) {
  return [...teams].sort((a, b) => {
    const ag = (a.wins ?? 0) + (a.losses ?? 0), bg = (b.wins ?? 0) + (b.losses ?? 0);
    const ap = ag ? (a.wins ?? 0) / ag : 0, bp = bg ? (b.wins ?? 0) / bg : 0;
    return bp - ap || (b.wins ?? 0) - (a.wins ?? 0) || (a.losses ?? 0) - (b.losses ?? 0);
  });
}

/**
 * `compact` drops the columns that are redundant at a glance (abbreviation,
 * raw runs for/against) and shrinks the logo, so both leagues still fit when
 * the table shares a row with other content.
 */
function Table({ teams, seasonId, compact = false, label = "Team" }: { teams: StandingsRow[]; seasonId: number; compact?: boolean; label?: string }) {
  return <div className="data-table-shell flex-1"><table className="data-table ranked h-full w-full table-fixed"><colgroup>
    <col style={{ width: "2.75rem" }} /><col style={{ width: compact ? "50%" : "38%" }} />
    {!compact && <col style={{ width: "12%" }} />}
    {Array.from({ length: compact ? 3 : 5 }, (_, index) => <col key={index} />)}
  </colgroup><thead><tr>
    <th>RNK</th><th>{label}</th>
    {!compact && <th>Abbr.</th>}
    {/* Record reads as one figure, the way a standings page is scanned. */}
    <th title="Wins and losses">W-L</th><th>PCT</th>
    {!compact && <><th>RS</th><th>RA</th></>}
    <th title="Run differential">Run diff</th>
  </tr></thead><tbody>{sorted(teams).map((team, index) => {
    const wins = team.wins ?? 0, losses = team.losses ?? 0, games = wins + losses;
    const diff = team.runsScored === null || team.runsAllowed === null ? null : team.runsScored - team.runsAllowed;
    return <tr key={team.id}><td>{index + 1}</td>
      <td><span className="flex min-w-0 items-center gap-2"><TeamLogo teamName={team.name} className={compact ? "h-6 w-6" : "h-8 w-8"} /><HistoricalTeamLink name={team.name} seasonId={seasonId} teamId={team.id} className="truncate" /></span></td>
      {!compact && <td className="text-slate-400">{team.abbreviation ?? "—"}</td>}
      <td className="whitespace-nowrap">
        {team.wins === null && team.losses === null ? "-" : `${wins}-${losses}`}
      </td>
      <td>{games ? (wins / games).toFixed(3).replace(/^0/, "") : "-"}</td>
      {!compact && <><td>{team.runsScored ?? "-"}</td><td>{team.runsAllowed ?? "-"}</td></>}
      <td className={diff !== null && diff > 0 ? "text-emerald-400" : diff !== null && diff < 0 ? "text-rose-400" : ""}>{diff === null ? "-" : `${diff > 0 ? "+" : ""}${diff}`}</td>
    </tr>;
  })}</tbody></table></div>;
}

export function StandingsTable({ teams, seasonId, controls = true, compact = false, constrain = true }: { teams: StandingsRow[]; seasonId: number; controls?: boolean; compact?: boolean;
  /**
   * Standings alone on a page read better held to a middle column. Sharing a
   * page with the season's stat tables they should not: two tables at two
   * widths, one above the other, look misaligned rather than deliberate.
   */
  constrain?: boolean }) {
  const [mode, setMode] = useState<"division" | "league">("division");
  const american = teams.filter((team) => team.league === "AMERICAN");
  const national = teams.filter((team) => team.league === "NATIONAL");
  const divided = american.length + national.length > 0;
  // Compact mode sits beside the leaders grid, so the two league cards stretch
  // to fill the row: both columns then start and end on the same line. On the
  // standings page the leagues stack down the centre of the page instead, at
  // one shared width so league view and division view are the same object.
  const splitAt = compact ? "h-full grid-rows-2" : "";
  const width = compact ? "" : constrain ? "mx-auto w-full max-w-4xl" : "w-full";
  return <div className={compact ? "flex min-h-0 flex-1 flex-col" : undefined}>
    {controls && <div className={`mb-5 flex justify-end ${width}`}><label className="ui-field-label">View<select value={mode} onChange={(event) => setMode(event.target.value as "division" | "league")} className="ui-select"><option value="division">Division standings</option><option value="league">League standings</option></select></label></div>}
    {mode === "league" || !divided ? <div className={width}><Table teams={teams} seasonId={seasonId} compact={compact} /></div> : <div className={`grid ${compact ? "gap-4" : "gap-6"} ${splitAt} ${width}`}>
      {/* The league name rides in the table header rather than a heading above
          it, so a standings card and a leaders card are the same object. */}
      <Table teams={american} seasonId={seasonId} compact={compact} label="American League" />
      <Table teams={national} seasonId={seasonId} compact={compact} label="National League" />
    </div>}
  </div>;
}
