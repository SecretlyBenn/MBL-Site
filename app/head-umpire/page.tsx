import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { games, players, plateAppearances, scorecards, teams, users } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { PageShell, EmptyState } from "@/app/SiteNav";
import { deriveBoxScore } from "@/app/derive-box-score";
import { formatInnings } from "@/app/formatStats";
import { ReviewActions } from "./ReviewActions";

export const dynamic = "force-dynamic";

export default async function HeadUmpirePage() {
  const leagueUser = await requireRole(["HEAD_UMPIRE", "ADMIN"], "/head-umpire");

  const db = getDb();
  const pending = await db
    .select()
    .from(scorecards)
    .where(eq(scorecards.status, "PENDING"))
    .orderBy(asc(scorecards.submittedAt));

  // Already on the site, newest first - these are what a reopen acts on.
  const approved = await db
    .select()
    .from(scorecards)
    .where(eq(scorecards.status, "APPROVED"))
    .orderBy(desc(scorecards.reviewedAt))
    .limit(25);

  const allGames = await db.select().from(games);
  const allTeams = await db.select().from(teams);
  const allUsers = await db.select().from(users);
  const allPlayers = await db.select().from(players);

  const gameById = new Map(allGames.map((game) => [game.id, game]));
  const teamNameById = new Map(allTeams.map((team) => [team.id, team.name]));
  const userNameById = new Map(allUsers.map((user) => [user.id, user.displayName]));
  const playerNameById = new Map(allPlayers.map((player) => [player.id, player.displayName]));

  const appearances =
    pending.length === 0
      ? []
      : await db
          .select()
          .from(plateAppearances)
          .where(inArray(plateAppearances.scorecardId, pending.map((row) => row.id)));

  return (
    <PageShell
      wide
      title="Scorecard review"
      subtitle={`${leagueUser.displayName} · ${leagueUser.role.replace("_", " ").toLowerCase()}`}
    >
      <h2 className="section-title mb-3">Waiting for review</h2>
      <h2 className="section-title mb-3">Waiting for review</h2>
      {pending.length === 0 ? (
        <EmptyState>No scorecards waiting for review.</EmptyState>
      ) : (
        <div className="space-y-8">
          {pending.map((scorecard) => {
            const game = gameById.get(scorecard.gameId);
            const away = game ? teamNameById.get(game.awayTeamId) : undefined;
            const home = game ? teamNameById.get(game.homeTeamId) : undefined;
            const box = deriveBoxScore(
              appearances.filter((row) => row.scorecardId === scorecard.id),
            );

            return (
              <section key={scorecard.id} className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5">
                <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-lg font-bold">
                    {away ?? "Away"} <span className="text-slate-500">at</span> {home ?? "Home"}
                    <span className="ml-3 tabular-nums text-slate-300">
                      {box.awayScore} – {box.homeScore}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Submitted by {userNameById.get(scorecard.submittedByUserId) ?? "unknown"}
                  </p>
                </header>

                {/* Line score first: it is the quickest way to see whether the
                    game reads the way the reviewer remembers it. */}
                <div className="data-table-shell mb-4 overflow-x-auto">
                  <table className="line-score m-3">
                    <thead>
                      <tr>
                        <th />
                        {Array.from(
                          { length: Math.max(box.awayInnings.length, box.homeInnings.length) },
                          (_, index) => <th key={index}>{index + 1}</th>,
                        )}
                        <th className="is-total is-total-start">R</th>
                        <th className="is-total">H</th>
                        <th className="is-total">E</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: away, innings: box.awayInnings, runs: box.awayScore, hits: box.awayHits, errors: box.awayErrors },
                        { name: home, innings: box.homeInnings, runs: box.homeScore, hits: box.homeHits, errors: box.homeErrors },
                      ].map((side, index) => (
                        <tr key={index}>
                          <th scope="row">{side.name?.split(" ").at(-1) ?? "—"}</th>
                          {Array.from(
                            { length: Math.max(box.awayInnings.length, box.homeInnings.length) },
                            (_, inning) => <td key={inning}>{side.innings[inning] ?? 0}</td>,
                          )}
                          <td className="is-total is-total-start">{side.runs}</td>
                          <td className="is-total">{side.hits}</td>
                          <td className="is-total">{side.errors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mb-4 grid gap-4 xl:grid-cols-2">
                  {[
                    { label: away, batting: box.awayBatting, pitching: box.awayPitching },
                    { label: home, batting: box.homeBatting, pitching: box.homePitching },
                  ].map((side, index) => (
                    <div key={index}>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        {side.label}
                      </h3>
                      <div className="data-table-shell mb-3">
                        <table className="data-table stat-table has-two-labels w-full">
                          <thead>
                            <tr>
                              <th>Batter</th><th>AB</th><th>R</th><th>H</th><th>HR</th><th>RBI</th><th>BB</th><th>SO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {side.batting.map((line) => (
                              <tr key={line.playerId}>
                                <td>{playerNameById.get(line.playerId) ?? "?"}</td>
                                <td>{line.atBats}</td><td>{line.runs}</td><td>{line.hits}</td>
                                <td>{line.homeRuns}</td><td>{line.rbis}</td><td>{line.walks}</td><td>{line.strikeouts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="data-table-shell">
                        <table className="data-table stat-table has-two-labels w-full">
                          <thead>
                            <tr>
                              <th>Pitcher</th><th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>SO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {side.pitching.map((line) => (
                              <tr key={line.playerId}>
                                <td>{playerNameById.get(line.playerId) ?? "?"}</td>
                                <td>{formatInnings(line.inningsPitched)}</td>
                                <td>{line.hits}</td><td>{line.runs}</td><td>{line.earnedRuns}</td>
                                <td>{line.walks}</td><td>{line.strikeouts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                <ReviewActions scorecardId={scorecard.id} />
              </section>
            );
          })}
        </div>
      )}

      <h2 className="section-title mb-3 mt-10">On the site</h2>
      {approved.length === 0 ? (
        <EmptyState>No approved games yet.</EmptyState>
      ) : (
        <div className="grid gap-2">
          {approved.map((scorecard) => {
            const game = gameById.get(scorecard.gameId);
            const away = game ? teamNameById.get(game.awayTeamId) : undefined;
            const home = game ? teamNameById.get(game.homeTeamId) : undefined;

            return (
              <div
                key={scorecard.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="font-semibold">
                    {away ?? "Away"} <span className="text-slate-500">at</span> {home ?? "Home"}
                  </span>
                  <span className="ml-3 tabular-nums text-slate-300">
                    {scorecard.awayScore} – {scorecard.homeScore}
                  </span>
                </span>
                <ReviewActions scorecardId={scorecard.id} mode="approved" />
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
