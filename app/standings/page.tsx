import { getHistoricalSeasonStandings, getHistoricalSeasons } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { StandingsSeasonSelect } from "./StandingsSeasonSelect";
import { StandingsTable } from "./StandingsTable";

export const dynamic = "force-dynamic";

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const seasons = await getHistoricalSeasons();
  const requested = (await searchParams).season;
  const season = seasons.find((row) => String(row.id) === requested) ?? seasons[0];
  const teams = season ? await getHistoricalSeasonStandings(season.id) : [];
  return <PageShell wide title="Standings" subtitle={season?.name}>
    {season && <div className="mb-6"><StandingsSeasonSelect seasons={seasons} selected={String(season.id)} /></div>}
    {teams.length && season ? <StandingsTable teams={teams} seasonId={season.id} /> : <EmptyState>No standings recorded for this season.</EmptyState>}
  </PageShell>;
}
