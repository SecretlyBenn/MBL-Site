"use client";

import { useState } from "react";
import { RESULTS, RESULT_BY_CODE, type ResultCode } from "@/app/scoring";

export type AtBatDraft = {
  result: ResultCode | "";
  fielders: string;
  rbis: number;
  batterScored: boolean;
  otherRunsScored: number;
  unearnedRuns: number;
  outsRecorded: number;
  errorPlayerId: string;
  stolenBases: number;
  note: string;
};

export const EMPTY_DRAFT: AtBatDraft = {
  result: "", fielders: "", rbis: 0, batterScored: false, otherRunsScored: 0,
  unearnedRuns: 0, outsRecorded: 0, errorPlayerId: "", stolenBases: 0, note: "",
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
  onSubmit,
  onCancel,
  busy,
  submitLabel = "Record",
}: {
  draft: AtBatDraft;
  setDraft: (draft: AtBatDraft) => void;
  fielders: { playerId: number; name: string; position: string }[];
  onSubmit: () => void;
  onCancel?: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  const [showMore, setShowMore] = useState(false);
  const definition = draft.result ? RESULT_BY_CODE.get(draft.result) : undefined;

  const patch = (change: Partial<AtBatDraft>) => setDraft({ ...draft, ...change });

  // Choosing a result seeds the usual outs for it; the umpire can still change
  // them, and anything already typed is kept.
  function chooseResult(code: ResultCode | "") {
    if (!code) return patch({ result: "" });
    const chosen = RESULT_BY_CODE.get(code);
    patch({ result: code, outsRecorded: chosen?.defaultOuts ?? 0 });
  }

  const isHit = definition?.isHit ?? false;
  const isOut = (definition?.defaultOuts ?? 0) > 0 || draft.outsRecorded > 0;
  const wantsError = draft.result === "E" || showMore;
  const runsOnPlay = (draft.batterScored ? 1 : 0) + draft.otherRunsScored;

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
                {fielders.map((fielder) => (
                  <option key={fielder.playerId} value={fielder.position}>
                    {fielder.position} — {fielder.name}
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

          <div className="grid grid-cols-2 gap-3">
            <label className="ui-field-label flex-col !items-start gap-1.5">
              Runners who scored
              <select
                value={draft.otherRunsScored}
                onChange={(event) => patch({ otherRunsScored: Number(event.target.value) })}
                className="ui-select w-full"
              >
                {[0, 1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </label>
            <label className="ui-field-label flex-col !items-start gap-1.5">
              RBI
              <select
                value={draft.rbis}
                onChange={(event) => patch({ rbis: Number(event.target.value) })}
                className="ui-select w-full"
              >
                {[0, 1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </label>
          </div>

          {/* A home run always scores the batter, so it is not worth asking. */}
          {draft.result !== "HR" && (isHit || definition.group === "On base") && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={draft.batterScored}
                onChange={(event) => patch({ batterScored: event.target.checked })}
              />
              The batter came round to score
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
