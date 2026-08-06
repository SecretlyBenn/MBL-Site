"use client";

import Link from "next/link";
import { useRef } from "react";
import { TeamLogo } from "@/app/TeamLogo";

export type StripGame = {
  id: number;
  playedOn: string | null;
  awayScore: number | null;
  homeScore: number | null;
  awayName: string | null;
  homeName: string | null;
  awayAbbr: string | null;
  homeAbbr: string | null;
};

/** "JUL 27" from "Monday July 27, 2026". */
function shortDate(value: string | null) {
  if (!value) return "";
  const withoutWeekday = value.replace(/^\w+,?\s*/, "").replace(/,\s*\d{4}$/, "");
  const [month = "", day = ""] = withoutWeekday.split(" ");
  return `${month.slice(0, 3)} ${day}`.toUpperCase();
}

function Side({
  name,
  abbr,
  score,
  won,
  final,
}: {
  name: string | null;
  abbr: string | null;
  score: number | null;
  won: boolean;
  final: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {name && <TeamLogo teamName={name} className="h-5 w-5 shrink-0" />}
      <span
        className={`text-xs font-bold tracking-wide ${
          final && !won ? "text-slate-500" : "text-slate-100"
        }`}
      >
        {abbr ?? name?.slice(0, 3).toUpperCase() ?? "—"}
      </span>
      <span
        className={`ml-auto text-sm tabular-nums ${
          !final ? "text-slate-600" : won ? "font-bold text-white" : "text-slate-500"
        }`}
      >
        {final ? score : "–"}
      </span>
    </div>
  );
}

/**
 * Horizontal scores rail beneath the nav. Scrolling is driven by the arrow
 * buttons rather than a visible scrollbar, which would cut across the row.
 */
export function ScoresStrip({ games }: { games: StripGame[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (games.length === 0) return null;

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.8, 240), behavior: "smooth" });
  };

  const arrow =
    "flex h-full w-8 shrink-0 items-center justify-center text-slate-500 transition-colors hover:bg-slate-800/70 hover:text-white";

  return (
    <div className="border-b border-slate-800/80 bg-slate-950/60">
      <div className="mx-auto flex max-w-[1600px] items-stretch">
        <button type="button" onClick={() => scrollBy(-1)} className={arrow} aria-label="Previous games">
          ‹
        </button>

        <div
          ref={trackRef}
          className="flex flex-1 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex divide-x divide-slate-800/80">
            {games.map((game) => {
              const final = game.awayScore !== null && game.homeScore !== null;
              const awayWon = final && (game.awayScore ?? 0) > (game.homeScore ?? 0);
              const homeWon = final && (game.homeScore ?? 0) > (game.awayScore ?? 0);

              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="flex shrink-0 items-center gap-4 px-5 py-2 transition-colors hover:bg-slate-900/70"
                >
                  <div className="flex w-[92px] flex-col gap-1">
                    <Side
                      name={game.awayName}
                      abbr={game.awayAbbr}
                      score={game.awayScore}
                      won={awayWon}
                      final={final}
                    />
                    <Side
                      name={game.homeName}
                      abbr={game.homeAbbr}
                      score={game.homeScore}
                      won={homeWon}
                      final={final}
                    />
                  </div>
                  <div className="flex flex-col gap-0.5 text-[10px] font-bold uppercase tracking-wider">
                    <span className={final ? "text-slate-400" : "text-emerald-400/80"}>
                      {final ? "Final" : "Next"}
                    </span>
                    <span className="text-slate-600">{shortDate(game.playedOn)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <button type="button" onClick={() => scrollBy(1)} className={arrow} aria-label="Next games">
          ›
        </button>
      </div>
    </div>
  );
}
