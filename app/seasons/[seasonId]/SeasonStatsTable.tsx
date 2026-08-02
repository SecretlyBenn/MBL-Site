"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

const PAGE_SIZE = 25;

function avg(value: number | null) {
  return value === null ? "-" : value.toFixed(3).replace(/^0/, "");
}

export function SeasonStatsTable({ rows, kind }: { rows: SeasonStatRow[]; kind: "batting" | "pitching" }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? rows.filter((row) => row.playerName.toLowerCase().includes(needle)) : rows;
  }, [query, rows]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

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
          className="w-full max-w-xs rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/40"
        />
        <span className="text-xs text-white/40">{filtered.length} players · Page {current} of {pages}</span>
      </div>
      <div className="overflow-x-auto rounded border border-white/10">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead className="bg-neutral-900">
            <tr className="border-b border-white/15 text-left text-xs uppercase tracking-wide text-white/50">
              <th className="py-2 pl-3 pr-3">Player</th><th className="py-2 pr-3">Team</th>
              {kind === "batting" ? <><th className="py-2 pr-3 text-right">G</th><th className="py-2 pr-3 text-right">AB</th><th className="py-2 pr-3 text-right">H</th><th className="py-2 pr-3 text-right">HR</th><th className="py-2 pr-3 text-right">RBI</th><th className="py-2 pr-3 text-right">AVG</th><th className="py-2 pr-3 text-right">OPS</th></> : <><th className="py-2 pr-3 text-right">IP</th><th className="py-2 pr-3 text-right">SO</th><th className="py-2 pr-3 text-right">ERA</th><th className="py-2 pr-3 text-right">WHIP</th></>}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={`${row.playerName}-${row.teamName}-${index}`} className="border-b border-white/5">
                <td className="py-2 pl-3 pr-3"><Link className="hover:underline" href={`/players/history/${encodeURIComponent(row.playerName)}`}>{row.playerName}</Link></td>
                <td className="py-2 pr-3 text-white/50">{row.teamName}</td>
                {kind === "batting" ? <><td className="py-2 pr-3 text-right">{row.games ?? "-"}</td><td className="py-2 pr-3 text-right">{row.atBats ?? "-"}</td><td className="py-2 pr-3 text-right">{row.hits ?? "-"}</td><td className="py-2 pr-3 text-right">{row.homeRuns ?? "-"}</td><td className="py-2 pr-3 text-right">{row.rbis ?? "-"}</td><td className="py-2 pr-3 text-right">{avg(row.battingAverage)}</td><td className="py-2 pr-3 text-right">{avg(row.ops)}</td></> : <><td className="py-2 pr-3 text-right">{row.inningsPitched ?? "-"}</td><td className="py-2 pr-3 text-right">{row.strikeoutsPitched ?? "-"}</td><td className="py-2 pr-3 text-right">{row.era === null ? "-" : row.era.toFixed(2)}</td><td className="py-2 pr-3 text-right">{row.whip === null ? "-" : row.whip.toFixed(2)}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="mt-3 flex items-center justify-end gap-2"><button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="rounded border border-white/15 px-3 py-1.5 text-sm disabled:opacity-30">Previous</button><button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="rounded border border-white/15 px-3 py-1.5 text-sm disabled:opacity-30">Next</button></div>}
    </div>
  );
}
