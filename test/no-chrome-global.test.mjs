import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSites } from "../extension/js/user-sites.js";
import { SEED_SITES } from "../extension/js/sites.js";
import { openStore } from "../extension/js/store.js";

/**
 * Guards the failure that made the bar show "0 sites" on an iPhone.
 *
 * Safari has no `chrome` global at all. Optional chaining does not rescue a
 * bare `chrome?.storage` there: an undeclared identifier throws a
 * ReferenceError before the `?.` is ever evaluated. That threw out of startup
 * before the catalog loaded, so the page rendered an empty site list and
 * nothing worked — while Chrome, which defines window.chrome on every page,
 * never showed a symptom.
 *
 * Node has no `chrome` global either, which makes it the right place to hold
 * this line.
 */

test("node has no chrome global, so these tests mean something", () => {
  assert.equal(typeof globalThis.chrome, "undefined");
});

test("a bare reference throws — this is the trap being guarded", () => {
  assert.throws(() => chrome?.storage, ReferenceError);
  assert.doesNotThrow(() => globalThis.chrome?.storage);
});

test("the catalog still loads with no chrome global", async () => {
  const sites = await loadSites();
  assert.equal(sites.length, SEED_SITES.length);
  assert.ok(sites.length > 200, "an empty catalog is the reported symptom");
});

test("a store is always available, and falls back rather than failing", () => {
  const store = openStore();
  assert.ok(store);
  assert.ok(["extension", "browser", "none"].includes(store.kind));
});

test("the fallback store round-trips without a chrome global", async () => {
  // Stand in for localStorage the way a browser provides it.
  const backing = new Map();
  globalThis.localStorage = {
    getItem: (k) => backing.get(k) ?? null,
    setItem: (k, v) => backing.set(k, String(v)),
    removeItem: (k) => backing.delete(k),
  };
  try {
    const store = openStore();
    assert.equal(store.kind, "browser");
    await store.set({ custom: { vadkul: { name: "vadkul", url: "https://vadkul.se" } } });
    const read = await store.get(["custom"]);
    assert.equal(read.custom.vadkul.url, "https://vadkul.se");
    await store.remove("custom");
    assert.deepEqual(await store.get(["custom"]), {});
  } finally {
    delete globalThis.localStorage;
  }
});

test("a corrupt stored value is discarded rather than crashing startup", async () => {
  const backing = new Map([["predictive-nav:visits", "{not json"]]);
  globalThis.localStorage = {
    getItem: (k) => backing.get(k) ?? null,
    setItem: (k, v) => backing.set(k, String(v)),
    removeItem: (k) => backing.delete(k),
  };
  try {
    const store = openStore();
    assert.deepEqual(await store.get(["visits"]), {}, "bad data must not throw");
  } finally {
    delete globalThis.localStorage;
  }
});

test("localStorage that throws on use is treated as absent", () => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("private browsing");
    },
    removeItem: () => {},
  };
  try {
    assert.equal(openStore().kind, "none", "detection must exercise it, not just find it");
  } finally {
    delete globalThis.localStorage;
  }
});
