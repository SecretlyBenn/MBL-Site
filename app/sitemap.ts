import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { historicalPlayerStats, historicalSeasons, leagues, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SITE } from "./site";

/** Pages every league has its own copy of, under /<league>. */
const LEAGUE_PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "yearly" }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/schedule", priority: 0.9, changeFrequency: "daily" },
  { path: "/standings", priority: 0.9, changeFrequency: "daily" },
  { path: "/statistics/leaders", priority: 0.8, changeFrequency: "daily" },
  { path: "/statistics/batting", priority: 0.8, changeFrequency: "daily" },
  { path: "/statistics/pitching", priority: 0.8, changeFrequency: "daily" },
  { path: "/statistics/team-batting", priority: 0.6, changeFrequency: "daily" },
  { path: "/statistics/team-pitching", priority: 0.6, changeFrequency: "daily" },
  { path: "/rosters", priority: 0.7, changeFrequency: "weekly" },
  { path: "/seasons", priority: 0.6, changeFrequency: "weekly" },
  { path: "/news", priority: 0.6, changeFrequency: "weekly" },
  { path: "/rules", priority: 0.4, changeFrequency: "yearly" },
];

/** Pages that belong to the site rather than to either league. */
const SITE_PAGES: { path: string; priority: number; changeFrequency: "yearly" }[] = [
  { path: "/contact", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

/**
 * Every public page a search engine should know about.
 *
 * A few small reads: the leagues, their seasons, the live clubs, and one name
 * per archived player with the league they played in - a player who moved from
 * one league to the other has a page in each. Crawlers fetch this rarely, so it
 * costs next to nothing against the database allowance.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = SITE_PAGES.map((page) => ({
    url: `${SITE.url}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  try {
    const db = getDb();
    const [allLeagues, seasons, liveTeams, players] = await Promise.all([
      db.select({ id: leagues.id, slug: leagues.slug }).from(leagues),
      db.select({ id: historicalSeasons.id, leagueId: historicalSeasons.leagueId }).from(historicalSeasons),
      db.select({ id: teams.id }).from(teams),
      db
        .selectDistinct({ name: historicalPlayerStats.playerName, leagueId: historicalSeasons.leagueId })
        .from(historicalPlayerStats)
        .innerJoin(historicalSeasons, eq(historicalPlayerStats.seasonId, historicalSeasons.id)),
    ]);

    const slugOf = new Map(allLeagues.map((league) => [league.id, league.slug]));
    const fallback = allLeagues[0]?.slug ?? "mbl";

    for (const league of allLeagues) {
      for (const page of LEAGUE_PAGES) {
        pages.push({
          url: `${SITE.url}/${league.slug}${page.path}`,
          changeFrequency: page.changeFrequency,
          priority: page.priority,
        });
      }
    }
    for (const season of seasons) {
      const slug = slugOf.get(season.leagueId ?? -1) ?? fallback;
      pages.push({ url: `${SITE.url}/${slug}/seasons/${season.id}`, changeFrequency: "weekly", priority: 0.5 });
    }
    // Clubs on the live side are not told apart by league yet, so they sit
    // under the league the site opens on.
    for (const team of liveTeams) {
      pages.push({ url: `${SITE.url}/${fallback}/teams/${team.id}`, changeFrequency: "weekly", priority: 0.6 });
    }
    for (const player of players) {
      const slug = slugOf.get(player.leagueId ?? -1) ?? fallback;
      pages.push({
        url: `${SITE.url}/${slug}/players/history/${encodeURIComponent(player.name)}`,
        changeFrequency: "weekly",
        priority: 0.4,
      });
    }
  } catch {
    // A database hiccup should still leave crawlers the static pages rather
    // than an error.
  }

  return pages;
}
