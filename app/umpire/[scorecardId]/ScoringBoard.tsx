"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RESULTS, RESULT_BY_CODE, type ResultCode } from "@/app/scoring";
import { gameState, type StoredPlateAppearance } from "@/app/derive-box-score";
import { AtBatLog, type LoggedAtBat } from "./AtBatLog";

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
}: {
  scorecardId: number;
  awayName: string;
  homeName: string;
  lineups: LineupRow[];
  appearances: StoredPlateAppearance[];
  atBats: LoggedAtBat[];
  nameOf: Record<number, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [result, setResult] = useState<ResultCode>("1B");
  const [fielders, setFielders] = useState("");
  const [rbis, setRbis] = useState(0);
  const [batterScored, setBatterScored] = useState(false);
  const [otherRuns, setOtherRuns] = useState(0);
  const [unearned, setUnearned] = useState(0);
  const [outs, setOuts] = useState<number | null>(null);
  const [errorPosition, setErrorPosition] = useState("");
  const [note, setNote] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const state = useMemo(() => gameState(appearances), [appearances]);
  const definition = RESULT_BY_CODE.get(result);
  // The default stands until the umpire overrides it - a groundout is usually
  // one out, but the same result can end an inning differently.
  const effectiveOuts = outs ?? definition?.defaultOuts ?? 0;

  const battingSide = lineups
    .filter((row) => row.isHome === state.isHomeBatting && row.battingOrder !== null)
    .sort((a, b) => (a.battingOrder ?? 0) - (b.battingOrder ?? 0));

  // Whose turn it is: count this side's completed plate appearances and walk
  // that far round the order.
  const completed = appearances.filter((pa) => pa.isHomeBatting === state.isHomeBatting).length;
  const batter = battingSide[completed % Math.max(1, battingSide.length)];

  const pitcher = lineups
    .filter((row) => row.isHome !== state.isHomeBatting && row.pitchingOrder !== null)
    .sort((a, b) => (b.pitchingOrder ?? 0) - (a.pitchingOrder ?? 0))[0];

  const [pitcherId, setPitcherId] = useState<number | null>(null);
  const activePitcher = pitcherId ?? pitcher?.playerId ?? null;

  const fieldingSide = lineups.filter((row) => row.isHome !== state.isHomeBatting);

  function reset() {
    setResult("1B");
    setFielders("");
    setRbis(0);
    setBatterScored(false);
    setOtherRuns(0);
    setUnearned(0);
    setOuts(null);
    setErrorPosition("");
    setNote("");
    setShowAdvanced(false);
  }

  async function record() {
    if (!batter || !activePitcher) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/scorecards/${scorecardId}/at-bats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batterPlayerId: batter.playerId,
          pitcherPlayerId: activePitcher,
          result,
          fielders: fielders || null,
          rbis,
          batterScored,
          otherRunsScored: otherRuns,
          unearnedRuns: unearned,
          outsRecorded: effectiveOuts,
          errorPosition: errorPosition ? Number(errorPosition) : null,
          stolenBases: 0,
          note: note || null,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not record the at-bat.");
      reset();
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!confirm("Finish the game and send it to the head umpire? Scoring stops here.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/scorecards/${scorecardId}/finish`, { method: "POST" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not finish the game.");
      router.push("/umpire");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function undo() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/scorecards/${scorecardId}/at-bats`, { method: "DELETE" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not undo.");
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const grouped = ["Hit", "On base", "Out", "Other"] as const;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
      <div>
        {/* Scoreboard */}
        <div className="mb-4 flex flex-wrap items-center gap-6 rounded-lg border border-slate-800/80 bg-slate-900/40 px-5 py-4">
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
          </div>
        </div>

        {/* At bat */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Now batting</p>
          <p className="mb-4 text-xl font-black">
            {batter ? `${batter.battingOrder}. ${batter.name}` : "No batter"}{" "}
            <span className="text-sm font-medium text-slate-500">{batter?.position}</span>
          </p>

          <label className="ui-field-label mb-3 flex-col !items-start gap-1.5">
            Result
            <select
              value={result}
              onChange={(event) => {
                setResult(event.target.value as ResultCode);
                setOuts(null);
              }}
              className="ui-select w-full"
            >
              {grouped.map((group) => (
                <optgroup key={group} label={group}>
                  {RESULTS.filter((row) => row.group === group).map((row) => (
                    <option key={row.code} value={row.code}>{row.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {definition?.wantsFielders && (
              <label className="ui-field-label flex-col !items-start gap-1.5">
                Fielders
                <input
                  value={fielders}
                  onChange={(event) => setFielders(event.target.value)}
                  placeholder="6-3"
                  className="ui-select w-full"
                />
              </label>
            )}
            <label className="ui-field-label flex-col !items-start gap-1.5">
              RBI
              <input type="number" min={0} max={4} value={rbis} onChange={(event) => setRbis(Number(event.target.value))} className="ui-select w-full" />
            </label>
            <label className="ui-field-label flex-col !items-start gap-1.5">
              Outs
              <input type="number" min={0} max={3} value={effectiveOuts} onChange={(event) => setOuts(Number(event.target.value))} className="ui-select w-full" />
            </label>
            <label className="ui-field-label flex-col !items-start gap-1.5">
              Runs scored
              <input type="number" min={0} max={4} value={otherRuns} onChange={(event) => setOtherRuns(Number(event.target.value))} className="ui-select w-full" />
            </label>
          </div>

          <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={batterScored} onChange={(event) => setBatterScored(event.target.checked)} />
            Batter scored
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="mb-3 text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            {showAdvanced ? "Hide" : "Show"} error, unearned runs and notes
          </button>

          {showAdvanced && (
            <div className="mb-3 grid grid-cols-2 gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-3">
              <label className="ui-field-label flex-col !items-start gap-1.5">
                Error on
                <select value={errorPosition} onChange={(event) => setErrorPosition(event.target.value)} className="ui-select w-full">
                  <option value="">No error</option>
                  {fieldingSide.map((row) => (
                    <option key={row.playerId} value={row.playerId}>{row.position} — {row.name}</option>
                  ))}
                </select>
              </label>
              <label className="ui-field-label flex-col !items-start gap-1.5">
                Unearned runs
                <input type="number" min={0} max={4} value={unearned} onChange={(event) => setUnearned(Number(event.target.value))} className="ui-select w-full" />
              </label>
              <label className="ui-field-label col-span-2 flex-col !items-start gap-1.5 sm:col-span-1">
                Note
                <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="What happened" className="ui-select w-full" />
              </label>
            </div>
          )}

          {result === "OTHER" && !note.trim() && (
            <p className="mb-3 text-xs text-amber-400">
              Describe what happened in the note — that is what makes this reviewable later.
            </p>
          )}
          {error && <p className="mb-3 text-xs text-rose-400">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={record}
              disabled={busy || !batter || (result === "OTHER" && !note.trim())}
              className="flex-1 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
            >
              {busy ? "Recording…" : "Record at-bat"}
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={busy || appearances.length === 0}
              className="rounded-md border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-40"
            >
              Undo last
            </button>
          </div>

          <button
            type="button"
            onClick={finish}
            disabled={busy || appearances.length === 0}
            className="mt-3 w-full rounded-md border border-emerald-600/50 bg-emerald-600/10 px-4 py-2 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-600/20 disabled:opacity-40"
          >
            Finish game and send for review
          </button>
        </div>
      </div>

      {/* Pitcher and recent plays */}
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Pitching</p>
          <select
            value={activePitcher ?? ""}
            onChange={(event) => setPitcherId(Number(event.target.value))}
            className="ui-select w-full"
          >
            {fieldingSide.map((row) => (
              <option key={row.playerId} value={row.playerId}>{row.name}</option>
            ))}
          </select>
          <p className="mt-2 text-[11px] text-slate-500">
            Change this when a reliever comes in — later at-bats go on their line.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            All at-bats — click Edit to correct any of them
          </p>
          <AtBatLog
            scorecardId={scorecardId}
            atBats={atBats}
            nameOf={nameOf}
            awayName={awayName}
            homeName={homeName}
          />
        </div>
      </div>
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
