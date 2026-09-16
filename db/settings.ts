import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { leagueSettings } from "./schema";

/**
 * Settings the league can change for itself, instead of waiting on a code
 * change and a deploy.
 */

/** The season a newly scheduled game belongs to, and whose schedule the umpire page reads. */
export const CURRENT_SEASON = "current_season";

/**
 * What the current season was before this was a setting. Used when the setting
 * has never been written, so an empty table behaves exactly as the code did.
 */
export const FALLBACK_SEASON_NAME = "MBL Season XII";

export async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await getDb().query.leagueSettings.findFirst({ where: eq(leagueSettings.key, key) });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string) {
  await getDb()
    .insert(leagueSettings)
    .values({ key, value, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: leagueSettings.key,
      set: { value, updatedAt: new Date().toISOString() },
    });
}

/**
 * The season the league is playing.
 *
 * A game carried over from a published schedule already knows its season, so
 * this only decides where a game the archive has never seen goes - and which
 * schedule the umpire page reads series numbers from. It used to be a constant
 * in the code, which meant Season XIII would have quietly filed itself under
 * Season XII until someone edited and redeployed the site.
 */
export async function currentSeasonName() {
  return (await getSetting(CURRENT_SEASON)) ?? FALLBACK_SEASON_NAME;
}
