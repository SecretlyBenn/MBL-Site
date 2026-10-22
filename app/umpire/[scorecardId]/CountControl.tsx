"use client";

import { useState } from "react";

/**
 * The count on the batter, for the stream scorebug.
 *
 * Nothing in the game depends on it. This site records plate appearances, not
 * pitches, and that is not changing - but a bug on a broadcast has to show a
 * count, and the umpire is the only person who knows it. So this writes two
 * numbers that the scorebug reads and nothing else does.
 *
 * It clears itself when the at-bat is recorded, server-side, so the only
 * clicking here is during the turn at bat. An umpire who is not streaming can
 * ignore the whole row.
 *
 * Kept deliberately cheap: the figures go up on screen before the request is
 * sent, because the umpire is clicking it pitch by pitch and waiting on a
 * round trip for each one would make it unusable. A failed write is corrected
 * by the next click, and the worst case is a bug a pitch behind.
 */
export function CountControl({
  scorecardId,
  balls: initialBalls,
  strikes: initialStrikes,
}: {
  scorecardId: number;
  balls: number;
  strikes: number;
}) {
  const [balls, setBalls] = useState(initialBalls);
  const [strikes, setStrikes] = useState(initialStrikes);

  const send = (nextBalls: number, nextStrikes: number) => {
    setBalls(nextBalls);
    setStrikes(nextStrikes);
    void fetch(`/api/scorecards/${scorecardId}/count`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balls: nextBalls, strikes: nextStrikes }),
    }).catch(() => {
      // The next click sends the whole count again, so a dropped request
      // fixes itself rather than needing to be reported mid-game.
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-800 bg-slate-900/60 px-4 py-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Count</span>
      <span className="text-2xl font-bold tabular-nums text-slate-100">
        {balls}-{strikes}
      </span>
      <Step label="Ball" onClick={() => send(Math.min(3, balls + 1), strikes)} />
      <Step label="Strike" onClick={() => send(balls, Math.min(2, strikes + 1))} />
      <Step label="Undo ball" onClick={() => send(Math.max(0, balls - 1), strikes)} subtle />
      <Step label="Undo strike" onClick={() => send(balls, Math.max(0, strikes - 1))} subtle />
      <Step label="Clear" onClick={() => send(0, 0)} subtle />
      <span className="text-xs text-slate-500">
        For the stream scorebug only. Clears itself when the at-bat is recorded.
      </span>
    </div>
  );
}

function Step({
  label,
  onClick,
  subtle,
}: {
  label: string;
  onClick: () => void;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        subtle
          ? "rounded border border-slate-800 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
          : "rounded border border-slate-700 bg-slate-800/60 px-3 py-1 text-sm font-semibold text-slate-100 transition-colors hover:border-sky-600/60 hover:bg-slate-800"
      }
    >
      {label}
    </button>
  );
}
