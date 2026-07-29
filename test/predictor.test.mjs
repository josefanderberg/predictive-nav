import { test } from "node:test";
import assert from "node:assert/strict";
import { predict, rankCandidates } from "../extension/js/predictor.js";
import { SEED_SITES, resolveRegionalUrl } from "../extension/js/sites.js";

test('"ama" confidently commits to amazon', () => {
  const result = predict("ama", SEED_SITES);
  assert.equal(result.kind, "commit");
  assert.equal(result.site.name, "amazon");
  assert.ok(result.confidence > 0.9);
});

test('"a" is ambiguous (amazon vs apple) and only suggests', () => {
  const result = predict("a", SEED_SITES);
  assert.equal(result.kind, "suggest");
});

test('"tw" is ambiguous (twitter vs twitch) and only suggests', () => {
  const result = predict("tw", SEED_SITES);
  assert.equal(result.kind, "suggest");
  const names = result.candidates.map((c) => c.site.name);
  assert.ok(names.includes("twitter") && names.includes("twitch"));
});

test('"twitc" resolves the ambiguity and commits to twitch', () => {
  const result = predict("twitc", SEED_SITES);
  assert.equal(result.kind, "commit");
  assert.equal(result.site.name, "twitch");
});

test("gibberish predicts nothing", () => {
  assert.equal(predict("xqzv", SEED_SITES).kind, "none");
});

test("empty input predicts nothing", () => {
  assert.equal(predict("   ", SEED_SITES).kind, "none");
  assert.deepEqual(rankCandidates("", SEED_SITES), []);
});

test("input is case-insensitive and trimmed", () => {
  const result = predict("  AmA ", SEED_SITES);
  assert.equal(result.kind, "commit");
  assert.equal(result.site.name, "amazon");
});

test("regional url: Swedish locale gets amazon.se", () => {
  const amazon = SEED_SITES.find((s) => s.name === "amazon");
  assert.equal(resolveRegionalUrl(amazon, "sv-SE"), "https://www.amazon.se");
  assert.equal(resolveRegionalUrl(amazon, "en-GB"), "https://www.amazon.co.uk");
  assert.equal(resolveRegionalUrl(amazon, "ja-JP"), "https://www.amazon.com");
});

test("regional url: sites without regional data keep their default", () => {
  const github = SEED_SITES.find((s) => s.name === "github");
  assert.equal(resolveRegionalUrl(github, "sv-SE"), "https://github.com");
});

test('"blo" commits to blocket', () => {
  const result = predict("blo", SEED_SITES);
  assert.equal(result.kind, "commit");
  assert.equal(result.site.name, "blocket");
});

test('"svt" typed exactly prefers svt.se over svtplay', () => {
  const result = predict("svt", SEED_SITES);
  assert.equal(result.site.name, "svt");
});

test('"svtp" resolves to svtplay', () => {
  const result = predict("svtp", SEED_SITES);
  assert.equal(result.kind, "commit");
  assert.equal(result.site.name, "svtplay");
});

test("Swedish everyday sites are present and reachable by prefix", () => {
  const expected = [
    ["hemn", "hemnet"],
    ["swedb", "swedbank"],
    ["skatt", "skatteverket"],
    ["syst", "systembolaget"],
    ["afton", "aftonbladet"],
    ["prisj", "prisjakt"],
    ["trad", "tradera"],
  ];
  for (const [prefix, name] of expected) {
    assert.equal(predict(prefix, SEED_SITES).site.name, name, prefix);
  }
});

test("every site has a unique name and a valid https url", () => {
  const names = new Set();
  for (const site of SEED_SITES) {
    assert.ok(!names.has(site.name), `duplicate name: ${site.name}`);
    names.add(site.name);
    assert.match(site.name, /^[a-z0-9]+$/, `bad name: ${site.name}`);
    assert.match(site.url, /^https:\/\//, `bad url: ${site.url}`);
    assert.ok(site.weight >= 1 && site.weight <= 100, `bad weight: ${site.name}`);
  }
  assert.ok(SEED_SITES.length > 100, "catalog should be comprehensive");
});

test("options can tighten the commit threshold", () => {
  const strict = predict("ama", SEED_SITES, { minLength: 6 });
  assert.equal(strict.kind, "suggest");
});
