"use client";

import { useMemo, useState } from "react";
import { TeamLogo } from "../TeamLogo";
import { formatInnings } from "../formatStats";
import { HistoricalTeamLink, PlayerProfileLink } from "../EntityLinks";
import { PlayerHead } from "../PlayerHead";

export type StatRow = Record<string, string | number | null | undefined> & { playerName: string; teamName: string };
type Column = {
  key: string; label: string; rate?: boolean; average?: boolean; innings?: boolean;
  /** Computed rather than stored - see PA below. */
  derive?: (row: StatRow) => number | null;
  /** Columns that make no sense as a team total. */
  playerOnly?: boolean;
};

const num = (value: StatRow[string]) => (value === null || value === undefined ? 0 : Number(value));

/** Rows per page - sized so a full page fills the viewport on a laptop screen. */
export const PAGE_SIZE = 14;

/**
 * Column widths, in rem, shared by every stat table on the site.
 *
 * They are stated rather than measured so a table is the same size on every
 * page of it: left to the browser, a page whose players happen to have shorter
 * names draws narrower columns than the page before, and the whole table jumps
 * when the pager is clicked.
 *
 * A rate column holds ".312" or "3.86" and a count column at most four digits,
 * so rates get slightly more room.
 *
 * The label columns are not fixed here. They are measured from the longest
 * name actually present, so the club sits beside the name it belongs to rather
 * than across a gap left by a guess. These constants only set the width below
 * which the table starts scrolling instead of crushing its columns.
 */
const NAME_COLUMN = 13;
const NAME_COLUMN_WITH_TEAM = 8.5;
const TEAM_COLUMN = 9;
const RATE_COLUMN = 3.2;
const COUNT_COLUMN = 2.6;

const BATTING: Column[] = [
  { key: "games", label: "G" },
  // Now the source's own TPA, not AB + BB - that derivation missed sacrifices.
  { key: "plateAppearances", label: "PA" },
  { key: "atBats", label: "AB" }, { key: "runs", label: "R" },
  { key: "hits", label: "H" },
  { key: "singles", label: "1B" }, { key: "doubles", label: "2B" }, { key: "triples", label: "3B" },
  { key: "homeRuns", label: "HR" }, { key: "rbis", label: "RBI" }, { key: "walks", label: "BB" },
  { key: "strikeouts", label: "SO" },
  { key: "stolenBases", label: "SB" }, { key: "caughtStealing", label: "CS" },
  { key: "sacFlies", label: "SF" }, { key: "leftOnBase", label: "LOB" },
  { key: "totalBases", label: "TB" },
  { key: "battingAverage", label: "AVG", rate: true }, { key: "onBasePct", label: "OBP", rate: true },
  { key: "sluggingPct", label: "SLG", rate: true }, { key: "ops", label: "OPS", rate: true },
  // Fielding rides along with the batting line in the source.
  { key: "putouts", label: "PO" }, { key: "errors", label: "E" },
  { key: "fieldingPct", label: "FPCT", rate: true },
];
const PITCHING: Column[] = [
  // A team's pitching "G" would just count how many pitchers appeared across
  // the season, which measures bullpen usage, not games played.
  { key: "pitchingGames", label: "G", playerOnly: true },
  { key: "gamesStarted", label: "GS" }, { key: "wins", label: "W" },
  { key: "losses", label: "L" }, { key: "saves", label: "SV" }, { key: "inningsPitched", label: "IP", innings: true },
  { key: "hitsAllowed", label: "H" }, { key: "runsAllowed", label: "R" }, { key: "earnedRuns", label: "ER" },
  { key: "homeRunsAllowed", label: "HR" }, { key: "strikeoutsPitched", label: "SO" },
  { key: "walksAllowed", label: "BB" },
  { key: "completeGames", label: "CG" }, { key: "shutouts", label: "SHO" },
  { key: "blownSaves", label: "BS" },
  { key: "era", label: "ERA", rate: true }, { key: "whip", label: "WHIP", rate: true },
  { key: "walksPerGame", label: "BB/X", rate: true },
  { key: "strikeoutsPerGame", label: "SO/X", rate: true },
];

/** A column's value for a row, computing it when the column is derived. */
function valueOf(row: StatRow, column: Column) {
  return column.derive ? column.derive(row) : row[column.key];
}

function display(value: StatRow[string], column: Column, leagueAverage = false) {
  if (value === null || value === undefined) return "-";
  if (column.rate) return Number(value).toFixed(3).replace(/^0/, "");
  // Innings are stored as true thirds but read back in baseball notation, so
  // 14 2/3 shows as 14.2 rather than 14.7.
  if (column.innings) return formatInnings(Number(value));
  if (leagueAverage || column.average) return Number(value).toFixed(1);
  return value;
}

function leagueAverage(rows: StatRow[], kind: "batting" | "pitching") {
  const n = rows.length || 1;
  const sum = (key: string) => rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
  const result: StatRow = { playerName: "League Average", teamName: "League Average" };
  for (const column of (kind === "batting" ? BATTING : PITCHING)) result[column.key] = rows.reduce((total, row) => total + num(valueOf(row, column)), 0) / n;
  if (kind === "batting") {
    const ab = sum("atBats"), h = sum("hits"), bb = sum("walks"), tb = sum("totalBases");
    result.battingAverage = ab ? h / ab : null;
    result.onBasePct = ab + bb ? (h + bb) / (ab + bb) : null;
    result.sluggingPct = ab ? tb / ab : null;
    result.ops = Number(result.onBasePct ?? 0) + Number(result.sluggingPct ?? 0);
  } else {
    const ip = sum("inningsPitched");
    result.era = ip ? sum("earnedRuns") * 9 / ip : null;
    result.whip = ip ? (sum("walksAllowed") + sum("hitsAllowed")) / ip : null;
  }
  return result;
}

export function StatsTable({ rows, kind, team = false, seasonId, teamIds = {}, toolbar, avatars = {} }: { rows: StatRow[]; kind: "batting" | "pitching"; team?: boolean; seasonId?: number; teamIds?: Record<string, number>; toolbar?: React.ReactNode; avatars?: Record<string, string> }) {
  const columns = (kind === "batting" ? BATTING : PITCHING).filter((column) => !(team && column.playerOnly));
  const [query, setQuery] = useState("");
  // Alphabetical by name is the default: an unsorted dump has no order the
  // reader can predict, and every figure column is one click away.
  const nameKey = team ? "teamName" : "playerName";
  const [sortKey, setSortKey] = useState<string>(nameKey);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [minimum, setMinimum] = useState("0");
  const [page, setPage] = useState(0);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let filtered = needle && !team ? rows.filter((row) => row.playerName.toLowerCase().includes(needle)) : [...rows];
    // The qualifying filter: a 1-for-2 cameo otherwise tops every rate stat.
    const floor = Number(minimum);
    if (!team && floor > 0) {
      filtered = filtered.filter((row) =>
        kind === "batting"
          ? num(row.atBats) + num(row.walks) >= floor
          : num(row.inningsPitched) >= floor,
      );
    }
    const sorted = columns.find((column) => column.key === sortKey);
    return filtered.sort((a, b) => {
      const left = sorted ? valueOf(a, sorted) : a[sortKey];
      const right = sorted ? valueOf(b, sorted) : b[sortKey];
      if (left == null) return 1;
      if (right == null) return -1;
      const compared = typeof left === "string"
        ? left.localeCompare(String(right), undefined, { sensitivity: "base" })
        : Number(left) - Number(right);
      return direction === "desc" ? -compared : compared;
    });
  }, [columns, direction, kind, minimum, query, rows, sortKey, team]);
  const averageRow = team ? leagueAverage(rows, kind) : null;
  const sort = (key: string) => {
    setDirection(sortKey === key && direction === "desc" ? "asc" : "desc");
    setSortKey(key);
    setPage(0);
  };
  const arrow = (key: string) => sortKey === key ? (direction === "desc" ? "↓" : "↑") : "↕";

  // Clamp rather than reset in an effect: filtering can shrink the list below
  // the current page while the user is on it.
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paged = visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  // A short last page would otherwise shrink the table and jump the pager up
  // the screen, so empty rows hold the height steady.
  const filler = team ? 0 : PAGE_SIZE - paged.length;

  // The label column is sized to the longest name in the whole filtered set,
  // not the page on screen. Sizing it to the page would draw a narrow column
  // for a page of short names and a wide one for the next, which is the jump
  // this table used to have; sizing it to a fixed guess either clips the long
  // names or strands the short ones across a gap. Measured over everything, it
  // is both as tight as it can be and the same on every page.
  const widest = (pick: (row: (typeof visible)[number]) => string) =>
    visible.reduce((longest, row) => Math.max(longest, pick(row).length), 0);
  // Characters, plus room for the head or crest, the gap after it, and the
  // cell's own padding.
  const toWidth = (chars: number) => `calc(${chars}ch + 3.25rem)`;
  const labelColumn = toWidth(widest((row) => (team ? row.teamName : row.playerName)));
  // The team column is measured the same way rather than being left to absorb
  // whatever remained: that squeezed it to 95px, which cuts off a name like
  // "Golden State Dolphins (+1)".
  const teamColumn = toWidth(widest((row) => row.teamName));

  // Every column is stated, so under `table-fixed` the browser never measures
  // a cell - which is what keeps a page of short names the same shape as a
  // page of long ones. These nominal label widths only feed the minimum below;
  // the real ones are measured from the data above.
  const labelWidth = team ? NAME_COLUMN : NAME_COLUMN_WITH_TEAM + TEAM_COLUMN;
  const figureWidth = columns.reduce(
    (total, column) => total + (column.rate ? RATE_COLUMN : COUNT_COLUMN),
    0,
  );
  // Below this the columns would be squeezed past legibility, so the table
  // scrolls sideways inside its shell instead.
  const minimumWidth = labelWidth + figureWidth;

  return <div className="w-full">
    {/* Season picker and search share one row: the controls that scope the
        table sit on the same line as each other rather than stacking. */}
    {(toolbar || !team) && <div className="mb-3 flex flex-wrap items-center gap-3">
      {toolbar}
      {!team && <label className="ui-field-label ml-auto">{kind === "batting" ? "Min PA" : "Min IP"}<select value={minimum} onChange={(e) => { setMinimum(e.target.value); setPage(0); }} className="ui-select">{(kind === "batting" ? [0, 10, 25, 50, 100] : [0, 5, 10, 25, 50]).map((value) => <option key={value} value={value}>{value === 0 ? "All" : value + "+"}</option>)}</select></label>}
      {!team && <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Search player username…" className="ui-select w-full sm:w-56" />}
    </div>}
    <div className="data-table-shell max-w-full overflow-x-auto">
      {/* Team tables have a single label column, so they must not pick up the
          two-label alignment - it would left-align their first figure. */}
      <table
        className={`data-table stat-table ${team ? "" : "has-two-labels"} w-full table-fixed`}
        style={{ minWidth: `${minimumWidth}rem` }}
      >
        {/* Figures get only the width their digits need. The label columns are
            left unstated so they absorb whatever remains, which is what makes
            the table meet its container's edge exactly. */}
        <colgroup>
          {/* On a player table the player column is stated and the team column
              takes the slack, so the club sits beside the name rather than
              across a gap. A team table has only the one label column, so that
              is the one left to absorb it. */}
          <col style={{ width: labelColumn }} />
          {!team && <col style={{ width: teamColumn }} />}
          {columns.map((column) => (
            <col key={column.key} style={{ width: `${column.rate ? RATE_COLUMN : COUNT_COLUMN}rem` }} />
          ))}
        </colgroup>
        <thead><tr>
          <th><button onClick={() => sort(team ? "teamName" : "playerName")} className="hover:text-white">{team ? "Team" : "Player"} {arrow(team ? "teamName" : "playerName")}</button></th>
          {!team && <th><button onClick={() => sort("teamName")} className="hover:text-white">Team {arrow("teamName")}</button></th>}
          {columns.map((column) => <th key={column.key}><button onClick={() => sort(column.key)} className="hover:text-white">{column.label} {arrow(column.key)}</button></th>)}
        </tr></thead>
        <tbody>{paged.map((row, index) => <tr key={`${row.playerName}-${row.teamName}-${index}`} className="border-b border-slate-800/60">
          <td><span className="flex min-w-0 items-center gap-2">{team && <TeamLogo teamName={row.teamName} className="h-7 w-7 shrink-0" />}{team ? (seasonId && teamIds[row.teamName] ? <HistoricalTeamLink name={row.teamName} seasonId={seasonId} teamId={teamIds[row.teamName]} className="truncate" /> : row.teamName) : <><PlayerHead uuid={avatars[row.playerName]} name={row.playerName} size={18} /><PlayerProfileLink name={row.playerName} className="truncate" /></>}</span></td>
          {/* The team cell carries the crest of the team the player ended the
              span with - for a career row that is their most recent club. */}
          {!team && <td>{(() => { const rosterName = row.teamName.replace(/ \(\+\d+\)$/, ""); const id = teamIds[rosterName]; return <span className="flex min-w-0 items-center gap-2"><TeamLogo teamName={rosterName} className="h-5 w-5 shrink-0" />{seasonId && id ? <HistoricalTeamLink name={row.teamName} seasonId={seasonId} teamId={id} className="truncate" /> : <span className="truncate">{row.teamName}</span>}</span>; })()}</td>}
          {columns.map((column) => <td key={column.key}>{display(valueOf(row, column), column)}</td>)}
        </tr>)}
        {/* Blank rows keep the table the same height on a short last page, so
            paging never resizes the card or moves the pager. */}
        {Array.from({ length: filler }, (_, index) => <tr key={`filler-${index}`} aria-hidden><td colSpan={columns.length + 2}>&nbsp;</td></tr>)}
        </tbody>
        {averageRow && <tfoot><tr className="border-t-2 border-slate-600/70 bg-slate-800/40 font-semibold">
          <td>League Average</td>
          {columns.map((column) => <td key={column.key}>{display(averageRow[column.key], column, true)}</td>)}
        </tr></tfoot>}
      </table>
    </div>
    <Pager
      page={currentPage}
      pageCount={pageCount}
      total={visible.length}
      noun={team ? "teams" : "players"}
      onChange={setPage}
    />
  </div>;
}

export function Pager({
  page, pageCount, total, noun, onChange,
}: {
  page: number; pageCount: number; total: number; noun: string; onChange: (page: number) => void;
}) {
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);
  const button = "ui-button";

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-500">
        {total === 0 ? `No ${noun}` : `${from}–${to} of ${total} ${noun}`}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={button} onClick={() => onChange(0)} disabled={page === 0}>« First</button>
        <button type="button" className={button} onClick={() => onChange(page - 1)} disabled={page === 0}>‹ Prev</button>
        <span className="px-1 text-xs text-slate-400">Page {page + 1} of {pageCount}</span>
        <button type="button" className={button} onClick={() => onChange(page + 1)} disabled={page >= pageCount - 1}>Next ›</button>
        <button type="button" className={button} onClick={() => onChange(pageCount - 1)} disabled={page >= pageCount - 1}>Last »</button>
      </div>
    </div>
  );
}
