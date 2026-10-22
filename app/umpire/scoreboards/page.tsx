import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { getLeagues } from "@/db/queries";
import { teams } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";
import { SITE } from "@/app/site";
import { CopyLink } from "./CopyLink";

export const metadata: Metadata = {
  title: "Scoreboards",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/**
 * Every club's two screens, with their addresses ready to copy.
 *
 * Both already worked for every club on the site - a board is built from
 * whichever game that club has on, and nothing about it was ever specific to
 * the MBL - but there was nowhere to find the addresses, so in practice only
 * the clubs somebody had typed into a config by hand had one. This is that
 * list, and it is on the umpire's side of the site because the umpire is who
 * sets a ground up before a game.
 *
 * The two are different things and are labelled as such:
 *
 * - The **scoreboard** is the ballpark jumbotron, loaded by the Minecraft mod
 *   and read from across the ground.
 * - The **scorebug** is the strip for a stream, loaded by OBS as a browser
 *   source and composited over the video.
 */
export default async function ScoreboardsPage() {
  await requireRole(["UMPIRE", "HEAD_UMPIRE", "ADMIN"], "/umpire/scoreboards");

  const db = getDb();
  const [clubs, leagues] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.name)),
    getLeagues(),
  ]);

  // Absolute, because these are pasted into a Minecraft plugin and into OBS,
  // neither of which has a notion of this site's origin.
  const incoming = await headers();
  const host = incoming.get("host");
  const scheme =
    incoming.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${scheme}://${host}` : SITE.url;

  if (clubs.length === 0) {
    return (
      <PageShell title="Scoreboards">
        <EmptyState>No clubs have been added yet.</EmptyState>
      </PageShell>
    );
  }

  // Grouped by competition, with anything unfiled gathered at the end rather
  // than dropped - a club with no league still has a ground.
  const sections = [
    ...leagues.map((league) => ({
      key: String(league.id),
      title: league.name,
      clubs: clubs.filter((club) => club.leagueId === league.id),
    })),
    {
      key: "unfiled",
      title: "No competition",
      clubs: clubs.filter((club) => club.leagueId === null),
    },
  ].filter((section) => section.clubs.length > 0);

  return (
    <PageShell
      wide
      title="Scoreboards"
      subtitle="Every club's ballpark board and stream scorebug."
    >
      <p className="mb-6 max-w-3xl text-sm text-slate-400">
        A board shows whatever game that club is playing, home or away, and goes
        blank when they are not playing. The <strong>scoreboard</strong> is the
        screen in the ground. The <strong>scorebug</strong> is the strip for a
        stream - add it in OBS as a browser source, 900 by 200 or so, and leave
        the background transparent. Its count is typed in on the scoring page
        while the game runs.
      </p>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.key}>
            <SectionHeader title={section.title} meta={`${section.clubs.length} clubs`} />
            <div className="grid gap-3 lg:grid-cols-2">
              {section.clubs.map((club) => (
                <div key={club.id} className="ui-card space-y-2 p-3">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={club.name} className="h-6 w-6" />
                    <span className="truncate font-semibold text-slate-100">{club.name}</span>
                    <span className="text-xs text-slate-500">{club.abbreviation}</span>
                  </div>
                  <CopyLink label="Scoreboard" url={`${origin}/scoreboard/${club.id}`} />
                  <CopyLink label="Scorebug" url={`${origin}/scorebug/${club.id}`} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/umpire" className="text-sky-400 hover:text-sky-300">
          Back to the games
        </Link>
      </p>
    </PageShell>
  );
}
