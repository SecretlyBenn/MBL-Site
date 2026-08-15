import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  fieldingChanges,
  games,
  players,
  plateAppearances,
  runnerOuts,
  scorecardLineups,
  scorecards,
  teams,
} from "@/db/schema";
import { requireRole } from "@/app/roles";
import { PageShell } from "@/app/SiteNav";
import { POSITION_NUMBER, type RunnerOutKind } from "@/app/scoring";
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
  // Which runners were retired on the bases, and in which half-inning - a
  // batter's cell shows what became of them after they reached, and the out
  // hangs off whichever play was standing at the time rather than their own.
  const outs = await db
    .select({
      id: runnerOuts.id,
      runnerPlayerId: runnerOuts.runnerPlayerId,
      kind: runnerOuts.kind,
      base: runnerOuts.base,
      putoutPlayerId: runnerOuts.putoutPlayerId,
      inning: plateAppearances.inning,
      isHomeBatting: plateAppearances.isHomeBatting,
    })
    .from(runnerOuts)
    .innerJoin(plateAppearances, eq(runnerOuts.plateAppearanceId, plateAppearances.id))
    .where(eq(runnerOuts.scorecardId, scorecardId));

  // Every rearrangement in the field, so the panel can show what has already
  // been changed rather than only where everyone is standing now.
  const moves = await db
    .select()
    .from(fieldingChanges)
    .where(eq(fieldingChanges.scorecardId, scorecardId))
    .orderBy(asc(fieldingChanges.appliedAtSequence));

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

  // A fielder's position as its scorebook number, for the "TAG 4" on a cell.
  const positionNumberOf = new Map(
    lineups.flatMap((row) => {
      const number = POSITION_NUMBER[row.position];
      return number ? [[row.playerId, number] as const] : [];
    }),
  );

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
          fieldingChanges={moves.map((move) => ({
            id: move.id,
            isHome: move.isHome,
            playerId: move.playerId,
            position: move.position,
            inning: move.inning,
          }))}
          starters={lineups.filter((row) => row.isStarter).map((row) => row.playerId)}
          runnerOuts={outs.map((out) => ({
            id: out.id,
            runnerPlayerId: out.runnerPlayerId,
            kind: out.kind,
            base: out.base,
            putoutPlayerId: out.putoutPlayerId,
            inning: out.inning,
            isHomeBatting: out.isHomeBatting,
          }))}
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
            stolenBases: row.stolenBases,
            note: row.note,
            ...(() => {
              const own = outs.find(
                (out) =>
                  out.runnerPlayerId === row.batterPlayerId &&
                  out.inning === row.inning &&
                  out.isHomeBatting === row.isHomeBatting,
              );
              return {
                retiredAs: (own?.kind ?? null) as RunnerOutKind | null,
                retiredByPosition:
                  own?.putoutPlayerId
                    ? positionNumberOf.get(own.putoutPlayerId) ?? null
                    : null,
              };
            })(),
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
            putoutPlayerId: row.putoutPlayerId,
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
