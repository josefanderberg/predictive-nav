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

  // The panel must never take the search watcher down with it: session
  // storage is walled off from content scripts unless the new tab page has
  // opened it up, and that call may not have happened yet.
  await showSecondChancePanel().catch(() => {});
  watchSiteSearch();

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
