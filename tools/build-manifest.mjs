/**
 * Regenerates the content-script match patterns in manifest.json from the site
 * catalog, so the catalog stays the single source of truth.
 *
 * The content script needs to run wherever we might auto-navigate, because the
 * second-chance panel is shown on the destination. Sensitive hosts are dropped:
 * we never want an injected script on a bank or a government service.
 *
 *   node tools/build-manifest.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SEED_SITES } from "../extension/js/sites.js";
import { isSensitiveLocation } from "../extension/js/site-search.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "extension", "manifest.json");

const hosts = new Set();
for (const site of SEED_SITES) {
  for (const url of [site.url, ...Object.values(site.regional ?? {})]) {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (isSensitiveLocation({ hostname, pathname: "/" })) continue;
    hosts.add(hostname);
  }
}

const matches = [...hosts].sort().map((host) => `https://*.${host}/*`);

/** Every module content.js pulls in dynamically must be reachable from the page. */
const SHARED_MODULES = ["js/site-search.js", "js/switcher.js", "js/offer-panel.js"];

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.content_scripts[0].matches = matches;
manifest.web_accessible_resources[0].resources = SHARED_MODULES;
manifest.web_accessible_resources[0].matches = matches;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const skipped = new Set();
for (const site of SEED_SITES) {
  const hostname = new URL(site.url).hostname.replace(/^www\./, "");
  if (isSensitiveLocation({ hostname, pathname: "/" })) skipped.add(hostname);
}
console.log(`${matches.length} match patterns written to manifest.json`);
console.log(`${skipped.size} sensitive hosts deliberately skipped: ${[...skipped].sort().join(", ")}`);
