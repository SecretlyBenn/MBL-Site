import { redirect } from "next/navigation";
import { toDefaultLeague } from "@/app/old-address";
import { leagueSlugForGame } from "@/db/queries";

export const dynamic = "force-dynamic";

/**
 * Where this page was before the site held two leagues.
 *
 * A game knows its own competition through its season, so this sends the
 * reader to that league's copy rather than guessing. It used to guess, and the
 * guess was always the MBL - so an old link to an MCBA game opened under MBL
 * crests and MBL navigation.
 */
export default async function Page({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const slug = Number.isFinite(Number(gameId)) ? await leagueSlugForGame(Number(gameId)) : null;
  if (slug) redirect(`/${slug}/games/${gameId}`);
  // No such game: fall back to the old behaviour rather than 404 a link
  // somebody posted, and let the league's own page say it is missing.
  await toDefaultLeague(`/games/${gameId}`);
}
