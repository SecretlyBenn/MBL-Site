import { getDb } from "@/db";
import { games, players, teams, users } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { CreatePlayerForm, CreateTeamForm, CreateUserForm, ScheduleGameForm } from "./AdminForms";
import { UserRoleRow } from "./UserRoleRow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const leagueUser = await requireRole(["ADMIN"], "/admin");

  const db = getDb();
  const allTeams = await db.select().from(teams);
  const allPlayers = await db.select().from(players);
  const allUsers = await db.select().from(users);
  const allGames = await db.select().from(games);
  const teamNameById = new Map(allTeams.map((team) => [team.id, team.name]));

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
