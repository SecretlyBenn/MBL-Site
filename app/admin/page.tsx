import { asc, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  games,
  historicalGames,
  historicalPlayerStats,
  historicalSeasons,
  historicalTeams,
  players,
  teams,
  users,
} from "@/db/schema";
import { requireRole } from "@/app/roles";
import {
  CreatePlayerForm,
  CreateTeamForm,
  CreateUserForm,
  MarkForfeitForm,
  RecomputeSeasonForm,
  RenamePlayerForm,
  RetireFixtureForm,
  ScheduleGameForm,
} from "./AdminForms";
import { UserRoleRow } from "./UserRoleRow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const leagueUser = await requireRole(["ADMIN"], "/admin");

  const db = getDb();
  const allTeams = await db.select().from(teams);
  const allPlayers = await db.select().from(players);
  const allUsers = await db.select().from(users);
  const allGames = await db.select().from(games);
  // Every name the site knows, not just the current pool: most names on the
  // site belong to the archive alone, and those can be renamed too.
  const archived = await db
    .selectDistinct({ name: historicalPlayerStats.playerName })
    .from(historicalPlayerStats);
  const knownNames = [
    ...new Set([...allPlayers.map((player) => player.displayName), ...archived.map((row) => row.name)]),
  ].sort((a, b) => a.localeCompare(b));
  const teamNameById = new Map(allTeams.map((team) => [team.id, team.name]));

  const allSeasons = await db
    .select({ id: historicalSeasons.id, name: historicalSeasons.name })
    .from(historicalSeasons)
    .orderBy(asc(historicalSeasons.sortOrder));

  // Only unplayed fixtures can be retired, so those are the only ones offered -
  // along with any already retired, so the choice can be undone.
  const archiveTeams = await db.select().from(historicalTeams);
  const archiveTeamName = new Map(archiveTeams.map((row) => [row.id, row.name]));
  const seasonName = new Map(allSeasons.map((row) => [row.id, row.name]));
  const openFixtures = await db
    .select()
    .from(historicalGames)
    .where(isNull(historicalGames.homeScore))
    .orderBy(asc(historicalGames.seasonId), asc(historicalGames.sortOrder));
  const fixtureLabel = (fixture: {
    seasonId: number;
    awayTeamId: number | null;
    homeTeamId: number | null;
    playedOn: string | null;
  }) =>
    `${seasonName.get(fixture.seasonId) ?? "Season"}: ${
      archiveTeamName.get(fixture.awayTeamId ?? -1) ?? "Away"
    } @ ${archiveTeamName.get(fixture.homeTeamId ?? -1) ?? "Home"}${
      fixture.playedOn ? ` - ${fixture.playedOn}` : ""
    }`;

  // Only played games can be quit part way through, so those are the ones the
  // forfeit control offers. Newest season first - that is where corrections
  // almost always land.
  const playedGames = await db
    .select()
    .from(historicalGames)
    .where(isNotNull(historicalGames.homeScore))
    .orderBy(asc(historicalGames.seasonId), asc(historicalGames.sortOrder));
  const forfeitOptions = playedGames.map((game) => ({
    id: game.id,
    forfeit: game.status === "FORFEIT",
    note: game.note,
    label: `${fixtureLabel(game)} (${game.awayScore}-${game.homeScore})`,
  }));

  const fixtureOptions = openFixtures.map((fixture) => ({
    id: fixture.id,
    retired: fixture.status === "NOT_NEEDED",
    label: `${seasonName.get(fixture.seasonId) ?? "Season"}: ${
      archiveTeamName.get(fixture.awayTeamId ?? -1) ?? "Away"
    } @ ${archiveTeamName.get(fixture.homeTeamId ?? -1) ?? "Home"}${
      fixture.playedOn ? ` - ${fixture.playedOn}` : ""
    }`,
  }));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-1 text-2xl font-bold">League admin</h1>
      <p className="mb-6 text-sm text-gray-500">
        Signed in as {leagueUser.displayName} ({leagueUser.role})
      </p>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CreateTeamForm />
        <CreatePlayerForm />
        <CreateUserForm teams={allTeams.map((team) => ({ id: team.id, name: team.name }))} />
        <ScheduleGameForm teams={allTeams.map((team) => ({ id: team.id, name: team.name }))} />
        <RenamePlayerForm names={knownNames} />
        <RecomputeSeasonForm seasons={allSeasons} />
        <RetireFixtureForm fixtures={fixtureOptions} />
        <MarkForfeitForm games={forfeitOptions} />
      </div>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">Teams ({allTeams.length})</h2>
        <ul className="space-y-1 text-sm">
          {allTeams.map((team) => (
            <li key={team.id}>
              {team.name} ({team.abbreviation})
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">Player pool ({allPlayers.length})</h2>
        <ul className="space-y-1 text-sm">
          {allPlayers.map((player) => (
            <li key={player.id}>
              {player.displayName} - {player.status}
              {player.teamId ? ` (${teamNameById.get(player.teamId) ?? "unknown team"})` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">League accounts ({allUsers.length})</h2>
        <ul className="space-y-2">
          {allUsers.map((user) => (
            <UserRoleRow
              key={user.id}
              user={user}
              teams={allTeams.map((team) => ({ id: team.id, name: team.name }))}
            />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Schedule ({allGames.length})</h2>
        <ul className="space-y-1 text-sm">
          {allGames.map((game) => (
            <li key={game.id}>
              {teamNameById.get(game.awayTeamId) ?? "Away"} @{" "}
              {teamNameById.get(game.homeTeamId) ?? "Home"} -{" "}
              {new Date(game.scheduledAt).toLocaleString()} - {game.status}
              {game.status === "FINAL" ? ` (${game.awayScore}-${game.homeScore})` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
