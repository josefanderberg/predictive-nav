/**
 * Learning which guesses were wrong.
 *
 * Typing "wo" and landing on Wolt is only helpful if Wolt is what you meant.
 * When it is not, you press Back — and that press is the clearest signal the
 * tool ever gets. It costs nothing to collect and it is unambiguous, unlike
 * anything inferred from dwell time or scrolling.
 *
 * The rejection is stored against the exact query, not the site. "wo" no
 * longer goes to Wolt, but typing "wolt" still does, because that spelling is
 * a different and much more deliberate act.
 *
 * Everything here is pure so the rules can be tested without a browser; the
 * storage wiring lives in main.js.
 */

/**
 * How long after leaving the bar a return still counts as a rejection.
 *
 * Long enough to load a slow site, glance at it and turn around. Beyond that,
 * going back is ordinary browsing rather than a correction.
 */
export const BOUNCE_WINDOW_MS = 20_000;

/**
 * True when arriving at the bar means "that was the wrong site".
 *
 * Requires an actual Back/Forward navigation — opening a fresh tab, or
 * navigating here on purpose, must never be read as a complaint. The browser
 * reports this exactly, so nothing has to be inferred.
 */
export function isBounce(pending, navigationType, now) {
  if (!pending || typeof pending.at !== "number" || !pending.name) return false;
  if (navigationType !== "back_forward") return false;
  const elapsed = now - pending.at;
  return elapsed >= 0 && elapsed <= BOUNCE_WINDOW_MS;
}

/** A copy of `rejections` with `name` recorded as wrong for `query`. */
export function addRejection(rejections, query, name) {
  const key = normalize(query);
  if (!key || !name) return rejections;
  const existing = rejections[key] ?? [];
  if (existing.includes(name)) return rejections;
  return { ...rejections, [key]: [...existing, name] };
}

/** Site names this exact query has already been sent to and rejected. */
export function rejectedFor(rejections, query) {
  return new Set(rejections?.[normalize(query)] ?? []);
}

/**
 * How much a site can gain from being one you actually use.
 *
 * The catalog is a starting guess about everyone; this is the correction for
 * one person. A site you visit daily has to be able to outrank a globally
 * popular one you never touch, otherwise two letters stay ambiguous forever.
 */
export const MAX_VISIT_BONUS = 80;
const BONUS_PER_VISIT = 10;

/**
 * Visits after which a site is treated as demonstrated habit rather than a
 * guess. Three is enough to rule out a slip, few enough that a site you use
 * becomes instant within a day or two.
 */
export const TRUST_AFTER_VISITS = 3;

/**
 * Sites this person has gone to often enough that ambiguity is settled by
 * evidence rather than by scoring.
 */
export function trustedSites(visits, threshold = TRUST_AFTER_VISITS) {
  return new Set(
    Object.entries(visits ?? {})
      .filter(([, count]) => count >= threshold)
      .map(([name]) => name)
  );
}

/** A copy of `visits` with one more visit counted for `name`. */
export function recordVisit(visits, name) {
  if (!name) return visits;
  return { ...visits, [name]: (visits?.[name] ?? 0) + 1 };
}

/** The weight bonus a site has earned, capped so early habits cannot lock in. */
export function visitBonus(visits, name) {
  const count = visits?.[name] ?? 0;
  return Math.min(count * BONUS_PER_VISIT, MAX_VISIT_BONUS);
}

/**
 * The catalog re-weighted around what this person actually opens.
 *
 * Returns a new array; the seed catalog is never mutated, so forgetting the
 * learned data restores the original behaviour exactly.
 */
export function applyVisits(sites, visits) {
  if (!visits || Object.keys(visits).length === 0) return sites;
  return sites.map((site) => {
    const bonus = visitBonus(visits, site.name);
    return bonus > 0 ? { ...site, weight: site.weight + bonus } : site;
  });
}

/** How many distinct sites this person has actually been sent to. */
export function learnedCount(visits) {
  return Object.keys(visits ?? {}).length;
}

/** A copy with every rejection for `query` forgotten. */
export function clearRejections(rejections, query) {
  const key = normalize(query);
  if (!(key in (rejections ?? {}))) return rejections;
  const { [key]: _dropped, ...rest } = rejections;
  return rest;
}

/** How this page load happened, as the browser reports it. */
export function navigationType(performanceEntries) {
  return performanceEntries?.[0]?.type ?? null;
}

function normalize(text) {
  return (text || "").trim().toLowerCase();
}
