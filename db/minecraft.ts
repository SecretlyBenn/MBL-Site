import { eq, inArray } from "drizzle-orm";
import { getDb } from "./index";
import { minecraftProfiles, minecraftSkins } from "./schema";

/** A Minecraft username: 3-16 letters, digits or underscores. */
export const MINECRAFT_NAME = /^[A-Za-z0-9_]{3,16}$/;

/**
 * Looks up the accounts currently holding these usernames, as lowercased name
 * -> { uuid, name }. Names Mojang does not recognise are simply absent.
 *
 * A username only identifies an account at the moment it is looked up -
 * renames free names for anyone to take - so this is for linking a player who
 * is using the name now, never for resolving an old archived name.
 */
export async function lookupAccounts(names: string[]) {
  const found = new Map<string, { uuid: string; name: string }>();
  const valid = [...new Set(names.filter((name) => MINECRAFT_NAME.test(name)))];
  // Mojang answers up to ten names per request.
  for (let start = 0; start < valid.length; start += 10) {
    try {
      const response = await fetch(
        "https://api.minecraftservices.com/minecraft/profile/lookup/bulk/byname",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(valid.slice(start, start + 10)),
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!response.ok) continue;
      for (const account of (await response.json()) as { id: string; name: string }[]) {
        found.set(account.name.toLowerCase(), { uuid: account.id, name: account.name });
      }
    } catch {
      // A failed batch leaves those players unlinked; they can be linked later.
    }
  }
  return found;
}

/**
 * Points a player's name at a Minecraft account, replacing any earlier link,
 * and forgets the cached skin so the next head is fetched fresh.
 */
export async function linkProfile(playerName: string, account: { uuid: string; name: string }, source: string) {
  const db = getDb();
  await db
    .insert(minecraftProfiles)
    .values({ playerName, uuid: account.uuid, currentName: account.name, source })
    .onConflictDoUpdate({
      target: minecraftProfiles.playerName,
      set: { uuid: account.uuid, currentName: account.name, source },
    });
  await db.delete(minecraftSkins).where(eq(minecraftSkins.uuid, account.uuid));
}

/** Which of these player names already have a linked account. */
export async function linkedNames(names: string[]) {
  if (names.length === 0) return new Set<string>();
  const rows = await getDb()
    .select({ playerName: minecraftProfiles.playerName })
    .from(minecraftProfiles)
    .where(inArray(minecraftProfiles.playerName, names));
  return new Set(rows.map((row) => row.playerName));
}
