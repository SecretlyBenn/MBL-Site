"use client";

import { useState } from "react";
import { PlayerProfile } from "./PlayerProfile";

export type LeagueRecord = {
  slug: string;
  name: string;
  /** The name the competition filed them under, shown when it differs. */
  playerName: string;
  /**
   * Seasons played, not rows. A season split between two clubs is two rows and
   * still one season, so counting the rows told a player who moved mid-season
   * that they had played twice as many as they had.
   */
  seasonCount: number;
  seasons: never[];
  games: never[];
  playedPitching: boolean;
};

/**
 * One player's record in each competition they played in, kept apart.
 *
 * The two are separate careers and never a total: someone who hit .300 in
 * college and .220 in the MBL has two figures, not one in between, and adding
 * them would invent a third that describes neither. So this picks between them
 * rather than combining them.
 *
 * The competitions file the same person under whatever name they used there,
 * so each tab says which name it is showing when that differs from the one in
 * the address.
 */
export function PlayerLeagues({ records }: { records: LeagueRecord[] }) {
  const [slug, setSlug] = useState(records[0]?.slug ?? "");
  const current = records.find((record) => record.slug === slug) ?? records[0];
  if (!current) return null;

  return (
    <div className="space-y-4">
      {records.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-slate-800">
          {records.map((record) => (
            <button
              key={record.slug}
              type="button"
              onClick={() => setSlug(record.slug)}
              className={`px-4 py-2.5 text-sm font-bold transition-colors ${
                current.slug === record.slug
                  ? "border-b-2 border-sky-500 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {record.name}
              <span className="ml-2 text-xs font-medium text-slate-500">
                {record.seasonCount} season{record.seasonCount === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      )}

      {records.length > 1 && current.playerName !== records[0].playerName && (
        <p className="text-xs text-slate-500">
          Filed in this competition as{" "}
          <span className="font-semibold text-slate-400">{current.playerName}</span>.
        </p>
      )}

      <PlayerProfile
        key={current.slug}
        seasons={current.seasons}
        games={current.games}
        playedPitching={current.playedPitching}
      />
    </div>
  );
}
