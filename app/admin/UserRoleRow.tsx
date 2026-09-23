"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES } from "@/db/schema";

/**
 * One league account: its name, its role and - for a GM - the club it manages.
 * Changes are staged and saved together, so promoting someone to GM and giving
 * them a team is one action rather than two states, the first of which would be
 * a GM with no roster. The name is the league's name for the person, not their
 * Discord one, so renaming it here is safe: the account is found by Discord id.
 */
export function UserRoleRow({
  user,
  teams,
}: {
  user: { id: number; displayName: string; discordId: string; role: string; teamId: number | null };
  teams: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState(user.role);
  const [teamId, setTeamId] = useState<number | "">(user.teamId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  const name = displayName.trim();
  const changed = name !== user.displayName || role !== user.role || (teamId || null) !== user.teamId;
  const needsTeam = role === "GM" && !teamId;

  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role, teamId: teamId || null, displayName: name }),
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

  /**
   * Ends every session this account has open. Worth doing when their Discord
   * account or a device is out of their hands - changing the role here does
   * not close a tab someone else is already signed in on.
   */
  async function signOutEverywhere() {
    if (!confirm(`Sign ${user.displayName} out of every browser? They can sign back in.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/users/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; self?: boolean };
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      // Signing yourself out includes this browser, so leave the admin area.
      if (body.self) window.location.href = "/";
      setSignedOut(true);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-label={`Name for ${user.displayName}`}
          className="ui-input min-w-0 flex-1 !py-1 text-sm font-semibold"
        />
        <span className="shrink-0 text-xs text-slate-500">{user.discordId}</span>
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
        disabled={busy || !changed || needsTeam || name === ""}
        className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save"}
      </button>

      <button
        type="button"
        onClick={signOutEverywhere}
        disabled={busy}
        title="Ends every session this account has open"
        className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-rose-500/60 hover:text-rose-300 disabled:opacity-40"
      >
        {signedOut ? "Signed out" : "Sign out everywhere"}
      </button>

      {error && <span role="alert" className="w-full text-xs text-rose-400">{error}</span>}
    </li>
  );
}
