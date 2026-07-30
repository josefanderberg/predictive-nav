import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeUrl } from "../extension/js/lucky.js";
import { predict } from "../extension/js/predictor.js";
import { SEED_SITES } from "../extension/js/sites.js";
import { isBounce, addRejection, rejectedFor } from "../extension/js/memory.js";

/**
 * Guards the failure that made typing a new address impossible.
 *
 * An address is only recognised once it ends in a real suffix, so every
 * keystroke before the last one looks like a plain search. The bar used to arm
 * a 900ms auto-search through all of them, so one pause mid-domain fired a
 * search for half a hostname and took the page away before the address existed
 * — and the search path stores nothing, so the site was never learned.
 *
 * Guarding on the dot fixes only the tail: at "vadkul" nothing yet says an
 * address is coming. Searches therefore wait for Enter, which removes the
 * whole class. These tests hold that line.
 */

/** Whether a search may fire on its own — mirrors AUTO_LUCKY in main.js. */
const AUTO_SEARCH = false;

/** Mirrors resolveIntent's decision, without the DOM. */
function classify(query) {
  if (looksLikeUrl(query)) return { type: "url", armed: true };

  const prediction = predict(query, SEED_SITES);
  if (prediction.kind !== "none") {
    return { type: "site", armed: prediction.kind === "commit" };
  }
  if (query.trim().length < 3) return { type: "none", armed: false };

  const typingAddress = !/\s/.test(query) && query.includes(".");
  return { type: "search", armed: AUTO_SEARCH && !typingAddress };
}

const keystrokes = (text) =>
  [...text].map((_, i) => text.slice(0, i + 1)).map((s) => ({ typed: s, ...classify(s) }));

test("no keystroke of a new address arms a search", () => {
  for (const step of keystrokes("vadkul.se")) {
    if (step.type !== "search") continue;
    assert.equal(step.armed, false, `"${step.typed}" must not auto-search mid-address`);
  }
});

test("the finished address is still recognised and committed", () => {
  const last = keystrokes("vadkul.se").at(-1);
  assert.equal(last.type, "url");
  assert.ok(last.armed);
});

test("longer and deeper addresses are equally safe", () => {
  for (const address of ["intranet.corp.example", "vadkul.se/events", "min-sida.nu"]) {
    for (const step of keystrokes(address)) {
      if (step.type === "search") {
        assert.equal(step.armed, false, `"${step.typed}" in "${address}"`);
      }
    }
  }
});

test("a search never fires on its own — Enter decides", () => {
  for (const query of ["world war 2", "vad kostar en tesla", "vadkul", "qqzx"]) {
    const final = classify(query);
    assert.equal(final.type, "search", query);
    assert.equal(final.armed, false, `"${query}" must wait for Enter`);
  }
});

test("known sites are untouched and still go instantly", () => {
  // The point of the change: only the search path loses its timer.
  for (const [query, name] of [["blo", "blocket"], ["am", "amazon"], ["pow", "power"]]) {
    const step = classify(query);
    assert.equal(step.type, "site", query);
    assert.equal(step.armed, true, `"${query}" should still auto-navigate`);
    assert.equal(predict(query, SEED_SITES).site.name, name);
  }
});

test("checking whether an address was saved must not blacklist it", () => {
  // Pressing Back is exactly how someone verifies "did it remember my site?".
  const typed = { kind: "url", query: "vadkul", name: "vadkul", at: 1000 };
  const treatAsRejection = typed.kind !== "url" && isBounce(typed, "back_forward", 3000);
  assert.equal(treatAsRejection, false);

  // A real prediction pressed Back on still is a rejection.
  const guessed = { query: "wo", name: "wolt", at: 1000 };
  assert.ok(guessed.kind !== "url" && isBounce(guessed, "back_forward", 3000));
});

test("had it been recorded as a rejection, the site would be unreachable", () => {
  // Documents why the guard above matters: nothing ever clears a rejection.
  const rejections = addRejection({}, "vadkul", "vadkul");
  const sites = [{ name: "vadkul", weight: 55, url: "https://vadkul.se" }];
  const p = predict("vadkul", sites, { exclude: rejectedFor(rejections, "vadkul") });
  assert.equal(p.kind, "none", "its own name would stop reaching it, permanently");
});
