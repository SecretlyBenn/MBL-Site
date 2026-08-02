import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { games, players, teams } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { SubmitScorecardForm } from "./SubmitScorecardForm";

export const dynamic = "force-dynamic";

export default async function UmpirePage() {
  const leagueUser = await requireRole(["UMPIRE", "HEAD_UMPIRE", "ADMIN"], "/umpire");

  const db = getDb();
  const scheduledGames = await db.query.games.findMany({
    where: eq(games.status, "SCHEDULED"),
    orderBy: (row, { asc }) => [asc(row.scheduledAt)],
  });
  const allTeams = await db.select().from(teams);
  const allPlayers = await db.select().from(players);
  const teamNameById = new Map(allTeams.map((team) => [team.id, team.name]));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-2xl font-bold">Submit a scorecard</h1>
      <p className="mb-6 text-sm text-gray-500">
        Signed in as {leagueUser.displayName} ({leagueUser.role})
      </p>

      {scheduledGames.length === 0 ? (
        <p className="text-gray-500">No scheduled games waiting for a scorecard.</p>
      ) : (
        <SubmitScorecardForm
          games={scheduledGames.map((game) => ({
            id: game.id,
            label: `${teamNameById.get(game.awayTeamId) ?? "Away"} @ ${
              teamNameById.get(game.homeTeamId) ?? "Home"
            } - ${new Date(game.scheduledAt).toLocaleString()}`,
          }))}
          players={allPlayers.map((player) => ({
            id: player.id,
            label: player.displayName,
          }))}
        />
      )}
    </main>
  );
}
