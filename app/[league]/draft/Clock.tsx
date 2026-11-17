"use client";

import { useEffect, useState } from "react";

/**
 * How long the club on the clock has left.
 *
 * It counts down in the browser from a deadline worked out on the server, so
 * it costs nothing to run and nothing to watch - a page that asked the server
 * every second would be one request a second per viewer, which is the whole
 * reason none of these pages poll.
 *
 * Running out does nothing. It turns red and sits at zero, because the point
 * of it is that everybody can see who is holding the draft up, not that the
 * draft picks for them.
 */
export function Clock({ deadline }: { deadline: string }) {
  const target = Date.parse(deadline);
  const [left, setLeft] = useState(() => target - Date.now());

  useEffect(() => {
    setLeft(target - Date.now());
    const tick = setInterval(() => setLeft(target - Date.now()), 1000);
    return () => clearInterval(tick);
  }, [target]);

  // Rendered as the full time on the server and on the first paint, so the
  // markup matches before the first tick and React has nothing to complain
  // about.
  const seconds = Math.max(0, Math.ceil(left / 1000));
  const out = seconds === 0;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return (
    <span
      role="timer"
      aria-label={out ? "Time is up" : `${minutes} minutes ${rest} seconds left`}
      className={`font-mono text-3xl font-black tabular-nums sm:text-4xl ${
        out ? "text-rose-400" : seconds <= 30 ? "text-amber-300" : "text-slate-100"
      }`}
    >
      {minutes}:{String(rest).padStart(2, "0")}
    </span>
  );
}
