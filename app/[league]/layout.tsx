import type { Metadata } from "next";
import { getLeagueBySlug } from "@/db/queries";
import { leagueFrom } from "./league";

/**
 * The league's name follows every page title below here, so a tab or a search
 * result says which league's standings it is rather than always saying MBL.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  // Looked up rather than resolved through leagueFrom: an unknown league is a
  // 404, and raising that while a title is being generated turns the page into
  // a 500 instead. The layout below does it, where it works.
  const league = await getLeagueBySlug((await params).league.toLowerCase());
  if (!league) return {};
  return {
    title: { default: `${league.abbreviation} | ${league.name}`, template: `%s | ${league.abbreviation}` },
  };
}

/**
 * Everything under a league's own part of the site.
 *
 * The layout exists to turn an unknown league into a 404 before any page runs
 * a query for it. Pages read the league themselves, because a layout in this
 * router cannot hand anything to the page inside it.
 */
export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ league: string }>;
}) {
  await leagueFrom(params);
  return children;
}
