import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

/**
 * Sessions are a signed cookie rather than a database row: the payload is tiny
 * and self-describing, so verifying one costs an HMAC check instead of a query
 * on every request. The trade-off is that a session cannot be revoked before it
 * expires - acceptable for a league site, and the reason the lifetime is short
 * enough to matter.
 */
export type Session = {
  /** Discord's user id - the stable identity. Usernames change. */
  discordId: string;
  displayName: string;
  /** Seconds since the epoch. */
  expiresAt: number;
};

const COOKIE = "mbl_session";
const LIFETIME_SECONDS = 60 * 60 * 24 * 14;

function secret() {
  const value = (env as unknown as { AUTH_SECRET?: string }).AUTH_SECRET;
  if (!value) {
    throw new Error(
      "AUTH_SECRET is not set. Generate a random value and add it with `wrangler secret put AUTH_SECRET`.",
    );
  }
  return value;
}

const encoder = new TextEncoder();

/** base64url, because a cookie value cannot carry +, / or =. */
function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function key() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: string) {
  const signature = await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

/** `<payload>.<signature>`, both base64url. */
export async function encodeSession(session: Session) {
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)));
  return `${payload}.${await sign(payload)}`;
}

export async function decodeSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  // Verify before parsing: the payload is attacker-supplied until the signature
  // says otherwise.
  const valid = await crypto.subtle.verify(
    "HMAC",
    await key(),
    fromBase64Url(signature),
    encoder.encode(payload),
  );
  if (!valid) return null;

  try {
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Session;
    if (!session.discordId || session.expiresAt * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(COOKIE)?.value);
}

/** The Set-Cookie value for a fresh session, for use from a route handler. */
export async function sessionCookie(discordId: string, displayName: string) {
  const session: Session = {
    discordId,
    displayName,
    expiresAt: Math.floor(Date.now() / 1000) + LIFETIME_SECONDS,
  };
  const token = await encodeSession(session);
  // HttpOnly keeps the token away from page scripts; Lax still arrives on the
  // top-level redirect back from Discord.
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${LIFETIME_SECONDS}`;
}

export const clearedSessionCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
