"use client";

import { atBatSummary, type ResultCode } from "@/app/scoring";
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
  placedRunners,
  reliefAt,
  isHomeSide,
  innings,
  activeSlot,
  activeInning,
  isActive,
  selectedId,
  onPick,
}: {
  order: { playerId: number; battingOrder: number | null; name: string; position: string }[];
  atBats: LoggedAtBat[];
  /**
   * Extra-innings runners, keyed by side, inning and slot. They reach second
   * without batting, so they have no cell of their own to fill and their run -
   * if it comes - otherwise appears only in the inning total.
   */
  placedRunners: Map<string, { scored: boolean; out: boolean }>;
  /**
   * The reliever who took the mound at a given at-bat, keyed by at-bat id.
   * Only the play he came in on is in here, so the mark lands once rather than
   * on every batter he then faced.
   */
  reliefAt: Map<number, string>;
  isHomeSide: boolean;
  innings: number;
  activeSlot: number | null;
  activeInning: number;
  /** False while the other side is batting, which greys the grid. */
  isActive: boolean;
  /**
   * The at-bat open in the entry panel. Lit differently from the cell the game
   * is waiting on: one is where the game is, the other is what the umpire is
   * typing into, and confusing them is how a correction lands on the wrong
   * play.
   */
  selectedId?: number | null;
  onPick: (atBat: LoggedAtBat | null, slot: number, inning: number) => void;
}) {
  // A slot can bat more than once in an inning; the grid shows them stacked in
  // the same cell rather than inventing a column.
  const cellFor = (slot: number, inning: number) =>
    atBats.filter((atBat) => atBat.inning === inning && atBat.battingSlot === slot);

  return (
    <div className="data-table-shell overflow-x-auto">
      {/* Sized in ch rather than stretched to the container: a scorecard has a
          natural width, and forcing nine innings into whatever space is left
          squeezes the cells until the notation is unreadable. Past that width
          the grid scrolls sideways, which is how a paper scorecard behaves. */}
      <table className="score-grid">
        <colgroup>
          <col style={{ width: "2.5ch" }} />
          <col style={{ width: "18ch" }} />
          <col style={{ width: "4ch" }} />
          {/* Wide enough for a full plate appearance - "2B + RBI + SB + R" -
              rather than the result alone. Past the grid width it scrolls
              sideways, which is what a paper scorecard does too. */}
          {Array.from({ length: innings }, (_, index) => (
            <col key={index} style={{ width: "17ch" }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th className="is-name">Batter</th>
            <th>Pos</th>
            {Array.from({ length: innings }, (_, index) => (
              <th key={index}>{index + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.map((batter) => {
            const slot = batter.battingOrder ?? 0;
            return (
              <tr key={batter.playerId}>
                <td className="text-slate-500">{slot}</td>
                <td className="is-name truncate font-semibold text-slate-100">{batter.name}</td>
                <td className="text-slate-500">{batter.position}</td>
                {Array.from({ length: innings }, (_, index) => {
                  const inning = index + 1;
                  const entries = cellFor(slot, inning);
                  const placed = placedRunners.get(`${isHomeSide}:${inning}:${slot}`);
                  const relief = entries.map((entry) => reliefAt.get(entry.id)).find(Boolean);
                  const waiting = isActive && slot === activeSlot && inning === activeInning;
                  const selected = entries.some((entry) => entry.id === selectedId);

                  return (
                    <td key={inning} className="p-0">
                      <button
                        type="button"
                        onClick={() => onPick(entries[0] ?? null, slot, inning)}
                        disabled={entries.length === 0 && !waiting && !placed}
                        className={`flex min-h-9 w-full flex-col items-center justify-center gap-0.5 px-1 py-0.5 transition-colors ${
                          selected
                            ? "bg-amber-400/25 font-bold text-amber-200 ring-2 ring-inset ring-amber-400"
                            : waiting
                              ? "bg-sky-500/25 font-bold text-sky-200 ring-2 ring-inset ring-sky-400"
                              : entries.length > 0
                                ? "text-slate-200 hover:bg-slate-700/50"
                                : "text-slate-700"
                        }`}
                        title={
                          placed && entries.length === 0
                            ? "Placed on second to start the inning"
                            : entries.map((entry) => entry.note ?? "").filter(Boolean).join(" · ")
                        }
                      >
                        {/* A reliever changes everything charged from this
                            batter on, so the cell where he came in is marked -
                            which is what a paper scorebook does by drawing a
                            line across the order at that point. */}
                        {relief && (
                          <span
                            className="mb-0.5 block truncate text-[9px] font-bold uppercase tracking-wide text-orange-300"
                            title={`${relief} came in here`}
                          >
                            ↻ {relief}
                          </span>
                        )}
                        {entries.length === 0 && placed ? (
                          // Not an at-bat, and deliberately not written like
                          // one: he was put on second to start the inning.
                          <span className="whitespace-nowrap text-violet-300">
                            {placed.out ? "ER + OUT" : placed.scored ? "ER + R" : "ER"}
                          </span>
                        ) : entries.length > 0
                          ? entries.map((entry) => (
                              // The whole plate appearance, not the result
                              // alone: what was driven in, stolen, scored, and
                              // how they were retired afterwards.
                              <span key={entry.id} className="whitespace-nowrap">
                                {atBatSummary(entry.result as ResultCode, entry.fielders, {
                                  rbis: entry.rbis,
                                  scored: entry.batterScored,
                                  stolenBases: entry.stolenBases ?? 0,
                                  retiredAs: entry.retiredAs ?? null,
                                  retiredBy: entry.retiredByPosition ?? null,
                                })}
                              </span>
                            ))
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
