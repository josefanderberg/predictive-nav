import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSites } from "../extension/js/user-sites.js";
import { SEED_SITES } from "../extension/js/sites.js";

/**
 * These guard the failure that made the installed extension inert: anything
 * loadSites() can be handed must produce a usable catalog rather than throw,
 * because main.js builds the whole page on top of the result.
 */
const withTopSites = async (impl, run) => {
  globalThis.chrome = { topSites: { get: impl } };
  try {
    return await run();
  } finally {
    delete globalThis.chrome;
  }
};

test("a callback-style API returning undefined does not throw", async () => {
  const sites = await withTopSites(() => undefined, loadSites);
  assert.ok(Array.isArray(sites));
  assert.equal(sites.length, SEED_SITES.length);
});

test("a rejecting topSites call falls back to the seed catalog", async () => {
  const sites = await withTopSites(() => Promise.reject(new Error("denied")), loadSites);
  assert.equal(sites.length, SEED_SITES.length);
});

test("a throwing topSites call falls back to the seed catalog", async () => {
  const sites = await withTopSites(
    () => {
      throw new Error("no permission");
    },
    loadSites
  );
  assert.equal(sites.length, SEED_SITES.length);
});

test("a non-array return value is ignored", async () => {
  const sites = await withTopSites(() => Promise.resolve({ nope: true }), loadSites);
  assert.equal(sites.length, SEED_SITES.length);
});

test("without the chrome API at all the seed catalog is used", async () => {
  const sites = await loadSites();
  assert.equal(sites.length, SEED_SITES.length);
});

test("real top sites boost matching entries and add new ones", async () => {
  const sites = await withTopSites(
    () =>
      Promise.resolve([
        { url: "https://www.blocket.se/annonser" },
        { url: "https://intranet.example.com/" },
      ]),
    loadSites
  );
  const blocket = sites.find((s) => s.name === "blocket");
  const seedBlocket = SEED_SITES.find((s) => s.name === "blocket");
  assert.ok(blocket.weight > seedBlocket.weight, "visited sites should rank higher");
  assert.ok(sites.some((s) => s.name === "intranet"), "unknown sites should be added");
});

test("malformed urls from topSites are skipped rather than fatal", async () => {
  const sites = await withTopSites(
    () => Promise.resolve([{ url: "not a url" }, { url: "" }, { url: "https://www.lidl.se" }]),
    loadSites
  );
  assert.ok(Array.isArray(sites));
  assert.ok(sites.some((s) => s.name === "lidl"));
});
