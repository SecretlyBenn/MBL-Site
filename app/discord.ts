import { env } from "cloudflare:workers";

/**
 * Discord OAuth. Signing in with Discord proves who someone is; it grants no
 * league access on its own - that still comes from a matching `users` row, the
 * same rule the ChatGPT sign-in followed.
 */

const AUTHORIZE = "https://discord.com/oauth2/authorize";
const TOKEN = "https://discord.com/api/oauth2/token";
const ME = "https://discord.com/api/users/@me";

function credential(name: "DISCORD_CLIENT_ID" | "DISCORD_CLIENT_SECRET") {
  const value = (env as unknown as Record<string, string | undefined>)[name];
  if (!value) throw new Error(`${name} is not set on the Worker.`);
  return value;
}

export function redirectUri(request: Request) {
  // Derived from the request so local development, the workers.dev address and
  // a custom domain each send Discord back to themselves.
  return new URL("/api/auth/discord/callback", new URL(request.url).origin).toString();
}

export function authorizeUrl(request: Request, state: string) {
  const url = new URL(AUTHORIZE);
  url.searchParams.set("client_id", credential("DISCORD_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri(request));
  url.searchParams.set("response_type", "code");
  // `identify` is enough for an id and username. Email is deliberately not
  // requested: the league does not need it, and not holding it is simpler than
  // protecting it.
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);
  return url.toString();
}

export type DiscordUser = { id: string; username: string; globalName: string | null };

export async function exchangeCode(request: Request, code: string): Promise<DiscordUser> {
  const response = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credential("DISCORD_CLIENT_ID"),
      client_secret: credential("DISCORD_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(request),
    }),
  });
  if (!response.ok) {
    throw new Error(`Discord rejected the authorization code (${response.status}).`);
  }

  const { access_token: accessToken } = (await response.json()) as { access_token: string };
  const me = await fetch(ME, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!me.ok) throw new Error(`Could not read the Discord profile (${me.status}).`);

  const user = (await me.json()) as { id: string; username: string; global_name: string | null };
  return { id: user.id, username: user.username, globalName: user.global_name };
}
