import Link from "next/link";
import { getStandings } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";

export const dynamic = "force-dynamic";

function formatPct(value: number) {
  return value.toFixed(3).replace(/^0/, "");
}

export default async function StandingsPage() {
  const standings = await getStandings();
  const hasGames = standings.some((row) => row.gamesPlayed > 0);

  return (
    <PageShell title="Standings" subtitle="Current season, from approved results only.">
      {standings.length === 0 ? (
        <EmptyState>No teams have been added yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/15 text-left text-xs uppercase tracking-wide text-white/50">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3 text-right">GP</th>
                <th className="py-2 pr-3 text-right">W</th>
                <th className="py-2 pr-3 text-right">L</th>
                <th className="py-2 pr-3 text-right">PCT</th>
                <th className="py-2 pr-3 text-right">GB</th>
                <th className="py-2 pr-3 text-right">RS</th>
                <th className="py-2 pr-3 text-right">RA</th>
                <th className="py-2 text-right">DIFF</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => (
                <tr key={row.teamId} className="border-b border-white/5">
                  <td className="py-2 pr-3 text-white/40">{index + 1}</td>
                  <td className="py-2 pr-3">
                    <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2 hover:underline">
                      <TeamLogo teamName={row.name} className="h-9 w-9" />
                      {row.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-right">{row.gamesPlayed}</td>
                  <td className="py-2 pr-3 text-right font-semibold">{row.wins}</td>
                  <td className="py-2 pr-3 text-right">{row.losses}</td>
                  <td className="py-2 pr-3 text-right">{formatPct(row.winPct)}</td>
                  <td className="py-2 pr-3 text-right">
                    {row.gamesBack === 0 ? "-" : row.gamesBack.toFixed(1)}
                  </td>
                  <td className="py-2 pr-3 text-right">{row.runsScored}</td>
                  <td className="py-2 pr-3 text-right">{row.runsAllowed}</td>
                  <td className="py-2 text-right">
                    {row.runsScored - row.runsAllowed > 0 ? "+" : ""}
                    {row.runsScored - row.runsAllowed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!hasGames && (
            <p className="mt-4 text-sm text-white/40">
              No completed games yet — records will fill in as head umpires approve scorecards.
            </p>
          )}
        </div>
      )}
    </PageShell>
  );
}
