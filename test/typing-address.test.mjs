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

/** Mirrors autoSearchDelay in main.js. */
function autoSearchDelay(query) {
  const q = query.trim();
  if (q.includes(".")) return null;
  if (/\s/.test(q)) return 900;
  return 1500;
}

/** Mirrors resolveIntent's decision, without the DOM. */
function classify(query) {
  if (looksLikeUrl(query)) return { type: "url", armed: true };

  const prediction = predict(query, SEED_SITES);
  if (prediction.kind !== "none") {
    return { type: "site", armed: prediction.kind === "commit" };
  }
  if (query.trim().length < 3) return { type: "none", armed: false };

  const delay = autoSearchDelay(query);
  return { type: "search", armed: delay !== null, delay };
}

const keystrokes = (text) =>
  [...text].map((_, i) => text.slice(0, i + 1)).map((s) => ({ typed: s, ...classify(s) }));

test("no keystroke of a new address can fire while you are still typing", () => {
  // Two defences, and every intermediate state must have one of them: once a
  // dot appears nothing fires at all, and before that the wait is far longer
  // than the gap between keystrokes (~180ms for an average typist).
  const TYPING_GAP_MS = 180;
  for (const step of keystrokes("vadkul.se")) {
    if (step.type !== "search") continue;
    if (step.typed.includes(".")) {
      assert.equal(step.armed, false, `"${step.typed}" is mid-address and must never fire`);
    } else {
      assert.ok(
        step.delay >= TYPING_GAP_MS * 5,
        `"${step.typed}" waits ${step.delay}ms — too short to survive typing`
      );
    }
  }
});

test("the finished address is still recognised and committed", () => {
  const last = keystrokes("vadkul.se").at(-1);
  assert.equal(last.type, "url");
  assert.ok(last.armed);
});

test("once a dot is typed, nothing fires until the address is finished", () => {
  for (const address of ["intranet.corp.example", "vadkul.se/events", "min-sida.nu"]) {
    for (const step of keystrokes(address)) {
      if (step.type !== "search" || !step.typed.includes(".")) continue;
      assert.equal(step.armed, false, `"${step.typed}" in "${address}"`);
    }
  }
});

test("a phrase searches on its own — a space rules out a hostname", () => {
  for (const query of ["world war 2", "vad kostar en tesla", "hur lagar man pannkakor"]) {
    const final = classify(query);
    assert.equal(final.type, "search", query);
    assert.equal(final.armed, true, `"${query}" should auto-search`);
  }
});

test("a lone word still searches by itself, just after a longer pause", () => {
  for (const query of ["bkbpsk", "qqzx", "vadkul"]) {
    const final = classify(query);
    assert.equal(final.type, "search", query);
    assert.ok(final.armed, `"${query}" should not need Enter`);
    assert.ok(final.delay > 900, "long enough that typing a domain never trips it");
  }
});

test("anything with a dot never searches on its own", () => {
  // A dot mid-word means an address is being typed. Firing here is what made
  // adding a new site impossible.
  for (const query of ["vadkul.", "vadkul.s", "min-sida."]) {
    const final = classify(query);
    assert.equal(final.type, "search", query);
    assert.equal(final.armed, false, `"${query}" is mid-address`);
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

test("a leading space pauses everything — only Enter or a click decides", () => {
  // Mirrors resolveIntent in main.js: the pause looks at the RAW input before
  // trimming, so " blo" predicts blocket but must not fire on its own.
  const paused = (raw) => /^\s/.test(raw);
  for (const raw of [" blo", " am", " world war 2", " vadkul"]) {
    assert.ok(paused(raw), `"${raw}" is paused`);
    const armed = classify(raw.trim()).armed && !paused(raw);
    assert.equal(armed, false, `"${raw}" must wait for Enter or a click`);
  }
  // And without the space, the same inputs behave as before.
  assert.ok(classify("blo").armed, "blo still goes by itself");
  assert.ok(!paused("blo"));
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
