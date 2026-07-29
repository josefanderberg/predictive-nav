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
  /(^|\.)(swedbank|seb|nordea|handelsbanken|lansforsakringar|folksam|trygghansa|if|lf|icabanken|avanza|nordnet|klarna|paypal|stripe|revolut|wise|coinbase|skatteverket|forsakringskassan|csn|arbetsformedlingen|polisen|migrationsverket|pensionsmyndigheten|transportstyrelsen|bolagsverket|domstol|1177|vardguiden|kry|mindoktor|doktor|apoteket|apotek|apotekhjartat|apohem|meds|bankid|freja|kivra|minaintyg)\./i;
const BLOCKED_TLD = /\.(gov|bank)(\.|$)/i;
const BLOCKED_PATH = /(checkout|kassa|payment|betal|order|bestall|login|logga-in|signin|account|konto|admin)/i;

const SEARCH_HINT = /(search|sok|sök|query|q)\b/i;

/** True when this page must never be auto-activated. */
export function isSensitiveLocation({ hostname = "", pathname = "" } = {}) {
  return (
    BLOCKED_HOST.test(`${hostname}.`) ||
    BLOCKED_TLD.test(hostname) ||
    BLOCKED_PATH.test(pathname)
  );
}

/** True when an input looks like a site search field rather than a data entry field. */
export function isSearchInput(el) {
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
export function findSuggestions(root) {
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
export function chooseSuggestion(query, suggestions, options = {}) {
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
export function activationTarget(el) {
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
