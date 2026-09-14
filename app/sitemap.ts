import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { historicalPlayerStats, historicalSeasons, teams } from "@/db/schema";
import { SITE } from "./site";

const STATIC_PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/schedule", priority: 0.9, changeFrequency: "daily" },
  { path: "/standings", priority: 0.9, changeFrequency: "daily" },
  { path: "/statistics/leaders", priority: 0.8, changeFrequency: "daily" },
  { path: "/statistics/batting", priority: 0.8, changeFrequency: "daily" },
  { path: "/statistics/pitching", priority: 0.8, changeFrequency: "daily" },
  { path: "/statistics/team-batting", priority: 0.6, changeFrequency: "daily" },
  { path: "/statistics/team-pitching", priority: 0.6, changeFrequency: "daily" },
  { path: "/rosters", priority: 0.7, changeFrequency: "weekly" },
  { path: "/seasons", priority: 0.6, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

/**
 * Every public page a search engine should know about.
 *
 * Three small reads: the seasons, the live teams, and one name per archived
 * player - the last walks the player_name index rather than the table. Crawlers
 * fetch this rarely, so it costs next to nothing against the database allowance.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${SITE.url}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  try {
    const db = getDb();
    const [seasons, liveTeams, players] = await Promise.all([
      db.select({ id: historicalSeasons.id }).from(historicalSeasons),
      db.select({ id: teams.id }).from(teams),
      db.selectDistinct({ name: historicalPlayerStats.playerName }).from(historicalPlayerStats),
    ]);

    for (const season of seasons) {
      pages.push({ url: `${SITE.url}/seasons/${season.id}`, changeFrequency: "weekly", priority: 0.5 });
    }
    for (const team of liveTeams) {
      pages.push({ url: `${SITE.url}/teams/${team.id}`, changeFrequency: "weekly", priority: 0.6 });
    }
    for (const player of players) {
      pages.push({
        url: `${SITE.url}/players/history/${encodeURIComponent(player.name)}`,
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
