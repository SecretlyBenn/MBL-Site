"use client";

import { useState } from "react";
import { HistoricalTeamLink, PlayerProfileLink } from "@/app/EntityLinks";
import { PlayerHead } from "@/app/PlayerHead";
import { TeamLogo } from "@/app/TeamLogo";

export type LeaderRow = {
  playerName: string;
  teamName: string;
  /** Null for a club that is not in the season being shown. */
  teamId: number | null;
  uuid?: string;
  value: string;
};

/**
 * One leaderboard, showing the leaders and opening to the whole field.
 *
 * A top five answers "who leads", which is what the page is for, but it
 * answers nothing about the player you actually care about - a hitter tenth in
 * the league appeared nowhere on the site. The full list is already here in
 * the page, so opening one is instant and costs no request.
 *
 * Only the rows past the fifth scroll. Twelve boards that each grow to eighty
 * rows would otherwise turn one screen into forty.
 */
export function LeaderBoard({
  label,
  unit,
  rows,
  seasonId,
  top = 5,
}: {
  label: string;
  unit: string;
  rows: LeaderRow[];
  seasonId: number;
  /** How many are shown before it is opened. */
  top?: number;
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, top);
  const hidden = rows.length - Math.min(rows.length, top);

  return (
    <div className="data-table-shell flex flex-col">
      <div className={open ? "max-h-96 overflow-y-auto" : undefined}>
        {/* Ranked, like the standings and the front page, so a rank, a name
            and a figure line up across every card on the site. */}
        <table className="data-table ranked w-full table-fixed text-sm">
          <colgroup>
            <col style={{ width: "2.75rem" }} />
            <col />
            <col style={{ width: "28%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>RNK</th>
              <th>{label}</th>
              <th>Team</th>
              <th>{unit}</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-600">
                  No data.
                </td>
              </tr>
            ) : (
              shown.map((row, index) => (
                <tr key={row.playerName}>
                  <td>{index + 1}</td>
                  <td>
                    <span className="flex min-w-0 items-center gap-2">
                      <PlayerHead uuid={row.uuid} name={row.playerName} size={18} />
                      <PlayerProfileLink name={row.playerName} className="truncate" />
                    </span>
                  </td>
                  <td>
                    <span className="flex min-w-0 items-center gap-1.5 text-slate-400">
                      <TeamLogo teamName={row.teamName} className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {row.teamId === null ? (
                          row.teamName
                        ) : (
                          <HistoricalTeamLink
                            name={row.teamName}
                            seasonId={seasonId}
                            teamId={row.teamId}
                          />
                        )}
                      </span>
                    </span>
                  </td>
                  <td>{row.value}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="border-t border-slate-800/80 px-3 py-1.5 text-xs font-medium text-sky-400 transition-colors hover:bg-slate-900/60 hover:text-sky-300"
        >
          {open ? "Show top 5" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}
