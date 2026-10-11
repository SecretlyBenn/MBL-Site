import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inningsPerGameForScorecard } from "@/db/queries";
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
import { inningAt } from "@/app/derive-box-score";
import { BENCH } from "@/app/fielding-history";
import { requireRole } from "@/app/roles";
import { latestAction } from "@/db/undo";
import { PageShell } from "@/app/SiteNav";
import { POSITION_NUMBER, type RunnerOutKind } from "@/app/scoring";
import { LineupEditor } from "./LineupEditor";
import { ScoringBoard } from "./ScoringBoard";

export const metadata: Metadata = {
  title: "Scorecard",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function ScorecardPage({
  params,
  searchParams,
}: {
  params: Promise<{ scorecardId: string }>;
  searchParams: Promise<{ lineups?: string }>;
}) {
  const scorecardId = Number((await params).scorecardId);
  // Asked for by the link on the board, which only appears while the game has
  // not been scored. A link rather than a button because this page is rendered
  // on the server and there is nothing else to keep.
  const wantsEditors = (await searchParams).lineups === "1";
  if (!Number.isInteger(scorecardId)) notFound();
  await requireRole(["UMPIRE", "HEAD_UMPIRE", "ADMIN"], `/umpire/${scorecardId}`);

  const db = getDb();
  const scorecard = await db.query.scorecards.findFirst({ where: eq(scorecards.id, scorecardId) });
  // Six innings in the MBL, five in the MCBA - it decides when this game is
  // over and from which inning a runner is placed on second.
  const inningsPerGame = await inningsPerGameForScorecard(scorecardId);
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
      outAt: runnerOuts.outAt,
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
  // Anybody a substitution has taken out. Once replaced a player is out of the
  // game and cannot come back, which nothing enforced: the lineup row changes
  // hands, so the man coming off leaves no row behind and reappeared in the
  // list of players available to come on. What marks him is the move to the
  // bench with nothing of his own left on the card - somebody who merely
  // stepped away kept his row, which is how the two are told apart on the
  // older cards that have both.
  const replaced = new Set(
    moves.filter((move) => move.position === BENCH && !inLineup.has(move.playerId)).map((move) => move.playerId),
  );
  const benchFor = (teamId: number | undefined) =>
    roster
      .filter(
        (player) =>
          player.teamId === teamId && !inLineup.has(player.id) && !replaced.has(player.id),
      )
      .map((player) => ({ id: player.id, name: player.displayName }));

  // What the undo button will take back, named so the umpire can see what
  // they are about to reverse before they press it.
  const undoable = await latestAction(scorecardId);

  const awayLineup = lineups.filter((row) => !row.isHome);
  const homeLineup = lineups.filter((row) => row.isHome);
  const ready = awayLineup.length > 0 && homeLineup.length > 0;
  // Until somebody has batted, a lineup is still only a lineup: changing one
  // is a correction to who is starting where, not a rearrangement during a
  // game. This page used to swap the editors for the scoring board the moment
  // both sides had a lineup at all, with no way back, which left the defence
  // panel as the only way to move anybody - and that writes the move down as
  // having happened in the first inning. See drizzle/0085.
  const scored = appearances.length > 0;
  const editing = !ready || (!scored && wantsEditors);

  const title = `${away?.name ?? "Away"} at ${home?.name ?? "Home"}`;

  return (
    <PageShell
      wide
      title={title}
      subtitle={editing ? (ready ? "Changing the lineups" : "Set the lineups to begin") : "Scoring"}
    >
      {!editing ? (
        <div className="space-y-5">
          {!scored && (
            <p className="rounded-md border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              Nobody has batted yet, so if somebody is in the wrong place{" "}
              <Link
                href={`/umpire/${scorecardId}?lineups=1`}
                className="font-semibold text-sky-400 transition-colors hover:text-sky-300"
              >
                change the lineups
              </Link>{" "}
              rather than moving them in the field - before the first play that
              is a correction, not a position change.
            </p>
          )}
          <ScoringBoard
            inningsPerGame={inningsPerGame}
            scorecardId={scorecardId}
            awayName={away?.name ?? "Away"}
            homeName={home?.name ?? "Home"}
            lineups={lineups.map((row) => ({
              playerId: row.playerId,
              isHome: row.isHome,
              battingOrder: row.battingOrder,
              position: row.position,
              pitchingOrder: row.pitchingOrder,
              leftAtSequence: row.leftAtSequence,
              name: roster.find((player) => player.id === row.playerId)?.displayName ?? "Unknown",
            }))}
            nameOf={Object.fromEntries(roster.map((player) => [player.id, player.displayName]))}
            bench={{ away: benchFor(game.awayTeamId), home: benchFor(game.homeTeamId) }}
            fieldingChanges={moves.map((move) => ({
              id: move.id,
              isHome: move.isHome,
              playerId: move.playerId,
              position: move.position,
              appliedAtSequence: move.appliedAtSequence,
              // Derived here as well as on the screen. The stored inning goes
              // stale the moment an at-bat is deleted, and a browser holding an
              // older copy of the page reads this field rather than working it
              // out - which printed "inning undefined" once the raw column
              // stopped being sent.
              inning: inningAt(appearances, move.appliedAtSequence, inningsPerGame),
            }))}
            starters={lineups.filter((row) => row.isStarter).map((row) => row.playerId)}
            undoable={undoable?.summary ?? null}
            runnerOuts={outs.map((out) => ({
              id: out.id,
              runnerPlayerId: out.runnerPlayerId,
              kind: out.kind,
              base: out.base,
              outAt: out.outAt,
              putoutPlayerId: out.putoutPlayerId,
              inning: out.inning,
              isHomeBatting: out.isHomeBatting,
            }))}
            atBats={appearances.map((row) => ({
              id: row.id,
              sequence: row.sequence,
              inning: row.inning,
              pitcherPlayerId: row.pitcherPlayerId,
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
              // Both of these are read back when a play is reopened to correct
              // it. Without them the form opens blank and saves that blank over
              // whatever was there - the error charged, and the runs scored.
              errorPlayerId: row.errorPlayerId,
              runnersScored: row.runnersScored,
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
        </div>
      ) : (
        <div className="space-y-6">
          {ready && (
            <p className="rounded-md border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              Nothing has been scored yet, so these are still the starting
              lineups and saving one replaces it.{" "}
              <Link
                href={`/umpire/${scorecardId}`}
                className="font-semibold text-sky-400 transition-colors hover:text-sky-300"
              >
                Back to scoring
              </Link>
            </p>
          )}
          <div className="grid gap-8 xl:grid-cols-2">
            <LineupEditor
              scorecardId={scorecardId}
              isHome={false}
              teamName={away?.name ?? "Away"}
              roster={rosterFor(game.awayTeamId)}
              existing={awayLineup.map((row) => ({
                playerId: row.playerId,
                battingOrder: row.battingOrder,
                position: row.position,
                dhForPlayerId: row.dhForPlayerId,
                pitchingOrder: row.pitchingOrder,
              }))}
            />
            <LineupEditor
              scorecardId={scorecardId}
              isHome
              teamName={home?.name ?? "Home"}
              roster={rosterFor(game.homeTeamId)}
              existing={homeLineup.map((row) => ({
                playerId: row.playerId,
                battingOrder: row.battingOrder,
                position: row.position,
                dhForPlayerId: row.dhForPlayerId,
                pitchingOrder: row.pitchingOrder,
              }))}
            />
          </div>
        </div>
      )}
    </PageShell>
  );
}
