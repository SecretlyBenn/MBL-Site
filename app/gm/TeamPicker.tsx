"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * Which roster is being managed. Shown only to admins - a GM is tied to their
 * own club, but an admin has no team of their own and would otherwise be stuck
 * on whichever team happened to sort first.
 */
export function TeamPicker({
  teams,
  teamId,
}: {
  teams: { id: number; name: string }[];
  teamId: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <label className="ui-field-label">
      Roster
      <select
        value={teamId}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          next.set("team", event.target.value);
          router.push(`/gm?${next}`);
        }}
        className="ui-select w-64"
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id}>{team.name}</option>
        ))}
      </select>
    </label>
  );
}
