/**
 * Fallback destinations for input that isn't a known site.
 *
 * "Lucky" jumps straight to the first ORGANIC search result, skipping the ad
 * block at the top of the results page.
 *
 * Provider notes (verified 2026-07):
 *   duckduckgo – the "\" operator redirects server-side to the first result.
 *                Clean 302, no interstitial. This is the reliable one.
 *   google     – &btnI=1 still resolves a first result, but Google now parks
 *                you on a "redirect notice" page that needs a manual click,
 *                so it does NOT actually save you a keypress.
 */
export const PROVIDERS = {
  duckduckgo: {
    label: "DuckDuckGo",
    lucky: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(`\\${query}`)}`,
    search: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  },
  google: {
    label: "Google",
    // No lucky jump: &btnI=1 still resolves a result but parks you on a
    // "redirect notice" page needing a manual click, which saves no keypress
    // and is worse than plain results. Choosing Google means ordinary results.
    lucky: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    search: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
};

const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i;

/** True when the text is already an address ("blocket.se", "https://x.com/y"). */
export function looksLikeUrl(text) {
  const trimmed = text.trim();
  if (/\s/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return DOMAIN.test(trimmed);
}

/** Normalize typed text into a navigable https URL. */
export function toDirectUrl(text) {
  const trimmed = text.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
