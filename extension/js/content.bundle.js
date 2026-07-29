/**
 * GENERATED — do not edit. Run: node tools/build-content.mjs
 *
 * Concatenation of domain.js, site-search.js, switcher.js, offer-panel.js, content.js as one plain script, so the host
 * page's CSP cannot block it the way a runtime import() would.
 */
(() => {
// ---- domain.js ----
/**
 * Domain comparison that survives the web's habit of moving you sideways.
 *
 * Exact hostname equality is too strict in both directions that matter here:
 * sites redirect between hosts they own (hm.com -> www2.hm.com), and a match
 * pattern built from one host misses its siblings. Comparing the registrable
 * domain instead keeps "same site" meaning what a person means by it.
 */

/**
 * Suffixes that are themselves public, so the registrable domain needs one
 * more label. Without this, amazon.co.uk would reduce to "co.uk" — which as a
 * match pattern would cover every British site there is.
 */
const MULTI_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "net.uk",
  "com.au", "net.au", "org.au", "co.nz", "co.za", "co.in", "co.jp", "ne.jp",
  "com.br", "com.mx", "com.tr", "com.cn", "com.sg", "com.hk",
]);

/** "www2.hm.com" -> "hm.com" · "amazon.co.uk" -> "amazon.co.uk" */
function registrableDomain(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  const labels = host.split(".");
  if (labels.length <= 2) return host;

  const lastTwo = labels.slice(-2).join(".");
  return MULTI_PART_SUFFIXES.has(lastTwo)
    ? labels.slice(-3).join(".")
    : lastTwo;
}

/** The registrable domain of a URL, or null when it cannot be parsed. */
function domainOf(url) {
  try {
    return registrableDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

/** True when both URLs belong to the same registrable domain. */
function sameDomain(a, b) {
  const left = domainOf(a);
  return left !== null && left === domainOf(b);
}

// ---- site-search.js ----
/**
 * Auto-selecting a site's OWN search suggestions.
 *
 * The insight: we never need to know that "mac" means McDonald's — Foodora
 * already knows. Their autocomplete renders it the moment you type. All we do
 * is read the list they render and pick the top entry.
 *
 * Detection is standards-based: an accessible autocomplete exposes
 * `role="listbox"` containing `role="option"` children. Verified 2026-07 that
 * Foodora does this even though its <input> carries no ARIA attributes.
 *
 * Not every site complies — Wikipedia's search box has no suggestion list at
 * all. When no list is found we do nothing. Guessing is worse than waiting.
 */

/**
 * Hosts and paths where silently activating a control is never acceptable,
 * regardless of markup. Banking, government, health and payment flows can
 * move money or submit filings; a mis-click there is not a small cost.
 */
const BLOCKED_HOST =
  /(^|\.)(swedbank|seb|nordea|handelsbanken|lansforsakringar|folksam|trygghansa|if|lf|icabanken|avanza|nordnet|klarna|paypal|stripe|revolut|wise|coinbase|skatteverket|forsakringskassan|csn|arbetsformedlingen|polisen|migrationsverket|pensionsmyndigheten|transportstyrelsen|bolagsverket|domstol|1177|vardguiden|kry|mindoktor|doktor|apoteket|apotek|bankid|freja|kivra|minaintyg)\./i;
const BLOCKED_TLD = /\.(gov|bank)(\.|$)/i;
const BLOCKED_PATH = /(checkout|kassa|payment|betal|order|bestall|login|logga-in|signin|account|konto|admin)/i;

const SEARCH_HINT = /(search|sok|sök|query|q)\b/i;

/** True when this page must never be auto-activated. */
function isSensitiveLocation({ hostname = "", pathname = "" } = {}) {
  return (
    BLOCKED_HOST.test(`${hostname}.`) ||
    BLOCKED_TLD.test(hostname) ||
    BLOCKED_PATH.test(pathname)
  );
}

/** True when an input looks like a site search field rather than a data entry field. */
function isSearchInput(el) {
  if (!el || el.tagName !== "INPUT") return false;
  const type = (el.type || "").toLowerCase();
  if (["password", "email", "tel", "number", "date", "file"].includes(type)) return false;
  if (type === "search" || el.getAttribute("role") === "combobox") return true;
  const hints = [el.name, el.id, el.placeholder, el.getAttribute("aria-label"), el.className]
    .filter((v) => typeof v === "string")
    .join(" ");
  return SEARCH_HINT.test(hints);
}

/**
 * Read the suggestion list the site itself rendered.
 *
 * Modern sites often render their autocomplete inside shadow DOM (verified on
 * elgiganten.se), so the search walks open shadow roots too. A page can also
 * hold several listboxes at once — search terms, brands, products — so results
 * are scoped to the FIRST listbox with visible options: sites consistently put
 * the primary suggestions first, and mixing lists would make the top entry
 * meaningless.
 */
function findSuggestions(root) {
  for (const scope of allRoots(root)) {
    for (const listbox of scope.querySelectorAll('[role="listbox"]')) {
      const options = [...listbox.querySelectorAll('[role="option"]')]
        .filter(isVisible)
        .map((el) => ({ el, label: labelOf(el) }))
        .filter((s) => s.label.length > 0);
      if (options.length > 0) return options;
    }
  }
  return [];
}

/** The document plus every open shadow root, in document order. */
function allRoots(root) {
  const roots = [root];
  const walk = (scope) => {
    if (typeof scope.querySelectorAll !== "function") return;
    for (const el of scope.querySelectorAll("*")) {
      if (el.shadowRoot) {
        roots.push(el.shadowRoot);
        walk(el.shadowRoot);
      }
    }
  };
  walk(root);
  return roots;
}

/**
 * Decide whether the top suggestion is a safe automatic pick.
 *
 * The top entry must *begin* with what was typed. Merely containing it is not
 * enough: a lone row reading `Sök efter "mac"` contains "mac" but is a generic
 * search action rather than a destination, and activating it would be wrong.
 * Prefix matching rejects that, and rejects lists whose best hit is only
 * loosely related.
 */
function chooseSuggestion(query, suggestions, options = {}) {
  const { minLength = 2, maxOptions = 8 } = options;
  const q = normalize(query);
  if (q.length < minLength) return null;
  if (suggestions.length === 0 || suggestions.length > maxOptions) return null;

  const [top] = suggestions;
  return normalize(top.label).startsWith(q) ? { ...top, reason: "prefix" } : null;
}

/**
 * The clickable node inside a suggestion row. Sites wrap the real control in
 * layers of layout elements, so prefer an inner link or button when present.
 */
function activationTarget(el) {
  return el.querySelector("a[href], button") ?? el;
}

function labelOf(el) {
  return (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");
}

function isVisible(el) {
  if (typeof el.getBoundingClientRect !== "function") return true;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function normalize(text) {
  return (text || "").trim().toLowerCase();
}

// ---- switcher.js ----
/**
 * The second-chance offer.
 *
 * Auto-navigation is only worth it if being wrong is cheap. So whenever we
 * navigate on a prediction, we hand the destination page a short-lived record
 * of what else we nearly picked. The destination shows it as a small panel for
 * a few seconds: land on LinkedIn when you meant Lidl, and switching costs one
 * click instead of a back-button round trip.
 *
 * The last row is always a plain web search, because sometimes none of the
 * guesses were right.
 */

/** How long an offer stays valid. Covers page load, not much more. */
const OFFER_TTL_MS = 12_000;
/** How long the panel stays on screen once shown. */
const OFFER_VISIBLE_MS = 5000;
/** Site alternatives shown before the search row. */
const MAX_ALTERNATIVES = 4;

const SEARCH_URL = "https://www.google.com/search?q=";

/**
 * Build the record handed to the destination page.
 *
 * `candidates` is the predictor's ranked list, best first. `neighbours` are
 * sites from the same category, used to fill the panel when the prefix has no
 * runners-up: landing on Lidl, the useful next move is Willys or ICA, and an
 * almost-empty panel is a wasted five seconds. Prefix matches always rank
 * first — they are what you were actually typing.
 */
function buildOffer({ query, chosenUrl, candidates, neighbours = [], kind = "site", now }) {
  const alternatives = [];
  for (const { name, url } of [...candidates, ...neighbours]) {
    if (url === chosenUrl || alternatives.some((a) => a.url === url)) continue;
    alternatives.push({ name, url });
    if (alternatives.length === MAX_ALTERNATIVES) break;
  }
  return {
    kind,
    query,
    chosenUrl,
    alternatives,
    searchUrl: SEARCH_URL + encodeURIComponent(query),
    createdAt: now,
  };
}

/**
 * An offer is only shown on the page it was created for, and only briefly.
 *
 * Having no alternatives is fine: the search row alone is worth showing, since
 * a confident guess with no runner-up ("lin" -> linkedin) can still be the
 * wrong thing to have done.
 */
function isOfferValid(offer, currentUrl, now) {
  if (!offer || typeof offer.createdAt !== "number") return false;
  if (!Array.isArray(offer.alternatives) || typeof offer.query !== "string") return false;
  if (now - offer.createdAt > OFFER_TTL_MS) return false;

  // A search jump has no known destination — the search engine decides where
  // you land — so there is nothing to compare against. Freshness is the only
  // check available, and it is also the navigation you are least sure about,
  // which is exactly when the panel earns its place.
  if (offer.kind === "search") return true;

  // Registrable domain, not exact host: sites routinely bounce you to another
  // host they own on the way in (hm.com -> www2.hm.com), and an exact compare
  // would silently void the offer exactly when it landed successfully.
  return sameDomain(offer.chosenUrl, currentUrl);
}

/** The rows to render: the alternatives, then always a search escape hatch. */
function offerRows(offer) {
  return [
    ...offer.alternatives.map((alt) => ({
      kind: "site",
      label: alt.name,
      url: alt.url,
      host: hostOf(alt.url),
    })),
    {
      kind: "search",
      label: `Search Google for “${offer.query}”`,
      url: offer.searchUrl,
      // Derived, not hardcoded, so switching search engine also switches the icon.
      host: hostOf(offer.searchUrl),
    },
  ];
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// ---- offer-panel.js ----
/**
 * The second-chance panel.
 *
 * Shared by two callers so they can never drift apart:
 *   - js/content.js  renders it on the real destination page
 *   - js/main.js     renders it on the demo page, where navigation is only
 *                    simulated and there is no destination to land on
 *
 * Favicons are loaded from each site's own origin, so seeing this panel does
 * not tell any third party where you went. Sites without one fall back to a
 * letter tile.
 */
const DEFAULT_VISIBLE_MS = 5000;

const ACCENT = "#4f8cff";
const SURFACE = "#1a1e26";
const TEXT = "#e8eaf0";
const TEXT_DIM = "#8a90a0";

/**
 * Render the panel and return a handle. `onPick(row)` receives the chosen row;
 * the caller decides what navigating means (real assign vs. demo banner).
 */
function renderOfferPanel({
  rows,
  title = "Meant something else?",
  visibleMs = DEFAULT_VISIBLE_MS,
  onPick,
  container = document.documentElement,
}) {
  const panel = element("div", {
    position: "fixed",
    "z-index": "2147483647",
    top: "16px",
    left: "50%",
    translate: "-50% 0",
    width: "min(380px, calc(100vw - 32px))",
    padding: "12px",
    "border-radius": "14px",
    background: SURFACE,
    color: TEXT,
    font: "14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "box-shadow": "0 8px 32px rgb(0 0 0 / .4)",
    "text-align": "left",
  });
  panel.dataset.predictiveNavPanel = "true";

  panel.append(
    element(
      "div",
      { "font-size": "12px", color: TEXT_DIM, padding: "2px 6px 8px" },
      `${title} · ${Math.round(visibleMs / 1000)}s`
    ),
    ...rows.map((row) => buildRow(row, onPick)),
    progressBar(visibleMs)
  );

  container.appendChild(panel);

  const dismiss = () => panel.remove();
  const timer = setTimeout(dismiss, visibleMs);
  const onKey = (event) => {
    if (event.key !== "Escape") return;
    clearTimeout(timer);
    dismiss();
    document.removeEventListener("keydown", onKey);
  };
  document.addEventListener("keydown", onKey);

  return { dismiss, element: panel };
}

function buildRow(row, onPick) {
  const el = element("div", {
    display: "flex",
    "align-items": "center",
    gap: "10px",
    padding: "8px 6px",
    "border-radius": "8px",
    cursor: "pointer",
  });
  el.addEventListener("mouseenter", () => (el.style.background = "rgb(79 140 255 / .18)"));
  el.addEventListener("mouseleave", () => (el.style.background = "transparent"));
  el.addEventListener("click", () => onPick(row));
  el.append(icon(row), label(row.label));
  return el;
}

function icon(row) {
  if (!row.host) return glyph(row.label[0]?.toUpperCase() ?? "?");
  const img = document.createElement("img");
  img.width = 20;
  img.height = 20;
  img.alt = "";
  img.style.cssText = "border-radius:4px;flex:none";
  img.referrerPolicy = "no-referrer";
  img.src = `https://${row.host}/favicon.ico`;
  img.addEventListener("error", () => img.replaceWith(glyph(row.label[0]?.toUpperCase() ?? "?")), {
    once: true,
  });
  return img;
}

function glyph(char) {
  return element(
    "div",
    {
      width: "20px",
      height: "20px",
      flex: "none",
      "border-radius": "4px",
      background: ACCENT,
      color: "#fff",
      display: "grid",
      "place-items": "center",
      "font-size": "12px",
      "font-weight": "600",
    },
    char
  );
}

function label(text) {
  return element(
    "div",
    { overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" },
    text
  );
}

function progressBar(visibleMs) {
  const track = element("div", {
    height: "3px",
    "margin-top": "6px",
    background: "rgb(255 255 255 / .12)",
    "border-radius": "2px",
    overflow: "hidden",
  });
  const fill = element("div", {
    height: "100%",
    width: "100%",
    background: ACCENT,
    transition: `width ${visibleMs}ms linear`,
  });
  track.appendChild(fill);
  requestAnimationFrame(() => (fill.style.width = "0%"));
  return track;
}

function element(tag, styles, text) {
  const el = document.createElement(tag);
  el.style.cssText = Object.entries(styles)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  if (text) el.textContent = text;
  return el;
}

// ---- content.js ----
/**
 * Injected into the sites in the catalog (see manifest.json). Two jobs:
 *
 *  1. Second-chance panel — if we auto-navigated here on a guess, show what
 *     else we nearly picked, for a few seconds, so a wrong guess costs one
 *     click instead of a back-button round trip.
 *
 *  2. Search auto-pick — watch the site's own search box and activate its own
 *     top suggestion, so typing "mac" on Foodora lands on McDonald's without
 *     the extra Enter.
 *
 * Deliberate limits: only ever activates a role="option" row inside the site's
 * own listbox, never an arbitrary button; never runs on banking, government,
 * health, payment or checkout pages; always shows a visible countdown that
 * Escape cancels.
 *
 * This file is never loaded on its own. tools/build-content.mjs concatenates
 * it with the modules it uses into js/content.bundle.js, which is what the
 * manifest injects — a runtime import() here would be evaluated against the
 * host page's CSP and blocked outright on strict sites.
 */
(async () => {
  if (isSensitiveLocation(location)) return;

  // Watch the search box first and synchronously. The panel has to await a
  // storage read, and anything typed before that resolves would go unseen —
  // besides, a failure in the panel must never take the watcher down with it.
  watchSiteSearch();
  showSecondChancePanel().catch(() => {});

  // --- 1. second-chance panel -------------------------------------------

  async function showSecondChancePanel() {
    const store = chrome.storage?.session;
    if (!store) return;

    const { switchOffer } = await store.get("switchOffer");
    if (!isOfferValid(switchOffer, location.href, Date.now())) return;
    await store.remove("switchOffer"); // one shot only

    renderOfferPanel({
      rows: offerRows(switchOffer),
      visibleMs: OFFER_VISIBLE_MS,
      onPick: (row) => location.assign(row.url),
    });
  }

  // --- 2. search auto-pick ----------------------------------------------

  function watchSiteSearch() {
    /** Time the suggestion list must hold still before we act on it. */
    const COMMIT_DELAY_MS = 800;
    /** Debounce between the last keystroke and reading the list. */
    const SETTLE_MS = 250;

    const state = { timer: null, settle: null, suppressed: false };
    const badge = createBadge();

    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKeyDown, true);

    function onInput(event) {
      if (!isSearchInput(event.target)) return;
      cancel();
      clearTimeout(state.settle);
      state.settle = setTimeout(() => evaluate(event.target), SETTLE_MS);
    }

    function evaluate(input) {
      if (state.suppressed || input.value.trim() === "") return;
      const choice = chooseSuggestion(input.value, findSuggestions(document));
      if (!choice) {
        badge.hide();
        return;
      }
      badge.show(choice.label, COMMIT_DELAY_MS);
      state.timer = setTimeout(() => commit(choice), COMMIT_DELAY_MS);
    }

    function commit(choice) {
      badge.hide();
      if (!document.contains(choice.el)) return; // the list changed under us
      activationTarget(choice.el).click();
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        cancel();
        state.suppressed = true;
        badge.flash("Auto-select paused");
      } else if (event.key === "Enter") {
        cancel(); // the user is committing themselves
      } else {
        state.suppressed = false;
      }
    }

    function cancel() {
      clearTimeout(state.timer);
      state.timer = null;
      badge.hide();
    }

    function createBadge() {
      const el = document.createElement("div");
      el.style.cssText = [
        "position:fixed",
        "z-index:2147483647",
        "right:16px",
        "bottom:16px",
        "padding:10px 14px",
        "border-radius:10px",
        "background:#1a1e26",
        "color:#e8eaf0",
        "font:14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        "box-shadow:0 4px 16px rgb(0 0 0 / .3)",
        "pointer-events:none",
        "opacity:0",
        "transition:opacity 120ms ease",
      ].join(";");
      document.documentElement.appendChild(el);
      return {
        show: (text, ms) => {
          el.textContent = `→ ${text} · ${Math.round(ms / 100) / 10}s · Esc cancels`;
          el.style.opacity = "1";
        },
        flash: (text) => {
          el.textContent = text;
          el.style.opacity = "1";
          setTimeout(() => (el.style.opacity = "0"), 1200);
        },
        hide: () => (el.style.opacity = "0"),
      };
    }
  }
})();

})();
