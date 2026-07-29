import { test } from "node:test";
import assert from "node:assert/strict";
import { PROVIDERS, looksLikeUrl, toDirectUrl } from "../extension/js/lucky.js";

test("duckduckgo lucky url uses the backslash operator", () => {
  const url = PROVIDERS.duckduckgo.lucky("teknik");
  assert.equal(url, "https://duckduckgo.com/?q=%5Cteknik");
});

test("lucky urls encode spaces and special characters", () => {
  const url = PROVIDERS.duckduckgo.lucky("billig teknik & prylar");
  assert.ok(url.startsWith("https://duckduckgo.com/?q=%5C"));
  assert.ok(!url.includes(" "));
  assert.ok(!url.includes("&prylar"), "raw & would split the query string");
});

test("plain search urls omit the lucky operator", () => {
  assert.equal(
    PROVIDERS.duckduckgo.search("teknik"),
    "https://duckduckgo.com/?q=teknik"
  );
});

test("both providers expose lucky and search builders", () => {
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    assert.equal(typeof provider.lucky, "function", key);
    assert.equal(typeof provider.search, "function", key);
    assert.match(provider.lucky("x"), /^https:\/\//, key);
    assert.match(provider.search("x"), /^https:\/\//, key);
  }
});

test("domains are recognised as addresses", () => {
  for (const text of [
    "blocket.se",
    "www.hemnet.se",
    "nyteknik.se/nyheter",
    "https://x.com/foo",
    "sub.domain.co.uk",
  ]) {
    assert.ok(looksLikeUrl(text), text);
  }
});

test("ordinary search words are not treated as addresses", () => {
  for (const text of [
    "teknik",
    "billig teknik",
    "blocket",
    "vad kostar en bil",
    "hello.",
    "3.5",
  ]) {
    assert.ok(!looksLikeUrl(text), text);
  }
});

test("partially typed domains are not addresses yet", () => {
  assert.ok(!looksLikeUrl("blocket.s"));
  assert.ok(looksLikeUrl("blocket.se"));
});

test("toDirectUrl adds https and preserves existing scheme", () => {
  assert.equal(toDirectUrl("blocket.se"), "https://blocket.se");
  assert.equal(toDirectUrl("  hemnet.se  "), "https://hemnet.se");
  assert.equal(toDirectUrl("https://x.com/a"), "https://x.com/a");
  assert.equal(toDirectUrl("http://old.example"), "http://old.example");
});
