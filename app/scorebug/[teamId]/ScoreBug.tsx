"use client";

import { useEffect, useState } from "react";
import type { Scoreboard } from "@/db/scoreboard";

/**
 * A broadcast scorebug, for OBS to load as a browser source.
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
  side,
}: {
  teamId: number;
  initial: Scoreboard | null;
  /** Which half of the bug to colour as "ours", for a club's own stream. */
  side: "home" | "away" | null;
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
      <div className="overflow-hidden rounded-lg border border-white/15 bg-[#0b1118]/95 font-sans text-white shadow-2xl backdrop-blur-sm">
        <div className="flex items-stretch">
          <Team
            abbreviation={board.away.abbreviation}
            color={board.away.color}
            score={board.awayScore}
            batting={!board.isHomeBatting}
            ours={side === "away"}
          />
          <Team
            abbreviation={board.home.abbreviation}
            color={board.home.color}
            score={board.homeScore}
            batting={board.isHomeBatting}
            ours={side === "home"}
          />

          {/* Inning, bases and outs: the block a viewer's eye goes to. */}
          <div className="flex items-center gap-4 border-l border-white/15 px-4">
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs text-white/60">
                {board.isHomeBatting ? "BOT" : "TOP"}
              </span>
              <span className="text-3xl font-bold leading-none tabular-nums">{board.inning}</span>
            </div>
            <Diamond onBase={onBase} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs tracking-wider text-white/60">OUT</span>
              <span className="flex gap-1">
                {[0, 1].map((index) => (
                  <span
                    key={index}
                    className={`h-3 w-3 rounded-full ${
                      index < board.outs ? "bg-amber-400" : "bg-white/20"
                    }`}
                  />
                ))}
              </span>
            </div>
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs tracking-wider text-white/60">B-S</span>
              <span className="text-3xl font-bold leading-none tabular-nums">
                {board.balls}-{board.strikes}
              </span>
            </div>
          </div>
        </div>

        {/* Who is involved in this pitch. Kept on its own line so the top row
            stays the same width all game, whatever the names are. */}
        {(batter || pitcher) && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-white/15 bg-black/30 px-4 py-2 text-base">
            {batter && (
              <span className="flex items-center gap-2">
                <span className="text-white/50">AB</span>
                <span className="font-semibold">
                  {batter.slot !== null && `${batter.slot} `}
                  {batter.name}
                </span>
                <span className="text-white/50">{batter.position}</span>
                <span className="tabular-nums text-white/80">
                  {batter.line.hits}-{batter.line.atBats}
                  {batter.line.homeRuns > 0 && `, ${batter.line.homeRuns} HR`}
                  {batter.line.rbis > 0 && `, ${batter.line.rbis} RBI`}
                </span>
                {batter.season?.average !== null && batter.season !== null && (
                  <span className="tabular-nums text-white/50">
                    {batter.season.average.toFixed(3).replace(/^0/, "")}
                  </span>
                )}
              </span>
            )}
            {pitcher && (
              <span className="flex items-center gap-2">
                <span className="text-white/50">P</span>
                <span className="font-semibold">{pitcher.name}</span>
                <span className="tabular-nums text-white/80">
                  {innings(pitcher.line.outs)} IP, {pitcher.line.strikeouts} K,{" "}
                  {pitcher.line.earnedRuns} ER
                </span>
                {pitcher.season?.era !== null && pitcher.season !== null && (
                  <span className="tabular-nums text-white/50">
                    {pitcher.season.era.toFixed(2)} ERA
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Outs into the 4.2 a scoreboard writes, rather than a decimal third. */
function innings(outs: number) {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

function Team({
  abbreviation,
  color,
  score,
  batting,
  ours,
}: {
  abbreviation: string;
  color: string | null;
  score: number;
  batting: boolean;
  ours: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3">
      {/* The club's own colour as a stripe rather than a fill: a bug sits over
          moving footage and a solid block of a club colour fights it. */}
      <span
        className="h-9 w-1.5 rounded-full"
        style={{ backgroundColor: color ?? "rgba(255,255,255,0.35)" }}
      />
      <span className={`text-2xl font-bold tracking-wide ${ours ? "text-white" : "text-white/85"}`}>
        {abbreviation}
      </span>
      <span className="min-w-[1.75rem] text-right text-3xl font-bold tabular-nums">{score}</span>
      {/* Which side is up, the way a television bug marks it. */}
      <span className={`h-2.5 w-2.5 rounded-full ${batting ? "bg-amber-400" : "bg-transparent"}`} />
    </div>
  );
}

/** The bases, drawn as the diamond they are rather than three lights in a row. */
function Diamond({ onBase }: { onBase: Set<string> }) {
  const on = (base: string) => (onBase.has(base) ? "fill-amber-400" : "fill-white/20");
  return (
    <svg viewBox="0 0 34 34" className="h-11 w-11" aria-hidden>
      <rect className={on("second")} x="11" y="2" width="12" height="12" rx="1.5" transform="rotate(45 17 8)" />
      <rect className={on("third")} x="2" y="11" width="12" height="12" rx="1.5" transform="rotate(45 8 17)" />
      <rect className={on("first")} x="20" y="11" width="12" height="12" rx="1.5" transform="rotate(45 26 17)" />
    </svg>
  );
}
