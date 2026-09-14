import { getDb } from "./index";
import { teamLogos } from "./schema";

export { logoKey } from "@/app/logo-key";

/**
 * Every uploaded logo, as club name -> image URL.
 *
 * Only the id and timestamp are read, never the image data, so this stays a
 * few bytes however many logos there are. The timestamp goes into the URL, so
 * a replaced logo is a new address and browsers can cache each one forever.
 *
 * A failure returns no overrides rather than throwing: this runs for every
 * page, and a missing custom logo must never take a page down with it - the
 * built-in logos still show.
 */
export async function getLogoOverrides(): Promise<Record<string, string>> {
  try {
    const rows = await getDb()
      .select({ id: teamLogos.id, teamName: teamLogos.teamName, updatedAt: teamLogos.updatedAt })
      .from(teamLogos);
    return Object.fromEntries(
      rows.map((row) => [row.teamName, `/api/logo/${row.id}?v=${Date.parse(row.updatedAt) || 0}`]),
    );
  } catch {
    return {};
  }
}
