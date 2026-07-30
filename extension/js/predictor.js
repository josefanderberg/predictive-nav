/**
 * Pure prediction engine. No DOM, no chrome.* APIs — fully unit-testable.
 *
 * Given a typed prefix and a site list, it ranks candidates and decides
 * whether the top match is unambiguous enough to auto-commit.
 */

export const DEFAULTS = {
  /** Don't auto-commit before this many typed characters. */
  minLength: 2,
  /** Top candidate must own at least this share of all matched weight. */
  minConfidence: 0.75,
  /** Top candidate must outweigh the runner-up by this factor. */
  minMargin: 1.5,
  /** Site names to drop before ranking — see memory.js. */
  exclude: new Set(),
};

/**
 * Rank all sites whose name starts with the typed prefix.
 * Returns candidates sorted by score (descending).
 */
export function rankCandidates(input, sites, exclude = new Set()) {
  const prefix = normalize(input);
  if (!prefix) return [];

  return sites
    .filter((site) => site.name.startsWith(prefix) && !exclude.has(site.name))
    .map((site) => ({ site, score: score(site, prefix) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Decide what to do for the current input.
 *
 * Returns:
 *   { kind: "none" }                                    – nothing matches
 *   { kind: "suggest", site, candidates, confidence }   – show, don't commit
 *   { kind: "commit",  site, candidates, confidence }   – confident: navigate
 */
export function predict(input, sites, options = {}) {
  const { minLength, minConfidence, minMargin, exclude } = { ...DEFAULTS, ...options };
  // Sites this exact query was already sent to and turned back from are gone,
  // not merely demoted: a guess the user has actively rejected should not be
  // the answer again, however far ahead it scores.
  const candidates = rankCandidates(input, sites, exclude);
  if (candidates.length === 0) return { kind: "none" };

  const [top, runnerUp] = candidates;
  const totalScore = candidates.reduce((sum, c) => sum + c.score, 0);
  const confidence = top.score / totalScore;
  const margin = runnerUp ? top.score / runnerUp.score : Infinity;

  const confident =
    normalize(input).length >= minLength &&
    confidence >= minConfidence &&
    margin >= minMargin;

  return {
    kind: confident ? "commit" : "suggest",
    site: top.site,
    candidates,
    confidence,
  };
}

/**
 * Longer prefixes matched against shorter names are stronger signals.
 * An exactly typed name must beat sites it merely prefixes ("svt" vs "svtplay").
 */
function score(site, prefix) {
  const completionRatio = prefix.length / site.name.length;
  const exactBonus = prefix === site.name ? 2 : 1;
  return site.weight * (1 + completionRatio) * exactBonus;
}

function normalize(input) {
  return input.trim().toLowerCase();
}
