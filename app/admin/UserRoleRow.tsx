"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES, type Role } from "@/db/schema";

/** The roles narrowed to one competition; the others cover both. */
const SCOPED: Role[] = ["UMPIRE", "HEAD_UMPIRE", "WRITER"];

/**
 * One league account: its name, the roles it holds and - for a GM - the club it
 * manages. Changes are staged and saved together, so making someone a GM and
 * giving them a team is one action rather than two states, the first of which
 * would be a GM with no roster. The name is the league's name for the person,
 * not their Discord one, so renaming it here is safe: the account is found by
 * Discord id.
 *
 * Roles are checkboxes rather than a dropdown because people here hold more
 * than one - a GM who umpires other clubs' games is the ordinary case.
 */
export function UserRoleRow({
  user,
  teams,
  leagues,
}: {
  user: {
    id: number;
    displayName: string;
    discordId: string;
    roles: Role[];
    teamId: number | null;
    leagueId: number | null;
  };
  teams: { id: number; name: string }[];
  leagues: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [roles, setRoles] = useState<Role[]>(user.roles);
  const [teamId, setTeamId] = useState<number | "">(user.teamId ?? "");
  const [leagueId, setLeagueId] = useState<number | "">(user.leagueId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  // A GM's competition comes from the club they manage, and an admin runs
  // both, so the picker appears only when a role with no club of its own is
  // held.
  const isGm = roles.includes("GM");
  const scopedByLeague = roles.some((held) => SCOPED.includes(held));
  const league = scopedByLeague ? leagueId || null : null;

  const sameRoles =
    roles.length === user.roles.length && roles.every((held) => user.roles.includes(held));

  const name = displayName.trim();
  const changed =
    name !== user.displayName ||
    !sameRoles ||
    (teamId || null) !== user.teamId ||
    league !== user.leagueId;
  const needsTeam = isGm && !teamId;
  // Nothing ticked would leave the account with no access at all. That is a
  // thing to do deliberately, by removing the account, not by mis-clicking here.
  const needsRole = roles.length === 0;

  const toggle = (role: Role) =>
    setRoles((held) =>
      held.includes(role) ? held.filter((other) => other !== role) : [...held, role],
    );

  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, roles, teamId: teamId || null, leagueId: league, displayName: name }),
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
      {/* A floor under the name, or a row carrying several role chips and a
          league picker squeezes it down to a couple of characters and the
          admin cannot read who they are editing. */}
      <span className="flex min-w-[15rem] flex-1 items-center gap-2">
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-label={`Name for ${user.displayName}`}
          className="ui-input min-w-0 flex-1 !py-1 text-sm font-semibold"
        />
        <span className="shrink-0 text-xs text-slate-500">{user.discordId}</span>
      </span>

      <span className="flex flex-wrap items-center gap-1.5">
        {ROLES.map((option) => (
          <label
            key={option}
            className={`cursor-pointer select-none rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
              roles.includes(option)
                ? "border-sky-500 bg-sky-600/20 text-sky-200"
                : "border-slate-700 text-slate-500 hover:border-slate-600"
            }`}
          >
            <input
              type="checkbox"
              checked={roles.includes(option)}
              onChange={() => toggle(option)}
              className="sr-only"
            />
            {option.replace("_", " ").toLowerCase()}
          </label>
        ))}
      </span>

      {/* Blank is both, which is what most officials are: the same people
          call and review games in either competition. */}
      {scopedByLeague && (
        <select
          value={leagueId}
          onChange={(event) => setLeagueId(Number(event.target.value) || "")}
          aria-label={`League for ${user.displayName}`}
          className="ui-select !py-1 text-xs"
        >
          <option value="">Both leagues</option>
          {leagues.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
      )}

      {/* Only a GM has a club, so the picker appears only when that is held. */}
      {isGm && (
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
        disabled={busy || !changed || needsTeam || needsRole || name === ""}
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
