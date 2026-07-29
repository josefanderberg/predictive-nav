import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

/**
 * Runs the GENERATED bundle — the exact file the manifest injects — against a
 * hand-built DOM stub. The modules are unit-tested individually elsewhere;
 * what this guards is the bundling itself: that stripping module syntax and
 * concatenating five files still produces a script that wires up and fires.
 *
 * A browser was the wrong tool for this: a hidden tab throttles setTimeout so
 * hard that a 250ms debounce plus an 800ms commit does not finish inside
 * twenty seconds, which reads as "it never clicked".
 */
const BUNDLE = readFileSync(new URL("../extension/js/content.bundle.js", import.meta.url), "utf8");

/** A DOM small enough to reason about, real enough for the bundle to drive. */
function makeDom({ hostname = "www.example.se", pathname = "/", options = [] } = {}) {
  const listeners = new Map();
  const clicks = [];

  const optionEls = options.map((label) => {
    const button = {
      tagName: "BUTTON",
      textContent: label,
      click: () => clicks.push(label),
      getAttribute: () => null,
      querySelector: () => null,
      getBoundingClientRect: () => ({ width: 80, height: 20 }),
    };
    return {
      tagName: "LI",
      textContent: label,
      getAttribute: (n) => (n === "role" ? "option" : null),
      querySelector: (sel) => (sel === "a[href], button" ? button : null),
      querySelectorAll: () => [],
      getBoundingClientRect: () => ({ width: 80, height: 20 }),
    };
  });

  const listbox = {
    getAttribute: (n) => (n === "role" ? "listbox" : null),
    querySelectorAll: (sel) => (sel === '[role="option"]' ? optionEls : []),
  };

  const el = () => ({
    style: { cssText: "", setProperty() {}, removeProperty() {} },
    dataset: {},
    textContent: "",
    append() {},
    appendChild() {},
    remove() {},
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
  });

  const document = {
    hidden: false,
    querySelector: (sel) => (sel === '[role="listbox"]' ? listbox : null),
    querySelectorAll: (sel) => {
      if (sel === '[role="listbox"]') return [listbox];
      if (sel === '[role="option"]') return optionEls;
      return []; // the "*" shadow-root walk finds no hosts
    },
    createElement: el,
    documentElement: { appendChild() {}, children: [] },
    addEventListener: (type, fn) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    removeEventListener() {},
    contains: () => true,
  };

  return {
    document,
    clicks,
    optionEls,
    fire: (type, event) => (listeners.get(type) ?? []).forEach((fn) => fn(event)),
    location: { hostname, pathname, href: `https://${hostname}${pathname}`, assign() {} },
  };
}

function runBundle(dom) {
  const context = {
    document: dom.document,
    location: dom.location,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => fn(),
    chrome: {}, // a content script with no storage access yet
    URL,
    Date,
    Math,
    Set,
    Array,
    Object,
    JSON,
    console,
  };
  vm.createContext(context);
  vm.runInContext(BUNDLE, context);
  return context;
}

const searchInput = (value) => ({
  tagName: "INPUT",
  type: "search",
  value,
  name: "",
  id: "",
  placeholder: "",
  className: "",
  getAttribute: () => null,
});

const settle = () => new Promise((r) => setTimeout(r, 1300)); // 250ms debounce + 800ms commit

test("the generated bundle evaluates without module syntax errors", () => {
  const dom = makeDom();
  assert.doesNotThrow(() => runBundle(dom));
});

test("the bundle auto-activates the site's own top suggestion", async () => {
  const dom = makeDom({ options: ["macbook", "macbook air"] });
  runBundle(dom);
  dom.fire("input", { target: searchInput("mac") });
  await settle();
  assert.deepEqual(dom.clicks, ["macbook"]);
});

test("the watcher is live immediately, not after the storage read", async () => {
  // chrome.storage is absent here, so the panel path bails out. If the watcher
  // were sequenced behind it, this input would be missed entirely.
  const dom = makeDom({ options: ["blocket bilar"] });
  runBundle(dom);
  dom.fire("input", { target: searchInput("blocket") });
  await settle();
  assert.deepEqual(dom.clicks, ["blocket bilar"]);
});

test("a suggestion that does not start with the query is left alone", async () => {
  const dom = makeDom({ options: ['Sök efter "mac"', "Burger King"] });
  runBundle(dom);
  dom.fire("input", { target: searchInput("mac") });
  await settle();
  assert.deepEqual(dom.clicks, []);
});

test("nothing is activated on a sensitive host", async () => {
  const dom = makeDom({ hostname: "www.swedbank.se", options: ["swish"] });
  runBundle(dom);
  dom.fire("input", { target: searchInput("swi") });
  await settle();
  assert.deepEqual(dom.clicks, []);
});

test("nothing is activated on a checkout path", async () => {
  const dom = makeDom({ hostname: "shop.example.se", pathname: "/kassa", options: ["kaffe"] });
  runBundle(dom);
  dom.fire("input", { target: searchInput("kaf") });
  await settle();
  assert.deepEqual(dom.clicks, []);
});

test("Escape cancels a pending activation", async () => {
  const dom = makeDom({ options: ["macbook"] });
  runBundle(dom);
  dom.fire("input", { target: searchInput("mac") });
  await new Promise((r) => setTimeout(r, 400)); // after the debounce, before the commit
  dom.fire("keydown", { key: "Escape" });
  await settle();
  assert.deepEqual(dom.clicks, []);
});

test("a password field is never treated as a site search", async () => {
  const dom = makeDom({ options: ["macbook"] });
  runBundle(dom);
  dom.fire("input", { target: { ...searchInput("mac"), type: "password" } });
  await settle();
  assert.deepEqual(dom.clicks, []);
});
