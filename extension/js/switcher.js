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
import { sameDomain } from "./domain.js";

/** How long an offer stays valid. Covers page load, not much more. */
export const OFFER_TTL_MS = 12_000;
/** How long the panel stays on screen once shown. */
export const OFFER_VISIBLE_MS = 5000;
/** Site alternatives shown before the search row. */
export const MAX_ALTERNATIVES = 4;

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
export function buildOffer({ query, chosenUrl, candidates, neighbours = [], now }) {
  const alternatives = [];
  for (const { name, url } of [...candidates, ...neighbours]) {
    if (url === chosenUrl || alternatives.some((a) => a.url === url)) continue;
    alternatives.push({ name, url });
    if (alternatives.length === MAX_ALTERNATIVES) break;
  }
  return {
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
export function isOfferValid(offer, currentUrl, now) {
  if (!offer || typeof offer.createdAt !== "number") return false;
  if (!Array.isArray(offer.alternatives) || typeof offer.query !== "string") return false;
  if (now - offer.createdAt > OFFER_TTL_MS) return false;
  // Registrable domain, not exact host: sites routinely bounce you to another
  // host they own on the way in (hm.com -> www2.hm.com), and an exact compare
  // would silently void the offer exactly when it landed successfully.
  return sameDomain(offer.chosenUrl, currentUrl);
}

/** The rows to render: the alternatives, then always a search escape hatch. */
export function offerRows(offer) {
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
