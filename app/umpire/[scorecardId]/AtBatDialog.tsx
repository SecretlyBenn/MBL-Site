"use client";

import { useState } from "react";
import { POSITION_NUMBER, RESULTS, RESULT_BY_CODE, type ResultCode } from "@/app/scoring";

export type AtBatDraft = {
  result: ResultCode | "";
  fielders: string;
  rbis: number;
  batterScored: boolean;
  otherRunsScored: number;
  /** Which runners crossed the plate, by player id. */
  scoredRunners: number[];
  /** Which runners were retired on the play, by player id. */
  outRunners: number[];
  /** Whether the batter was one of the outs. */
  batterOut: boolean;
  /**
   * Who is credited with each out, keyed by "batter" or the runner's player
   * id. The league gives one putout per out and no assists, so a double play
   * credits two fielders - often different ones.
   */
  outPutouts: Record<string, string>;
  unearnedRuns: number;
  outsRecorded: number;
  errorPlayerId: string;
  stolenBases: number;
  note: string;
};

export const EMPTY_DRAFT: AtBatDraft = {
  result: "", fielders: "", rbis: 0, batterScored: false, otherRunsScored: 0,
  scoredRunners: [], outRunners: [], batterOut: false, outPutouts: {}, unearnedRuns: 0, outsRecorded: 0,
  errorPlayerId: "", stolenBases: 0, note: "",
};

/**
 * The follow-up questions for one at-bat, revealed by what happened rather than
 * shown all at once. Picking a result is the only thing asked up front; a
 * groundout then asks who fielded it, a hit asks about runs, an error asks who
 * made it. Fields that cannot apply are never rendered.
 */
export function AtBatDialog({
  draft,
  setDraft,
  fielders,
  runners,
  onSubmit,
  onCancel,
  busy,
  submitLabel = "Record",
}: {
  draft: AtBatDraft;
  setDraft: (draft: AtBatDraft) => void;
  fielders: { playerId: number; name: string; position: string }[];
  /** Who is on base, nearest home first. Decides which questions are worth asking. */
  runners: { playerId: number; name: string; base: string }[];
  onSubmit: () => void;
  onCancel?: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  const [showMore, setShowMore] = useState(false);
  const definition = draft.result ? RESULT_BY_CODE.get(draft.result) : undefined;

  /**
   * Applies a change, and keeps the figures that follow from it in step. Runs
   * are the count of the runners named, and RBI defaults to the runs - the
   * umpire only touches RBI when the credit differs from the runs, which is
   * the unusual case rather than every play.
   */
  function patch(change: Partial<AtBatDraft>) {
    const next = { ...draft, ...change };
    const touchedRuns = "scoredRunners" in change || "batterScored" in change || "result" in change;

    if (touchedRuns) {
      const scoredBatter = next.result === "HR" || next.batterScored;
      next.otherRunsScored = next.scoredRunners.length;
      if (!("rbis" in change)) {
        next.rbis = next.scoredRunners.length + (scoredBatter ? 1 : 0);
      }
    }
    setDraft(next);
  }

  // Choosing a result seeds the usual outs for it; the umpire can still change
  // them, and anything already typed is kept.
  function chooseResult(code: ResultCode | "") {
    if (!code) return patch({ result: "" });
    const chosen = RESULT_BY_CODE.get(code);
    patch({
      result: code,
      outsRecorded: chosen?.defaultOuts ?? 0,
      outRunners: [],
      outPutouts: {},
      // A fielder's choice is the batter reaching while someone else is
      // retired; a double play usually starts with the batter.
      batterOut: chosen?.retiresRunners ? code !== "FC" : (chosen?.defaultOuts ?? 0) > 0,
    });
  }

  const isHit = definition?.isHit ?? false;
  const isOut = (definition?.defaultOuts ?? 0) > 0 || draft.outsRecorded > 0;
  const wantsError = draft.result === "E" || showMore;
  // A home run scores the batter without being asked, and clears whoever was on.
  const isHomeRun = draft.result === "HR";
  const runsOnPlay =
    (isHomeRun || draft.batterScored ? 1 : 0) +
    (isHomeRun ? runners.length : draft.scoredRunners.length);

  return (
    <div className="space-y-3">
      <label className="ui-field-label flex-col !items-start gap-1.5">
        What happened?
        <select
          value={draft.result}
          onChange={(event) => chooseResult(event.target.value as ResultCode | "")}
          className="ui-select w-full"
          autoFocus
        >
          <option value="">Choose a result…</option>
          {(["Hit", "On base", "Out", "Other"] as const).map((group) => (
            <optgroup key={group} label={group}>
              {RESULTS.filter((row) => row.group === group).map((row) => (
                <option key={row.code} value={row.code}>{row.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {/* Nothing below appears until a result is chosen. */}
      {definition && (
        <>
          {definition.wantsFielders && (
            <label className="ui-field-label flex-col !items-start gap-1.5">
              {draft.result === "E" ? "Error charged to" : "Fielded by"}
              <select
                value={draft.fielders}
                onChange={(event) => patch({ fielders: event.target.value })}
                className="ui-select w-full"
              >
                <option value="">Not recorded</option>
                {/* Numbered the way the scorebook writes them, so what the
                    umpire picks reads the same as what lands on the card. */}
                {fielders.map((fielder) => (
                  <option key={fielder.playerId} value={fielder.position}>
                    {POSITION_NUMBER[fielder.position] ?? fielder.position} — {fielder.name}
                    {POSITION_NUMBER[fielder.position] ? ` (${fielder.position})` : ""}
                  </option>
                ))}
                <option value="6-3">6-3 (short to first)</option>
                <option value="4-3">4-3 (second to first)</option>
                <option value="5-3">5-3 (third to first)</option>
              </select>
            </label>
          )}

          {isOut && (
            <label className="ui-field-label flex-col !items-start gap-1.5">
              How many outs on the play?
              <select
                value={draft.outsRecorded}
                onChange={(event) => patch({ outsRecorded: Number(event.target.value) })}
                className="ui-select w-full"
              >
                {[0, 1, 2, 3].map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </label>
          )}

          {/* A fielder's choice retires a runner and the batter reaches - that
              is what makes it one - so the umpire says who was thrown out
              rather than the screen assuming the batter. A double play usually
              takes the batter and a runner, but two runners happens too. */}
          {(definition.retiresRunners || draft.outsRecorded > 1) && (
            <fieldset className="rounded-md border border-slate-800 p-3">
              <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Who was put out?
              </legend>
              <div className="space-y-1.5">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={draft.batterOut}
                      onChange={(event) => patch({ batterOut: event.target.checked })}
                    />
                    The batter
                  </label>
                  {draft.batterOut && (
                    <PutoutPicker
                      fielders={fielders}
                      value={draft.outPutouts.batter ?? ""}
                      onChange={(position) =>
                        patch({ outPutouts: { ...draft.outPutouts, batter: position } })
                      }
                    />
                  )}
                </div>
                {runners.map((runner) => (
                  <div key={runner.playerId} className="space-y-1">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={draft.outRunners.includes(runner.playerId)}
                        onChange={(event) =>
                          patch({
                            outRunners: event.target.checked
                              ? [...draft.outRunners, runner.playerId]
                              : draft.outRunners.filter((id) => id !== runner.playerId),
                          })
                        }
                      />
                      {runner.name}
                      <span className="text-xs text-slate-500">from {runner.base}</span>
                    </label>
                    {draft.outRunners.includes(runner.playerId) && (
                      <PutoutPicker
                        fielders={fielders}
                        value={draft.outPutouts[runner.playerId] ?? ""}
                        onChange={(position) =>
                          patch({
                            outPutouts: { ...draft.outPutouts, [runner.playerId]: position },
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
              {draft.outsRecorded > 0 &&
                draft.outRunners.length + (draft.batterOut ? 1 : 0) !== draft.outsRecorded && (
                  <p className="mt-2 text-[11px] text-amber-400">
                    {draft.outsRecorded} out{draft.outsRecorded === 1 ? "" : "s"} on the play,{" "}
                    {draft.outRunners.length + (draft.batterOut ? 1 : 0)} named
                    {draft.outRunners.length + (draft.batterOut ? 1 : 0) < draft.outsRecorded
                      ? " - each out is a putout for someone"
                      : ""}
                    .
                  </p>
                )}
            </fieldset>
          )}

          {/* Nobody on base means nobody can have been driven in, so the
              question is not asked at all. With runners aboard, they are named
              rather than counted - "did Ross score?" is a question about the
              play the umpire just watched, where "how many scored?" is
              arithmetic they have to do first. */}
          {runners.length > 0 && draft.result !== "HR" && (
            <fieldset className="rounded-md border border-slate-800 p-3">
              <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Who scored?
              </legend>
              <div className="space-y-1.5">
                {runners.map((runner) => (
                  <label key={runner.playerId} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={draft.scoredRunners.includes(runner.playerId)}
                      onChange={(event) =>
                        patch({
                          scoredRunners: event.target.checked
                            ? [...draft.scoredRunners, runner.playerId]
                            : draft.scoredRunners.filter((id) => id !== runner.playerId),
                        })
                      }
                    />
                    {runner.name}
                    <span className="text-xs text-slate-500">from {runner.base}</span>
                  </label>
                ))}
                {/* The batter can only come round on someone else's play, so
                    this belongs with the runners rather than on its own. */}
                {(isHit || definition.group === "On base") && (
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={draft.batterScored}
                      onChange={(event) => patch({ batterScored: event.target.checked })}
                    />
                    The batter came round to score
                  </label>
                )}
              </div>
            </fieldset>
          )}

          {/* RBI follows the runs by default, and is only worth asking about
              once a run has actually scored. It stays editable because a run
              scored on an error or a double play is not credited. */}
          {runsOnPlay > 0 && (
            <label className="ui-field-label flex-col !items-start gap-1.5">
              RBI credited
              <select
                value={draft.rbis}
                onChange={(event) => patch({ rbis: Number(event.target.value) })}
                className="ui-select w-full"
              >
                {Array.from({ length: runsOnPlay + 1 }, (_, count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </label>
          )}

          {wantsError && (
            <label className="ui-field-label flex-col !items-start gap-1.5">
              Error charged to
              <select
                value={draft.errorPlayerId}
                onChange={(event) => patch({ errorPlayerId: event.target.value })}
                className="ui-select w-full"
              >
                <option value="">No error</option>
                {fielders.map((fielder) => (
                  <option key={fielder.playerId} value={fielder.playerId}>
                    {fielder.position} — {fielder.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Earned versus unearned only matters once someone scored. */}
          {runsOnPlay > 0 && (draft.errorPlayerId || showMore) && (
            <label className="ui-field-label flex-col !items-start gap-1.5">
              Of those {runsOnPlay} run{runsOnPlay === 1 ? "" : "s"}, how many were unearned?
              <select
                value={draft.unearnedRuns}
                onChange={(event) => patch({ unearnedRuns: Number(event.target.value) })}
                className="ui-select w-full"
              >
                {Array.from({ length: runsOnPlay + 1 }, (_, count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </label>
          )}

          {(draft.result === "OTHER" || showMore) && (
            <label className="ui-field-label flex-col !items-start gap-1.5">
              {draft.result === "OTHER" ? "Describe what happened" : "Note"}
              <input
                value={draft.note}
                onChange={(event) => patch({ note: event.target.value })}
                placeholder={draft.result === "OTHER" ? "Runner tagged out between second and third" : ""}
                className="ui-select w-full"
              />
            </label>
          )}

          {!showMore && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              Something else happened (error, unearned runs, note)
            </button>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy || !draft.result || (draft.result === "OTHER" && !draft.note.trim())}
              className="flex-1 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
            >
              {busy ? "Saving…" : submitLabel}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="rounded-md border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Who is credited with one particular out. Shown beside each out rather than
 * once for the play, because the league gives a putout per out and a double
 * play is usually turned by two different fielders.
 */
function PutoutPicker({
  fielders,
  value,
  onChange,
}: {
  fielders: { playerId: number; name: string; position: string }[];
  value: string;
  onChange: (position: string) => void;
}) {
  return (
    <label className="ml-6 flex items-center gap-2 text-[11px] text-slate-500">
      Putout
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ui-select !py-0.5 !text-[11px]"
      >
        <option value="">Not recorded</option>
        {fielders.map((fielder) => (
          <option key={fielder.playerId} value={fielder.position}>
            {POSITION_NUMBER[fielder.position] ?? fielder.position} — {fielder.name}
          </option>
        ))}
      </select>
    </label>
  );
}
