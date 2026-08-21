"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  basesBefore,
  currentBases,
  extraInningsRunner,
  gameState,
  REGULATION_INNINGS,
  type StoredPlateAppearance,
} from "@/app/derive-box-score";
import { advance, decodeRunners, encodeBases, encodeRunners, runnersOn } from "@/app/bases";
import { AtBatDialog, EMPTY_DRAFT, type AtBatDraft } from "./AtBatDialog";
import { ScoreGrid } from "./ScoreGrid";
import { DefensePanel } from "./DefensePanel";
import { BaseDiamond } from "./BaseDiamond";
import { LivePitching } from "./LivePitching";
import { SubstitutionPanel } from "./SubstitutionPanel";
import type { LoggedAtBat } from "./AtBatLog";
import { nextInOrder, POSITION_NUMBER, type ResultCode } from "@/app/scoring";

type LineupRow = {
  playerId: number;
  isHome: boolean;
  battingOrder: number | null;
  position: string;
  pitchingOrder: number | null;
  name: string;
  /** Set while they are away from the field; they keep their batting slot. */
  leftAtSequence?: number | null;
};

export function ScoringBoard({
  scorecardId,
  awayName,
  homeName,
  lineups,
  appearances,
  atBats,
  nameOf,
  bench,
  runnerOuts,
  fieldingChanges,
  starters,
  undoable,
}: {
  scorecardId: number;
  awayName: string;
  homeName: string;
  lineups: LineupRow[];
  appearances: StoredPlateAppearance[];
  atBats: LoggedAtBat[];
  nameOf: Record<number, string>;
  bench: { away: { id: number; name: string }[]; home: { id: number; name: string }[] };
  /** Runners retired on the bases, with the half-inning each happened in. */
  runnerOuts: {
    id: number;
    runnerPlayerId: number;
    kind: string;
    base: string;
    putoutPlayerId?: number | null;
    inning: number;
    isHomeBatting: boolean;
  }[];
  /** Every rearrangement in the field, oldest first. */
  fieldingChanges: {
    id: number;
    isHome: boolean;
    playerId: number;
    position: string;
    inning: number;
  }[];
  /** Who was on the card at the first pitch, so a substitute reads as one. */
  starters: number[];
  /** What the undo button would take back, or null when nothing would. */
  undoable: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<AtBatDraft>(EMPTY_DRAFT);
  const [editing, setEditing] = useState<LoggedAtBat | null>(null);
  /** Who the umpire is about to bring in, before they confirm it. */
  const [warmingUp, setWarmingUp] = useState<string>("");

  const state = useMemo(() => gameState(appearances), [appearances]);
  const bases = useMemo(() => currentBases(appearances), [appearances]);

  // A player who has walked off is not standing anywhere, but he keeps his
  // place in the order: people in this league come back, and rebuilding the
  // lineup around every disappearance would be worse than skipping a turn.
  const onField = (row: LineupRow) =>
    row.leftAtSequence === null || row.leftAtSequence === undefined;

  const orderFor = (isHome: boolean) =>
    lineups
      .filter((row) => row.isHome === isHome && row.battingOrder !== null)
      .sort((a, b) => (a.battingOrder ?? 0) - (b.battingOrder ?? 0));

  // Two different lists, on purpose. The card shows every slot, including the
  // man who has wandered off - his innings are on it and he is coming back.
  // The turn passes over him, because he is not there to hit, and this is the
  // list the server uses to decide the same thing.
  const battingOrder = orderFor(state.isHomeBatting).filter(onField);
  // Whose turn it is, worked out the same way the server works it out when the
  // at-bat is recorded. It used to be a count of plate appearances modulo the
  // lineup size, which drifts the moment the order is not a clean nine - a
  // deleted at-bat, a skipped batter, or a player leaving the game all shift
  // it, and the highlighted cell then names someone who is not up.
  const lastForSide = atBats
    .filter((atBat) => atBat.isHomeBatting === state.isHomeBatting)
    .sort((a, b) => b.sequence - a.sequence)[0];
  const batter = nextInOrder(battingOrder, lastForSide?.battingSlot ?? null);

  // Who is aboard, nearest home first - the order they would score in. The
  // batter is at the plate, not on a base: if a stale reading leaves him among
  // the runners he can be ticked as having scored and counted again as the
  // batter, which is one man and two runs.
  //
  // While correcting an earlier play this is the bases as they stood when that
  // play began, not as they stand now. The live diamond answers "who is on
  // now", which is the wrong question in a half-inning that is already over -
  // and it made a run that was missed at the time impossible to add, because
  // the man who scored it was not in the list to tick.
  const entryBases = editing ? basesBefore(appearances, editing.sequence) : bases;
  const entryBatter = editing ? editing.batterPlayerId : batter?.playerId;

  const runners = runnersOn(entryBases)
    .filter((runner) => runner.playerId !== entryBatter)
    .map((runner) => ({
      playerId: runner.playerId,
      name: nameOf[runner.playerId] ?? "Runner",
      base: runner.base,
    }));

  const fieldingSide = lineups.filter(
    (row) => row.isHome !== state.isHomeBatting && onField(row),
  );
  // The mound is read from the lineup rather than held in the browser. It was
  // a dropdown whose value existed only on this page: it decided who every
  // later at-bat was charged to, left no record that a change had happened,
  // and a refresh put the old pitcher back.
  const activePitcher =
    fieldingSide
      .filter((row) => row.pitchingOrder !== null)
      .sort((a, b) => (b.pitchingOrder ?? 0) - (a.pitchingOrder ?? 0))[0]?.playerId ?? null;

  const innings = Math.max(6, state.inning);

  async function send(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json()) as {
        error?: string;
        inningsShifted?: number;
        movedOuts?: number;
        lostOuts?: number;
      };
      if (!response.ok) throw new Error(result.error ?? "Something went wrong.");

      // Anything the change did beyond what was asked for is said out loud,
      // rather than left for the umpire to notice in the outs.
      const told = [
        result.inningsShifted
          ? `${result.inningsShifted} later at-bat${result.inningsShifted === 1 ? "" : "s"} moved to a different half-inning`
          : null,
        result.movedOuts
          ? `${result.movedOuts} runner out${result.movedOuts === 1 ? "" : "s"} moved to the play before`
          : null,
        result.lostOuts
          ? `${result.lostOuts} runner out${result.lostOuts === 1 ? "" : "s"} removed with it - there was no earlier play to keep ${result.lostOuts === 1 ? "it" : "them"} on`
          : null,
      ].filter(Boolean);
      if (told.length > 0) setNotice(`${told.join("; ")}.`);
      setDraft(EMPTY_DRAFT);
      setEditing(null);
      router.refresh();
      return true;
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const payload = () => {
    const batterScored = draft.result === "HR" ? true : draft.batterScored;
    // A home run empties the bases, so everyone aboard scored whether or not
    // the umpire ticked them.
    const scored =
      draft.result === "HR" ? runners.map((runner) => runner.playerId) : draft.scoredRunners;

    // The bases as they stand after this play are stored with it, so the
    // diamond survives a reload and an edit to an earlier at-bat replays from
    // a known state rather than being guessed at again.
    const after = advance(bases, {
      batterPlayerId: batter?.playerId ?? 0,
      result: draft.result || "OTHER",
      scored,
      outRunners: draft.outRunners,
      // On a fielder's choice the batter reaches; on a double play he usually
      // does not. The umpire says which, so the bases follow rather than the
      // result code deciding for them.
      batterTo: draft.batterOut ? null : undefined,
    });

    return {
      result: draft.result as ResultCode,
      fielders: draft.fielders || null,
      rbis: draft.rbis,
      batterScored,
      otherRunsScored: scored.length,
      unearnedRuns: draft.unearnedRuns,
      outsRecorded: draft.outsRecorded,
      // The fielder the umpire named, and his position at the time. Both were
      // being thrown away here - the dialog asked who made the error and the
      // answer never left the browser, so the error reached nobody's line.
      errorPlayerId: draft.errorPlayerId ? Number(draft.errorPlayerId) : null,
      errorPosition: erredAt(draft.errorPlayerId),
      stolenBases: draft.stolenBases,
      basesAfter: encodeBases(after.bases),
      runnersScored: encodeRunners(scored),
      outRunners: draft.outRunners,
      batterOut: draft.batterOut,
      outPutouts: draft.outPutouts,
      note: draft.note || null,
    };
  };

  const record = () =>
    batter && activePitcher
      ? send(`/api/scorecards/${scorecardId}/at-bats`, "POST", {
          batterPlayerId: batter.playerId,
          pitcherPlayerId: activePitcher,
          ...payload(),
        })
      : undefined;

  const saveEdit = () =>
    editing ? send(`/api/scorecards/${scorecardId}/at-bats/${editing.id}`, "PATCH", payload()) : undefined;

  async function removeEdit() {
    if (!editing || !confirm("Delete this at-bat? Later innings will shift.")) return;
    await send(`/api/scorecards/${scorecardId}/at-bats/${editing.id}`, "DELETE");
  }

  function pick(atBat: LoggedAtBat | null) {
    if (!atBat) return;
    setEditing(atBat);
    setDraft({
      result: atBat.result as ResultCode,
      fielders: atBat.fielders ?? "",
      rbis: atBat.rbis,
      batterScored: atBat.batterScored,
      otherRunsScored: atBat.otherRunsScored,
      unearnedRuns: atBat.unearnedRuns,
      outsRecorded: atBat.outsRecorded,
      // Loaded rather than blanked: the form sends whatever is in it, so
      // opening a play to fix the RBI would otherwise wipe the error off it.
      errorPlayerId: atBat.errorPlayerId ? String(atBat.errorPlayerId) : "",
      stolenBases: atBat.stolenBases ?? 0,
      // Loaded for the same reason the error is: the form sends whatever is in
      // it, so a blank here would clear the runs off any play reopened to fix
      // something else.
      scoredRunners: decodeRunners(atBat.runnersScored),
      outRunners: [],
      batterOut: (atBat.outsRecorded ?? 0) > 0,
      outPutouts: {},
      note: atBat.note ?? "",
    });
  }

  async function undo() {
    if (!undoable) return;
    if (!confirm(`Undo "${undoable}"?`)) return;
    if (await send(`/api/scorecards/${scorecardId}/undo`, "POST")) {
      // The entry panel may be holding the play that just stopped existing.
      setEditing(null);
      setDraft(EMPTY_DRAFT);
    }
  }

  async function finish() {
    if (!confirm("Finish the game and send it to the head umpire? Scoring stops here.")) return;
    if (await send(`/api/scorecards/${scorecardId}/finish`, "POST")) router.push("/umpire");
  }

  /**
   * The extra-innings runner, marked on his own line.
   *
   * He is placed on second without batting, so nothing appears in his row for
   * that inning - and if he came round, the run showed in the total with no
   * sign of where it came from. The cell says he was put there, and what
   * became of him.
   */
  const placedRunners = useMemo(() => {
    const marks = new Map<string, { scored: boolean; out: boolean }>();
    const lastInning = Math.max(REGULATION_INNINGS, ...atBats.map((atBat) => atBat.inning));

    for (let inning = REGULATION_INNINGS + 1; inning <= lastInning; inning += 1) {
      for (const isHome of [false, true]) {
        const runner = extraInningsRunner(appearances, inning, isHome);
        if (runner === null) continue;

        // His slot comes from the play he made last inning rather than from
        // the lineup, which may have changed hands under him since.
        const previous = atBats
          .filter((atBat) => atBat.inning === inning - 1 && atBat.isHomeBatting === isHome)
          .sort((a, b) => b.sequence - a.sequence)[0];
        if (!previous) continue;

        const half = appearances.filter(
          (pa) => pa.inning === inning && pa.isHomeBatting === isHome,
        );
        marks.set(`${isHome}:${inning}:${previous.battingSlot}`, {
          scored: half.some((pa) => decodeRunners(pa.runnersScored).includes(runner)),
          out: runnerOuts.some(
            (out) =>
              out.inning === inning &&
              out.isHomeBatting === isHome &&
              out.runnerPlayerId === runner,
          ),
        });
      }
    }
    return marks;
  }, [appearances, atBats, runnerOuts]);

  const fielderList = fieldingSide.map((row) => ({
    playerId: row.playerId,
    name: row.name,
    position: row.position,
  }));

  /**
   * The fielders the entry form offers, which is not always the side out there
   * now. Correcting a play from the half-inning just gone means naming someone
   * from the other team - and offering the current fielders instead made an
   * error in the top of the inning impossible to record, and hid one already
   * recorded, because the man who made it was not in the list to be selected.
   *
   * Everyone on that side is offered, including anyone since gone from the
   * field: they were standing there when the play happened, which is the only
   * thing that matters here.
   */
  const entrySide = editing
    ? lineups.filter((row) => row.isHome !== editing.isHomeBatting)
    : fieldingSide;

  const entryFielders = entrySide.map((row) => ({
    playerId: row.playerId,
    name: row.name,
    position: row.position,
  }));

  /** The scorebook number of whoever is charged with an error, if anyone is. */
  const erredAt = (playerId: string) => {
    if (!playerId) return null;
    const fielder = entrySide.find((row) => row.playerId === Number(playerId));
    return fielder ? POSITION_NUMBER[fielder.position] ?? null : null;
  };

  /**
   * Putouts and errors so far, beside the man who made them. A fielding line
   * that only exists in the published box score is no use to the umpire, who
   * needs to see that the putout he just entered landed on the right player
   * while there is still time to correct it.
   */
  const fieldingTally = useMemo(() => {
    const tally = new Map<number, { putouts: number; errors: number }>();
    const bump = (playerId: number | null | undefined, key: "putouts" | "errors") => {
      if (!playerId) return;
      const line = tally.get(playerId) ?? { putouts: 0, errors: 0 };
      line[key] += 1;
      tally.set(playerId, line);
    };
    for (const pa of appearances) {
      bump(pa.putoutPlayerId, "putouts");
      bump(pa.errorPlayerId, "errors");
    }
    // Tag plays and pickoffs are putouts too, and they are not plate
    // appearances - leaving them out would undercount every catcher.
    for (const out of runnerOuts) bump(out.putoutPlayerId, "putouts");
    return tally;
  }, [appearances, runnerOuts]);

  /**
   * What has already been changed on this side, in the order it happened: who
   * came in for whom, and who moved where. Only where everyone is standing now
   * was visible before, which made a mistaken substitution impossible to spot.
   */
  const changeLogFor = (fieldingIsHome: boolean) => {
    const entered = lineups
      .filter((row) => row.isHome === fieldingIsHome && !starters.includes(row.playerId))
      .map((row) => ({
        key: `sub-${row.playerId}`,
        text: `${row.name} entered the game at ${row.position}`,
      }));
    const moved = fieldingChanges
      .filter((change) => change.isHome === fieldingIsHome)
      .map((change) => ({
        key: `move-${change.id}`,
        text: `${nameOf[change.playerId] ?? "Player"} moved to ${change.position} in inning ${change.inning}`,
      }));
    const gone = lineups
      .filter((row) => row.isHome === fieldingIsHome && !onField(row))
      .map((row) => ({
        key: `left-${row.playerId}`,
        text: `${row.name} is away from the field`,
      }));
    return [...entered, ...moved, ...gone];
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-slate-800/80 bg-slate-900/40 px-5 py-4">
        <div className="flex items-center gap-4">
          <Score label={awayName} runs={state.awayScore} active={!state.isHomeBatting} />
          <span className="text-slate-600">–</span>
          <Score label={homeName} runs={state.homeScore} active={state.isHomeBatting} />
        </div>
        <div className="ml-auto flex items-center gap-5 text-sm">
          <span className="font-bold uppercase tracking-wider text-sky-400">
            {state.isHomeBatting ? "Bot" : "Top"} {state.inning}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Outs</span>
            <span className="flex gap-1">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={`h-3 w-3 rounded-full border ${
                    index < state.outs ? "border-amber-400 bg-amber-400" : "border-slate-600"
                  }`}
                />
              ))}
            </span>
          </span>
          {/* One undo for everything, at the top where the game state is. An
              umpire who has just done the wrong thing does not think about
              which panel it belonged to - and before this, some actions could
              be taken back, some needed an at-bat deleted to get at them, and
              a pitching change could not be reversed at all. It names what it
              will take back, because undoing blind mid-game is its own
              mistake. */}
          <button
            type="button"
            onClick={undo}
            disabled={busy || !undoable}
            title={undoable ?? "Nothing to undo"}
            className="rounded-md border border-amber-700/70 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
          >
            {undoable ? `Undo: ${undoable}` : "Nothing to undo"}
          </button>
          <button
            type="button"
            onClick={finish}
            disabled={busy || appearances.length === 0}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-40"
          >
            Finish game
          </button>
        </div>
      </div>

      {notice && <p className="text-xs text-amber-400">{notice}</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {/* One row of panels, all the same shell, then the scorecards beneath at
          full width. Entry, the bases, the pitching lines and the bench are
          each their own box rather than one long column, so the umpire is not
          scrolling to reach the thing they need next. */}
      <div className="grid gap-3 xl:grid-cols-4">
        <section className="panel">
          <div className="panel-head">
            <h3 className="panel-title">
              {editing ? "Editing an earlier at-bat" : "Now batting"}
            </h3>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(null); setDraft(EMPTY_DRAFT); }}
                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300"
              >
                Back to live
              </button>
            )}
          </div>
          <div className="p-3">
            <p className="mb-3 text-base font-black leading-tight">
              {editing
                ? `${nameOf[editing.batterPlayerId] ?? "?"} · ${editing.isHomeBatting ? "Bot" : "Top"} ${editing.inning}`
                : batter
                  ? `${batter.battingOrder}. ${batter.name}`
                  : "No batter"}
            </p>

            <AtBatDialog
              draft={draft}
              setDraft={setDraft}
              fielders={entryFielders}
              runners={runners}
              busy={busy}
              submitLabel={editing ? "Save change" : "Record at-bat"}
              onSubmit={editing ? saveEdit : record}
              onCancel={editing ? () => { setEditing(null); setDraft(EMPTY_DRAFT); } : undefined}
            />

            {editing && (
              <button
                type="button"
                onClick={removeEdit}
                disabled={busy}
                className="mt-2 w-full rounded-md border border-rose-800 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-950/40"
              >
                Delete this at-bat
              </button>
            )}
          </div>
        </section>

        {/* While a past play is open for correction the diamond shows the
            bases as they stood when that play began, not as they stand now.
            The two panels sat side by side answering different questions -
            the form offering the runner who was on then, the diamond drawing
            whoever is on in the current inning - and the disagreement read as
            the form naming the wrong man.

            Moves are shut off there: a drag would be sent against the live
            half-inning, which is not the one on screen. */}
        <BaseDiamond
          bases={entryBases}
          asOf={editing ? `inning ${editing.inning}, before this play` : null}
          nameOf={nameOf}
          busy={busy || Boolean(editing)}
          fielders={fielderList}
          onMove={(playerId, to, reason, note, errorPlayerId) =>
            send(`/api/scorecards/${scorecardId}/runners`, "POST", {
              playerId,
              to,
              reason,
              note,
              errorPlayerId,
            })
          }
          recordedOuts={runnerOuts
            .filter(
              (out) => out.inning === state.inning && out.isHomeBatting === state.isHomeBatting,
            )
            .map((out) => ({
              id: out.id,
              runnerName: nameOf[out.runnerPlayerId] ?? "Runner",
              kind: out.kind,
              base: out.base,
            }))}
          onUndoOut={(outId) =>
            send(`/api/scorecards/${scorecardId}/runner-outs?outId=${outId}`, "DELETE")
          }
          onOut={(playerId, kind, fielded) =>
            send(`/api/scorecards/${scorecardId}/runner-outs`, "POST", { playerId, kind, fielded })
          }
        />

        {/* Who is pitching and what they have done are one subject, so they
            are one card rather than two stacked on each other. */}
        <section className="panel">
          <div className="panel-head">
            <h3 className="panel-title">On the mound</h3>
          </div>
          <div className="p-3">
            {/* Bringing a reliever in is one of the biggest things an umpire
                does - it decides the win, the loss, the save and every earned
                run after it - so it is a deliberate act with a confirm, not a
                dropdown that rewrites the game as a side effect of being
                clicked. */}
            <p className="mb-2 text-xs text-slate-400">
              Pitching:{" "}
              <span className="font-bold text-slate-100">
                {activePitcher ? nameOf[activePitcher] ?? "Unknown" : "Nobody yet"}
              </span>
            </p>
            <div className="flex gap-1.5">
              <select
                value={warmingUp}
                onChange={(event) => setWarmingUp(event.target.value)}
                className="ui-select w-full !py-1 text-xs"
              >
                <option value="">Bring in a reliever…</option>
                {fieldingSide
                  .filter((row) => row.playerId !== activePitcher)
                  .map((row) => (
                    <option key={row.playerId} value={row.playerId}>
                      {row.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!warmingUp || busy}
                onClick={async () => {
                  const name = nameOf[Number(warmingUp)] ?? "that player";
                  if (!confirm(`Bring ${name} in to pitch?`)) return;
                  const done = await send(
                    `/api/scorecards/${scorecardId}/pitching-change`,
                    "POST",
                    { playerId: Number(warmingUp) },
                  );
                  if (done) setWarmingUp("");
                }}
                className="shrink-0 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
              >
                Bring in
              </button>
            </div>
          </div>

          <LivePitching
            awayName={awayName}
            homeName={homeName}
            away={state.awayPitching}
            home={state.homePitching}
            nameOf={nameOf}
            activePitcherId={activePitcher}
          />
        </section>

        <div className="space-y-3">
          <SubstitutionPanel
            scorecardId={scorecardId}
            awayName={awayName}
            homeName={homeName}
            lineups={lineups}
            bench={bench}
            busy={busy}
          />

          {/* Both sides, not just the one in the field. A position change is
              agreed between innings as often as during one, and an umpire who
              can only touch the fielding team has to wait for the sides to
              turn over before recording something that has already happened. */}
          {[false, true].map((isHome) => (
            <DefensePanel
              key={String(isHome)}
              scorecardId={scorecardId}
              isHome={isHome}
              teamName={isHome ? homeName : awayName}
              inTheField={isHome !== state.isHomeBatting}
              fielders={lineups
                .filter((row) => row.isHome === isHome && onField(row))
                .map((row) => ({
                  playerId: row.playerId,
                  name: row.name,
                  position: row.position,
                  putouts: fieldingTally.get(row.playerId)?.putouts ?? 0,
                  errors: fieldingTally.get(row.playerId)?.errors ?? 0,
                }))}
              changeLog={changeLogFor(isHome)}
              onWithdraw={(playerId) =>
                send(`/api/scorecards/${scorecardId}/withdraw`, "POST", { playerId })
              }
              away={lineups
                .filter((row) => row.isHome === isHome && !onField(row))
                .map((row) => ({
                  playerId: row.playerId,
                  name: row.name,
                  position: row.position,
                }))}
              onReturn={(playerId, position) =>
                send(`/api/scorecards/${scorecardId}/withdraw`, "POST", {
                  playerId,
                  undo: true,
                  position,
                })
              }
              busy={busy}
              bench={isHome ? bench.home : bench.away}
              inning={state.inning}
            />
          ))}
        </div>
      </div>

      {/* Both scorecards stay on screen; the side at bat is live and the other
          is dimmed, so the game reads as one card rather than two. Each grid
          gets the full width and scrolls sideways once the innings run past
          it. */}
      {[false, true].map((isHome) => (
        <section key={String(isHome)}>
          <h3 className="mb-1.5 flex items-baseline gap-2 text-xs font-bold uppercase tracking-wider">
            <span className={isHome === state.isHomeBatting ? "text-sky-400" : "text-slate-500"}>
              {isHome ? homeName : awayName}
            </span>
            {isHome === state.isHomeBatting && (
              <span className="text-[10px] font-medium normal-case text-slate-500">
                batting — the highlighted cell is next
              </span>
            )}
          </h3>
          <div className={isHome === state.isHomeBatting ? "" : "opacity-50"}>
            <ScoreGrid
              // An away player still has his slot, so the card shows a dash
              // where his position would be - the umpire skips his turn rather
              // than wondering why nobody is out there.
              order={orderFor(isHome).map((row) => ({
                ...row,
                position: onField(row) ? row.position : "—",
              }))}
              atBats={atBats.filter((atBat) => atBat.isHomeBatting === isHome)}
              placedRunners={placedRunners}
              isHomeSide={isHome}
              innings={innings}
              activeSlot={batter?.battingOrder ?? null}
              activeInning={state.inning}
              isActive={isHome === state.isHomeBatting}
              selectedId={editing?.id ?? null}
              onPick={(atBat) => pick(atBat)}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

function Score({ label, runs, active }: { label: string; runs: number; active: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`text-sm ${active ? "font-bold text-white" : "text-slate-400"}`}>{label}</span>
      <span className="text-2xl font-black tabular-nums">{runs}</span>
    </span>
  );
}
