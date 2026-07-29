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
import { registrableDomain } from "../extension/js/domain.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "extension", "manifest.json");

// Patterns are built from the registrable domain, not the exact host. A seed
// entry on a subdomain (www2.hm.com, open.spotify.com) would otherwise emit a
// pattern that misses its own siblings — so landing on www.hm.com after a
// redirect, or on the variant the user actually visits, would get no content
// script and no overlay, silently.
const hosts = new Set();
for (const site of SEED_SITES) {
  for (const url of [site.url, ...Object.values(site.regional ?? {})]) {
    const hostname = new URL(url).hostname;
    if (isSensitiveLocation({ hostname, pathname: "/" })) continue;
    hosts.add(registrableDomain(hostname));
  }
}

const matches = [...hosts].sort().map((host) => `https://*.${host}/*`);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.content_scripts[0].matches = matches;
manifest.content_scripts[0].js = ["js/content.bundle.js"];
// Nothing is fetched at runtime any more — the bundle carries its modules —
// so the extension exposes no resources to pages at all.
delete manifest.web_accessible_resources;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const skipped = new Set();
for (const site of SEED_SITES) {
  const hostname = new URL(site.url).hostname.replace(/^www\./, "");
  if (isSensitiveLocation({ hostname, pathname: "/" })) skipped.add(hostname);
}
console.log(`${matches.length} match patterns written to manifest.json`);
console.log(`${skipped.size} sensitive hosts deliberately skipped: ${[...skipped].sort().join(", ")}`);
