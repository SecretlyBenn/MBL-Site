/**
 * Serves a player's Minecraft head, cached at the edge.
 *
 * Fetching these straight from a skin service in the browser has two problems.
 * A roster page asks for twenty heads at once, and the services throttle a
 * burst like that - mc-heads answers a throttled request with the default
 * Steve rather than an error, so the page quietly fills with strangers. And
 * every head costs the visitor a fresh connection to a third party, which is
 * what made them crawl in.
 *
 * Going through here fixes both: the browser talks only to this origin, and
 * Cloudflare keeps each head in its cache, so a head is fetched from upstream
 * once and served from the edge afterwards. Skins change rarely, so a long TTL
 * costs nothing and a changed skin appears within the day.
 */

/** Upstream services, tried in order. Minotar first - it answered correctly for
 *  every account mc-heads served a default skin for. */
const SERVICES = [
  (uuid: string, size: number) => `https://minotar.net/avatar/${uuid}/${size}`,
  (uuid: string, size: number) => `https://mc-heads.net/avatar/${uuid}/${size}`,
];

const DAY = 86_400;

export async function GET(request: Request, context: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await context.params;

  // The id goes into an upstream URL, so it is checked rather than trusted.
  if (!/^[0-9a-f]{32}$/i.test(uuid)) {
    return new Response("Not a player id", { status: 400 });
  }

  const requested = Number(new URL(request.url).searchParams.get("s") ?? 64);
  const size = Number.isFinite(requested) ? Math.min(256, Math.max(8, Math.round(requested))) : 64;

  // Caching is left to the Cache-Control headers below rather than the Cache
  // API: `caches.default` is not available in this runtime and reaching for it
  // threw, which took the whole route down.
  for (const build of SERVICES) {
    try {
      // A service that hangs must not hold the page's head hostage - give up
      // and try the next one. One upstream was taking over twenty seconds.
      const upstream = await fetch(build(uuid, size), {
        headers: { "User-Agent": "mbl-site (minecraftbaseball.com)" },
        signal: AbortSignal.timeout(4000),
      });
      if (!upstream.ok) continue;

      const body = await upstream.arrayBuffer();
      // An empty body means the service answered without an image; treating it
      // as a hit would cache a blank head for a day.
      if (body.byteLength === 0) continue;

      return new Response(body, {
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
          "Cache-Control": `public, max-age=${DAY}, s-maxage=${DAY}`,
        },
      });
    } catch {
      // Try the next service rather than failing the whole request.
    }
  }

  // Nothing upstream answered. A short cache keeps a run of failures from
  // hammering the services, without pinning the failure for a day.
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
