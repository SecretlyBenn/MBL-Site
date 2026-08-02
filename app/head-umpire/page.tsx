import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { games, scorecards, teams, users } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { ReviewActions } from "./ReviewActions";

export const dynamic = "force-dynamic";

export default async function HeadUmpirePage() {
  const leagueUser = await requireRole(["HEAD_UMPIRE", "ADMIN"], "/head-umpire");

  const db = getDb();
  const pending = await db.query.scorecards.findMany({
    where: eq(scorecards.status, "PENDING"),
    orderBy: (row, { asc }) => [asc(row.submittedAt)],
  });
  const allGames = await db.select().from(games);
  const allTeams = await db.select().from(teams);
  const allUsers = await db.select().from(users);

  const gameById = new Map(allGames.map((game) => [game.id, game]));
  const teamNameById = new Map(allTeams.map((team) => [team.id, team.name]));
  const userNameById = new Map(allUsers.map((user) => [user.id, user.displayName]));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-2xl font-bold">Scorecard review</h1>
      <p className="mb-6 text-sm text-gray-500">
        Signed in as {leagueUser.displayName} ({leagueUser.role})
      </p>

      {pending.length === 0 ? (
        <p className="text-gray-500">Nothing waiting on review.</p>
      ) : (
        <div className="space-y-4">
          {pending.map((scorecard) => {
            const game = gameById.get(scorecard.gameId);
            const matchup = game
              ? `${teamNameById.get(game.awayTeamId) ?? "Away"} @ ${
                  teamNameById.get(game.homeTeamId) ?? "Home"
                }`
              : `Game #${scorecard.gameId}`;

            return (
              <div key={scorecard.id} className="rounded border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{matchup}</p>
                    <p className="text-sm text-gray-500">
                      Submitted by {userNameById.get(scorecard.submittedByUserId) ?? "unknown"} ·{" "}
                      {new Date(scorecard.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-lg font-bold">
                    {scorecard.awayScore} - {scorecard.homeScore}
                  </p>
                </div>
                <ReviewActions scorecardId={scorecard.id} />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
