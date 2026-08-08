import { getHistoricalSeasonStandings, getHistoricalSeasons, getHistoricalTeamStats, getIndividualHistoricalStats, getPlayerAvatars } from "@/db/queries";
import { EmptyState, PageShell } from "../SiteNav";
import { SeasonSelect } from "./SeasonSelect";
import { StatRow, StatsTable } from "./StatsTable";

type SearchParams = Promise<{ season?: string }>;

function selectedSeason(seasons: { id: number }[], requested?: string, career = false) {
  if (career && requested === "career") return "career";
  const id = Number(requested);
  return seasons.some((season) => season.id === id) ? String(id) : String(seasons[0]?.id ?? "");
}

export async function IndividualStatisticsPage({ kind, searchParams }: { kind: "batting" | "pitching"; searchParams: SearchParams }) {
  const seasons = await getHistoricalSeasons();
  const requested = (await searchParams).season;
  const selected = selectedSeason(seasons, requested, true);
  const numericSeason = selected === "career" ? undefined : Number(selected);
  const [rows, standings, avatars] = await Promise.all([
    getIndividualHistoricalStats(numericSeason),
    numericSeason ? getHistoricalSeasonStandings(numericSeason) : Promise.resolve([]),
    getPlayerAvatars(),
  ]);
  const filtered = rows.filter((row) => kind === "batting" ? (row.atBats ?? 0) > 0 : (row.inningsPitched ?? 0) > 0);
  const label = kind === "batting" ? "Batting Statistics" : "Pitching Statistics";
  return <PageShell wide title={label} subtitle="Individual player statistics by season or across an entire career.">
    {filtered.length
      ? <StatsTable avatars={avatars} toolbar={<SeasonSelect seasons={seasons} selected={selected} career />} rows={filtered as unknown as StatRow[]} kind={kind} seasonId={numericSeason} teamIds={Object.fromEntries(standings.map((row) => [row.name, row.id]))} />
      : <><div className="mb-5"><SeasonSelect seasons={seasons} selected={selected} career /></div><EmptyState>No statistics are available for this selection.</EmptyState></>}
  </PageShell>;
}

export async function TeamStatisticsPage({ kind, searchParams }: { kind: "batting" | "pitching"; searchParams: SearchParams }) {
  const seasons = await getHistoricalSeasons();
  const requested = (await searchParams).season;
  const selected = selectedSeason(seasons, requested);
  const [rows, standings] = selected ? await Promise.all([getHistoricalTeamStats(Number(selected)), getHistoricalSeasonStandings(Number(selected))]) : [[], []];
  // A team's G is how many games the team played. Summing its players' games
  // counts one game once per player who appeared in it.
  const gamesPlayed = new Map(standings.map((row) => [row.name, (row.wins ?? 0) + (row.losses ?? 0)]));
  const withTeamGames = rows.map((row) => ({ ...row, games: gamesPlayed.get(row.teamName) ?? row.games }));
  const filtered = withTeamGames.filter((row) => kind === "batting" ? (row.atBats ?? 0) > 0 : (row.inningsPitched ?? 0) > 0);
  const label = kind === "batting" ? "Team Batting Statistics" : "Team Pitching Statistics";
  return <PageShell wide title={label} subtitle="Team totals for the selected season, followed by the league average.">
    {filtered.length
      ? <StatsTable toolbar={<SeasonSelect seasons={seasons} selected={selected} />} rows={filtered as unknown as StatRow[]} kind={kind} team seasonId={Number(selected)} teamIds={Object.fromEntries(standings.map((row) => [row.name, row.id]))} />
      : <><div className="mb-5"><SeasonSelect seasons={seasons} selected={selected} /></div><EmptyState>No team statistics are available for this season.</EmptyState></>}
  </PageShell>;
}
