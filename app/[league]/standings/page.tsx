import type { Metadata } from "next";
import { getHistoricalSchedule, getHistoricalSeasonStandings, getHistoricalSeasons } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { Bracket } from "./Bracket";
import { StandingsSeasonSelect } from "./StandingsSeasonSelect";
import { StandingsTable } from "./StandingsTable";
import { leagueFrom } from "../league";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  return {
    title: "Standings",
    description:
      "Current Minecraft Baseball League standings: wins, losses, winning percentage, run differential and games back for every club, season by season.",
    alternates: { canonical: `/${league}/standings` },
  };
}

export const dynamic = "force-dynamic";

export default async function StandingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const league = await leagueFrom(params);
  const seasons = await getHistoricalSeasons(league.id);
  const requested = (await searchParams).season;
  const season = seasons.find((row) => String(row.id) === requested) ?? seasons[0];
  // A postseason is a bracket, not a table: its games are what place a club,
  // so they are read instead of its win-loss line.
  const [teams, games] = season
    ? await Promise.all([
        getHistoricalSeasonStandings(season.id),
        season.isPlayoffs ? getHistoricalSchedule(season.id) : Promise.resolve([]),
      ])
    : [[], []];

  return <PageShell wide title={season?.isPlayoffs ? "Playoff bracket" : "Standings"} subtitle={season?.name}>
    {season && <div className="mb-6"><StandingsSeasonSelect seasons={seasons} selected={String(season.id)} /></div>}
    {!season || teams.length === 0
      ? <EmptyState>No standings recorded for this season.</EmptyState>
      : season.isPlayoffs
        ? <Bracket leagueSlug={league.slug} games={games} teams={teams} />
        : <StandingsTable leagueSlug={league.slug}
teams={teams} seasonId={season.id} />}
  </PageShell>;
}
