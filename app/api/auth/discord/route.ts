import { authorizeUrl } from "@/app/discord";

/**
 * Starts sign-in. The `state` parameter carries where to return to afterwards
 * and is signed into a cookie, so a forged callback cannot pick the
 * destination or replay someone else's login.
 */
export async function GET(request: Request) {
  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/";
  // Only same-site paths: an open redirect would let a phishing page borrow the
  // site's own sign-in link.
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";

  const nonce = crypto.randomUUID();
  const state = `${nonce}:${safeReturnTo}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl(request, state),
      "Set-Cookie": `mbl_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
