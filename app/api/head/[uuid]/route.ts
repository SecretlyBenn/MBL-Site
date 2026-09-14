import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { minecraftProfiles, minecraftSkins } from "@/db/schema";

/**
 * Serves the skin a Minecraft account is wearing, straight from Mojang.
 *
 * Heads used to come from third-party avatar services (minotar, mc-heads).
 * Both served the default Steve for accounts Mojang confirms have a custom
 * skin, so pages showed strangers no matter which one was asked. Mojang is the
 * source those services copy from: its session server names the account's
 * texture, and textures.minecraft.net serves the skin itself.
 *
 * This returns the whole 64x64 skin rather than a cropped face - a Worker has
 * no image library to crop with - and PlayerHead cuts the face and hat out of
 * it in CSS.
 *
 * The session server is rate limited, so its answer is kept in minecraft_skins
 * and asked for again only once it is STALE_AFTER old. That refresh is also how
 * a new skin or a renamed account reaches the site with nobody editing
 * anything. The texture URLs are content-addressed and not rate limited, so
 * fetching the skin itself is always safe.
 */

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
/** Browsers keep a skin this long before asking again. */
const BROWSER_CACHE_SECONDS = 6 * 60 * 60;
const TIMEOUT_MS = 4000;

type Resolved = { name: string | null; skinUrl: string | null };

/** Asks Mojang which skin the account wears. Null when Mojang did not answer. */
async function askMojang(uuid: string): Promise<Resolved | null> {
  try {
    const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const profile = (await response.json()) as {
      name?: string;
      properties?: { name: string; value: string }[];
    };
    const textures = profile.properties?.find((property) => property.name === "textures");
    let skinUrl: string | null = null;
    if (textures) {
      const decoded = JSON.parse(atob(textures.value)) as {
        textures?: { SKIN?: { url?: string } };
      };
      skinUrl = decoded.textures?.SKIN?.url ?? null;
    }
    // Mojang hands these out as http; the CDN serves the same file over https.
    return { name: profile.name ?? null, skinUrl: skinUrl?.replace(/^http:/, "https:") ?? null };
  } catch {
    return null;
  }
}

/** The skin Mojang last reported, refreshed when stale. */
async function resolveSkin(uuid: string): Promise<Resolved | null> {
  const db = getDb();
  const cached = await db.query.minecraftSkins.findFirst({ where: eq(minecraftSkins.uuid, uuid) });
  const fresh = cached && Date.now() - Date.parse(cached.checkedAt) < STALE_AFTER_MS;
  if (cached && fresh) return { name: cached.name, skinUrl: cached.skinUrl };

  const answer = await askMojang(uuid);
  // Mojang busy or down: an old answer beats no head at all.
  if (!answer) return cached ? { name: cached.name, skinUrl: cached.skinUrl } : null;

  const checkedAt = new Date().toISOString();
  await db
    .insert(minecraftSkins)
    .values({ uuid, name: answer.name, skinUrl: answer.skinUrl, checkedAt })
    .onConflictDoUpdate({
      target: minecraftSkins.uuid,
      set: { name: answer.name, skinUrl: answer.skinUrl, checkedAt },
    });

  // A renamed account keeps its UUID, so the name on file can follow it.
  if (answer.name && answer.name !== cached?.name) {
    await db
      .update(minecraftProfiles)
      .set({ currentName: answer.name })
      .where(eq(minecraftProfiles.uuid, uuid));
  }
  return answer;
}

async function fetchImage(url: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const body = await response.arrayBuffer();
    return body.byteLength > 0 ? body : null;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ uuid: string }> }) {
  const { uuid: raw } = await context.params;
  const uuid = raw.toLowerCase().replace(/-/g, "");

  // The id goes into upstream URLs, so it is checked rather than trusted.
  if (!/^[0-9a-f]{32}$/.test(uuid)) {
    return new Response("Not a player id", { status: 400 });
  }

  let resolved: Resolved | null = null;
  try {
    resolved = await resolveSkin(uuid);
  } catch {
    // The database being unavailable should not cost anyone their head.
    resolved = await askMojang(uuid);
  }

  const body =
    (resolved?.skinUrl ? await fetchImage(resolved.skinUrl) : null) ??
    // No custom skin, or Mojang unreachable: minotar serves the correct default
    // skin for the account. Its failure mode - serving a default - is exactly
    // right here, where a default is the answer.
    (await fetchImage(`https://minotar.net/skin/${uuid}`));

  if (!body) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
  }

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${BROWSER_CACHE_SECONDS}`,
    },
  });
}
