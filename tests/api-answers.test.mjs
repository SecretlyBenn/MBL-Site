import test from "node:test";
import assert from "node:assert/strict";
import { readJson } from "../app/read-json.ts";

const answer = (body, status = 200, ok = status < 400) => ({
  ok,
  status,
  text: async () => body,
});

/**
 * A request that never reaches its route comes back as a page, not JSON. That
 * used to surface as "Unexpected token '<'" - a parser complaint standing in
 * for a signed-out session or a worker that threw.
 */

test("a route's own refusal is passed through as written", async () => {
  await assert.rejects(
    readJson(answer(JSON.stringify({ error: "Somebody is already at 1B." }), 409)),
    /already at 1B/,
  );
});

test("an error page says what happened instead of failing to parse", async () => {
  await assert.rejects(readJson(answer("<!DOCTYPE html><html></html>", 500)), /HTTP 500/);
});

test("an expired session is named as one", async () => {
  await assert.rejects(readJson(answer("<!DOCTYPE html>", 401)), /session has expired/);
});

test("nothing is claimed to have been saved when the answer was a page", async () => {
  await assert.rejects(readJson(answer("<!DOCTYPE html>", 502)), /Nothing was saved/);
});

test("an empty body from a route that succeeded is not an error", async () => {
  assert.deepEqual(await readJson(answer("", 200)), {});
});

test("a successful answer is handed back parsed", async () => {
  assert.deepEqual(await readJson(answer(JSON.stringify({ inning: 6 }))), { inning: 6 });
});
