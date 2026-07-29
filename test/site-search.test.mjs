import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSensitiveLocation,
  isSearchInput,
  findSuggestions,
  chooseSuggestion,
  activationTarget,
} from "../extension/js/site-search.js";

/** Minimal stand-ins so the logic can be tested without a DOM. */
const option = (label, extra = {}) => ({
  getAttribute: (name) => (name === "aria-label" ? extra.ariaLabel ?? null : null),
  textContent: label,
  querySelector: () => extra.inner ?? null,
  ...extra,
});

const listbox = (options) => ({
  querySelectorAll: (sel) => (sel === '[role="option"]' ? options : []),
});

/** A fake document: `elements` answer the shadow-root walk, `listboxes` the query. */
const rootWith = ({ listboxes = [], elements = [] }) => ({
  querySelectorAll: (sel) => {
    if (sel === "*") return elements;
    if (sel === '[role="listbox"]') return listboxes;
    return [];
  },
});

const root = (options, { listbox: hasListbox = true } = {}) =>
  rootWith({ listboxes: hasListbox ? [listbox(options)] : [] });

test("banking, government and health hosts are never auto-activated", () => {
  for (const hostname of [
    "www.swedbank.se",
    "internetbank.seb.se",
    "www.skatteverket.se",
    "www.forsakringskassan.se",
    "www.1177.se",
    "app.klarna.com",
    "www.paypal.com",
    "irs.gov",
  ]) {
    assert.ok(isSensitiveLocation({ hostname, pathname: "/" }), hostname);
  }
});

test("checkout and login paths are never auto-activated", () => {
  for (const pathname of ["/checkout", "/kassa/steg-2", "/betalning", "/logga-in", "/account/settings"]) {
    assert.ok(isSensitiveLocation({ hostname: "shop.example.se", pathname }), pathname);
  }
});

test("ordinary shopping pages are allowed", () => {
  assert.ok(!isSensitiveLocation({ hostname: "www.foodora.se", pathname: "/" }));
  assert.ok(!isSensitiveLocation({ hostname: "www.tradera.com", pathname: "/search" }));
});

test("a hostname merely containing a bank name is not blocked", () => {
  assert.ok(!isSensitiveLocation({ hostname: "sebastian-blog.se", pathname: "/" }));
});

test("search inputs are recognised, sensitive inputs are not", () => {
  const input = (props) => ({ tagName: "INPUT", getAttribute: () => null, ...props });
  assert.ok(isSearchInput(input({ type: "search" })));
  assert.ok(isSearchInput(input({ type: "text", placeholder: "Sök efter restauranger" })));
  assert.ok(isSearchInput(input({ type: "text", name: "q" })));
  assert.ok(!isSearchInput(input({ type: "password", name: "search" })));
  assert.ok(!isSearchInput(input({ type: "email", name: "search" })));
  assert.ok(!isSearchInput(input({ type: "text", name: "street" })));
  assert.ok(!isSearchInput(null));
});

test("suggestions are read from the site's own listbox", () => {
  const found = findSuggestions(root([option("macdonalds svergie"), option("macdonalds fridhemsplan")]));
  assert.equal(found.length, 2);
  assert.equal(found[0].label, "macdonalds svergie");
});

test("blank rows are ignored", () => {
  assert.equal(findSuggestions(root([option("   "), option("mcdonalds")])).length, 1);
});

test("suggestions inside shadow DOM are found (the Elgiganten case)", () => {
  const inner = rootWith({ listboxes: [listbox([option("macbook"), option("macbook air")])] });
  const host = { shadowRoot: inner, querySelectorAll: () => [] };
  const doc = rootWith({ listboxes: [], elements: [host] });
  const found = findSuggestions(doc);
  assert.equal(found.length, 2);
  assert.equal(found[0].label, "macbook");
});

test("only the first listbox with visible options is used", () => {
  const doc = rootWith({
    listboxes: [
      listbox([]), // an empty leftover list is skipped
      listbox([option("macbook")]),
      listbox([option("MAC"), option("Xtreme Mac"), option("Macadamia Oil")]),
    ],
  });
  const found = findSuggestions(doc);
  assert.equal(found.length, 1);
  assert.equal(found[0].label, "macbook");
});

test("the Foodora case: 'mac' picks macdonalds", () => {
  const suggestions = findSuggestions(
    root([option("macdonalds svergie"), option("macdonalds fridhemsplan")])
  );
  const choice = chooseSuggestion("mac", suggestions);
  assert.ok(choice);
  assert.equal(choice.label, "macdonalds svergie");
  assert.equal(choice.reason, "prefix");
});

test("a generic 'search for X' row is never auto-picked", () => {
  const suggestions = findSuggestions(root([option('Sök efter "mac"')]));
  assert.equal(chooseSuggestion("mac", suggestions), null);
});

test("a loosely related top hit is not auto-picked", () => {
  const suggestions = findSuggestions(root([option("Burger King"), option("McDonalds")]));
  assert.equal(chooseSuggestion("mac", suggestions), null);
});

test("containing the query is not enough — it must start with it", () => {
  const suggestions = findSuggestions(root([option("Stora McDonalds Kungsgatan")]));
  assert.equal(chooseSuggestion("mcdonalds", suggestions), null);
});

test("nothing is picked from too little input or an empty list", () => {
  assert.equal(chooseSuggestion("m", findSuggestions(root([option("macdonalds")]))), null);
  assert.equal(chooseSuggestion("mac", []), null);
});

test("an overlong list is treated as unreliable", () => {
  const many = Array.from({ length: 9 }, (_, i) => option(`mac ${i}`));
  assert.equal(chooseSuggestion("mac", findSuggestions(root(many))), null);
});

test("activation prefers an inner link or button over the row itself", () => {
  const inner = { tag: "BUTTON" };
  const row = option("macdonalds", { inner });
  assert.equal(activationTarget(row), inner);

  const bare = { textContent: "x", querySelector: () => null };
  assert.equal(activationTarget(bare), bare);
});
