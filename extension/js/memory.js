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
