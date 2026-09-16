import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { callerAddress, rateLimit } from "@/db/rate-limit";
import { users } from "@/db/schema";
import { exchangeCode } from "@/app/discord";
import { sessionCookie } from "@/app/session";

/** Discord sends the user back here with a one-time code. */
export async function GET(request: Request) {
  // Sign-in is the one door into the league's tools, so it is the one worth
  // holding shut against a machine: a handful of attempts per address, then a
  // wait. A real person signs in once and never notices.
  const attempt = await rateLimit(`signin:${callerAddress(request)}`, { limit: 12, windowSeconds: 300 });
  if (!attempt.ok) {
    return new Response("Too many sign-in attempts. Try again in a few minutes.", {
      status: 429,
      headers: { "Retry-After": String(attempt.retryAfter) },
    });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieHeader = request.headers.get("Cookie") ?? "";
  const expected = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("mbl_oauth_state="))
    ?.slice("mbl_oauth_state=".length);

  // The state must match the one this browser was issued: that is what ties the
  // callback to a sign-in this user actually started.
  if (!code || !state || !expected || decodeURIComponent(expected) !== state) {
    return new Response(null, { status: 302, headers: { Location: "/unauthorized?error=state" } });
  }

  const returnTo = state.slice(state.indexOf(":") + 1) || "/";

  try {
    const user = await exchangeCode(request, code);
    // The cookie is stamped with the account's current epoch, so signing out
    // everywhere later invalidates it. Someone with no league account gets a
    // session all the same - it grants nothing until an admin adds them.
    const account = await getDb().query.users.findFirst({ where: eq(users.discordId, user.id) });
    const headers = new Headers({ Location: returnTo });
    headers.append(
      "Set-Cookie",
      await sessionCookie(user.id, user.globalName ?? user.username, account?.sessionEpoch ?? 0),
    );
    headers.append("Set-Cookie", "mbl_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    return new Response(null, { status: 302, headers });
  } catch {
    return new Response(null, { status: 302, headers: { Location: "/unauthorized?error=discord" } });
  }
}
