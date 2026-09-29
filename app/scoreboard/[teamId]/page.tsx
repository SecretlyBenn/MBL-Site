import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { getLogoOverrides } from "@/db/logos";
import { getScoreboard } from "@/db/scoreboard";
import { leagues, teams } from "@/db/schema";
import { logoKey, teamLogoPath } from "@/app/logo-key";
import { SITE } from "@/app/site";
import { Jumbotron } from "./Jumbotron";

/**
 * A club's stadium scoreboard, as a page a browser can be pointed at.
 *
 * This is the address that goes into the jumbotron mod - one per club, so each
 * ground's screen wears its own colours. The mod loads it once and then pushes
 * the live count and score into it; the page never asks the site for anything
 * again. See `Jumbotron.tsx` for why that matters.
 */

export const metadata: Metadata = {
  title: "Scoreboard",
  // A screen inside a video game is not a page anyone should find in a search.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ScoreboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const teamId = Number((await params).teamId);
  if (!Number.isInteger(teamId) || teamId <= 0) notFound();

  const db = getDb();
  const club = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!club) notFound();

  // The board is rendered from whatever host is serving it, so the logo
  // addresses it hands out are right on workers.dev today and right on the
  // league's own domain the day that changes.
  const host = (await headers()).get("host");
  const origin = host ? `https://${host}` : SITE.url;

  const [board, overrides, league] = await Promise.all([
    getScoreboard(teamId, origin),
    getLogoOverrides(),
    club.leagueId
      ? db.query.leagues.findFirst({ where: eq(leagues.id, club.leagueId) })
      : undefined,
  ]);

  const path = overrides[logoKey(club.name)] ?? teamLogoPath(club.name);

  return (
    <Jumbotron
      initial={board}
      club={{
        id: club.id,
        name: club.name,
        abbreviation: club.abbreviation,
        color: club.color,
        logo: path ? new URL(path, origin).toString() : null,
      }}
      leagueName={league?.name ?? SITE.name}
      preview={(await searchParams).preview === "1"}
    />
  );
}
