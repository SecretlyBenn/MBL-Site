"use client";

import { scoreNotation, type ResultCode } from "@/app/scoring";
import type { LoggedAtBat } from "./AtBatLog";

/**
 * The scorecard as the league already writes it: the batting order down the
 * side, innings across the top, one cell per plate appearance.
 *
 * The cell the game is waiting on is highlighted, and any filled cell can be
 * clicked to correct it - a mistake spotted in the sixth is usually a mistake
 * made in the second.
 */
export function ScoreGrid({
  order,
  atBats,
  innings,
  activeSlot,
  activeInning,
  isActive,
  onPick,
}: {
  order: { playerId: number; battingOrder: number | null; name: string; position: string }[];
  atBats: LoggedAtBat[];
  innings: number;
  activeSlot: number | null;
  activeInning: number;
  /** False while the other side is batting, which greys the grid. */
  isActive: boolean;
  onPick: (atBat: LoggedAtBat | null, slot: number, inning: number) => void;
}) {
  // A slot can bat more than once in an inning; the grid shows them stacked in
  // the same cell rather than inventing a column.
  const cellFor = (slot: number, inning: number) =>
    atBats.filter((atBat) => atBat.inning === inning && atBat.battingSlot === slot);

  return (
    <div className="data-table-shell overflow-x-auto">
      <table className="data-table w-full text-xs">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th className="min-w-40">Batter</th>
            <th className="w-10">Pos</th>
            {Array.from({ length: innings }, (_, index) => (
              <th key={index} className="w-16">{index + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.map((batter) => {
            const slot = batter.battingOrder ?? 0;
            return (
              <tr key={batter.playerId}>
                <td className="text-slate-500">{slot}</td>
                <td className="truncate font-semibold text-slate-100">{batter.name}</td>
                <td className="text-slate-500">{batter.position}</td>
                {Array.from({ length: innings }, (_, index) => {
                  const inning = index + 1;
                  const entries = cellFor(slot, inning);
                  const waiting = isActive && slot === activeSlot && inning === activeInning;

                  return (
                    <td key={inning} className="p-0">
                      <button
                        type="button"
                        onClick={() => onPick(entries[0] ?? null, slot, inning)}
                        disabled={entries.length === 0 && !waiting}
                        className={`h-8 w-full px-1 text-center transition-colors ${
                          waiting
                            ? "bg-sky-500/20 font-bold text-sky-300 ring-1 ring-inset ring-sky-500/60"
                            : entries.length > 0
                              ? "text-slate-200 hover:bg-slate-700/50"
                              : "text-slate-700"
                        }`}
                        title={entries.map((entry) => entry.note ?? "").filter(Boolean).join(" · ")}
                      >
                        {entries.length > 0
                          ? entries
                              .map((entry) =>
                                scoreNotation(entry.result as ResultCode, entry.fielders) +
                                (entry.rbis > 0 ? `·${entry.rbis}` : ""),
                              )
                              .join(" ")
                          : waiting
                            ? "•"
                            : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
