import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { StandingsTable } from "@/app/standings/StandingsTable";
import { getHistoricalSeason, getHistoricalSeasonPlayerTotals, getHistoricalSeasonStandings } from "@/db/queries";
import { SeasonStatsTable } from "./SeasonStatsTable";

export const dynamic = "force-dynamic";

export default async function SeasonPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const seasonId = Number((await params).seasonId);
  if (!Number.isInteger(seasonId)) notFound();
  const season = await getHistoricalSeason(seasonId);
  if (!season) notFound();
  const [standings, playerStats] = await Promise.all([getHistoricalSeasonStandings(seasonId), getHistoricalSeasonPlayerTotals(seasonId)]);
  const batters = playerStats.filter((row) => (row.atBats ?? 0) > 0).sort((a, b) => (b.battingAverage ?? 0) - (a.battingAverage ?? 0));
  const pitchers = playerStats.filter((row) => (row.inningsPitched ?? 0) > 0).sort((a, b) => (a.era ?? 99) - (b.era ?? 99));
  return <PageShell wide title={season.name} subtitle={season.isPlayoffs ? "Playoffs" : "Regular season"}>
    <p className="mb-6 text-sm"><Link href="/seasons" className="text-slate-400 hover:text-white">← All seasons</Link></p>
    <section className="mb-10"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Standings</h2>{standings.length ? <StandingsTable teams={standings} seasonId={seasonId} constrain={false} /> : <EmptyState>No standings recorded for this season.</EmptyState>}</section>
    <section className="mb-10"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Batting ({batters.length})</h2>{batters.length ? <SeasonStatsTable rows={batters} kind="batting" seasonId={seasonId} teamIds={Object.fromEntries(standings.map((team) => [team.name, team.id]))} /> : <EmptyState>No batting stats for this season.</EmptyState>}</section>
    <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Pitching ({pitchers.length})</h2>{pitchers.length ? <SeasonStatsTable rows={pitchers} kind="pitching" seasonId={seasonId} teamIds={Object.fromEntries(standings.map((team) => [team.name, team.id]))} /> : <EmptyState>No pitching stats for this season.</EmptyState>}</section>
  </PageShell>;
}
