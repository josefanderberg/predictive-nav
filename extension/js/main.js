/**
 * UI wiring for the predictive navigation bar.
 *
 * Every keystroke resolves the input to exactly one intent:
 *
 *   url    – you typed an address ("blocket.se")        -> go there
 *   site   – a known site matched confidently            -> go there
 *   lucky  – nothing matched, so jump to the first        -> go there
 *            organic search result (skipping the ads)
 *   none   – too little to act on                        -> wait
 *
 * An intent with a `delay` auto-navigates after that many ms of typing
 * silence. More typing resets the timer, Escape cancels auto-navigation for
 * the rest of the input, Enter commits immediately.
 *
 * Demo mode (?demo=1): shows a "would navigate to …" banner instead of
 * actually leaving the page, so the behavior can be tested on a plain server.
 */
import { predict } from "./predictor.js";
import { resolveRegionalUrl } from "./sites.js";
import { loadSites } from "./user-sites.js";
import { PROVIDERS, looksLikeUrl, toDirectUrl } from "./lucky.js";
import { buildOffer } from "./switcher.js";
import {
  isBounce,
  addRejection,
  rejectedFor,
  navigationType,
  recordVisit,
  applyVisits,
  learnedCount,
  trustedSites,
} from "./memory.js";

/** Which search engine handles anything the catalog does not know. */
const PROVIDER = PROVIDERS.google;
/**
 * Whether an unknown word should jump straight to the first organic result.
 *
 * Off. Jumping saves a click when the guess is right, but lands you on a
 * stranger's page when it is wrong — and for a two-word thought like "world
 * war 2" it is wrong most of the time. Search results are a page you can read
 * and choose from; a wrong site is a page you have to escape.
 */
const JUMP_TO_FIRST_RESULT = false;
/** Set false to require Enter for search fallbacks (known sites still auto-go). */
const AUTO_LUCKY = true;

const COMMIT_DELAY_MS = 450; // known site: high confidence, go quickly
/**
 * When exactly one site matches, typing more of the same name cannot change
 * the answer — "am", "ama", "amazon" all end at Amazon — so there is nothing
 * to wait for. Guessing early is only wrong if you meant a site the catalog
 * has never heard of, which is what Esc and the arrival overlay are for.
 */
const SOLE_MATCH_DELAY_MS = 200;
const LUCKY_DELAY_MS = 900; // search fallback: riskier, leave room to keep typing
const MIN_LUCKY_LENGTH = 3;
const MAX_SUGGESTIONS = 5;

const els = {
  input: document.getElementById("nav-input"),
  ghost: document.getElementById("ghost"),
  status: document.getElementById("status"),
  ring: document.getElementById("ring"),
  banner: document.getElementById("banner"),
  suggestions: document.getElementById("suggestions"),
  diagnostics: document.getElementById("diagnostics"),
};

const state = {
  sites: [],
  timer: null,
  suppressed: false,
  intent: null,
  /** query -> site names this query was sent to and turned back from */
  rejections: {},
  /** site name -> times a guess sent us there and stuck */
  visits: {},
};

const DEMO_MODE = new URLSearchParams(location.search).has("demo");

init();

async function init() {
  // Listeners first, unconditionally: even if personalization fails, the bar
  // must keep working (Enter falls back to search on an empty catalog).
  els.input.addEventListener("input", onInput);
  els.input.addEventListener("keydown", onKeyDown);
  claimFocus();
  if (DEMO_MODE) setStatus("Demo mode: navigation is simulated.");
  renderDiagnostics();

  allowContentScriptsToReadOffers();
  await learnFromLastVisit();

  try {
    state.sites = applyVisits(await loadSites(), state.visits);
  } catch {
    const { SEED_SITES } = await import("./sites.js");
    state.sites = applyVisits(SEED_SITES, state.visits);
  }
  renderDiagnostics();
  onInput(); // re-evaluate anything typed while the catalog loaded
}

/**
 * If the last guess was answered with the Back button, remember not to make it
 * again for that query.
 *
 * Runs before the catalog loads so the very first keystroke already benefits.
 * Failures are silent by design: a browser without extension storage still
 * gets a working bar, just one that cannot learn.
 */
async function learnFromLastVisit() {
  const local = chrome?.storage?.local;
  if (!local) return;

  try {
    const stored = await local.get(["lastGuess", "rejections", "visits"]);
    const { lastGuess } = stored;
    state.rejections = stored.rejections ?? {};
    state.visits = stored.visits ?? {};
    if (!lastGuess) return;

    const how = navigationType(performance.getEntriesByType("navigation"));
    if (isBounce(lastGuess, how, Date.now())) {
      state.rejections = addRejection(state.rejections, lastGuess.query, lastGuess.name);
      await local.set({ rejections: state.rejections });
    } else {
      // Not turned back from, so the guess was right. Counting only guesses
      // that stuck is what turns the generic catalog into this person's own
      // short list of sites.
      state.visits = recordVisit(state.visits, lastGuess.name);
      await local.set({ visits: state.visits });
    }
    await local.remove("lastGuess");
  } catch {
    // storage is best-effort; never block the bar on it
  }
}

/** Record where a guess sent us, so a quick return can be read as a rejection. */
async function rememberGuess(intent) {
  if (intent?.type !== "site" || !intent.site) return;
  try {
    await chrome?.storage?.local?.set({
      lastGuess: { query: intent.query, name: intent.site.name, at: Date.now() },
    });
  } catch {
    // best-effort
  }
}

/**
 * Get the caret into the bar so the first thing typed is a destination, not a
 * lost keystroke.
 *
 * Desktop: Chrome parks focus in the address bar when a new tab opens and can
 * take it back after the page paints, so one focus() call during load loses
 * the race. We ask repeatedly for a moment, again whenever the tab is shown,
 * and treat any printable key pressed elsewhere on the page as meant for the
 * bar.
 *
 * Mobile: the soft keyboard cannot be opened programmatically at all. iOS only
 * raises it from a trusted gesture, and only when focus() runs synchronously
 * inside that gesture's handler — an await or a timer moves execution out of
 * the gesture and the keyboard stays down. So the best available is to make
 * the first tap anywhere count as tapping the bar, which is why the handler
 * below calls focus() directly rather than deferring.
 */
function claimFocus() {
  const focus = () => {
    if (document.activeElement !== els.input) els.input.focus({ preventScroll: true });
  };

  focus();
  for (const delay of [0, 30, 100, 250, 500]) setTimeout(focus, delay);
  document.addEventListener("visibilitychange", () => !document.hidden && focus());
  window.addEventListener("focus", focus);

  // Anything already interactive keeps its own tap — stealing focus here would
  // break clicking a suggestion.
  const INTERACTIVE = "a, button, input, textarea, select, #suggestions";
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
      focus(); // synchronous: this is what lets a mobile keyboard open
    },
    { passive: true }
  );

  document.addEventListener("keydown", (event) => {
    if (event.target === els.input) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.length !== 1) return; // ignore Tab, arrows, F-keys and friends
    focus();
  });
}

/**
 * States which of the three contexts this page is running in.
 *
 * They behave differently in ways that otherwise look like bugs: served as an
 * ordinary web page there is no extension storage, so the destination overlay
 * cannot appear no matter how well everything else works — and in demo mode
 * nothing navigates at all. Saying so beats leaving it to be discovered.
 */
function renderDiagnostics() {
  const isExtension = location.protocol === "chrome-extension:";
  const learned = learnedCount(state.visits);
  const parts = [learned > 0 ? `${state.sites.length} sites · ${learned} yours` : `${state.sites.length} sites`];

  if (DEMO_MODE) parts.push("demo mode — nothing actually navigates");
  else if (!isExtension) parts.push("web page — navigates, but the destination overlay needs the installed extension");
  else parts.push("running as the extension — all features active");

  els.diagnostics.replaceChildren(document.createTextNode(parts.join(" · ")));
  els.diagnostics.classList.toggle("error", !isExtension && !DEMO_MODE);

  if (!DEMO_MODE) return;
  const real = new URL(location.href);
  real.searchParams.delete("demo");
  const link = document.createElement("a");
  link.href = real.href;
  link.textContent = "turn demo off";
  els.diagnostics.append(document.createTextNode(" · "), link);
}

/**
 * chrome.storage.session is walled off from content scripts by default; the
 * second-chance panel runs in one. This page is a trusted context, so it can
 * open session storage up before any offer is written.
 */
function allowContentScriptsToReadOffers() {
  try {
    chrome?.storage?.session
      ?.setAccessLevel?.({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })
      ?.catch(() => {});
  } catch {
    // not running as an extension — nothing to do
  }
}

// --- intent resolution --------------------------------------------------

function resolveIntent(text) {
  const query = text.trim();
  if (!query) return null;

  if (looksLikeUrl(query)) {
    const url = toDirectUrl(query);
    return { type: "url", url, status: `${url} — typed address`, candidates: [], delay: COMMIT_DELAY_MS };
  }

  const prediction = predict(query, state.sites, {
    exclude: rejectedFor(state.rejections, query),
    trusted: trustedSites(state.visits),
  });
  if (prediction.kind !== "none") {
    const url = destinationOf(prediction.site);
    const percent = Math.round(prediction.confidence * 100);
    return {
      type: "site",
      url,
      site: prediction.site,
      status: `${url} — ${percent}% confident`,
      ghost: prediction.site.name,
      candidates: prediction.candidates.slice(0, MAX_SUGGESTIONS),
      runnersUp: prediction.candidates.map((c) => ({
        name: c.site.name,
        url: destinationOf(c.site),
      })),
      query,
      delay: prediction.kind !== "commit"
        ? null
        : prediction.candidates.length === 1
          ? SOLE_MATCH_DELAY_MS
          : COMMIT_DELAY_MS,
    };
  }

  if (query.length < MIN_LUCKY_LENGTH) {
    return { type: "none", url: null, status: "Keep typing…", candidates: [], delay: null };
  }

  return {
    type: "lucky",
    url: JUMP_TO_FIRST_RESULT ? PROVIDER.lucky(query) : PROVIDER.search(query),
    query,
    status: JUMP_TO_FIRST_RESULT
      ? `First result for “${query}” — skips the ads · ${PROVIDER.label}`
      : `Search ${PROVIDER.label} for “${query}”`,
    candidates: [],
    delay: AUTO_LUCKY ? LUCKY_DELAY_MS : null,
  };
}

// --- events -------------------------------------------------------------

function onInput() {
  cancelPendingCommit();
  hideBanner();

  const intent = resolveIntent(els.input.value);
  if (!intent) {
    state.suppressed = false;
    render(null);
    return;
  }

  render(intent);
  if (intent.delay !== null && !state.suppressed) scheduleCommit(intent);
}

function onKeyDown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    // Pass the intent along: committing by hand is still a guess, so the
    // destination should offer the same second chance as an automatic one.
    const intent = state.intent ?? resolveIntent(els.input.value);
    if (intent?.url) navigateTo(intent.url, intent);
    else if (els.input.value.trim()) navigateTo(PROVIDER.search(els.input.value.trim()));
  } else if (event.key === "Escape") {
    cancelPendingCommit();
    state.suppressed = true;
    setStatus("Auto-navigation paused — press Enter to go.");
  }
}

// --- commit timing ------------------------------------------------------

function scheduleCommit(intent) {
  state.intent = intent;
  els.ring.style.setProperty("--commit-ms", `${intent.delay}ms`);
  els.ring.classList.add("active");
  state.timer = setTimeout(() => navigateTo(intent.url, intent), intent.delay);
}

function cancelPendingCommit() {
  clearTimeout(state.timer);
  state.timer = null;
  state.intent = null;
  els.ring.classList.remove("active");
}

async function navigateTo(url, intent = null) {
  cancelPendingCommit();
  const offer = intent ? buildSwitchOffer(url, intent) : null;

  if (DEMO_MODE) {
    showBanner(url);
    return;
  }

  if (offer) await storeSwitchOffer(offer);
  await rememberGuess(intent);
  location.assign(url);
}

/**
 * The runners-up worth offering as a one-click switch. Only for site guesses —
 * a typed address is not a guess, and a search fallback has no runners-up.
 */
function buildSwitchOffer(url, intent) {
  if (intent.type === "site") {
    return buildOffer({
      kind: "site",
      query: intent.query,
      chosenUrl: url,
      candidates: intent.runnersUp,
      neighbours: neighboursOf(intent.site),
      now: Date.now(),
    });
  }

  // A search jump lands wherever the engine decides, so there is no
  // destination to record and no runners-up to rank — but it is the least
  // certain navigation of the lot, so the way back matters more here, not less.
  if (intent.type === "lucky") {
    return buildOffer({
      kind: "search",
      query: intent.query,
      chosenUrl: null,
      candidates: [],
      neighbours: containing(intent.query),
      now: Date.now(),
    });
  }

  return null;
}

/**
 * The heaviest other sites in the same category, used to top the panel up when
 * the typed prefix has no runners-up. "lidl" matches only Lidl, but the next
 * thing you might want is another grocer, and offering nothing wastes the
 * five seconds the panel is on screen.
 */
/**
 * Catalog sites whose name merely contains the query. Too weak a signal to
 * navigate on — which is why the predictor only matches prefixes — but worth
 * offering after a search jump, where there is otherwise nothing to show.
 * "tube" finds youtube; "giganten" finds elgiganten.
 */
function containing(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  return state.sites
    .filter((s) => !s.name.startsWith(q) && s.name.includes(q))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => ({ name: s.name, url: destinationOf(s) }));
}

function neighboursOf(site) {
  if (!site?.category) return [];
  return state.sites
    .filter((s) => s.category === site.category && s.name !== site.name)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => ({ name: s.name, url: destinationOf(s) }));
}

/** Hand the offer to the destination page, which renders it on arrival. */
async function storeSwitchOffer(offer) {
  try {
    await chrome?.storage?.session?.set({ switchOffer: offer });
  } catch {
    // storage is best-effort; never block navigation on it
  }
}

function destinationOf(site) {
  return resolveRegionalUrl(site, navigator.language);
}

// --- rendering ----------------------------------------------------------

function render(intent) {
  const typed = els.input.value;
  const name = intent?.ghost ?? "";
  const completion = name.startsWith(typed.trim().toLowerCase())
    ? name.slice(typed.trim().length)
    : "";
  els.ghost.textContent = typed + completion;
  setStatus(intent?.status ?? "");
  renderSuggestions(intent?.candidates ?? []);
}

function setStatus(text) {
  els.status.textContent = text;
}

function renderSuggestions(candidates) {
  els.suggestions.replaceChildren(
    ...candidates.map(({ site }) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "s-name";
      name.textContent = site.name;
      const url = document.createElement("span");
      url.className = "s-url";
      url.textContent = destinationOf(site);
      li.append(name, url);
      li.addEventListener("click", () => navigateTo(destinationOf(site)));
      return li;
    })
  );
}

/**
 * Demo mode's whole point is to not navigate, which reads as "broken" unless
 * the banner says so and offers the way out. So it names the mode and links to
 * the destination, making the simulated hop one click from the real one.
 */
function showBanner(url) {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = url;

  const hint = document.createElement("span");
  hint.className = "banner-hint";
  hint.textContent = "Simulated — click the link to go there for real";

  els.banner.replaceChildren(document.createTextNode("Would navigate to "), link, hint);
  els.banner.classList.add("visible");
}

function hideBanner() {
  els.banner.classList.remove("visible");
}
