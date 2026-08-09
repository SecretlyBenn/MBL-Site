import { exchangeCode } from "@/app/discord";
import { sessionCookie } from "@/app/session";

/** Discord sends the user back here with a one-time code. */
export async function GET(request: Request) {
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
    const headers = new Headers({ Location: returnTo });
    headers.append("Set-Cookie", await sessionCookie(user.id, user.globalName ?? user.username));
    headers.append("Set-Cookie", "mbl_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    return new Response(null, { status: 302, headers });
  } catch {
    return new Response(null, { status: 302, headers: { Location: "/unauthorized?error=discord" } });
  }
}
