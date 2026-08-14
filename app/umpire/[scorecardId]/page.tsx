import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { games, players, plateAppearances, scorecardLineups, scorecards, teams } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { PageShell } from "@/app/SiteNav";
import { LineupEditor } from "./LineupEditor";
import { ScoringBoard } from "./ScoringBoard";

export const dynamic = "force-dynamic";

export default async function ScorecardPage({
  params,
}: {
  params: Promise<{ scorecardId: string }>;
}) {
  const scorecardId = Number((await params).scorecardId);
  if (!Number.isInteger(scorecardId)) notFound();
  await requireRole(["UMPIRE", "HEAD_UMPIRE", "ADMIN"], `/umpire/${scorecardId}`);

  const db = getDb();
  const scorecard = await db.query.scorecards.findFirst({ where: eq(scorecards.id, scorecardId) });
  if (!scorecard) notFound();

  const game = await db.query.games.findFirst({ where: eq(games.id, scorecard.gameId) });
  if (!game) notFound();

  const allTeams = await db.select().from(teams);
  const teamById = new Map(allTeams.map((team) => [team.id, team]));
  const away = teamById.get(game.awayTeamId);
  const home = teamById.get(game.homeTeamId);

  const roster = await db.select().from(players);
  const lineups = await db
    .select()
    .from(scorecardLineups)
    .where(eq(scorecardLineups.scorecardId, scorecardId));
  const appearances = await db
    .select()
    .from(plateAppearances)
    .where(eq(plateAppearances.scorecardId, scorecardId))
    .orderBy(asc(plateAppearances.sequence));

  const rosterFor = (teamId: number | undefined) =>
    roster
      .filter((player) => player.teamId === teamId)
      .map((player) => ({ id: player.id, name: player.displayName }))
      .sort((a, b) => a.name.localeCompare(b.name));

  const slotOf = new Map(lineups.filter((row) => row.battingOrder !== null).map((row) => [row.playerId, row.battingOrder ?? 0]));
  const inLineup = new Set(lineups.map((row) => row.playerId));
  const benchFor = (teamId: number | undefined) =>
    roster
      .filter((player) => player.teamId === teamId && !inLineup.has(player.id))
      .map((player) => ({ id: player.id, name: player.displayName }));

  const awayLineup = lineups.filter((row) => !row.isHome);
  const homeLineup = lineups.filter((row) => row.isHome);
  const ready = awayLineup.length > 0 && homeLineup.length > 0;

  const title = `${away?.name ?? "Away"} at ${home?.name ?? "Home"}`;

  return (
    <PageShell wide title={title} subtitle={ready ? "Scoring" : "Set the lineups to begin"}>
      {ready ? (
        <ScoringBoard
          scorecardId={scorecardId}
          awayName={away?.name ?? "Away"}
          homeName={home?.name ?? "Home"}
          lineups={lineups.map((row) => ({
            playerId: row.playerId,
            isHome: row.isHome,
            battingOrder: row.battingOrder,
            position: row.position,
            pitchingOrder: row.pitchingOrder,
            name: roster.find((player) => player.id === row.playerId)?.displayName ?? "Unknown",
          }))}
          nameOf={Object.fromEntries(roster.map((player) => [player.id, player.displayName]))}
          bench={{ away: benchFor(game.awayTeamId), home: benchFor(game.homeTeamId) }}
          atBats={appearances.map((row) => ({
            id: row.id,
            sequence: row.sequence,
            inning: row.inning,
            isHomeBatting: row.isHomeBatting,
            batterPlayerId: row.batterPlayerId,
                        // The slot stored with the play, so a substitution never moves an
            // at-bat out of the row it was scored in. Plays recorded before the
            // column existed fall back to the lineup.
            battingSlot: row.battingSlot ?? slotOf.get(row.batterPlayerId) ?? 0,
            result: row.result,
            fielders: row.fielders,
            rbis: row.rbis,
            batterScored: row.batterScored,
            otherRunsScored: row.otherRunsScored,
            unearnedRuns: row.unearnedRuns,
            outsRecorded: row.outsRecorded,
            errorPosition: row.errorPosition,
            note: row.note,
          }))}
          appearances={appearances.map((row) => ({
            sequence: row.sequence,
            inning: row.inning,
            isHomeBatting: row.isHomeBatting,
            batterPlayerId: row.batterPlayerId,
            pitcherPlayerId: row.pitcherPlayerId,
            result: row.result,
            fielders: row.fielders,
            rbis: row.rbis,
            batterScored: row.batterScored,
            otherRunsScored: row.otherRunsScored,
            unearnedRuns: row.unearnedRuns,
            outsRecorded: row.outsRecorded,
            errorPosition: row.errorPosition,
            errorPlayerId: row.errorPlayerId,
            stolenBases: row.stolenBases,
            // Without these the diamond re-infers the bases from the results
            // alone and never sees what actually happened - runners the record
            // says came home stayed standing on the bases on screen.
            basesAfter: row.basesAfter,
            runnersScored: row.runnersScored,
          }))}
        />
      ) : (
        <div className="grid gap-8 xl:grid-cols-2">
          <LineupEditor
            scorecardId={scorecardId}
            isHome={false}
            teamName={away?.name ?? "Away"}
            roster={rosterFor(game.awayTeamId)}
          />
          <LineupEditor
            scorecardId={scorecardId}
            isHome
            teamName={home?.name ?? "Home"}
            roster={rosterFor(game.homeTeamId)}
          />
        </div>
      )}
    </PageShell>
  );
}
