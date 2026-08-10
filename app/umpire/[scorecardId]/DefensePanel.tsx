"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { POSITIONS } from "@/app/scoring";

type Fielder = { playerId: number; name: string; position: string };

/**
 * Defensive positions for the team in the field, changeable at any point.
 * Changes are staged and only sent when confirmed, so a rearrangement that
 * moves three players is recorded as one moment rather than three, and a
 * half-finished shuffle never reaches the card.
 */
export function DefensePanel({
  scorecardId,
  isHome,
  teamName,
  fielders,
  bench,
  inning,
}: {
  scorecardId: number;
  isHome: boolean;
  teamName: string;
  fielders: Fielder[];
  bench: { id: number; name: string }[];
  inning: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const positionOf = (fielder: Fielder) => draft[fielder.playerId] ?? fielder.position;
  const changed = fielders.filter((fielder) => positionOf(fielder) !== fielder.position);

  const used = fielders.map(positionOf);
  const duplicate = used.filter((position, index) => used.indexOf(position) !== index);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/scorecards/${scorecardId}/fielding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isHome,
          // Only what moved: the log reads as a list of changes, not a repeated
          // full alignment.
          assignments: changed.map((fielder) => ({
            playerId: fielder.playerId,
            position: positionOf(fielder),
          })),
        }),
      });
      const body = (await response.json()) as { error?: string; inning?: number; moves?: number };
      if (!response.ok) throw new Error(body.error ?? "Could not record the change.");
      setNotice(`${body.moves} position change${body.moves === 1 ? "" : "s"} recorded in inning ${body.inning}.`);
      setDraft({});
      setOpen(false);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          In the field · {teamName}
        </p>
        <button
          type="button"
          onClick={() => { setOpen(!open); setNotice(""); }}
          className="text-xs font-semibold text-sky-400 hover:text-sky-300"
        >
          {open ? "Cancel" : "Change positions"}
        </button>
      </div>

      {notice && <p className="mb-2 text-[11px] text-emerald-400">{notice}</p>}
      {error && <p className="mb-2 text-[11px] text-rose-400">{error}</p>}

      <ul className="space-y-1 text-xs">
        {fielders.map((fielder) => (
          <li key={fielder.playerId} className="flex items-center gap-2">
            {open ? (
              <>
                <select
                  value={positionOf(fielder)}
                  onChange={(event) => setDraft({ ...draft, [fielder.playerId]: event.target.value })}
                  className={`ui-select !py-0.5 !text-xs ${
                    positionOf(fielder) !== fielder.position ? "!border-sky-500/70" : ""
                  }`}
                >
                  {POSITIONS.map((position) => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
                <span className="truncate text-slate-300">{fielder.name}</span>
              </>
            ) : (
              <>
                <span className="w-8 shrink-0 font-bold text-slate-500">{fielder.position}</span>
                <span className="truncate text-slate-300">{fielder.name}</span>
              </>
            )}
          </li>
        ))}
      </ul>

      {open && (
        <div className="mt-3">
          {duplicate.length > 0 && (
            <p className="mb-2 text-[11px] text-amber-400">
              Two players are set to {duplicate[0]}.
            </p>
          )}
          <button
            type="button"
            onClick={confirm}
            disabled={busy || changed.length === 0 || duplicate.length > 0}
            className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
          >
            {busy
              ? "Recording…"
              : changed.length === 0
                ? "No changes yet"
                : `Confirm ${changed.length} change${changed.length === 1 ? "" : "s"} from inning ${inning}`}
          </button>
          {bench.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-500">
              Bench: {bench.map((player) => player.name).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
