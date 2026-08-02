import { getHistoricalLeaders } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";

export const dynamic = "force-dynamic";

const LEADERBOARDS = [
  { column: "homeRuns" as const, label: "Home runs" },
  { column: "hits" as const, label: "Hits" },
  { column: "rbis" as const, label: "RBI" },
  { column: "strikeoutsPitched" as const, label: "Strikeouts (pitching)" },
];

export default async function CareersPage() {
  const leaderboards = await Promise.all(
    LEADERBOARDS.map(async (board) => ({
      ...board,
      rows: await getHistoricalLeaders(board.column, 15),
    })),
  );

  const hasData = leaderboards.some((board) => board.rows.length > 0);

  return (
    <PageShell
      title="Career Stats"
      subtitle="All-time leaders across every season in league history."
    >
      {!hasData ? (
        <EmptyState>No career stats recorded yet.</EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {leaderboards.map((board) => (
            <div key={board.column}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
                {board.label}
              </h2>
              {board.rows.length === 0 ? (
                <EmptyState>No data.</EmptyState>
              ) : (
                <ol className="space-y-1 text-sm">
                  {board.rows.map((row, index) => (
                    <li
                      key={row.playerName}
                      className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span>
                        <span className="mr-2 inline-block w-5 text-right text-white/40">
                          {index + 1}
                        </span>
                        {row.playerName}
                      </span>
                      <span className="font-mono font-semibold">{row.total}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
