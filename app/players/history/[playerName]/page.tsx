import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { getPlayerHistoricalStats } from "@/db/queries";

export const dynamic = "force-dynamic";

function avg(value: number | null) { return value === null ? "-" : value.toFixed(3).replace(/^0/, ""); }

export default async function HistoricalPlayerPage({ params }: { params: Promise<{ playerName: string }> }) {
  const { playerName } = await params;
  const name = decodeURIComponent(playerName);
  const history = await getPlayerHistoricalStats(name);
  if (history.length === 0) notFound();
  return <PageShell title={name} subtitle={`${history.length} archived season line${history.length === 1 ? "" : "s"}`}>
    <p className="mb-6 text-sm"><Link href="/players" className="text-white/50 hover:text-white">← Player search</Link></p>
    {history.length === 0 ? <EmptyState>No archived seasons found.</EmptyState> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-sm"><thead><tr className="border-b border-white/15 text-left text-xs uppercase tracking-wide text-white/50"><th className="py-2 pr-3">Season</th><th className="py-2 pr-3">Team</th><th className="py-2 pr-3 text-right">G</th><th className="py-2 pr-3 text-right">AB</th><th className="py-2 pr-3 text-right">H</th><th className="py-2 pr-3 text-right">HR</th><th className="py-2 pr-3 text-right">RBI</th><th className="py-2 pr-3 text-right">AVG</th><th className="py-2 pr-3 text-right">OPS</th><th className="py-2 pr-3 text-right">IP</th><th className="py-2 text-right">ERA</th></tr></thead><tbody>{history.map((row, index) => <tr key={index} className="border-b border-white/5"><td className="py-2 pr-3">{row.seasonName}</td><td className="py-2 pr-3 text-white/60">{row.teamName}</td><td className="py-2 pr-3 text-right">{row.games ?? "-"}</td><td className="py-2 pr-3 text-right">{row.atBats ?? "-"}</td><td className="py-2 pr-3 text-right">{row.hits ?? "-"}</td><td className="py-2 pr-3 text-right">{row.homeRuns ?? "-"}</td><td className="py-2 pr-3 text-right">{row.rbis ?? "-"}</td><td className="py-2 pr-3 text-right">{avg(row.battingAverage)}</td><td className="py-2 pr-3 text-right">{avg(row.ops)}</td><td className="py-2 pr-3 text-right">{row.inningsPitched ?? "-"}</td><td className="py-2 text-right">{row.era === null ? "-" : row.era.toFixed(2)}</td></tr>)}</tbody></table></div>}
  </PageShell>;
}
