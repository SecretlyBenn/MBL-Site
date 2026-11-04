import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// app/session.ts imports cloudflare:workers, so it cannot be loaded here and
// the shape of the function is what this file can check. The behaviour itself
// was tested against the live site: a cookie whose signature is not base64url
// answered 500 before this, and answers as signed out after it.
const session = readFileSync("app/session.ts", "utf8");

test("a cookie this site cannot read means signed out, not a crash", () => {
  // A malformed cookie - truncated by a proxy, mangled by an extension - is
  // not merely unsigned: decoding a value that is not base64url throws. That
  // throw used to escape decodeSession, which is a 500 on every page the
  // reader loads while the bad cookie is still in their browser.
  const decode = session.slice(session.indexOf("export async function decodeSession"));
  const body = decode.slice(0, decode.indexOf("\n}"));
  const guarded = body.indexOf("try {");
  assert.ok(guarded > 0, "decodeSession has nothing catching a malformed cookie");

  for (const unsafe of ["crypto.subtle.verify", "fromBase64Url(signature)", "JSON.parse"]) {
    assert.ok(
      body.indexOf(unsafe) > guarded,
      `${unsafe} runs before the try, so a malformed cookie still throws`,
    );
  }
});

test("the signature is checked before the payload is believed", () => {
  const decode = session.slice(session.indexOf("export async function decodeSession"));
  assert.ok(
    decode.indexOf("crypto.subtle.verify") < decode.indexOf("JSON.parse"),
    "the payload is parsed before the signature is verified",
  );
  assert.ok(decode.includes("if (!valid) return null;"), "a bad signature is not refused");
});

test("the session cookie keeps page scripts out and expires", () => {
  // HttpOnly is what stops a script reading the token; Secure keeps it off
  // plain HTTP. Lax still arrives on the top-level redirect back from Discord.
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age="]) {
    assert.ok(session.includes(flag), `the session cookie is missing ${flag}`);
  }
  assert.ok(session.includes("session.expiresAt * 1000 < Date.now()"), "an expired cookie is accepted");
});
