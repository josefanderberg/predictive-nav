import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isBounce,
  addRejection,
  rejectedFor,
  clearRejections,
  navigationType,
  BOUNCE_WINDOW_MS,
} from "../extension/js/memory.js";
import { predict } from "../extension/js/predictor.js";
import { SEED_SITES } from "../extension/js/sites.js";

const guess = (at = 1000) => ({ query: "wo", name: "wolt", at });

test("pressing Back soon after a guess counts as rejecting it", () => {
  assert.ok(isBounce(guess(), "back_forward", 1000 + 3000));
  assert.ok(isBounce(guess(), "back_forward", 1000 + BOUNCE_WINDOW_MS));
});

test("opening a fresh tab is never read as a complaint", () => {
  // The distinction that makes this safe: only an actual Back/Forward counts.
  assert.ok(!isBounce(guess(), "navigate", 1000 + 3000));
  assert.ok(!isBounce(guess(), "reload", 1000 + 3000));
  assert.ok(!isBounce(guess(), null, 1000 + 3000));
});

test("returning much later is ordinary browsing, not a correction", () => {
  assert.ok(!isBounce(guess(), "back_forward", 1000 + BOUNCE_WINDOW_MS + 1));
});

test("a missing or malformed guess is ignored", () => {
  assert.ok(!isBounce(null, "back_forward", 5000));
  assert.ok(!isBounce({}, "back_forward", 5000));
  assert.ok(!isBounce({ at: 1000 }, "back_forward", 5000), "no site name");
  assert.ok(!isBounce(guess(9999), "back_forward", 1000), "clock went backwards");
});

test("rejections are recorded per query and are not duplicated", () => {
  let r = addRejection({}, "wo", "wolt");
  assert.deepEqual(r, { wo: ["wolt"] });
  r = addRejection(r, "wo", "wolt");
  assert.deepEqual(r, { wo: ["wolt"] }, "same rejection twice changes nothing");
  r = addRejection(r, "wo", "wordpress");
  assert.deepEqual(r.wo, ["wolt", "wordpress"]);
});

test("recording a rejection does not mutate the original", () => {
  const before = { wo: ["wolt"] };
  const after = addRejection(before, "wo", "wordpress");
  assert.deepEqual(before, { wo: ["wolt"] });
  assert.notEqual(before, after);
});

test("queries are matched case-insensitively and trimmed", () => {
  const r = addRejection({}, "  WO ", "wolt");
  assert.ok(rejectedFor(r, "wo").has("wolt"));
  assert.ok(rejectedFor(r, "Wo").has("wolt"));
});

test("a rejection applies only to the query that earned it", () => {
  const r = addRejection({}, "wo", "wolt");
  assert.ok(rejectedFor(r, "wo").has("wolt"));
  assert.ok(!rejectedFor(r, "wol").has("wolt"), "typing more is a deliberate act");
  assert.ok(!rejectedFor(r, "wolt").has("wolt"));
  assert.equal(rejectedFor({}, "wo").size, 0);
  assert.equal(rejectedFor(undefined, "wo").size, 0);
});

test("rejections can be forgotten", () => {
  const r = addRejection({}, "wo", "wolt");
  assert.equal(rejectedFor(clearRejections(r, "wo"), "wo").size, 0);
  assert.equal(clearRejections(r, "never-seen"), r, "unknown query is a no-op");
});

test("the browser's own navigation type is read straight through", () => {
  assert.equal(navigationType([{ type: "back_forward" }]), "back_forward");
  assert.equal(navigationType([]), null);
  assert.equal(navigationType(undefined), null);
});

test("the user's scenario: wo stops going to wolt, but wolt still does", () => {
  const before = predict("wo", SEED_SITES);
  assert.equal(before.site.name, "wolt");

  const rejections = addRejection({}, "wo", "wolt");
  const after = predict("wo", SEED_SITES, { exclude: rejectedFor(rejections, "wo") });
  assert.notEqual(after.site?.name, "wolt", "the rejected guess is gone");

  const spelled = predict("wolt", SEED_SITES, { exclude: rejectedFor(rejections, "wolt") });
  assert.equal(spelled.site.name, "wolt", "spelling it out still works");
});
