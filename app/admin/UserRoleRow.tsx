"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES } from "@/db/schema";

/**
 * One league account, with its role and - for a GM - the club it manages.
 * Changes are staged and saved together, so promoting someone to GM and giving
 * them a team is one action rather than two states, the first of which would be
 * a GM with no roster.
 */
export function UserRoleRow({
  user,
  teams,
}: {
  user: { id: number; displayName: string; discordId: string; role: string; teamId: number | null };
  teams: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [role, setRole] = useState(user.role);
  const [teamId, setTeamId] = useState<number | "">(user.teamId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const changed = role !== user.role || (teamId || null) !== user.teamId;
  const needsTeam = role === "GM" && !teamId;

  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role, teamId: teamId || null }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{user.displayName}</span>
        <span className="ml-2 text-xs text-slate-500">{user.discordId}</span>
      </span>

      <select
        value={role}
        onChange={(event) => setRole(event.target.value)}
        className="ui-select !py-1 text-xs"
      >
        {ROLES.map((option) => (
          <option key={option} value={option}>{option.replace("_", " ")}</option>
        ))}
      </select>

      {/* Only a GM has a club, so the picker appears only for that role. */}
      {role === "GM" && (
        <select
          value={teamId}
          onChange={(event) => setTeamId(Number(event.target.value) || "")}
          className="ui-select !py-1 text-xs"
        >
          <option value="">Pick a team…</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={save}
        disabled={busy || !changed || needsTeam}
        className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save"}
      </button>

      {error && <span className="w-full text-xs text-rose-400">{error}</span>}
    </li>
  );
}
