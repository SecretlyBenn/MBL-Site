/// <reference types="@cloudflare/workers-types" />

/**
 * What the Worker runtime provides, for the type checker's benefit.
 *
 * `D1Database`, `Fetcher` and the `cloudflare:workers` module come from the
 * Workers runtime rather than from Node or the browser, so without this
 * reference `tsc` reports them as undefined and the whole check is useless.
 *
 * The bindings below are the ones `wrangler.json` declares. The secrets are
 * optional because a Worker can be deployed without them set - the code that
 * reads them says so plainly and throws rather than running half-configured.
 */
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    AUTH_SECRET?: string;
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
  }
}
