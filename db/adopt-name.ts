import { and, eq, ne, or } from "drizzle-orm";
import { getDb } from "./index";
import {
  historicalGameStats,
  historicalPlayerStats,
  historicalRosterEntries,
  minecraftProfiles,
  players,
} from "./schema";

/**
 * Moves a player to the name their Minecraft account now carries.
 *
 * The league's rule is that a player appears under the name they go by today,
 * everywhere, however old the season. The archive is keyed by name rather than
 * by id, so honouring that means rewriting the string in every table that
 * holds it - otherwise a rename splits a career in two, the old seasons under
 * one name and the recent games under another, and the half that no longer
 * matches a profile row loses its head as well.
 *
 * This is the automatic half of /api/players/rename. That route is an admin
 * typing a name; this one is the six-hourly skin refresh noticing that Mojang
 * reports a different name than the site has, which is how a rename reaches
 * the site with nobody doing anything.
 *
 * It refuses exactly what that route refuses. If the new name already belongs
 * to anything on the site that is not this account, renaming onto it would
 * merge two careers into one, and nothing records which rows came from where,
 * so no later edit could separate them again. Refusing leaves the player under
 * their old name, which is wrong but recoverable; merging is neither.
 */

/** The archive tables that key a player by name. */
const NAMED = [
  { table: historicalPlayerStats, column: historicalPlayerStats.playerName },
  { table: historicalGameStats, column: historicalGameStats.playerName },
  { table: historicalRosterEntries, column: historicalRosterEntries.playerName },
] as const;

export type AdoptResult = "renamed" | "taken" | "nothing";

export async function adoptCurrentName(uuid: string, to: string): Promise<AdoptResult> {
  // A Minecraft name is 3-16 of letters, digits and underscore. Anything else
  // did not come from Mojang and has no business being written to five tables.
  if (!/^\w{3,16}$/.test(to)) return "nothing";

  const db = getDb();
  const [profile] = await db
    .select()
    .from(minecraftProfiles)
    .where(eq(minecraftProfiles.uuid, uuid));
  if (!profile || profile.playerName === to) return "nothing";

  const from = profile.playerName;

  // Taken by another account's profile row.
  const [otherProfile] = await db
    .select({ name: minecraftProfiles.playerName })
    .from(minecraftProfiles)
    .where(and(eq(minecraftProfiles.playerName, to), ne(minecraftProfiles.uuid, uuid)));
  if (otherProfile) return "taken";

  // Taken on the live roster by somebody who is not this player. The username
  // column is unique, so writing over it would throw rather than merge, but
  // the answer is the same either way.
  const [otherPlayer] = await db
    .select({ id: players.id, displayName: players.displayName })
    .from(players)
    .where(or(eq(players.displayName, to), eq(players.minecraftUsername, to)));
  if (otherPlayer && otherPlayer.displayName !== from) return "taken";

  // Taken in the archive. A name there carries no account, so there is no way
  // to tell whether those rows are this player's earlier seasons or somebody
  // else's whole career - and the second is the one that must not be merged.
  for (const { table, column } of NAMED) {
    const [held] = await db.select({ name: column }).from(table).where(eq(column, to)).limit(1);
    if (held) return "taken";
  }

  for (const { table, column } of NAMED) {
    await db.update(table).set({ playerName: to }).where(eq(column, from));
  }
  // The Minecraft username travels with the display name; they are the same
  // string for every player in this league.
  await db
    .update(players)
    .set({ displayName: to, minecraftUsername: to })
    .where(eq(players.displayName, from));
  await db
    .update(minecraftProfiles)
    .set({ playerName: to, currentName: to })
    .where(eq(minecraftProfiles.uuid, uuid));

  return "renamed";
}
