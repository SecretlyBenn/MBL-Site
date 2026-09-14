import type { Metadata } from "next";
import Link from "next/link";
import { eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { games, historicalSeasons, minecraftProfiles, players, scorecards, teams, users } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { SectionHeader } from "@/app/SiteNav";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

/**
 * Where an admin starts: what needs attention, and a door into each section.
 * Only counts are read here - each section loads its own rows - so this page
 * stays light however large the league grows.
 */
export default async function AdminOverviewPage() {
  const leagueUser = await requireRole(["ADMIN"], "/admin");
  const db = getDb();
  const n = sql<number>`count(*)`;
  const one = async (query: Promise<{ n: number }[]>) => Number((await query)[0]?.n ?? 0);

  const [teamCount, playerCount, unlinked, scheduled, pendingReview, seasonCount, accountCount] = await Promise.all([
    one(db.select({ n }).from(teams)),
    one(db.select({ n }).from(players)),
    one(
      db
        .select({ n })
        .from(players)
        .leftJoin(minecraftProfiles, eq(minecraftProfiles.playerName, players.displayName))
        .where(isNull(minecraftProfiles.uuid)),
    ),
    one(db.select({ n }).from(games).where(eq(games.status, "SCHEDULED"))),
    one(db.select({ n }).from(scorecards).where(eq(scorecards.status, "PENDING"))),
    one(db.select({ n }).from(historicalSeasons)),
    one(db.select({ n }).from(users)),
  ]);

  const sections = [
    {
      href: "/admin/teams",
      title: "Teams",
      stat: `${teamCount} clubs`,
      body: "Add a club, rename it, change its colours, upload its logo, or remove one added by mistake.",
    },
    {
      href: "/admin/players",
      title: "Players",
      stat: `${playerCount} in the pool`,
      alert: unlinked > 0 ? `${unlinked} without a Minecraft account` : undefined,
      body: "Add a draft class, move players between teams, rename them, and link Minecraft accounts so heads show.",
    },
    {
      href: "/admin/games",
      title: "Games",
      stat: `${scheduled} scheduled`,
      body: "Build a season's schedule, remove a game, retire a game a series never reached, record a forfeit.",
    },
    {
      href: "/admin/seasons",
      title: "Seasons",
      stat: `${seasonCount} seasons`,
      body: "Start the next season or its playoffs, and recount a season's standings and stats.",
    },
    {
      href: "/admin/accounts",
      title: "Accounts",
      stat: `${accountCount} accounts`,
      alert: pendingReview > 0 ? `${pendingReview} scorecard${pendingReview === 1 ? "" : "s"} waiting for review` : undefined,
      body: "Give umpires, head umpires, GMs and admins access, and change their roles.",
    },
  ];

  return (
    <>
      <SectionHeader title={`Signed in as ${leagueUser.displayName}`} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="ui-card group flex flex-col gap-1.5 p-4 transition-colors hover:border-sky-700/60"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-base font-bold text-slate-100 group-hover:text-sky-300">{section.title}</span>
              <span className="text-xs text-slate-500">{section.stat}</span>
            </span>
            <span className="text-sm leading-relaxed text-slate-400">{section.body}</span>
            {section.alert && <span className="text-xs font-semibold text-amber-400">{section.alert}</span>}
          </Link>
        ))}
      </div>
    </>
  );
}
