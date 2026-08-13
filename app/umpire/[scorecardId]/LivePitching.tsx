"use client";

import { formatInnings } from "@/app/formatStats";
import type { PitchingLine } from "@/app/derive-box-score";

/**
 * Each pitcher's line as it stands, for both sides.
 *
 * Derived from the same box score the published game will be built from, so
 * what the umpire watches during the game and what the site reports afterwards
 * cannot disagree - there is no second tally being kept alongside.
 */
export function LivePitching({
  awayName,
  homeName,
  away,
  home,
  nameOf,
  activePitcherId,
}: {
  awayName: string;
  homeName: string;
  away: PitchingLine[];
  home: PitchingLine[];
  nameOf: Record<number, string>;
  activePitcherId: number | null;
}) {
  const sides = [
    { label: awayName, lines: away },
    { label: homeName, lines: home },
  ];

  return (
    <section className="panel">
      <div className="panel-head">
        <h3 className="panel-title">Pitching so far</h3>
      </div>
      <div className="divide-y divide-slate-800/80">
        {sides.map((side) => (
          <div key={side.label} className="p-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {side.label}
            </p>
            {side.lines.length === 0 ? (
              <p className="text-[11px] text-slate-600">No batters faced yet.</p>
            ) : (
              <table className="w-full text-[11px] tabular-nums">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left font-bold">Pitcher</th>
                    <th className="font-bold">IP</th>
                    <th className="font-bold">H</th>
                    <th className="font-bold">R</th>
                    <th className="font-bold">ER</th>
                    <th className="font-bold">BB</th>
                    <th className="font-bold">SO</th>
                  </tr>
                </thead>
                <tbody>
                  {side.lines.map((line) => (
                    <tr
                      key={line.playerId}
                      className={line.playerId === activePitcherId ? "text-sky-300" : "text-slate-300"}
                    >
                      <td className="truncate pr-2 text-left font-semibold">
                        {nameOf[line.playerId] ?? "?"}
                      </td>
                      <td className="text-center">{formatInnings(line.inningsPitched)}</td>
                      <td className="text-center">{line.hits}</td>
                      <td className="text-center">{line.runs}</td>
                      <td className="text-center">{line.earnedRuns}</td>
                      <td className="text-center">{line.walks}</td>
                      <td className="text-center">{line.strikeouts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
