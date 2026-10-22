import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { getScoreboard } from "@/db/scoreboard";
import { teams } from "@/db/schema";
import { SITE } from "@/app/site";
import { ScoreBug } from "./ScoreBug";

/**
 * A club's broadcast scorebug, as a browser source for OBS.
 *
 * One address per club, the same shape as the stadium board next door, and for
 * the same reason: a stream is of one club's game, and the bug should know
 * whose. It shows what a television bug shows - the two sides and their runs,
 * the inning, the bases, the outs, the count, and the lines of the two men in
 * the middle of it.
 *
 * Everything except the count comes out of the scorecard the umpire is filling
 * in, so it follows the game a play behind. The count does not: there is no
 * pitch in this site's record, so the umpire types that one in on the scoring
 * page and it moves as it happens.
 */

export const metadata: Metadata = {
  title: "Scorebug",
  // A layer over somebody's broadcast is not a page to be found in a search.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ScoreBugPage({ params }: { params: Promise<{ teamId: string }> }) {
  const teamId = Number((await params).teamId);
  if (!Number.isInteger(teamId) || teamId <= 0) notFound();

  const db = getDb();
  const club = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!club) notFound();

  // Same reasoning as the scoreboard: the origin is whatever is serving this,
  // so the addresses it builds are right on workers.dev today and right on the
  // league's own domain the day that changes.
  const incoming = await headers();
  const host = incoming.get("host");
  const scheme =
    incoming.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${scheme}://${host}` : SITE.url;

  const board = await getScoreboard(teamId, origin);
  const side = board ? (board.clubIsHome ? "home" : "away") : null;

  return (
    <>
      {/*
        A browser source composites over the video, so the page behind the bug
        has to be nothing at all. The site's own background is set on body in
        the root layout, which this page cannot opt out of any other way.
      */}
      <style>{`html,body{background:transparent !important}`}</style>
      <ScoreBug teamId={teamId} initial={board} side={side} />
    </>
  );
}
