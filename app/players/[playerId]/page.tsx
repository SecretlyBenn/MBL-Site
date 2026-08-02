import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { players, teams } from "@/db/schema";
import { getPlayerHistoricalStats, getPlayerLiveStats } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";

export const dynamic = "force-dynamic";

function fmtAvg(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  return value.toFixed(3).replace(/^0/, "");
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId: playerIdParam } = await params;
  const playerId = Number(playerIdParam);
  if (!Number.isInteger(playerId)) notFound();

  const db = getDb();
  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) notFound();

  const team = player.teamId
    ? await db.query.teams.findFirst({ where: eq(teams.id, player.teamId) })
    : null;

  // Historical rows are keyed by the name used on the old stats site, which is
  // the Minecraft username here.
  const [live, history] = await Promise.all([
    getPlayerLiveStats(playerId),
    getPlayerHistoricalStats(player.minecraftUsername),
  ]);

  return (
    <PageShell
      title={player.displayName}
      subtitle={[team ? team.name : "Free agent", player.status].join(" · ")}
    >
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
          Current season
        </h2>
        {live.gamesLogged === 0 ? (
          <EmptyState>No approved games logged this season yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["AVG", fmtAvg(live.average)],
              ["H", live.hits],
              ["HR", live.homeRuns],
              ["RBI", live.rbis],
              ["R", live.runs],
              ["BB", live.walks],
              ["SO", live.strikeouts],
              ["ERA", live.inningsPitched > 0 ? live.era.toFixed(2) : "-"],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
          Career history
        </h2>
        {history.length === 0 ? (
          <EmptyState>No archived seasons found for this player.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/15 text-left text-xs uppercase tracking-wide text-white/50">
                  <th className="py-2 pr-3">Season</th>
                  <th className="py-2 pr-3">Team</th>
                  <th className="py-2 pr-3 text-right">G</th>
                  <th className="py-2 pr-3 text-right">AB</th>
                  <th className="py-2 pr-3 text-right">H</th>
                  <th className="py-2 pr-3 text-right">HR</th>
                  <th className="py-2 pr-3 text-right">RBI</th>
                  <th className="py-2 pr-3 text-right">AVG</th>
                  <th className="py-2 pr-3 text-right">OPS</th>
                  <th className="py-2 pr-3 text-right">IP</th>
                  <th className="py-2 text-right">ERA</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-2 pr-3">{row.seasonName}</td>
                    <td className="py-2 pr-3 text-white/60">{row.teamName}</td>
                    <td className="py-2 pr-3 text-right">{row.games ?? "-"}</td>
                    <td className="py-2 pr-3 text-right">{row.atBats ?? "-"}</td>
                    <td className="py-2 pr-3 text-right">{row.hits ?? "-"}</td>
                    <td className="py-2 pr-3 text-right">{row.homeRuns ?? "-"}</td>
                    <td className="py-2 pr-3 text-right">{row.rbis ?? "-"}</td>
                    <td className="py-2 pr-3 text-right">{fmtAvg(row.battingAverage)}</td>
                    <td className="py-2 pr-3 text-right">{fmtAvg(row.ops)}</td>
                    <td className="py-2 pr-3 text-right">{row.inningsPitched ?? "-"}</td>
                    <td className="py-2 text-right">
                      {row.era === null ? "-" : row.era.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {team && (
        <p className="mt-8 text-sm">
          <Link href={`/teams/${team.id}`} className="text-white/50 hover:text-white">
            ← Back to {team.name}
          </Link>
        </p>
      )}
    </PageShell>
  );
}
