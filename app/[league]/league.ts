import { notFound } from "next/navigation";
import { getLeagueBySlug } from "@/db/queries";

/**
 * The league a page is being asked for, from the first part of its address.
 *
 * Every page under this segment begins by calling it, which is also what makes
 * an address like /mcba/standings mean anything: an unknown league is a 404
 * rather than a page showing whatever happens to be first in the database.
 * The table holds two rows, so the lookup costs nothing worth saving.
 */
export async function leagueFrom(params: Promise<{ league: string }>) {
  const { league: slug } = await params;
  const league = await getLeagueBySlug(slug.toLowerCase());
  if (!league) notFound();
  return league;
}

export type League = Awaited<ReturnType<typeof leagueFrom>>;
