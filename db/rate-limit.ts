import { sql } from "drizzle-orm";
import { getDb } from "./index";

/**
 * A simple fixed-window rate limit, kept in D1.
 *
 * Nothing on the site was limited before: a script could hammer sign-in or the
 * admin API as fast as the network allowed. This puts a ceiling on how often
 * one actor may do one kind of thing, so a stolen or guessed way in cannot be
 * used at machine speed, and a runaway page cannot run the league's database
 * quota down on its own.
 *
 * Counting happens in a single statement - read-then-write would let two
 * requests at once both see the same count - and the answer costs one query,
 * so it is cheap enough to sit in front of every write.
 */

export type RateLimit = {
  /** How many are allowed inside the window. */
  limit: number;
  /** How long the window lasts, in seconds. */
  windowSeconds: number;
};

export type RateVerdict = {
  ok: boolean;
  /** Seconds until the window resets, for a Retry-After header. */
  retryAfter: number;
};

/**
 * Counts one attempt against `key` and says whether it is allowed.
 *
 * A database that will not answer must not lock the league out of its own
 * site, so a failed check allows the request.
 */
export async function rateLimit(key: string, { limit, windowSeconds }: RateLimit): Promise<RateVerdict> {
  const now = Math.floor(Date.now() / 1000);
  const windowOpened = now - windowSeconds;

  try {
    const rows = await getDb().all<{ window_start: number; hits: number }>(sql`
      INSERT INTO rate_limits (key, window_start, hits) VALUES (${key}, ${now}, 1)
      ON CONFLICT(key) DO UPDATE SET
        hits = CASE WHEN rate_limits.window_start <= ${windowOpened} THEN 1 ELSE rate_limits.hits + 1 END,
        window_start = CASE WHEN rate_limits.window_start <= ${windowOpened} THEN ${now} ELSE rate_limits.window_start END
      RETURNING window_start, hits
    `);
    const row = rows[0];
    if (!row) return { ok: true, retryAfter: 0 };
    return {
      ok: row.hits <= limit,
      retryAfter: Math.max(1, row.window_start + windowSeconds - now),
    };
  } catch {
    return { ok: true, retryAfter: 0 };
  }
}

/** The client's address, as Cloudflare reports it. Unknown callers share a bucket. */
export function callerAddress(request: Request) {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

/** The response a caller gets when they are over the limit. */
export function tooManyRequests(retryAfter: number) {
  return Response.json(
    { error: "That is happening too often. Wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/**
 * Clears out windows that closed long ago, roughly one call in fifty.
 *
 * The table would otherwise grow a row per address per day forever. Doing it
 * on a dice roll keeps it off the critical path of every request.
 */
export async function sweepRateLimits() {
  if (Math.random() > 0.02) return;
  const dayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  try {
    await getDb().run(sql`DELETE FROM rate_limits WHERE window_start < ${dayAgo}`);
  } catch {
    // Housekeeping; a failure changes nothing the caller cares about.
  }
}
