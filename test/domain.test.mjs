import { test } from "node:test";
import assert from "node:assert/strict";
import { registrableDomain, domainOf, sameDomain } from "../extension/js/domain.js";

test("subdomains reduce to the registrable domain", () => {
  assert.equal(registrableDomain("www2.hm.com"), "hm.com");
  assert.equal(registrableDomain("open.spotify.com"), "spotify.com");
  assert.equal(registrableDomain("store.steampowered.com"), "steampowered.com");
  assert.equal(registrableDomain("sv.wikipedia.org"), "wikipedia.org");
  assert.equal(registrableDomain("web.whatsapp.com"), "whatsapp.com");
});

test("apex domains are left alone", () => {
  assert.equal(registrableDomain("blocket.se"), "blocket.se");
  assert.equal(registrableDomain("x.com"), "x.com");
});

test("multi-part public suffixes keep their third label", () => {
  // Reducing these to the suffix would produce a match pattern covering an
  // entire country's web.
  assert.equal(registrableDomain("amazon.co.uk"), "amazon.co.uk");
  assert.equal(registrableDomain("www.amazon.co.uk"), "amazon.co.uk");
  assert.equal(registrableDomain("shop.example.com.au"), "example.com.au");
  assert.equal(registrableDomain("a.b.example.co.jp"), "example.co.jp");
});

test("case and trailing dots are normalised", () => {
  assert.equal(registrableDomain("WWW.Blocket.SE."), "blocket.se");
});

test("junk input does not throw", () => {
  assert.equal(registrableDomain(""), "");
  assert.equal(registrableDomain(null), "");
  assert.equal(domainOf("not a url"), null);
  assert.equal(domainOf(""), null);
});

test("a host-changing redirect within the same brand still counts as same site", () => {
  assert.ok(sameDomain("https://hm.com/", "https://www2.hm.com/sv_se/"));
  assert.ok(sameDomain("https://www.svt.se", "https://svt.se/nyheter"));
  assert.ok(sameDomain("https://spotify.com", "https://open.spotify.com/browse"));
});

test("different sites never count as the same", () => {
  assert.ok(!sameDomain("https://www.linkedin.com", "https://www.lidl.se"));
  assert.ok(!sameDomain("https://amazon.co.uk", "https://bbc.co.uk"));
  assert.ok(!sameDomain("https://blocket.se", "https://evil.example"));
  assert.ok(!sameDomain("https://blocket.se", "not a url"));
});
