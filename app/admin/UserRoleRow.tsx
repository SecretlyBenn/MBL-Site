"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES, type Role } from "@/db/schema";

/** The roles narrowed to a competition; the others cover the lot. */
const SCOPED: Role[] = ["UMPIRE", "HEAD_UMPIRE", "WRITER"];

/** Whether two sets of ids hold the same ids, in whatever order. */
const same = (a: number[], b: number[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

function roleLabel(role: Role) {
  return role.replace("_", " ").toLowerCase();
}

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
 *
 * At rest the row only says who someone is and what they hold, and the editor
 * opens on a click. Every account showing its full editor at once meant ten
 * people put about a hundred controls on screen - five role chips each, mostly
 * unticked and grey, two pickers and two buttons - and the rows wrapped to
 * different heights depending on what was in them, so there was no column to
 * read down. Who is a GM is the question this page is usually open to answer,
 * and that now reads straight down the page.
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
    /** Which competitions each scoped role covers; a role with none covers all. */
    scopes: { role: Role; leagueId: number }[];
  };
  teams: { id: number; name: string }[];
  leagues: { id: number; name: string; abbreviation: string }[];
}) {
  const router = useRouter();
  const everyLeague = leagues.map((option) => option.id);
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [roles, setRoles] = useState<Role[]>(user.roles);
  const [teamId, setTeamId] = useState<number | "">(user.teamId ?? "");
  // No rows stored means every competition, so that is what the boxes show:
  // all of them ticked. Unticking one is how somebody gets narrowed, which
  // reads the same way round as the thing it is describing.
  // A set per scoped role, because somebody can umpire one competition and
  // write for another. A role with nothing stored covers everything, so that
  // is what its boxes show: all of them ticked.
  const storedFor = (role: Role) => user.scopes.filter((s) => s.role === role).map((s) => s.leagueId);
  const [byRole, setByRole] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(
      SCOPED.map((role) => [role, storedFor(role).length === 0 ? everyLeague : storedFor(role)]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  // A GM's competition comes from the club they manage, and an admin runs the
  // lot, so the boxes appear only when a role with no club of its own is held.
  const isGm = roles.includes("GM");
  const scopedByLeague = roles.some((held) => SCOPED.includes(held));

  const sameRoles =
    roles.length === user.roles.length && roles.every((held) => user.roles.includes(held));
  // Compared as it will be stored, so ticking all three on somebody who
  // already covers everything does not look like a change.
  // Compared as it will be stored, so ticking all three on somebody who
  // already covers everything does not look like a change.
  const sameLeagues = SCOPED.every((role) => {
    const held = roles.includes(role) ? byRole[role] ?? [] : [];
    const stored = same(held, everyLeague) || !roles.includes(role) ? [] : held;
    return same(stored, storedFor(role));
  });

  const name = displayName.trim();
  const changed =
    name !== user.displayName ||
    !sameRoles ||
    (teamId || null) !== user.teamId ||
    !sameLeagues;
  const needsTeam = isGm && !teamId;
  // Nothing ticked is not "all of them" - that is all of them ticked. An
  // account that covers nothing would hold a role it can never use.
  const needsLeague = SCOPED.some((role) => roles.includes(role) && (byRole[role] ?? []).length === 0);
  // Nothing ticked would leave the account with no access at all. That is a
  // thing to do deliberately, by removing the account, not by mis-clicking here.
  const needsRole = roles.length === 0;

  const toggle = (role: Role) =>
    setRoles((held) =>
      held.includes(role) ? held.filter((other) => other !== role) : [...held, role],
    );

  const toggleLeague = (role: Role, id: number) =>
    setByRole((held) => {
      const mine = held[role] ?? [];
      return {
        ...held,
        [role]: mine.includes(id) ? mine.filter((other) => other !== id) : [...mine, id],
      };
    });

  /** Throws away whatever was staged and closes, so Cancel really does cancel. */
  function close() {
    setDisplayName(user.displayName);
    setRoles(user.roles);
    setTeamId(user.teamId ?? "");
    setByRole(
      Object.fromEntries(
        SCOPED.map((role) => [role, storedFor(role).length === 0 ? everyLeague : storedFor(role)]),
      ),
    );
    setError("");
    setOpen(false);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          roles,
          teamId: teamId || null,
          // What is ticked, every id and all. The route decides that all of
          // them means all of them, rather than this form deciding it twice.
          leaguesByRole: Object.fromEntries(
            SCOPED.filter((role) => roles.includes(role)).map((role) => [role, byRole[role] ?? []]),
          ),
          displayName: name,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      setOpen(false);
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
   *
   * Kept inside the editor rather than on the resting row: it is rare, it
   * cannot be undone from here, and sitting next to Save on every row it was
   * one slip away on a page an admin opens to do something else.
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

  const club = teams.find((team) => team.id === user.teamId)?.name;
  // Abbreviated, because this column is a few characters wide and the college
  // league's name is six words long.
  const abbreviations = (ids: number[]) =>
    leagues.filter((option) => ids.includes(option.id)).map((option) => option.abbreviation).join("·");
  // One line per scoped role they hold, because the two can differ now:
  // "umpire MBL · writer MCBA" is an ordinary thing to be.
  const held = SCOPED.filter((role) => user.roles.includes(role));
  const scope = held
    .map((role) => {
      const ids = user.scopes.filter((s) => s.role === role).map((s) => s.leagueId);
      return `${roleLabel(role)} ${ids.length === 0 ? "all" : abbreviations(ids)}`;
    })
    .join(" · ");

  if (!open) {
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-2.5">
        <span className="min-w-[10rem] flex-1 text-sm font-semibold text-slate-100">
          {user.displayName}
        </span>

        {/* Only what they actually hold. The unticked three were noise on every
            row and made the held ones harder to pick out. */}
        <span className="flex flex-wrap items-center gap-1.5">
          {user.roles.length === 0 ? (
            <span className="text-xs text-rose-400">no access</span>
          ) : (
            ROLES.filter((role) => user.roles.includes(role)).map((role) => (
              <span
                key={role}
                className="rounded-md border border-sky-500/50 bg-sky-600/15 px-2 py-0.5 text-xs font-semibold text-sky-200"
              >
                {roleLabel(role)}
              </span>
            ))
          )}
        </span>

        {/* The club a GM runs is the thing this page is most often opened to
            check, so it reads down the right-hand side rather than hiding in
            a closed picker. */}
        <span className="min-w-[9rem] text-right text-xs text-slate-400">
          {club ?? (user.roles.some((held) => SCOPED.includes(held)) ? scope : "")}
        </span>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className="ui-button !px-3 !py-1 text-xs"
        >
          Edit
        </button>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-sky-800/70 bg-slate-900/70 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
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
              {roleLabel(option)}
            </label>
          ))}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Boxes rather than a picker, because there are three competitions
            now and a picker could only ever say one of them or all of them.
            An umpire who calls MBL games and the off-season tournament but not
            the college league is a sentence the old control could not write.
            Same chips as the roles above, which is the same kind of choice. */}
        {/* A row of boxes per scoped role, because the two can be narrowed
            differently: umpiring the MBL and writing for the MCBA is an
            ordinary thing to be, and one shared set could not say it. Chips
            rather than a picker, because a role can cover more than one
            competition and all of them ticked is how somebody covers
            everything - including a competition added tomorrow. */}
        {SCOPED.filter((role) => roles.includes(role)).map((role) => (
          <span
            key={role}
            className="flex flex-wrap items-center gap-2 text-xs text-slate-400"
          >
            {roleLabel(role)} covers
            <span className="flex flex-wrap items-center gap-1.5">
              {leagues.map((option) => {
                const on = (byRole[role] ?? []).includes(option.id);
                return (
                  <label
                    key={option.id}
                    title={`${option.name} — ${roleLabel(role)}`}
                    className={`cursor-pointer select-none rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
                      on
                        ? "border-sky-500 bg-sky-600/20 text-sky-200"
                        : "border-slate-700 text-slate-500 hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleLeague(role, option.id)}
                      className="sr-only"
                    />
                    {option.abbreviation}
                  </label>
                );
              })}
            </span>
          </span>
        ))}

        {/* Only a GM has a club, so the picker appears only when that is held. */}
        {isGm && (
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Manages
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
          </label>
        )}

        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={signOutEverywhere}
            disabled={busy}
            title="Ends every session this account has open"
            className="ui-button-danger !px-3 !py-1 text-xs"
          >
            {signedOut ? "Signed out" : "Sign out everywhere"}
          </button>
          <button type="button" onClick={close} disabled={busy} className="ui-button !px-3 !py-1 text-xs">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !changed || needsTeam || needsRole || needsLeague || name === ""}
            className="ui-button-primary !px-3 !py-1 text-xs"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </span>
      </div>

      {/* Said rather than left to a greyed-out button, which does not explain
          itself. */}
      {needsRole && <span className="text-xs text-amber-400">Tick at least one role, or remove the account.</span>}
      {needsTeam && <span className="text-xs text-amber-400">A general manager needs a club.</span>}
      {needsLeague && (
        <span className="text-xs text-amber-400">
          Tick at least one competition. All of them is how someone covers everything.
        </span>
      )}
      {error && <span role="alert" className="text-xs text-rose-400">{error}</span>}
    </li>
  );
}
