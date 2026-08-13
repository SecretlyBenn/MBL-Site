"use client";

import { useMemo, useState } from "react";
import { formatInnings } from "@/app/formatStats";
import { HistoricalTeamLink, PlayerProfileLink } from "@/app/EntityLinks";

export type SeasonStatRow = {
  playerName: string;
  teamName: string;
  games: number | null;
  atBats: number | null;
  hits: number | null;
  homeRuns: number | null;
  rbis: number | null;
  battingAverage: number | null;
  ops: number | null;
  inningsPitched: number | null;
  strikeoutsPitched: number | null;
  era: number | null;
  whip: number | null;
};

const PAGE_SIZE = 15;
type SortKey = keyof SeasonStatRow;
type SortDirection = "asc" | "desc";

function avg(value: number | null) {
  return value === null ? "-" : value.toFixed(3).replace(/^0/, "");
}

export function SeasonStatsTable({ rows, kind, seasonId, teamIds }: { rows: SeasonStatRow[]; kind: "batting" | "pitching"; seasonId: number; teamIds: Record<string, number> }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sorted = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = needle
      ? rows.filter((row) => row.playerName.toLowerCase().includes(needle))
      : [...rows];
    if (!sortKey) return result;
    return result.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (left === null) return 1;
      if (right === null) return -1;
      const comparison = typeof left === "string"
        ? left.localeCompare(String(right), undefined, { sensitivity: "base" })
        : left - Number(right);
      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [query, rows, sortDirection, sortKey]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function sortBy(key: SortKey) {
    setSortDirection(sortKey === key && sortDirection === "desc" ? "asc" : "desc");
    setSortKey(key);
    setPage(1);
  }

  function SortHeader({ column, children, align = "right", padded = false }: { column: SortKey; children: React.ReactNode; align?: "left" | "right"; padded?: boolean }) {
    const active = sortKey === column;
    return (
      <th className={`${padded ? "" : ""} ${align === "right" ? "" : ""}`}>
        <button type="button" onClick={() => sortBy(column)} className="inline-flex items-center gap-1 hover:text-white">
          {children}
          <span aria-hidden="true" className={active ? "text-white" : "text-slate-600"}>
            {active ? (sortDirection === "desc" ? "↓" : "↑") : "↕"}
          </span>
        </button>
      </th>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label className="sr-only" htmlFor={`${kind}-search`}>Search player usernames</label>
        <input
          id={`${kind}-search`}
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          placeholder="Search player username…"
          className="ui-select w-full max-w-xs"
        />
        <span className="text-xs text-slate-500">{sorted.length} players · Page {current} of {pages}</span>
      </div>
      <div className="data-table-shell">
        <table className="data-table w-full table-fixed">
          <colgroup>
            <col style={{ width: "26%" }} /><col style={{ width: "24%" }} />
            {Array.from({ length: kind === "batting" ? 7 : 4 }, (_, index) => <col key={index} />)}
          </colgroup>
          <thead className="bg-slate-900">
            <tr className="border-b border-slate-700/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <SortHeader column="playerName" align="left" padded>Player</SortHeader>
              <SortHeader column="teamName" align="left">Team</SortHeader>
              {kind === "batting" ? <>
                <SortHeader column="games">G</SortHeader><SortHeader column="atBats">AB</SortHeader>
                <SortHeader column="hits">H</SortHeader><SortHeader column="homeRuns">HR</SortHeader>
                <SortHeader column="rbis">RBI</SortHeader><SortHeader column="battingAverage">AVG</SortHeader>
                <SortHeader column="ops">OPS</SortHeader>
              </> : <>
                <SortHeader column="inningsPitched">IP</SortHeader><SortHeader column="strikeoutsPitched">SO</SortHeader>
                <SortHeader column="era">ERA</SortHeader><SortHeader column="whip">WHIP</SortHeader>
              </>}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={`${row.playerName}-${row.teamName}-${index}`} className="border-b border-slate-800/60">
                <td><PlayerProfileLink name={row.playerName} /></td>
                <td>{teamIds[row.teamName] ? <HistoricalTeamLink name={row.teamName} seasonId={seasonId} teamId={teamIds[row.teamName]} /> : row.teamName}</td>
                {kind === "batting" ? <>
                  <td>{row.games ?? "-"}</td><td>{row.atBats ?? "-"}</td>
                  <td>{row.hits ?? "-"}</td><td>{row.homeRuns ?? "-"}</td>
                  <td>{row.rbis ?? "-"}</td><td>{avg(row.battingAverage)}</td>
                  <td>{avg(row.ops)}</td>
                </> : <>
                  <td>{formatInnings(row.inningsPitched)}</td><td>{row.strikeoutsPitched ?? "-"}</td>
                  <td>{row.era === null ? "-" : row.era.toFixed(2)}</td><td>{row.whip === null ? "-" : row.whip.toFixed(2)}</td>
                </>}
              </tr>
            ))}
            {/* A short last page would otherwise collapse the table and jump
                the pager up the screen, so empty rows hold the height. */}
            {Array.from({ length: PAGE_SIZE - visible.length }, (_, index) => (
              <tr key={`filler-${index}`} aria-hidden="true">
                <td colSpan={kind === "batting" ? 9 : 6}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="mt-3 flex items-center justify-end gap-2">
        <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="rounded border border-slate-700/60 px-3 py-1.5 text-sm disabled:opacity-30">Previous</button>
        <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="rounded border border-slate-700/60 px-3 py-1.5 text-sm disabled:opacity-30">Next</button>
      </div>}
    </div>
  );
}
