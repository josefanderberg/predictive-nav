/**
 * Merges the user's own most-visited sites (chrome.topSites) into the seed
 * list. This is the personalization layer: your own top 20 sites are far more
 * predictable than any global list.
 *
 * Safe to call outside an extension (plain demo page) — it just returns the
 * seed list unchanged when chrome.topSites is unavailable.
 */
import { SEED_SITES } from "./sites.js";

const TOP_SITE_BONUS = 40;

export async function loadSites() {
  const topSites = await fetchTopSites();
  if (topSites.length === 0) return SEED_SITES;

  const merged = new Map(SEED_SITES.map((site) => [site.name, { ...site }]));

  for (const { url } of topSites) {
    const name = siteNameFromUrl(url);
    if (!name) continue;
    const existing = merged.get(name);
    if (existing) {
      existing.weight += TOP_SITE_BONUS;
      existing.url = url; // prefer the variant the user actually visits
    } else {
      merged.set(name, { name, url, weight: TOP_SITE_BONUS });
    }
  }
  return [...merged.values()];
}

async function fetchTopSites() {
  if (typeof chrome === "undefined" || !chrome.topSites) return [];
  try {
    // Callback-style Chrome builds return undefined here rather than a
    // promise, so this must never be assumed to be an array.
    const sites = await chrome.topSites.get();
    return Array.isArray(sites) ? sites : [];
  } catch {
    return [];
  }
}

/** "https://www.amazon.se/deals" -> "amazon" */
function siteNameFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0].toLowerCase();
  } catch {
    return null;
  }
}
