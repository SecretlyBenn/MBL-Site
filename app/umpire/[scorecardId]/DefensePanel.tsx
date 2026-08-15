"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { POSITIONS } from "@/app/scoring";

type Fielder = {
  playerId: number;
  name: string;
  position: string;
  /** Plays made and plays muffed so far, shown beside the name. */
  putouts: number;
  errors: number;
};

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
  changeLog,
  onWithdraw,
  busy: sending,
  bench,
  inning,
}: {
  scorecardId: number;
  isHome: boolean;
  teamName: string;
  fielders: Fielder[];
  /** Substitutions and moves already made by this side, oldest first. */
  changeLog: { key: string; text: string }[];
  /** Takes a player out of the game with nobody replacing them. */
  onWithdraw: (playerId: number) => void;
  busy?: boolean;
  bench: { id: number; name: string }[];
  inning: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  /** Armed once, confirmed on the second click - it cannot be undone here. */
  const [leaving, setLeaving] = useState<number | null>(null);

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
    <section className="panel">
      <div className="panel-head">
        <h3 className="panel-title">Position changes</h3>
        <button
          type="button"
          onClick={() => { setOpen(!open); setNotice(""); }}
          className="text-[11px] font-semibold text-sky-400 hover:text-sky-300"
        >
          {open ? "Cancel" : "Change"}
        </button>
      </div>

      <div className="p-3">
      <p className="mb-2 text-[11px] text-slate-500">
        {teamName} in the field
        {open && " — “Left” takes a player out for good"}
      </p>

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
                {/* Someone can walk out of a game with nobody to replace
                    them. A substitution needs an incoming player and a
                    position change leaves them on the field, so without this
                    they stay standing where they were - blocking the position
                    for anyone else. */}
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    if (leaving === fielder.playerId) {
                      onWithdraw(fielder.playerId);
                      setLeaving(null);
                    } else {
                      setLeaving(fielder.playerId);
                    }
                  }}
                  className={`ml-auto shrink-0 text-[11px] font-semibold ${
                    leaving === fielder.playerId
                      ? "text-rose-300"
                      : "text-slate-500 hover:text-rose-400"
                  }`}
                >
                  {leaving === fielder.playerId ? "Sure?" : "Left"}
                </button>
              </>
            ) : (
              <>
                <span className="w-8 shrink-0 font-bold text-slate-500">{fielder.position}</span>
                <span className="truncate text-slate-300">{fielder.name}</span>
                {/* The fielding line as it stands. Nothing is shown for a
                    fielder who has neither made a play nor dropped one -
                    a row of zeroes reads as noise, and every fielder starts
                    there. */}
                <span className="ml-auto shrink-0 tabular-nums text-[11px]">
                  {fielder.putouts > 0 && (
                    <span className="text-emerald-400">{fielder.putouts} PO</span>
                  )}
                  {fielder.putouts > 0 && fielder.errors > 0 && (
                    <span className="text-slate-600"> · </span>
                  )}
                  {fielder.errors > 0 && <span className="text-rose-400">{fielder.errors} E</span>}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      {!open && changeLog.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Changes this game
          </p>
          <ul className="space-y-0.5 text-[11px] text-slate-400">
            {changeLog.map((entry) => (
              <li key={entry.key}>{entry.text}</li>
            ))}
          </ul>
        </div>
      )}

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
    </section>
  );
}
