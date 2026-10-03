"use client";

import { useMemo, useState } from "react";
import type { Role } from "@/db/schema";
import { EmptyState } from "@/app/SiteNav";
import { UserRoleRow } from "../UserRoleRow";

type Account = {
  id: number;
  displayName: string;
  discordId: string;
  roles: Role[];
  teamId: number | null;
  leagueId: number | null;
};

/**
 * The account list, with a box to narrow it.
 *
 * Ten people fit on a screen and did not need finding. Every club gets a
 * general manager before launch, and umpires are a person each, so this list is
 * about to be long enough that scrolling it to change one person's club is the
 * slow way round.
 *
 * It matches on the name, the Discord id and the role names, so "gm" lists the
 * general managers and "umpire" the officials - which is how an admin usually
 * thinks about who they are looking for, rather than by name.
 */
export function AccountList({
  accounts,
  teams,
  leagues,
}: {
  accounts: Account[];
  teams: { id: number; name: string }[];
  leagues: { id: number; name: string }[];
}) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter((account) => {
      const club = teams.find((team) => team.id === account.teamId)?.name ?? "";
      const haystack = [
        account.displayName,
        account.discordId,
        club,
        // Underscores are how the roles are stored, not how anyone types them.
        ...account.roles.map((role) => role.replace("_", " ")),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [accounts, teams, query]);

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find a person, a club or a role"
        aria-label="Filter accounts"
        className="ui-input mb-3 w-full text-sm"
      />

      {shown.length === 0 ? (
        <EmptyState>Nobody matches that.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((account) => (
            <UserRoleRow key={account.id} user={account} teams={teams} leagues={leagues} />
          ))}
        </ul>
      )}
    </>
  );
}
