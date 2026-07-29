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
export function registrableDomain(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  const labels = host.split(".");
  if (labels.length <= 2) return host;

  const lastTwo = labels.slice(-2).join(".");
  return MULTI_PART_SUFFIXES.has(lastTwo)
    ? labels.slice(-3).join(".")
    : lastTwo;
}

/** The registrable domain of a URL, or null when it cannot be parsed. */
export function domainOf(url) {
  try {
    return registrableDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

/** True when both URLs belong to the same registrable domain. */
export function sameDomain(a, b) {
  const left = domainOf(a);
  return left !== null && left === domainOf(b);
}
