"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RESULTS, type ResultCode } from "@/app/scoring";

export type LoggedAtBat = {
  id: number;
  sequence: number;
  inning: number;
  isHomeBatting: boolean;
  batterPlayerId: number;
  /** Derived from the lineup - the order slot this at-bat belongs to. */
  battingSlot: number;
  result: string;
  fielders: string | null;
  rbis: number;
  batterScored: boolean;
  otherRunsScored: number;
  unearnedRuns: number;
  outsRecorded: number;
  errorPosition: number | null;
  /** The fielder charged with the error, so an edit can show it again. */
  errorPlayerId?: number | null;
  /** Runners who scored on this play, as a JSON array of player ids. */
  runnersScored?: string | null;
  /** Bases stolen during this plate appearance. */
  stolenBases?: number;
  note: string | null;
  /** How the batter was retired on the bases after reaching, if they were. */
  retiredAs?: "TAGGED" | "PICKED_OFF" | "CAUGHT_STEALING" | "FORCED" | null;
  /** The position credited with that out, as its scorebook number. */
  retiredByPosition?: number | null;
};

/**
 * Every at-bat in the game, each one editable. A mistake noticed in the sixth
 * inning is usually a mistake made in the second, so corrections cannot be
 * limited to the most recent play.
 *
 * Editing the outs moves later inning boundaries; the server recomputes them
 * and reports how many rows shifted, which the umpire is told rather than left
 * to discover.
 */
export function AtBatLog({
  scorecardId,
  atBats,
  nameOf,
  awayName,
  homeName,
}: {
  scorecardId: number;
  atBats: LoggedAtBat[];
  nameOf: Record<number, string>;
  awayName: string;
  homeName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<LoggedAtBat>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function begin(atBat: LoggedAtBat) {
    setEditing(atBat.id);
    setDraft({ ...atBat });
    setError("");
    setNotice("");
  }

  async function save(id: number) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/scorecards/${scorecardId}/at-bats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = (await response.json()) as { error?: string; inningsShifted?: number };
      if (!response.ok) throw new Error(body.error ?? "Could not save the change.");
      setEditing(null);
      if (body.inningsShifted) {
        setNotice(`${body.inningsShifted} later at-bat${body.inningsShifted === 1 ? "" : "s"} moved to a different half-inning.`);
      }
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this at-bat? Later innings will shift.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/scorecards/${scorecardId}/at-bats/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { error?: string; inningsShifted?: number };
      if (!response.ok) throw new Error(body.error ?? "Could not delete.");
      setEditing(null);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (atBats.length === 0) {
    return <p className="text-xs text-slate-600">Nothing scored yet.</p>;
  }

  // Newest first: a correction is nearly always to something recent.
  const ordered = [...atBats].sort((a, b) => b.sequence - a.sequence);

  return (
    <div>
      {notice && <p className="mb-2 text-xs text-amber-400">{notice}</p>}
      {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}

      <div className="max-h-[32rem] overflow-y-auto pr-1">
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th className="w-14">Inn</th>
              <th>Batter</th>
              <th className="w-20">Result</th>
              <th className="w-12">RBI</th>
              <th className="w-12">Out</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {ordered.map((atBat) =>
              editing === atBat.id ? (
                <tr key={atBat.id} className="bg-slate-800/50">
                  <td colSpan={6} className="p-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <label className="ui-field-label flex-col !items-start gap-1">
                        Result
                        <select
                          value={draft.result ?? atBat.result}
                          onChange={(event) => setDraft({ ...draft, result: event.target.value as ResultCode })}
                          className="ui-select w-full !py-1"
                        >
                          {RESULTS.map((row) => (
                            <option key={row.code} value={row.code}>{row.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="ui-field-label flex-col !items-start gap-1">
                        Fielders
                        <input
                          value={draft.fielders ?? atBat.fielders ?? ""}
                          onChange={(event) => setDraft({ ...draft, fielders: event.target.value })}
                          className="ui-select w-full !py-1"
                        />
                      </label>
                      <label className="ui-field-label flex-col !items-start gap-1">
                        RBI
                        <input
                          type="number" min={0} max={4}
                          value={draft.rbis ?? atBat.rbis}
                          onChange={(event) => setDraft({ ...draft, rbis: Number(event.target.value) })}
                          className="ui-select w-full !py-1"
                        />
                      </label>
                      <label className="ui-field-label flex-col !items-start gap-1">
                        Outs
                        <input
                          type="number" min={0} max={3}
                          value={draft.outsRecorded ?? atBat.outsRecorded}
                          onChange={(event) => setDraft({ ...draft, outsRecorded: Number(event.target.value) })}
                          className="ui-select w-full !py-1"
                        />
                      </label>
                      <label className="ui-field-label flex-col !items-start gap-1">
                        Runs scored
                        <input
                          type="number" min={0} max={4}
                          value={draft.otherRunsScored ?? atBat.otherRunsScored}
                          onChange={(event) => setDraft({ ...draft, otherRunsScored: Number(event.target.value) })}
                          className="ui-select w-full !py-1"
                        />
                      </label>
                      <label className="ui-field-label col-span-2 flex-col !items-start gap-1">
                        Note
                        <input
                          value={draft.note ?? atBat.note ?? ""}
                          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                          className="ui-select w-full !py-1"
                        />
                      </label>
                      <label className="flex items-center gap-2 pt-4 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={draft.batterScored ?? atBat.batterScored}
                          onChange={(event) => setDraft({ ...draft, batterScored: event.target.checked })}
                        />
                        Batter scored
                      </label>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button" onClick={() => save(atBat.id)} disabled={busy}
                        className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-40"
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button" onClick={() => setEditing(null)} disabled={busy}
                        className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button" onClick={() => remove(atBat.id)} disabled={busy}
                        className="ml-auto rounded-md border border-rose-800 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={atBat.id}>
                  <td className="text-slate-500">
                    {atBat.isHomeBatting ? "B" : "T"}{atBat.inning}
                  </td>
                  <td className="truncate">{nameOf[atBat.batterPlayerId] ?? "?"}</td>
                  <td className="font-semibold text-slate-200">
                    {atBat.result}{atBat.fielders ?? ""}
                  </td>
                  <td>{atBat.rbis || ""}</td>
                  <td>{atBat.outsRecorded || ""}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => begin(atBat)}
                      className="text-sky-400 hover:text-sky-300"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        {atBats.length} at-bats · {awayName} bats in the top, {homeName} in the bottom
      </p>
    </div>
  );
}
