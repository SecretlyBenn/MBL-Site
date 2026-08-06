import { notFound } from "next/navigation";
import { PageShell } from "@/app/SiteNav";
import { BackButton } from "@/app/players/BackButton";
import { PlayerHistory } from "@/app/players/PlayerHistory";
import { getPlayerHistoricalStats } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function HistoricalPlayerPage({ params }: { params: Promise<{ playerName: string }> }) {
  const { playerName } = await params;
  const name = decodeURIComponent(playerName);
  const history = await getPlayerHistoricalStats(name);
  if (history.length === 0) notFound();
  const seasonCount = new Set(history.map((row) => row.seasonId)).size;
  return <PageShell wide title={name} subtitle={`${seasonCount} archived season${seasonCount === 1 ? "" : "s"}`}>
    <div className="mb-6"><BackButton /></div>
    <PlayerHistory history={history} />
  </PageShell>;
}
