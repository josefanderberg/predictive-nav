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
import { openStore } from "./store.js";
import {
  isBounce,
  addRejection,
  rejectedFor,
  navigationType,
  recordVisit,
  applyVisits,
  learnedCount,
  trustedSites,
  addCustomSite,
  removeCustomSite,
  mergeCustomSites,
  siteNameFromUrl,
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
/**
 * How long a search waits before going by itself, or null for never.
 *
 * The hard case is telling "bkbpsk" — plainly something to look up — from
 * "vadkul", which may be one keystroke away from becoming vadkul.se. The text
 * alone cannot separate them, but the pause after it can: nobody stops for a
 * second and a half in the middle of typing a domain.
 *
 * A dot settles it outright in the other direction. Nothing but an address has
 * one mid-word, so those never go on their own — that is what stopped a search
 * firing halfway through a hostname and making new sites impossible to add.
 */
function autoSearchDelay(query) {
  const q = query.trim();
  if (q.includes(".")) return null;
  // A space cannot occur in a hostname, so this is unambiguously a lookup.
  if (/\s/.test(q)) return LUCKY_DELAY_MS;
  return SINGLE_WORD_DELAY_MS;
}

const COMMIT_DELAY_MS = 450; // known site: high confidence, go quickly
/**
 * When exactly one site matches, typing more of the same name cannot change
 * the answer — "am", "ama", "amazon" all end at Amazon — so there is nothing
 * to wait for. Guessing early is only wrong if you meant a site the catalog
 * has never heard of, which is what Esc and the arrival overlay are for.
 */
const SOLE_MATCH_DELAY_MS = 200;
const LUCKY_DELAY_MS = 900; // search fallback: riskier, leave room to keep typing
/**
 * A lone word gets longer, because it might still be turning into a domain.
 * Well past a typing pause (~180ms between keys) but short enough to feel
 * automatic once you have actually stopped.
 */
const SINGLE_WORD_DELAY_MS = 1500;
const MIN_LUCKY_LENGTH = 3;
const MAX_SUGGESTIONS = 5;

const els = {
  input: document.getElementById("nav-input"),
  ghost: document.getElementById("ghost"),
  status: document.getElementById("status"),
  progress: document.getElementById("progress"),
  banner: document.getElementById("banner"),
  suggestions: document.getElementById("suggestions"),
  diagnostics: document.getElementById("diagnostics"),
  settings: document.getElementById("settings"),
  speed: document.getElementById("setting-speed"),
  yours: document.getElementById("setting-yours"),
  counts: document.getElementById("setting-counts"),
  yourSitesList: document.getElementById("setting-sites"),
};

const state = {
  sites: [],
  /** the catalog before personalisation, kept so removals can rebuild it */
  baseSites: [],
  timer: null,
  suppressed: false,
  intent: null,
  /** query -> site names this query was sent to and turned back from */
  rejections: {},
  /** site name -> times a guess sent us there and stuck */
  visits: {},
  /** site name -> address this person typed out themselves */
  custom: {},
  /**
   * Whether an empty bar lists your sites. Off: a new tab should be bare, and
   * the list is a thing to turn on rather than something to dismiss.
   */
  showYours: false,
  /** multiplies every commit delay — 1 is as fast as it goes */
  speed: 1,
  /** where what we learn is kept — see store.js */
  store: null,
};

const DEMO_MODE = new URLSearchParams(location.search).has("demo");

init();

async function init() {
  // Listeners first, unconditionally: even if personalization fails, the bar
  // must keep working (Enter falls back to search on an empty catalog).
  els.input.addEventListener("input", onInput);
  els.input.addEventListener("keydown", onKeyDown);
  window.addEventListener("pageshow", onPageShow);
  claimFocus();
  if (DEMO_MODE) setStatus("Demo mode: navigation is simulated.");
  renderDiagnostics();

  state.store = openStore();
  allowContentScriptsToReadOffers();
  await learnFromLastVisit();

  try {
    state.baseSites = await loadSites();
  } catch {
    const { SEED_SITES } = await import("./sites.js");
    state.baseSites = SEED_SITES;
  }
  state.sites = personalise(state.baseSites);
  initSettings();
  renderDiagnostics();
  onInput(); // re-evaluate anything typed while the catalog loaded
}

/**
 * Coming back with the Back button often serves this page frozen from the
 * back-forward cache rather than reloading it: the old query still in the
 * field, the ghost completion drawn over the placeholder — the "two
 * placeholders" look. None of that mid-thought state is worth keeping, because
 * returning to a launcher means you want to launch something else. So the bar
 * resets to blank, and the return is fed to the same learning path a fresh
 * back-navigation load takes — a cache restore never re-runs init, so without
 * this the Back signal on such browsers was simply lost.
 */
async function onPageShow(event) {
  if (!event.persisted) return;
  cancelPendingCommit();
  hideBanner();
  els.input.value = "";
  render(null);
  await learnFromLastVisit("back_forward");
  state.sites = personalise(state.baseSites);
  renderSuggestions(yourSites());
  renderDiagnostics();
  els.input.focus({ preventScroll: true });
}

/**
 * If the last guess was answered with the Back button, remember not to make it
 * again for that query.
 *
 * Runs before the catalog loads so the very first keystroke already benefits.
 * Failures are silent by design: a browser without extension storage still
 * gets a working bar, just one that cannot learn.
 */
async function learnFromLastVisit(howOverride) {
  const local = state.store;
  if (!local || local.kind === "none") return;

  try {
    const stored = await local.get([
      "lastGuess",
      "rejections",
      "visits",
      "custom",
      "showYours",
      "speed",
    ]);
    const { lastGuess } = stored;
    state.rejections = stored.rejections ?? {};
    state.visits = stored.visits ?? {};
    state.custom = stored.custom ?? {};
    state.showYours = stored.showYours ?? false;
    state.speed = Number(stored.speed) || 1;
    if (!lastGuess) return;

    const how = howOverride ?? navigationType(performance.getEntriesByType("navigation"));
    if (lastGuess.kind !== "url" && isBounce(lastGuess, how, Date.now())) {
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

/**
 * Every wait, stretched by the chosen speed.
 *
 * One dial rather than four: the delays are already tuned relative to each
 * other, and what differs between people is how much room they want overall.
 * Someone who types slowly, or wants a beat to change their mind, moves them
 * all at once and keeps the balance.
 */
const scaled = (ms) => Math.round(ms * state.speed);

/** Reflect the stored preferences in the controls, and wire them up once. */
function initSettings() {
  els.speed.value = String(state.speed);
  els.yours.checked = state.showYours;

  els.speed.addEventListener("change", () => {
    state.speed = Number(els.speed.value) || 1;
    save({ speed: state.speed });
    onInput(); // re-arm anything pending at the new pace
  });

  els.yours.addEventListener("change", () => {
    state.showYours = els.yours.checked;
    save({ showYours: state.showYours });
    if (!els.input.value.trim()) renderSuggestions(yourSites());
  });
}

function toggleSettings() {
  els.settings.hidden = !els.settings.hidden;
  if (!els.settings.hidden) renderSettingsPanel();
  renderDiagnostics();
}

/**
 * The numbers and the list of typed-in sites, shown where they can be acted
 * on. A removed site leaves the catalog immediately — the base list is kept
 * unpersonalised precisely so this rebuild restores it exactly.
 */
function renderSettingsPanel() {
  const yours = learnedCount(state.visits);
  els.counts.textContent = `${state.sites.length} sites in the catalog · ${yours} learned as yours`;

  const entries = Object.values(state.custom);
  els.yourSitesList.replaceChildren();
  if (entries.length === 0) return;

  const heading = document.createElement("p");
  heading.className = "setting-sites-heading";
  heading.textContent = "Sites you added";
  els.yourSitesList.append(heading);

  for (const site of entries) {
    const row = document.createElement("div");
    row.className = "setting-site";

    const label = document.createElement("span");
    label.textContent = site.name;
    label.title = site.url;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "remove";
    remove.setAttribute("aria-label", `Remove ${site.name}`);
    remove.addEventListener("click", () => {
      state.custom = removeCustomSite(state.custom, site.name);
      save({ custom: state.custom });
      state.sites = personalise(state.baseSites);
      renderSettingsPanel();
      if (!els.input.value.trim()) renderSuggestions(yourSites());
    });

    row.append(label, remove);
    els.yourSitesList.append(row);
  }
}

function save(values) {
  state.store?.set(values).catch(() => {
    // a preference is not worth failing over
  });
}

/** The catalog with this person's own addresses folded in and their habits applied. */
function personalise(sites) {
  return applyVisits(mergeCustomSites(sites, state.custom), state.visits);
}

/**
 * The sites that have become this person's own — ones they added by typing an
 * address, and ones they keep going back to, most-used first.
 *
 * Shown under an empty bar. Learning that leaves no trace on screen is
 * indistinguishable from learning that never happened, and this is also a
 * usable launcher in its own right.
 */
function yourSites() {
  if (!state.showYours) return [];
  const visits = (name) => state.visits[name] ?? 0;
  const added = new Set(Object.keys(state.custom));
  return state.sites
    .filter((site) => added.has(site.name) || visits(site.name) > 0)
    .sort((a, b) => visits(b.name) - visits(a.name) || b.weight - a.weight)
    .slice(0, MAX_SUGGESTIONS)
    .map((site) => ({ site }));
}

/**
 * Record where a guess sent us, so a quick return can be read as a rejection.
 *
 * A typed address is also remembered as a site of its own. That is the only
 * way something outside the catalog — vadkul.se, a work intranet — can ever
 * become reachable from two letters: you type it out once, and from then on
 * it competes like anything else.
 */
async function rememberGuess(intent, url) {
  const local = state.store;
  if (!local || local.kind === "none") return;

  try {
    if (intent?.type === "site" && intent.site) {
      await local.set({
        lastGuess: { query: intent.query, name: intent.site.name, at: Date.now() },
      });
      return;
    }

    if (intent?.type === "url") {
      const name = siteNameFromUrl(url);
      if (!name) return;
      state.custom = addCustomSite(state.custom, url);
      // kind "url" so the return trip can only ever count as a visit. A typed
      // address is not a prediction and cannot be wrong — and checking whether
      // it was remembered means pressing Back, which would otherwise blacklist
      // the site under its own name the moment you went to look.
      await local.set({
        custom: state.custom,
        lastGuess: { kind: "url", query: name, name, at: Date.now() },
      });
    }
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

  const parts = [];
  if (DEMO_MODE) parts.push("demo mode — nothing navigates and nothing is remembered");
  else if (!isExtension)
    parts.push("web page — learns your sites here, but the arrival overlay needs the extension");

  els.diagnostics.replaceChildren();
  els.diagnostics.classList.toggle("error", !isExtension && !DEMO_MODE);

  // No storage means no preferences worth opening: show only the context note.
  if (state.store?.kind === "none") {
    els.diagnostics.append(
      document.createTextNode([`${state.sites.length} sites`, ...parts].join(" · "))
    );
    return;
  }

  // The numbers live inside the panel; the page itself just offers the word.
  const link = document.createElement("a");
  link.href = "#";
  link.textContent = els.settings.hidden ? "settings" : "close settings";
  link.addEventListener("click", (event) => {
    event.preventDefault();
    toggleSettings();
  });
  els.diagnostics.append(link);
  if (parts.length > 0) els.diagnostics.append(document.createTextNode(` · ${parts.join(" · ")}`));

  if (!DEMO_MODE) return;
  const real = new URL(location.href);
  real.searchParams.delete("demo");
  const demoOff = document.createElement("a");
  demoOff.href = real.href;
  demoOff.textContent = "turn demo off";
  els.diagnostics.append(document.createTextNode(" · "), demoOff);
}

/**
 * chrome.storage.session is walled off from content scripts by default; the
 * second-chance panel runs in one. This page is a trusted context, so it can
 * open session storage up before any offer is written.
 */
function allowContentScriptsToReadOffers() {
  try {
    // globalThis.chrome, not bare chrome: Safari has no such global at all,
    // and optional chaining does not save you from an undeclared identifier —
    // it throws a ReferenceError before the ?. is ever reached.
    globalThis.chrome?.storage?.session
      ?.setAccessLevel?.({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })
      ?.catch(() => {});
  } catch {
    // not running as an extension — nothing to do
  }
}

// --- intent resolution --------------------------------------------------

/**
 * A leading space means "let me think": predictions and suggestions still
 * appear, but nothing fires on its own — only Enter or a click decides. The
 * space bar is under your thumb and needs no hint to remember, which is what
 * an escape hatch is for.
 */
function resolveIntent(text) {
  const intent = resolveIntentFor(text.trim());
  if (!intent || intent.delay === null || !/^\s/.test(text)) return intent;
  return { ...intent, delay: null, status: `${intent.status} · paused — Enter or a click goes` };
}

function resolveIntentFor(query) {
  if (!query) return null;

  if (looksLikeUrl(query)) {
    const url = toDirectUrl(query);
    return { type: "url", url, status: `${url} — typed address`, candidates: [], delay: scaled(COMMIT_DELAY_MS) };
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
        : scaled(prediction.candidates.length === 1 ? SOLE_MATCH_DELAY_MS : COMMIT_DELAY_MS),
    };
  }

  if (query.length < MIN_LUCKY_LENGTH) {
    return { type: "none", url: null, status: "Keep typing…", candidates: [], delay: null };
  }

  const delay = autoSearchDelay(query);
  const armed = delay === null ? null : scaled(delay);

  return {
    type: "lucky",
    url: JUMP_TO_FIRST_RESULT ? PROVIDER.lucky(query) : PROVIDER.search(query),
    query,
    status: delay
      ? `Search ${PROVIDER.label} for “${query}”`
      : `Finish the address, or press Enter to search for “${query}”`,
    candidates: [],
    delay: armed,
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
    renderSuggestions(yourSites());
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
  els.progress.style.setProperty("--commit-ms", `${intent.delay}ms`);
  // Restart the fill from zero even if the previous one had not finished.
  els.progress.classList.remove("active");
  void els.progress.offsetWidth;
  els.progress.classList.add("active");
  state.timer = setTimeout(() => navigateTo(intent.url, intent), intent.delay);
}

function cancelPendingCommit() {
  clearTimeout(state.timer);
  state.timer = null;
  state.intent = null;
  els.progress.classList.remove("active");
}

async function navigateTo(url, intent = null) {
  cancelPendingCommit();
  const offer = intent ? buildSwitchOffer(url, intent) : null;

  if (DEMO_MODE) {
    showBanner(url);
    return;
  }

  if (offer) await storeSwitchOffer(offer);
  await rememberGuess(intent, url);
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
    await globalThis.chrome?.storage?.session?.set({ switchOffer: offer });
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
