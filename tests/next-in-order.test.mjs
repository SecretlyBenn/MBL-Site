import test from "node:test";
import assert from "node:assert/strict";
import { nextInOrder } from "../app/scoring.ts";

/**
 * The highlighted cell and the batter the server records have to agree, and
 * both come from here. A count of plate appearances modulo the lineup size
 * agreed with it only while the order was a clean nine.
 */

const order = (...slots) => slots.map((slot) => ({ battingOrder: slot, name: `slot ${slot}` }));

test("nobody has batted yet, so the top of the order is up", () => {
  assert.equal(nextInOrder(order(1, 2, 3), null).battingOrder, 1);
});

test("the next slot up follows the one just used", () => {
  assert.equal(nextInOrder(order(1, 2, 3), 1).battingOrder, 2);
});

test("past the bottom it comes back to the top", () => {
  assert.equal(nextInOrder(order(1, 2, 3), 3).battingOrder, 1);
});

test("a player who left the game is passed over", () => {
  // Slot 4 batted; slot 5 has since left and is not in the order handed in.
  assert.equal(nextInOrder(order(1, 2, 3, 4, 6, 7), 4).battingOrder, 6);
});

test("the man who batted last having left does not send it back to the top", () => {
  // This is the bug: slot 5 batted and then left, so his row is gone. Looking
  // for his position in the array found nothing and wrapped to the leadoff man.
  assert.equal(nextInOrder(order(1, 2, 3, 4, 6, 7), 5).battingOrder, 6);
});

test("a gap left by a withdrawal mid-order is stepped over", () => {
  assert.equal(nextInOrder(order(1, 3, 4), 1).battingOrder, 3);
});

test("an order given out of sequence is still walked in order", () => {
  assert.equal(nextInOrder(order(3, 1, 2), 1).battingOrder, 2);
});

test("an empty order has nobody due up", () => {
  assert.equal(nextInOrder([], 1), undefined);
});
