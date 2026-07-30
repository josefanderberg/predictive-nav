import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isBounce,
  addRejection,
  rejectedFor,
  clearRejections,
  navigationType,
  BOUNCE_WINDOW_MS,
  recordVisit,
  visitBonus,
  applyVisits,
  learnedCount,
  MAX_VISIT_BONUS,
  trustedSites,
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

test("visits accumulate and the bonus is capped", () => {
  let v = {};
  for (let i = 0; i < 20; i++) v = recordVisit(v, "wolt");
  assert.equal(v.wolt, 20);
  assert.equal(visitBonus(v, "wolt"), MAX_VISIT_BONUS, "early habits cannot lock in forever");
  assert.equal(visitBonus({}, "wolt"), 0);
  assert.equal(visitBonus(v, "never-visited"), 0);
});

test("recording a visit does not mutate the original", () => {
  const before = { wolt: 1 };
  const after = recordVisit(before, "wolt");
  assert.deepEqual(before, { wolt: 1 });
  assert.equal(after.wolt, 2);
});

test("the seed catalog is never mutated by learning", () => {
  const seed = [{ name: "wolt", weight: 48 }];
  const boosted = applyVisits(seed, { wolt: 3 });
  assert.equal(seed[0].weight, 48, "forgetting the data must restore the original");
  assert.equal(boosted[0].weight, 48 + visitBonus({ wolt: 3 }, "wolt"));
  assert.ok(boosted[0].weight > seed[0].weight);
  assert.equal(applyVisits(seed, {}), seed, "no data, no copy");
});

test("a site you actually use wins the prefix over one you never touch", () => {
  // The whole thesis: two letters should reach YOUR hundred sites, not a
  // generic ranking of everyone's.
  const sites = [
    { name: "wordpress", weight: 70, url: "https://wordpress.com" },
    { name: "wolt", weight: 48, url: "https://wolt.com/sv" },
  ];
  assert.equal(predict("wo", sites).site.name, "wordpress", "before learning");

  let visits = {};
  for (let i = 0; i < 4; i++) visits = recordVisit(visits, "wolt");
  const learned = predict("wo", applyVisits(sites, visits), {
    trusted: trustedSites(visits),
  });
  assert.equal(learned.site.name, "wolt", "after four visits it is yours");
  assert.equal(learned.kind, "commit", "and two letters go there directly");
});

test("one visit is not yet a habit", () => {
  const sites = [
    { name: "wordpress", weight: 70, url: "https://wordpress.com" },
    { name: "wolt", weight: 48, url: "https://wolt.com/sv" },
  ];
  const visits = recordVisit({}, "wolt");
  const p = predict("wo", applyVisits(sites, visits), { trusted: trustedSites(visits) });
  assert.equal(p.kind, "suggest", "a single visit must not start auto-navigating");
});

test("trust never overrides a near-tie", () => {
  // Habit settles which of two plausible sites you meant; it must not push
  // through a coin flip. Here the rival is popular enough that three visits
  // move Wolt to the top without separating it convincingly.
  const sites = [
    { name: "wolt", weight: 50, url: "https://wolt.com" },
    { name: "wolf", weight: 60, url: "https://wolf.example" },
  ];
  let visits = {};
  for (let i = 0; i < 3; i++) visits = recordVisit(visits, "wolt");
  const p = predict("wol", applyVisits(sites, visits), { trusted: trustedSites(visits) });
  assert.equal(p.site.name, "wolt", "habit still wins the ranking");
  assert.equal(p.kind, "suggest", "but the margin rule still refuses to commit");
});

test("trust is earned per site, not shared", () => {
  let visits = {};
  for (let i = 0; i < 5; i++) visits = recordVisit(visits, "wolt");
  const trusted = trustedSites(visits);
  assert.ok(trusted.has("wolt"));
  assert.ok(!trusted.has("wordpress"));
  assert.equal(trustedSites({}).size, 0);
  assert.equal(trustedSites(undefined).size, 0);
});

test("learnedCount reports how much of the catalog is actually yours", () => {
  assert.equal(learnedCount({}), 0);
  assert.equal(learnedCount(undefined), 0);
  assert.equal(learnedCount({ wolt: 9, blocket: 2 }), 2);
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
