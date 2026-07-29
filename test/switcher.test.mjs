import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildOffer,
  isOfferValid,
  offerRows,
  OFFER_TTL_MS,
  MAX_ALTERNATIVES,
} from "../extension/js/switcher.js";

const candidates = [
  { name: "linkedin", url: "https://www.linkedin.com" },
  { name: "lidl", url: "https://www.lidl.se" },
  { name: "lyko", url: "https://lyko.com" },
  { name: "inet", url: "https://www.inet.se" },
  { name: "komplett", url: "https://www.komplett.se" },
  { name: "jula", url: "https://www.jula.se" },
];

const offerFor = (chosenUrl, now = 1000) =>
  buildOffer({ query: "li", chosenUrl, candidates, now });

test("the chosen destination is not offered as an alternative to itself", () => {
  const offer = offerFor("https://www.linkedin.com");
  assert.ok(!offer.alternatives.some((a) => a.name === "linkedin"));
  assert.equal(offer.alternatives[0].name, "lidl");
});

test("alternatives are capped", () => {
  assert.equal(offerFor("https://www.linkedin.com").alternatives.length, MAX_ALTERNATIVES);
});

test("duplicate destinations are collapsed", () => {
  const offer = buildOffer({
    query: "tw",
    chosenUrl: "https://example.com",
    candidates: [
      { name: "twitter", url: "https://x.com" },
      { name: "x", url: "https://x.com" },
      { name: "twitch", url: "https://www.twitch.tv" },
    ],
    now: 0,
  });
  assert.deepEqual(
    offer.alternatives.map((a) => a.name),
    ["twitter", "twitch"]
  );
});

test("a web search is always the final row", () => {
  const rows = offerRows(offerFor("https://www.linkedin.com"));
  assert.equal(rows.length, MAX_ALTERNATIVES + 1);
  assert.equal(rows.at(-1).kind, "search");
  assert.equal(rows.at(-1).url, "https://www.google.com/search?q=li");
});

test("the query is escaped into the search url", () => {
  const offer = buildOffer({
    query: 'billiga "skor" & co',
    chosenUrl: "https://example.com",
    candidates,
    now: 0,
  });
  assert.ok(!offer.searchUrl.includes(" "));
  assert.ok(!offer.searchUrl.includes('"'));
  assert.ok(offer.searchUrl.startsWith("https://www.google.com/search?q="));
});

test("rows carry the host so a favicon can be loaded from the site itself", () => {
  const rows = offerRows(offerFor("https://www.linkedin.com"));
  assert.equal(rows[0].host, "lidl.se");
});

test("the search row carries the engine's own host for its favicon", () => {
  const rows = offerRows(offerFor("https://www.linkedin.com"));
  assert.equal(rows.at(-1).host, "google.com");
});

test("every row has an icon host and a destination", () => {
  for (const row of offerRows(offerFor("https://www.linkedin.com"))) {
    assert.ok(row.host, `missing host: ${row.label}`);
    assert.match(row.url, /^https:\/\//, row.label);
    assert.ok(row.label.length > 0);
  }
});

test("an offer is valid on the page it was made for", () => {
  const offer = offerFor("https://www.linkedin.com");
  assert.ok(isOfferValid(offer, "https://www.linkedin.com/feed", 1500));
});

test("www is ignored when matching the destination", () => {
  const offer = offerFor("https://www.linkedin.com");
  assert.ok(isOfferValid(offer, "https://linkedin.com/", 1500));
});

test("an offer never shows up on an unrelated site", () => {
  const offer = offerFor("https://www.linkedin.com");
  assert.ok(!isOfferValid(offer, "https://www.lidl.se/", 1500));
  assert.ok(!isOfferValid(offer, "https://evil.example/", 1500));
});

test("an offer expires", () => {
  const offer = offerFor("https://www.linkedin.com", 1000);
  assert.ok(isOfferValid(offer, "https://www.linkedin.com", 1000 + OFFER_TTL_MS - 1));
  assert.ok(!isOfferValid(offer, "https://www.linkedin.com", 1000 + OFFER_TTL_MS + 1));
});

test("a search jump is valid wherever it lands", () => {
  // The engine picks the destination, so there is nothing to compare against;
  // only freshness can be checked.
  const offer = buildOffer({
    kind: "search",
    query: "power",
    chosenUrl: null,
    candidates: [],
    now: 1000,
  });
  assert.ok(isOfferValid(offer, "https://www.power.se/", 1500));
  assert.ok(isOfferValid(offer, "https://some.unexpected.site/x", 1500));
  assert.ok(!isOfferValid(offer, "https://www.power.se/", 1000 + OFFER_TTL_MS + 1), "still expires");
});

test("a site offer stays pinned to its destination", () => {
  const offer = buildOffer({
    kind: "site",
    query: "li",
    chosenUrl: "https://www.linkedin.com",
    candidates,
    now: 1000,
  });
  assert.ok(!isOfferValid(offer, "https://some.other.site/", 1500));
});

test("an offer with no kind is treated as a site offer", () => {
  // Guards against a stale record written by an older version.
  const offer = { query: "x", chosenUrl: "https://x.com", alternatives: [], createdAt: 0 };
  assert.ok(isOfferValid(offer, "https://x.com/feed", 100));
  assert.ok(!isOfferValid(offer, "https://elsewhere.example/", 100));
});

test("garbage offers are rejected rather than rendered", () => {
  assert.ok(!isOfferValid(null, "https://x.com", 0));
  assert.ok(!isOfferValid({}, "https://x.com", 0));
  assert.ok(!isOfferValid({ createdAt: 0, chosenUrl: "https://x.com" }, "https://x.com", 0));
  assert.ok(!isOfferValid({ createdAt: 0, alternatives: [], chosenUrl: "" }, "https://x.com", 0));
});

test("neighbours fill the panel when the prefix has no runners-up", () => {
  // "lidl" matches only Lidl, so without neighbours the panel would be a
  // single search row — five seconds of screen for almost nothing.
  const offer = buildOffer({
    query: "lidl",
    chosenUrl: "https://www.lidl.se",
    candidates: [{ name: "lidl", url: "https://www.lidl.se" }],
    neighbours: [
      { name: "ica", url: "https://www.ica.se" },
      { name: "willys", url: "https://www.willys.se" },
      { name: "coop", url: "https://www.coop.se" },
      { name: "foodora", url: "https://www.foodora.se" },
      { name: "mathem", url: "https://www.mathem.se" },
    ],
    now: 0,
  });
  assert.deepEqual(
    offer.alternatives.map((a) => a.name),
    ["ica", "willys", "coop", "foodora"]
  );
  assert.equal(offerRows(offer).length, 5, "four sites plus the search row");
  assert.ok(offerRows(offer).every((r) => r.host), "every row needs a favicon host");
});

test("prefix matches always outrank neighbours", () => {
  const offer = buildOffer({
    query: "sv",
    chosenUrl: "https://www.svt.se",
    candidates: [
      { name: "svt", url: "https://www.svt.se" },
      { name: "svtplay", url: "https://www.svtplay.se" },
      { name: "svd", url: "https://www.svd.se" },
    ],
    neighbours: [{ name: "aftonbladet", url: "https://www.aftonbladet.se" }],
    now: 0,
  });
  assert.deepEqual(
    offer.alternatives.map((a) => a.name),
    ["svtplay", "svd", "aftonbladet"]
  );
});

test("a neighbour duplicating the destination is not offered", () => {
  const offer = buildOffer({
    query: "x",
    chosenUrl: "https://x.com",
    candidates: [{ name: "x", url: "https://x.com" }],
    neighbours: [
      { name: "twitter", url: "https://x.com" }, // same destination
      { name: "reddit", url: "https://www.reddit.com" },
    ],
    now: 0,
  });
  assert.deepEqual(
    offer.alternatives.map((a) => a.name),
    ["reddit"]
  );
});

test("a guess with no runner-up still offers the search row", () => {
  const offer = buildOffer({
    query: "lin",
    chosenUrl: "https://www.linkedin.com",
    candidates: [{ name: "linkedin", url: "https://www.linkedin.com" }],
    now: 0,
  });
  assert.equal(offer.alternatives.length, 0);
  assert.ok(isOfferValid(offer, "https://www.linkedin.com/feed", 100));

  const rows = offerRows(offer);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "search");
  assert.equal(rows[0].url, "https://www.google.com/search?q=lin");
});
