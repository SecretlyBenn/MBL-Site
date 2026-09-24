/**
 * Facts about the site itself, in one place.
 *
 * `url` is what canonical links, the sitemap and social previews are built
 * from. It is the workers.dev address for now; pointing minecraftbaseball.com
 * at the Worker is a one-line change here.
 */
export const SITE = {
  url: "https://mbl-site.benmerlin11.workers.dev",
  name: "Minecraft Baseball League",
  shortName: "MBL",
  description:
    "The official home of the Minecraft Baseball League: live scores, standings, rosters, schedules and player statistics going back to Season IV.",
  discordUrl: "https://discord.gg/mbl",
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
  /** Where the privacy policy and terms were last revised. */
  policiesUpdated: "September 23, 2026",
} as const;
