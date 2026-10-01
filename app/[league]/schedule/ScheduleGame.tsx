"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { describeEastern } from "@/app/datetime";
import { easternInputToIso, inEastern, toEasternInputValue } from "@/app/eastern";

/**
 * The time two clubs agreed on, in the league's own timezone.
 *
 * This used to render in UTC with no label, which read correctly only for the
 * older rows - those are bare wall-clock strings and UTC left them alone. A
 * game entered through the admin page is a real instant, so the same code
 * showed it four or five hours out: one arranged for ten at night appeared on
 * the umpire's page as five the next morning.
 */
export function formatAgreedTime(scheduledAt: string) {
  return inEastern(scheduledAt, "short") || scheduledAt;
}

/**
 * Setting the date and time two clubs agreed on for an upcoming fixture.
 *
 * The fixture itself belongs to the published season and is never created or
 * removed here - only the arrangement is. Withdrawing one leaves the game on
 * the schedule as still to be played, which is what the league expects; it
 * just stops being offered to umpires until a new time is set.
 */
export function ScheduleGame({
  sourceGameId,
  scheduledAt,
  claimed,
}: {
  sourceGameId: string;
  /** The agreed time, if one has been set. */
  scheduledAt: string | null;
  /** True once an umpire has started scoring, which locks the arrangement. */
  claimed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Shown in Eastern, so a GM in another timezone edits the hour the league
  // agreed rather than the hour their own laptop would have shown.
  const [value, setValue] = useState(toEasternInputValue(scheduledAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/games/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Stored as a real instant. What the box holds is Eastern, because
        // that is what the person was told to type.
        body: JSON.stringify({ sourceGameId, scheduledAt: easternInputToIso(value) ?? value }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not schedule the game.");
      setOpen(false);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Remove the date and time? The game stays on the schedule as upcoming.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/games/schedule?sourceGameId=${encodeURIComponent(sourceGameId)}`,
        { method: "DELETE" },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not remove the time.");
      setValue("");
      setOpen(false);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-2">
        {scheduledAt ? (
          <span className="text-[11px] text-emerald-400">
            {formatAgreedTime(scheduledAt)}
            {claimed && <span className="ml-2 text-slate-500">· being scored</span>}
          </span>
        ) : (
          <span className="text-[11px] text-slate-500">No time set</span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto text-[11px] font-semibold text-sky-400 hover:text-sky-300"
        >
          {scheduledAt ? "Change" : "Set a time"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2 border-t border-slate-800/80 pt-2">
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">
        Start time (Eastern)
      </p>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="ui-select w-full !py-1 text-xs"
      />
      {describeEastern(value) && (
        <p className="text-[11px] font-medium text-slate-300">{describeEastern(value)}</p>
      )}
      {error && <p role="alert" className="text-[11px] text-rose-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy || !value}
          className="rounded-md bg-sky-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {scheduledAt && !claimed && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-md border border-rose-800 px-3 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-950/40 disabled:opacity-40"
          >
            Remove time
          </button>
        )}
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); }}
          className="ml-auto text-[11px] text-slate-500 hover:text-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
