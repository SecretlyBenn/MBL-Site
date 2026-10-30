/**
 * Facts about the site itself, in one place.
 *
 * `url` is what canonical links, the sitemap and social previews are built
 * from. It is the workers.dev address for now; pointing minecraftbaseball.com
 * at the Worker is a one-line change here.
 *
 * It has to be the address the site is actually served from. It was left
 * behind when the Worker moved to the league's own Cloudflare account, so
 * every canonical link, every sitemap entry and every social preview named a
 * Worker in the old account - which still answers, with an older copy of the
 * site, so nothing looked broken.
 */
export const SITE = {
  url: "https://mbl-site.mbljavabaseball.workers.dev",
  name: "Minecraft Baseball League",
  shortName: "MBL",
  description:
    "The official home of the Minecraft Baseball League: live scores, standings, rosters, schedules and player statistics going back to Season IV.",
  discordUrl: "https://discord.gg/mbl",
  /**
   * The cosmetics shop, which Tebex hosts and the league does not. It is a
   * link and nothing more - no payment of any kind touches this site, and it
   * should stay that way, because the moment it did this would need to care
   * about card data.
   */
  storeUrl: "https://mbl.tebex.io",
  /**
   * The modpack, served from this site rather than linked off it.
   *
   * It is a Modrinth pack file - 49KB of manifest naming the ten mods, which
   * a launcher then fetches from Modrinth itself - so hosting it costs
   * nothing and there is no build of anything to keep in step. The path has no
   * version in it on purpose: the link is printed in Discord and on the site,
   * and a new release should not break either. `modpackVersion` is what the
   * page says out loud, so a release is two lines here.
   *
   * This is the file a player imports into Prism or the Modrinth app. The
   * Sports Launcher does not read it - that reads /client/json, which is the
   * same ten mods in the shape the launcher wants.
   */
  modpackUrl: "/minecraft-baseball-league.mrpack",
  modpackVersion: "1.21.8",
  /**
   * The league's own documents, kept in Google Docs where the commissioners
   * edit them. These are the short links the league publishes in Discord, so
   * a new season's rulebook can be swapped in without touching the site.
   */
  rulebookUrl: "https://tinyurl.com/RulebookMBL",
  communityRulesUrl: "https://tinyurl.com/MBLCommunityRules",
  /**
   * Shown on the contact page and in the policies when set. Discord is the
   * league's front door either way; an address matters for requests that
   * should not go through a public server, like deleting someone's data.
   */
  contactEmail: "mbljavabaseball@gmail.com",
  /**
   * Cloudflare Web Analytics site token. Empty means analytics is off.
   *
   * Get one from the Cloudflare dashboard: Analytics & Logs > Web Analytics >
   * Add a site, enter the hostname, and copy the token out of the snippet. The
   * token is public by design - it appears in every page's HTML - so it lives
   * here rather than in a secret.
   */
  analyticsToken: "",
} as const;
