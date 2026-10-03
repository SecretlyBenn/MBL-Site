import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { leagueSettings } from "./schema";

/**
 * Settings the league can change for itself, instead of waiting on a code
 * change and a deploy.
 */

/**
 * The key the season setting used before the site held two competitions.
 *
 * Still read for the MBL so an unmigrated database behaves as it did, and so
 * 0066 is not a thing that has to have been applied for the site to work.
 */
export const CURRENT_SEASON = "current_season";

/** Where a competition's current season is recorded. See 0066. */
export function currentSeasonKey(leagueSlug: string) {
  return `${CURRENT_SEASON}:${leagueSlug}`;
}

/**
 * What the MBL's current season was before this was a setting. Used when the
 * setting has never been written, so an empty table behaves exactly as the
 * code did.
 *
 * There is deliberately no equivalent for any other competition. A fallback
 * here is a guess about where somebody's game should be filed, and the MBL's
 * is only tolerable because it is the value the code itself used to carry.
 */
export const FALLBACK_SEASON_NAME = "MBL Season XII";
const FALLBACK_SEASON_LEAGUE = "mbl";

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
 * The season a competition is playing, or null if nobody has said.
 *
 * A game carried over from a published schedule already knows its season, so
 * this only decides where a game the archive has never seen goes - and which
 * schedule the umpire page reads series numbers from. It used to be a constant
 * in the code, which meant Season XIII would have quietly filed itself under
 * Season XII until someone edited and redeployed the site.
 *
 * It is per competition because the MBL and the MCBA run at the same time.
 * Null is a real answer and means the competition has not started a season
 * here yet; callers that file data must refuse rather than fall back, because
 * the only season available to fall back to belongs to the other competition.
 */
export async function currentSeasonName(leagueSlug: string): Promise<string | null> {
  const set = await getSetting(currentSeasonKey(leagueSlug));
  if (set) return set;

  // The MBL's setting may still be under the key it had before 0066.
  if (leagueSlug === FALLBACK_SEASON_LEAGUE) {
    return (await getSetting(CURRENT_SEASON)) ?? FALLBACK_SEASON_NAME;
  }
  return null;
}

/** Records which season a competition is playing. */
export async function setCurrentSeasonName(leagueSlug: string, name: string) {
  await setSetting(currentSeasonKey(leagueSlug), name);
}
