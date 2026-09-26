"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";

export type LeagueChoice = { slug: string; name: string; abbreviation: string };

/**
 * The leagues the site holds, read once in the root layout and shared with
 * everything below it.
 *
 * The navigation has to build links into whichever league the reader is in,
 * and it renders on every page of the site - passing the league down through
 * every one of them would be a prop on thirty pages that exists only so the
 * bar at the top can point somewhere.
 */
const LeaguesContext = createContext<LeagueChoice[]>([]);

export function LeaguesProvider({
  value,
  children,
}: {
  value: LeagueChoice[];
  children: React.ReactNode;
}) {
  return <LeaguesContext.Provider value={value}>{children}</LeaguesContext.Provider>;
}

export function useLeagues() {
  return useContext(LeaguesContext);
}

/**
 * The league whose part of the site is open, from the first step of the path.
 *
 * Pages that belong to no league - the policies, the staff portals - still
 * have a navigation bar, and its links have to lead somewhere: they lead to
 * the first league, which is the one the front door opens on.
 */
export function useCurrentLeague(): LeagueChoice | null {
  const leagues = useLeagues();
  const first = usePathname().split("/")[1] ?? "";
  return leagues.find((league) => league.slug === first) ?? leagues[0] ?? null;
}
