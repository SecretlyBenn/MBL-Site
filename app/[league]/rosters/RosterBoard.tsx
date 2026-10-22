"use client";

import { useState } from "react";
import { PlayerHead } from "@/app/PlayerHead";
import { PlayerProfileLink } from "@/app/EntityLinks";
import { TeamLogo } from "@/app/TeamLogo";

export type RosterPlayer = {
  id: number;
  teamId: number;
  displayName: string;
  status: string;
};

type Club = { id: number; name: string };

/**
 * One club at a time, chosen from a list.
 *
 * Every club's roster on one page was a wall of names nobody read, and on a
 * phone it was a scroll with no end. The whole league is still fetched in the
 * one request that drew this page - it is three queries either way - so the
 * picking happens here rather than through the address bar. Changing club
 * costs nothing: no request, no render on the Worker, and the heads of the
 * clubs you are not looking at are never asked for, because only the chosen
 * club's players exist in the page at all.
 */
export function RosterBoard({
  leagueSlug,
  clubs,
  squads,
  avatars,
  sentTo,
}: {
  leagueSlug: string;
  clubs: Club[];
  squads: Record<number, RosterPlayer[]>;
  avatars: Record<string, string>;
  /** Player id -> the club he was sent down to, when he was sent anywhere. */
  sentTo: Record<number, string>;
}) {
  const [clubId, setClubId] = useState(clubs[0]?.id ?? 0);
  const club = clubs.find((row) => row.id === clubId) ?? clubs[0];
  const squad = squads[clubId] ?? [];

  // The three ways a man can be on a club: playing, hurt, or farmed out. They
  // are separated rather than badged in one list because the first question a
  // GM asks is who he can actually pick tonight, and that is the top list.
  const active = squad.filter((player) => player.status === "ACTIVE");
  const injured = squad.filter((player) => player.status === "INJURED");
  const sentDown = squad.filter((player) => player.status === "TRIPLE_A");

  return (
    <div className="space-y-4">
      <div className="ui-card flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <TeamLogo teamName={club.name} className="h-12 w-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-white">{club.name}</h2>
          <p className="text-sm text-slate-400">
            {active.length} active
            {injured.length > 0 && ` · ${injured.length} injured`}
            {sentDown.length > 0 && ` · ${sentDown.length} sent down`}
          </p>
        </div>
        <label className="ui-field-label w-full sm:w-56">
          Club
          <select
            value={clubId}
            onChange={(event) => setClubId(Number(event.target.value))}
            className="ui-select"
          >
            {clubs.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Squad
        title="Roster"
        players={active}
        leagueSlug={leagueSlug}
        avatars={avatars}
        empty="Nobody is on this roster."
      />
      {injured.length > 0 && (
        <Squad title="Injured list" players={injured} leagueSlug={leagueSlug} avatars={avatars} />
      )}
      {sentDown.length > 0 && (
        <Squad
          title="MiBL"
          players={sentDown}
          leagueSlug={leagueSlug}
          avatars={avatars}
          sentTo={sentTo}
        />
      )}
    </div>
  );
}

function Squad({
  title,
  players,
  leagueSlug,
  avatars,
  sentTo,
  empty,
}: {
  title: string;
  players: RosterPlayer[];
  leagueSlug: string;
  avatars: Record<string, string>;
  sentTo?: Record<number, string>;
  empty?: string;
}) {
  return (
    <section className="ui-card p-4">
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">{title}</h3>
        <span className="text-xs text-slate-500">{players.length}</span>
      </div>
      {players.length === 0 ? (
        <p className="py-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {players
            .slice()
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .map((player) => (
              <li
                key={player.id}
                className="flex items-center gap-2 border-b border-slate-800/60 py-1.5 text-sm last:border-0 sm:last:border-b"
              >
                <PlayerHead uuid={avatars[player.displayName]} name={player.displayName} size={20} />
                <PlayerProfileLink
                  leagueSlug={leagueSlug}
                  name={player.displayName}
                  className="truncate text-slate-100"
                />
                {sentTo?.[player.id] && (
                  <span className="ml-auto shrink-0 text-xs text-slate-500">
                    {sentTo[player.id]}
                  </span>
                )}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
