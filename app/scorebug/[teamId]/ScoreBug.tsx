"use client";

import { useEffect, useState } from "react";
import type { Scoreboard } from "@/db/scoreboard";

/**
 * A broadcast scorebug, for OBS to load as a browser source.
 *
 * Built to the shape a television bug has: the two men in the middle of the
 * pitch on top, the clubs and their runs underneath in their own colours, and
 * the bases, the inning, the outs and the count along the bottom. The figure
 * on the pitcher's line is his innings rather than a pitch count, because
 * this site records plate appearances and has no idea how many pitches he has
 * thrown.
 *
 * This is the one page on the site that is allowed to poll, and the reason is
 * the opposite of the jumbotron's. A stadium board runs inside every watching
 * player's own Chromium, so one fetch on the page is one poller per viewer and
 * twenty of them would spend the day's requests before tea. A scorebug has
 * exactly one viewer - the streamer's encoder - however many thousand people
 * are watching the stream, because the stream is a video of it. So it asks the
 * site directly, and the endpoint's two-second cache means even a second
 * operator costs nothing.
 *
 * It lags the field by one plate appearance. The inning, the outs and the
 * score here are derived from what the umpire has written down, and the umpire
 * writes a play down after it happens. There is no fixing that from this end:
 * the jumbotron only beats it because the plugin is fed by the umpire's own
 * /ball and /strike at the plate. The count is the exception and is typed in
 * on the scorecard page, so it moves pitch by pitch.
 *
 * The page is transparent on purpose. A browser source composites over the
 * game feed, so anything opaque behind the bug would be a grey slab across the
 * picture.
 */
const POLL_MS = 3000;

export function ScoreBug({
  teamId,
  initial,
}: {
  teamId: number;
  initial: Scoreboard | null;
  /** Kept for the page's call signature; the bug colours both clubs alike. */
  side?: "home" | "away" | null;
}) {
  const [board, setBoard] = useState(initial);

  useEffect(() => {
    let live = true;
    const read = async () => {
      try {
        const response = await fetch(`/api/scoreboard/${teamId}`, { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { scoreboard: Scoreboard | null };
        if (live) setBoard(body.scoreboard);
      } catch {
        // A dropped poll is the next poll's problem. Showing an error over
        // somebody's broadcast would be worse than showing the last score for
        // three more seconds.
      }
    };
    const timer = setInterval(read, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [teamId]);

  // Nothing on: the bug renders nothing at all rather than an idle card,
  // because an OBS source that is "off" should be invisible, not a box saying
  // there is no game.
  if (!board) return null;

  const batting = board.isHomeBatting ? board.home : board.away;
  const fielding = board.isHomeBatting ? board.away : board.home;
  const batter = batting.nextBatter;
  const pitcher = fielding.pitcher;
  const onBase = new Set(board.bases.map((runner) => runner.base));

  return (
    <div className="flex min-h-screen items-start justify-start p-3">
      <div className="w-[21rem] overflow-hidden rounded-md font-sans text-white shadow-2xl">
        {/* Who is involved in this pitch. The pitcher above the batter, the
            way a television bug stacks them. */}
        <div className="bg-[#2b2320]/95 px-3 py-1.5 text-[15px] leading-tight">
          <Line
            left={pitcher?.name ?? "-"}
            right={pitcher ? `${innings(pitcher.line.outs)} IP` : ""}
          />
          <Line
            left={
              batter
                ? `${batter.slot !== null ? `${batter.slot}. ` : ""}${batter.name}`
                : "-"
            }
            right={batter ? `${batter.line.hits} FOR ${batter.line.atBats}` : ""}
          />
        </div>

        <div className="flex">
          <div className="flex-1">
            <TeamRow
              abbreviation={board.away.abbreviation}
              color={board.away.color}
              score={board.awayScore}
            />
            <TeamRow
              abbreviation={board.home.abbreviation}
              color={board.home.color}
              score={board.homeScore}
            />
            {/* Inning, with the arrow a scoreboard uses for which half, then
                the outs in words rather than as lights. */}
            <div className="flex items-center gap-3 bg-[#11161d] px-3 py-1 text-[15px] font-semibold">
              <span className="tabular-nums">
                {board.isHomeBatting ? "▼" : "▲"}
                {board.inning}
              </span>
              <span>
                <span className="tabular-nums">{board.outs}</span>{" "}
                <span className="font-normal text-white/70">
                  {board.outs === 1 ? "Out" : "Outs"}
                </span>
              </span>
            </div>
          </div>

          <div className="flex w-[7.5rem] flex-col items-center justify-center gap-1 bg-[#11161d] py-1">
            <Diamond onBase={onBase} />
            <span className="text-xl font-bold leading-none tabular-nums">
              {board.balls}-{board.strikes}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Outs into the 4.2 a scoreboard writes, rather than a decimal third. */
function innings(outs: number) {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

/** A name on the left and his figure for the day on the right, and nothing else. */
function Line({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="truncate font-semibold">{left}</span>
      <span className="ml-auto shrink-0 font-bold tabular-nums">{right}</span>
    </div>
  );
}

/**
 * One club's band. The club's own colour fills the row, as it does on a
 * television bug, with a fallback for a club nobody has given one.
 */
function TeamRow({
  abbreviation,
  color,
  score,
}: {
  abbreviation: string;
  color: string | null;
  score: number;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-0.5"
      style={{ backgroundColor: color ?? "#1d2733" }}
    >
      {/* A shadow rather than a chosen text colour: the clubs pick their own
          colours and some of them are light, and white on a pale crest colour
          is unreadable over moving footage without it. */}
      <span
        className="text-xl font-bold tracking-wide"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.65)" }}
      >
        {abbreviation}
      </span>
      <span
        className="text-xl font-bold tabular-nums"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.65)" }}
      >
        {score}
      </span>
    </div>
  );
}

/** The bases, drawn as the diamond they are rather than three lights in a row. */
function Diamond({ onBase }: { onBase: Set<string> }) {
  const on = (base: string) => (onBase.has(base) ? "fill-amber-400" : "fill-transparent");
  return (
    // A rotated square's corners reach further than its side, so the bases
    // have to sit wider apart than their width or they overlap into a blob.
    // Ten across the diagonal is about fourteen, and the nearest pair here is
    // seventeen apart.
    <svg viewBox="0 0 40 32" className="h-12 w-14" aria-hidden>
      <g className="stroke-white/70" strokeWidth="1.5">
        <rect className={on("second")} x="15" y="3" width="10" height="10" rx="1" transform="rotate(45 20 8)" />
        <rect className={on("third")} x="3" y="15" width="10" height="10" rx="1" transform="rotate(45 8 20)" />
        <rect className={on("first")} x="27" y="15" width="10" height="10" rx="1" transform="rotate(45 32 20)" />
      </g>
    </svg>
  );
}
