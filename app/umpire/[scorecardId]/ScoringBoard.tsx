"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { currentBases, gameState, type StoredPlateAppearance } from "@/app/derive-box-score";
import { advance, encodeBases, encodeRunners, runnersOn } from "@/app/bases";
import { AtBatDialog, EMPTY_DRAFT, type AtBatDraft } from "./AtBatDialog";
import { ScoreGrid } from "./ScoreGrid";
import { DefensePanel } from "./DefensePanel";
import { BaseDiamond } from "./BaseDiamond";
import { LivePitching } from "./LivePitching";
import { SubstitutionPanel } from "./SubstitutionPanel";
import type { LoggedAtBat } from "./AtBatLog";
import type { ResultCode } from "@/app/scoring";

type LineupRow = {
  playerId: number;
  isHome: boolean;
  battingOrder: number | null;
  position: string;
  pitchingOrder: number | null;
  name: string;
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
}: {
  scorecardId: number;
  awayName: string;
  homeName: string;
  lineups: LineupRow[];
  appearances: StoredPlateAppearance[];
  atBats: LoggedAtBat[];
  nameOf: Record<number, string>;
  bench: { away: { id: number; name: string }[]; home: { id: number; name: string }[] };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<AtBatDraft>(EMPTY_DRAFT);
  const [editing, setEditing] = useState<LoggedAtBat | null>(null);
  const [pitcherId, setPitcherId] = useState<number | null>(null);

  const state = useMemo(() => gameState(appearances), [appearances]);
  const bases = useMemo(() => currentBases(appearances), [appearances]);

  const orderFor = (isHome: boolean) =>
    lineups
      .filter((row) => row.isHome === isHome && row.battingOrder !== null)
      .sort((a, b) => (a.battingOrder ?? 0) - (b.battingOrder ?? 0));

  const battingOrder = orderFor(state.isHomeBatting);
  const completed = appearances.filter((pa) => pa.isHomeBatting === state.isHomeBatting).length;
  const batter = battingOrder[battingOrder.length > 0 ? completed % battingOrder.length : 0];

  // Who is aboard, nearest home first - the order they would score in. The
  // batter is at the plate, not on a base: if a stale reading leaves him among
  // the runners he can be ticked as having scored and counted again as the
  // batter, which is one man and two runs.
  const runners = runnersOn(bases)
    .filter((runner) => runner.playerId !== batter?.playerId)
    .map((runner) => ({
      playerId: runner.playerId,
      name: nameOf[runner.playerId] ?? "Runner",
      base: runner.base,
    }));

  const fieldingSide = lineups.filter((row) => row.isHome !== state.isHomeBatting);
  const defaultPitcher = fieldingSide
    .filter((row) => row.pitchingOrder !== null)
    .sort((a, b) => (b.pitchingOrder ?? 0) - (a.pitchingOrder ?? 0))[0];
  const activePitcher = pitcherId ?? defaultPitcher?.playerId ?? null;

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
      const result = (await response.json()) as { error?: string; inningsShifted?: number };
      if (!response.ok) throw new Error(result.error ?? "Something went wrong.");
      if (result.inningsShifted) {
        setNotice(
          `${result.inningsShifted} later at-bat${result.inningsShifted === 1 ? "" : "s"} moved to a different half-inning.`,
        );
      }
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
    });

    return {
      result: draft.result as ResultCode,
      fielders: draft.fielders || null,
      rbis: draft.rbis,
      batterScored,
      otherRunsScored: scored.length,
      unearnedRuns: draft.unearnedRuns,
      outsRecorded: draft.outsRecorded,
      errorPosition: null,
      stolenBases: draft.stolenBases,
      basesAfter: encodeBases(after.bases),
      runnersScored: encodeRunners(scored),
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
      errorPlayerId: "",
      stolenBases: 0,
      scoredRunners: [],
      note: atBat.note ?? "",
    });
  }

  async function finish() {
    if (!confirm("Finish the game and send it to the head umpire? Scoring stops here.")) return;
    if (await send(`/api/scorecards/${scorecardId}/finish`, "POST")) router.push("/umpire");
  }

  const fielderList = fieldingSide.map((row) => ({
    playerId: row.playerId,
    name: row.name,
    position: row.position,
  }));

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
              fielders={fielderList}
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

        <BaseDiamond
          bases={bases}
          nameOf={nameOf}
          busy={busy}
          onMove={(playerId, to, stole) =>
            send(`/api/scorecards/${scorecardId}/runners`, "POST", { playerId, to, stole })
          }
        />

        <div className="space-y-3">
          <section className="panel">
            <div className="panel-head">
              <h3 className="panel-title">On the mound</h3>
            </div>
            <div className="p-3">
              <select
                value={activePitcher ?? ""}
                onChange={(event) => setPitcherId(Number(event.target.value))}
                className="ui-select w-full"
              >
                {fieldingSide.map((row) => (
                  <option key={row.playerId} value={row.playerId}>{row.name}</option>
                ))}
              </select>
            </div>
          </section>

          <LivePitching
            awayName={awayName}
            homeName={homeName}
            away={state.awayPitching}
            home={state.homePitching}
            nameOf={nameOf}
            activePitcherId={activePitcher}
          />
        </div>

        <div className="space-y-3">
          <SubstitutionPanel
            scorecardId={scorecardId}
            awayName={awayName}
            homeName={homeName}
            lineups={lineups}
            bench={bench}
            busy={busy}
          />

          <DefensePanel
            scorecardId={scorecardId}
            isHome={!state.isHomeBatting}
            teamName={state.isHomeBatting ? awayName : homeName}
            fielders={fielderList}
            bench={state.isHomeBatting ? bench.away : bench.home}
            inning={state.inning}
          />
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
              order={orderFor(isHome)}
              atBats={atBats.filter((atBat) => atBat.isHomeBatting === isHome)}
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
