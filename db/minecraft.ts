import { eq, inArray } from "drizzle-orm";
import { getDb } from "./index";
import { minecraftProfiles, minecraftSkins } from "./schema";

/** A Minecraft username: 3-16 letters, digits or underscores. */
export const MINECRAFT_NAME = /^[A-Za-z0-9_]{3,16}$/;

/**
 * Mojang turns away requests from Cloudflare's servers, so on the live site
 * every call straight to Mojang fails - which read as "no such account" and
 * left every head on its fallback. playerdb.co relays Mojang's own answers
 * (the same UUIDs and signed texture data) and does answer Cloudflare, so it
 * is asked whenever Mojang is not. Run locally, Mojang still answers first.
 */
const RELAY = "https://playerdb.co/api/player/minecraft/";
const RELAY_HEADERS = { "User-Agent": "MBL-Site (+https://mbl-site.benmerlin11.workers.dev)" };
const TIMEOUT_MS = 5000;

/**
 * A Worker may make only 50 outside requests per visit, so one visit asks the
 * relay about at most this many names. The rest come back unchecked.
 */
const RELAY_LIMIT = 40;

export type Account = { uuid: string; name: string };
/** What an account wears, as its profile reports it. */
export type AccountProfile = { name: string | null; skinUrl: string | null };

type Textures = { name: string; value: string }[] | undefined;

/** The skin URL inside a profile's signed textures property, if it has one. */
function skinUrlFrom(properties: Textures) {
  const textures = properties?.find((property) => property.name === "textures");
  if (!textures) return null;
  try {
    const decoded = JSON.parse(atob(textures.value)) as { textures?: { SKIN?: { url?: string } } };
    // Mojang hands these out as http; the CDN serves the same file over https.
    return decoded.textures?.SKIN?.url?.replace(/^http:/, "https:") ?? null;
  } catch {
    return null;
  }
}

type RelayPlayer = { username: string; raw_id: string; properties?: Textures };

/**
 * Asks the relay about a username or UUID: the player, `null` when no account
 * matches, or `undefined` when the relay gave no answer at all.
 */
async function askRelay(nameOrUuid: string): Promise<RelayPlayer | null | undefined> {
  try {
    const response = await fetch(RELAY + encodeURIComponent(nameOrUuid), {
      headers: RELAY_HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.json()) as { code?: string; data?: { player?: RelayPlayer } };
    if (body.code === "player.found" && body.data?.player) return body.data.player;
    return body.code?.startsWith("minecraft.invalid") ? null : undefined;
  } catch {
    return undefined;
  }
}

/** Mojang's answer for one batch of up to ten names, or null if it would not answer. */
async function askMojangForNames(names: string[]) {
  try {
    const response = await fetch("https://api.minecraftservices.com/minecraft/profile/lookup/bulk/byname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(names),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return ((await response.json()) as { id: string; name: string }[]).map(
      (account): Account => ({ uuid: account.id, name: account.name }),
    );
  } catch {
    return null;
  }
}

/**
 * Looks up the accounts currently holding these usernames.
 *
 * `found` maps lowercased name -> account; a name Mojang does not recognise is
 * simply absent. `unchecked` lists names nobody could answer for - Mojang and
 * the relay both down, or past the relay limit - which are not the same as
 * "no such account" and should be reported differently.
 *
 * A username only identifies an account at the moment it is looked up -
 * renames free names for anyone to take - so this is for linking a player who
 * is using the name now, never for resolving an old archived name.
 */
export async function lookupAccounts(names: string[]) {
  const found = new Map<string, Account>();
  const valid = [...new Set(names.filter((name) => MINECRAFT_NAME.test(name)))];

  // Mojang answers up to ten names per request. Once it refuses one batch it
  // will refuse the rest, so the remainder goes straight to the relay.
  let unanswered: string[] = [];
  for (let start = 0; start < valid.length; start += 10) {
    const batch = valid.slice(start, start + 10);
    const accounts = unanswered.length === 0 ? await askMojangForNames(batch) : null;
    if (!accounts) {
      unanswered.push(...batch);
      continue;
    }
    for (const account of accounts) found.set(account.name.toLowerCase(), account);
  }

  const unchecked = unanswered.slice(RELAY_LIMIT);
  const relayed = unanswered.slice(0, RELAY_LIMIT);
  // A few at a time, to stay polite to a free service.
  for (let start = 0; start < relayed.length; start += 8) {
    await Promise.all(
      relayed.slice(start, start + 8).map(async (name) => {
        const player = await askRelay(name);
        if (player) found.set(player.username.toLowerCase(), { uuid: player.raw_id, name: player.username });
        else if (player === undefined) unchecked.push(name);
      }),
    );
  }
  return { found, unchecked };
}

/**
 * The name and skin an account has today, by UUID, or null when neither Mojang
 * nor the relay answered. Mojang's session server is asked first; from the
 * live site it refuses, and the relay's copy of the same profile is used.
 */
export async function lookupProfile(uuid: string): Promise<AccountProfile | null> {
  try {
    const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) {
      const profile = (await response.json()) as { name?: string; properties?: Textures };
      return { name: profile.name ?? null, skinUrl: skinUrlFrom(profile.properties) };
    }
  } catch {
    // Fall through to the relay.
  }
  const player = await askRelay(uuid);
  return player ? { name: player.username, skinUrl: skinUrlFrom(player.properties) } : null;
}

/**
 * Points a player's name at a Minecraft account, replacing any earlier link,
 * and forgets the cached skin so the next head is fetched fresh.
 */
export async function linkProfile(playerName: string, account: Account, source: string) {
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
