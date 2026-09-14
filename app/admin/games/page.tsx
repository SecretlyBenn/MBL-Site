import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { games, historicalGames, historicalSeasons, historicalTeams, scorecards, teams } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { EmptyState, SectionHeader } from "@/app/SiteNav";
import { AddFixtureForm, MarkForfeitForm, RetireFixtureForm, ScheduleGameForm } from "../AdminForms";
import { QueryPicker } from "../QueryPicker";
import { DeleteButton } from "../ui";

export const metadata: Metadata = { title: "Games" };
export const dynamic = "force-dynamic";

/**
 * Games in two senses. Live games are the ones given a time and waiting for,
 * or being scored by, an umpire. Fixtures are a season's schedule - what the
 * live games are created from. Fixture tools work on one season at a time.
 */
export default async function AdminGamesPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  await requireRole(["ADMIN"], "/admin/games");
  const db = getDb();

  const [allTeams, seasons, liveGames, cards] = await Promise.all([
    db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.name)),
    db.select({ id: historicalSeasons.id, name: historicalSeasons.name }).from(historicalSeasons).orderBy(desc(historicalSeasons.sortOrder)),
    db.select().from(games).orderBy(desc(games.scheduledAt)),
    db.select({ gameId: scorecards.gameId, status: scorecards.status }).from(scorecards),
  ]);
  const teamName = new Map(allTeams.map((team) => [team.id, team.name]));
  const cardFor = new Map(cards.map((card) => [card.gameId, card.status]));

  const requested = Number((await searchParams).season);
  const season = seasons.find((row) => row.id === requested) ?? seasons[0];

  const fixtures = season
    ? await db.select().from(historicalGames).where(eq(historicalGames.seasonId, season.id)).orderBy(asc(historicalGames.sortOrder))
    : [];
  const seasonTeams = season
    ? await db.select({ id: historicalTeams.id, name: historicalTeams.name }).from(historicalTeams).where(eq(historicalTeams.seasonId, season.id))
    : [];
  const clubName = new Map(seasonTeams.map((team) => [team.id, team.name]));
  const label = (fixture: typeof historicalGames.$inferSelect) =>
    `${clubName.get(fixture.awayTeamId ?? -1) ?? "Away"} @ ${clubName.get(fixture.homeTeamId ?? -1) ?? "Home"}${
      fixture.playedOn ? ` - ${fixture.playedOn}` : ""
    }`;

  const unplayed = fixtures.filter((fixture) => fixture.homeScore === null);
  const played = fixtures.filter((fixture) => fixture.homeScore !== null);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHeader title="Live games" meta="Given a time, waiting for or being scored by an umpire" />
        {liveGames.length === 0 ? (
          <EmptyState>No live games. Clubs create them by setting a time on the schedule page.</EmptyState>
        ) : (
          <ul className="ui-card px-3">
            {liveGames.map((game) => {
              const card = cardFor.get(game.id);
              return (
                <li key={game.id} className="flex flex-wrap items-center gap-3 border-b border-slate-800/60 py-2.5 last:border-0">
                  <span className="min-w-56 flex-1 font-semibold text-slate-100">
                    {teamName.get(game.awayTeamId) ?? "Away"} @ {teamName.get(game.homeTeamId) ?? "Home"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(game.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  <span className="text-xs text-slate-500">
                    {game.status}
                    {card ? ` · scorecard ${card.toLowerCase().replace("_", " ")}` : ""}
                  </span>
                  {card === "APPROVED" ? (
                    <span className="text-[11px] text-slate-500">published</span>
                  ) : (
                    <DeleteButton
                      url={`/api/games?gameId=${game.id}`}
                      confirmText={`Delete this game${card ? " and the scorecard started for it" : ""}? The season fixture stays, so it can be scheduled again.`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <QueryPicker
            label="Season"
            param="season"
            value={season ? String(season.id) : ""}
            options={seasons.map((row) => ({ value: String(row.id), label: row.name }))}
          />
          {season && (
            <p className="text-xs text-slate-500">
              {fixtures.length} games · {played.length} played · {unplayed.length} to play
            </p>
          )}
        </div>

        {season ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
            <div className="min-w-0">
              <SectionHeader title="Games still to play" meta="Remove only games that should never have been scheduled" />
              {unplayed.length === 0 ? (
                <EmptyState>Every game in this season has been played.</EmptyState>
              ) : (
                <ul className="ui-card px-3">
                  {unplayed.map((fixture) => (
                    <li key={fixture.id} className="flex flex-wrap items-center gap-3 border-b border-slate-800/60 py-2 last:border-0">
                      <span className="min-w-56 flex-1 text-sm text-slate-200">{label(fixture)}</span>
                      {fixture.status === "NOT_NEEDED" && <span className="text-[11px] text-slate-500">not needed</span>}
                      <DeleteButton
                        url={`/api/fixtures?fixtureId=${fixture.id}`}
                        confirmText="Remove this game from the season? For a game a series simply didn't reach, use Game not needed instead."
                        label="Remove"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <aside className="flex flex-col gap-4">
              <AddFixtureForm seasonId={season.id} seasonName={season.name} teams={allTeams} />
              <RetireFixtureForm
                fixtures={unplayed.map((fixture) => ({ id: fixture.id, label: label(fixture), retired: fixture.status === "NOT_NEEDED" }))}
              />
              <MarkForfeitForm
                games={played.map((fixture) => ({
                  id: fixture.id,
                  label: `${label(fixture)} (${fixture.awayScore}-${fixture.homeScore})`,
                  forfeit: fixture.status === "FORFEIT",
                }))}
              />
              <ScheduleGameForm teams={allTeams} />
            </aside>
          </div>
        ) : (
          <EmptyState>No seasons yet. Start one from the Seasons tab.</EmptyState>
        )}
      </section>
    </div>
  );
}
