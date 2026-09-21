"use client";

import { useState } from "react";
import type { getHistoricalTeamRoster } from "@/db/queries";
import { PlayerHead } from "@/app/PlayerHead";
import { PlayerProfileLink } from "@/app/EntityLinks";
import { formatInnings } from "@/app/formatStats";
import styles from "./rosters.module.css";

type Row = Awaited<ReturnType<typeof getHistoricalTeamRoster>>[number];
type Column = { key: keyof Row; label: string; format?: "rate" | "decimal" | "innings" };
const batting: Column[] = [
  { key: "games", label: "G" }, { key: "atBats", label: "AB" },
  { key: "runs", label: "R" }, { key: "hits", label: "H" },
  { key: "doubles", label: "2B" }, { key: "triples", label: "3B" },
  { key: "homeRuns", label: "HR" }, { key: "rbis", label: "RBI" },
  { key: "walks", label: "BB" }, { key: "strikeouts", label: "SO" },
  { key: "stolenBases", label: "SB" }, { key: "leftOnBase", label: "LOB" },
  { key: "putouts", label: "PO" }, { key: "errors", label: "E" },
  { key: "battingAverage", label: "AVG", format: "rate" },
  { key: "onBasePct", label: "OBP", format: "rate" },
  { key: "sluggingPct", label: "SLG", format: "rate" },
  { key: "ops", label: "OPS", format: "rate" },
];
const pitching: Column[] = [
  { key: "pitchingGames", label: "G" }, { key: "gamesStarted", label: "GS" },
  { key: "wins", label: "W" }, { key: "losses", label: "L" },
  { key: "saves", label: "SV" }, { key: "completeGames", label: "CG" },
  { key: "shutouts", label: "SHO" }, { key: "inningsPitched", label: "IP", format: "innings" },
  { key: "hitsAllowed", label: "H" }, { key: "runsAllowed", label: "R" },
  { key: "earnedRuns", label: "ER" }, { key: "homeRunsAllowed", label: "HR" },
  { key: "walksAllowed", label: "BB" }, { key: "strikeoutsPitched", label: "SO" },
  { key: "era", label: "ERA", format: "decimal" },
  { key: "whip", label: "WHIP", format: "decimal" },
];

function value(row: Row, key: keyof Row) {
  // An unused roster slot has zero appearances; missing recorded stats remain unknown.
  return row[key] ?? (row.played ? null : 0);
}

function display(raw: ReturnType<typeof value>, column: Column) {
  if (raw === null) return "—";
  if (column.format === "innings") return formatInnings(Number(raw));
  if (column.format === "rate") return Number(raw).toFixed(3).replace(/^0/, "");
  if (column.format === "decimal") return Number(raw).toFixed(2);
  return String(raw);
}

export function RosterStatsTable({ rows, kind, avatars }: {
  rows: Row[]; kind: "batting" | "pitching"; avatars: Record<string, string>;
}) {
  const [sort, setSort] = useState<{ key: keyof Row; descending: boolean }>({ key: "playerName", descending: false });
  const columns: Column[] = [{ key: "playerName", label: "Player" }, ...(kind === "batting" ? batting : pitching)];
  const sorted = [...rows].sort((a, b) => {
    const left = value(a, sort.key), right = value(b, sort.key);
    if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
    const difference = typeof left === "string"
      ? left.localeCompare(String(right), undefined, { sensitivity: "base" })
      : Number(left) - Number(right);
    return (sort.descending ? -difference : difference) || a.playerName.localeCompare(b.playerName);
  });
  return <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`${kind} statistics; scroll for more columns`}>
    <table className="data-table">
      <thead><tr>{columns.map((column) => <th key={column.key} scope="col"
        aria-sort={sort.key === column.key ? sort.descending ? "descending" : "ascending" : "none"}>
        <button type="button" onClick={() => setSort({ key: column.key, descending: sort.key === column.key ? !sort.descending : column.key !== "playerName" })}
          title={`Sort by ${column.label}`}>
          {column.label}<span aria-hidden="true">{sort.key === column.key ? sort.descending ? " ↓" : " ↑" : " ↕"}</span>
        </button>
      </th>)}</tr></thead>
      <tbody>{sorted.map((row) => <tr key={row.playerName} className={row.played ? undefined : styles.unplayed}>
        <td><span className={styles.player}><PlayerHead uuid={avatars[row.playerName]} name={row.playerName} size={18} /><PlayerProfileLink name={row.playerName} /></span></td>
        {columns.slice(1).map((column) => <td key={column.key}>{display(value(row, column.key), column)}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}
