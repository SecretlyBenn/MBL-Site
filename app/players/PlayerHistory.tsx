import type { getPlayerHistoricalStats } from "@/db/queries";
import { HistoricalTeamLink } from "@/app/EntityLinks";
import { formatInnings } from "@/app/formatStats";
import { earnedRunAverage } from "@/app/scoring";

type HistoryRow = Awaited<ReturnType<typeof getPlayerHistoricalStats>>[number];
type Column = { key: keyof HistoryRow; label: string; format?: "rate" | "innings" };

const BATTING: Column[] = [
  { key: "games", label: "G" }, { key: "atBats", label: "AB" }, { key: "runs", label: "R" },
  { key: "hits", label: "H" }, { key: "doubles", label: "2B" }, { key: "triples", label: "3B" },
  { key: "homeRuns", label: "HR" }, { key: "rbis", label: "RBI" }, { key: "walks", label: "BB" },
  { key: "strikeouts", label: "SO" }, { key: "stolenBases", label: "SB" },
  { key: "battingAverage", label: "AVG", format: "rate" }, { key: "onBasePct", label: "OBP", format: "rate" },
  { key: "sluggingPct", label: "SLG", format: "rate" }, { key: "ops", label: "OPS", format: "rate" },
  { key: "totalBases", label: "TB" },
];

const PITCHING: Column[] = [
  { key: "pitchingGames", label: "G" }, { key: "gamesStarted", label: "GS" },
  { key: "wins", label: "W" }, { key: "losses", label: "L" }, { key: "saves", label: "SV" },
  { key: "inningsPitched", label: "IP", format: "innings" }, { key: "hitsAllowed", label: "H" },
  { key: "runsAllowed", label: "R" }, { key: "earnedRuns", label: "ER" },
  { key: "homeRunsAllowed", label: "HR" }, { key: "strikeoutsPitched", label: "SO" },
  { key: "walksAllowed", label: "BB" }, { key: "era", label: "ERA", format: "rate" },
  { key: "whip", label: "WHIP", format: "rate" },
];

const TOTALS = [
  "games", "atBats", "runs", "hits", "doubles", "triples", "homeRuns", "rbis", "walks",
  "strikeouts", "stolenBases", "totalBases", "pitchingGames", "gamesStarted", "wins", "losses",
  "saves", "inningsPitched", "hitsAllowed", "runsAllowed", "earnedRuns", "homeRunsAllowed",
  "strikeoutsPitched", "walksAllowed",
] as const;

function format(value: unknown, kind?: Column["format"]) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (kind === "rate") return number.toFixed(3).replace(/^0/, "");
  if (kind === "innings") return formatInnings(number);
  return String(value);
}

function totalRows(rows: HistoryRow[]) {
  const total = { ...rows[0], teamName: "Total" };
  for (const key of TOTALS) total[key] = rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
  const ab = total.atBats ?? 0;
  const hits = total.hits ?? 0;
  const walks = total.walks ?? 0;
  const innings = total.inningsPitched ?? 0;
  total.battingAverage = ab ? hits / ab : null;
  total.onBasePct = ab + walks ? (hits + walks) / (ab + walks) : null;
  total.sluggingPct = ab ? (total.totalBases ?? 0) / ab : null;
  total.ops = total.onBasePct === null || total.sluggingPct === null ? null : total.onBasePct + total.sluggingPct;
  total.era = earnedRunAverage(total.earnedRuns, innings);
  total.whip = innings ? ((total.hitsAllowed ?? 0) + (total.walksAllowed ?? 0)) / innings : null;
  return total;
}

function HistoryTable({
  seasons,
  columns,
  label,
  hasStats,
}: {
  seasons: HistoryRow[][];
  columns: Column[];
  label: string;
  hasStats: (row: HistoryRow) => boolean;
}) {
  const groups = seasons
    .map((rows) => ({ rows, total: totalRows(rows) }))
    .filter(({ total }) => hasStats(total));

  if (groups.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-slate-300">{label}</h2>
      <div className="data-table-shell">
        <table className="data-table w-full table-fixed">
          <colgroup>
            <col style={{ width: "11%" }} />
            <col style={{ width: "18%" }} />
            {columns.map((column) => <col key={String(column.key)} />)}
          </colgroup>
          <thead>
            <tr>
              <th>Season</th>
              <th>Team</th>
              {columns.map((column) => <th key={String(column.key)}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {groups.flatMap(({ rows, total }) => {
              const displayed = rows.length > 1 ? [total, ...rows] : [rows[0]];
              return displayed.map((row, index) => (
                <tr key={`${rows[0].seasonId}-${row.teamName}-${index}`} className={index === 0 ? "bg-blue-500/[0.045] font-semibold" : "text-slate-400"}>
                  <td>{index === 0 ? rows[0].seasonName : ""}</td>
                  <td>
                    {index > 0 && <span className="mr-1 text-slate-500">↳</span>}
                    {index === 0 && rows.length > 1 ? (
                      <span className="text-slate-300">Total</span>
                    ) : (
                      <HistoricalTeamLink name={row.teamName} seasonId={row.seasonId} teamId={row.historicalTeamId} />
                    )}
                  </td>
                  {columns.map((column) => (
                    <td key={String(column.key)}>
                      {format(row[column.key], column.format)}
                    </td>
                  ))}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PlayerHistory({ history }: { history: HistoryRow[] }) {
  const grouped = new Map<number, HistoryRow[]>();
  for (const row of history) grouped.set(row.seasonId, [...(grouped.get(row.seasonId) ?? []), row]);
  const seasons = [...grouped.values()];

  return (
    <div className="space-y-6">
      <HistoryTable seasons={seasons} columns={BATTING} label="Batting history" hasStats={(row) => (row.atBats ?? 0) > 0} />
      <HistoryTable seasons={seasons} columns={PITCHING} label="Pitching history" hasStats={(row) => (row.inningsPitched ?? 0) > 0} />
    </div>
  );
}
