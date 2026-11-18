import { env } from "cloudflare:workers";

/**
 * The shared secret the Discord bot pushes with.
 *
 * Shared by every route under /api/bot, because there is more than one now
 * and a second copy of a constant-time comparison is a second chance to write
 * one that is not.
 */

/**
 * Compared character by character to the end, so a wrong secret takes the
 * same time as a right one whatever it starts with.
 */
export function sameSecret(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let differences = 0;
  for (let index = 0; index < given.length; index += 1) {
    differences |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return differences === 0;
}

/**
 * Whether this request is the bot. Returns a Response to send back when it is
 * not, and nothing when it is.
 */
export function notTheBot(request: Request): Response | null {
  const expected = (env as unknown as { BOT_SECRET?: string }).BOT_SECRET;
  if (!expected) {
    return Response.json({ error: "BOT_SECRET is not set on this Worker." }, { status: 503 });
  }
  const given = request.headers.get("x-bot-secret") ?? "";
  if (!sameSecret(given, expected)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }
  return null;
}
