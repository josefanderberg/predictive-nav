/**
 * Bundles the content script.
 *
 * js/content.js used to pull its modules in with dynamic import() at runtime.
 * That is evaluated against the HOST PAGE's content security policy, and any
 * site with a strict script-src blocks it — so on exactly the big, careful
 * sites you would want this on, the whole script died before rendering
 * anything, silently and with nothing in the page console to explain it.
 *
 * Concatenating the modules into one plain script sidesteps CSP entirely:
 * Chrome injects declared content scripts into the isolated world without
 * consulting the page. The modules stay the single source of truth — they are
 * still imported normally by the new tab page and by the tests.
 *
 *   node tools/build-content.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "extension", "js");
const OUT = join(SRC, "content.bundle.js");

/** Order matters: dependencies first, entry point last. */
const MODULES = ["domain.js", "site-search.js", "switcher.js", "offer-panel.js", "content.js"];

/**
 * Strip module syntax so the files can share one scope.
 * Deliberately narrow: it only removes `export ` prefixes and whole-line
 * imports of our own relative modules. Anything else it leaves alone and the
 * check below will catch.
 */
function toPlainScript(source) {
  return source
    .replace(/^import\s+[^;]*?\s+from\s+["']\.\/[^"']+["'];?\s*$/gm, "")
    .replace(/^export\s+(?=(const|function|class|let|var)\b)/gm, "");
}

const parts = MODULES.map((name) => {
  const plain = toPlainScript(readFileSync(join(SRC, name), "utf8"));
  const leftover = plain.match(/^\s*(import|export)\b.*$/m);
  if (leftover) {
    console.error(`${name}: unhandled module syntax -> ${leftover[0].trim()}`);
    process.exit(1);
  }
  return `// ---- ${name} ----\n${plain.trim()}\n`;
});

const bundle = `/**
 * GENERATED — do not edit. Run: node tools/build-content.mjs
 *
 * Concatenation of ${MODULES.join(", ")} as one plain script, so the host
 * page's CSP cannot block it the way a runtime import() would.
 */
(() => {
${parts.join("\n")}
})();
`;

writeFileSync(OUT, bundle);

const duplicates = [...bundle.matchAll(/^(?:const|function)\s+([A-Za-z_$][\w$]*)/gm)]
  .map((m) => m[1])
  .reduce((counts, name) => counts.set(name, (counts.get(name) ?? 0) + 1), new Map());
const clashes = [...duplicates].filter(([, n]) => n > 1).map(([name]) => name);
if (clashes.length > 0) {
  console.error(`Top-level name collisions between modules: ${clashes.join(", ")}`);
  process.exit(1);
}

console.log(`content.bundle.js written from ${MODULES.length} modules (${bundle.length} bytes)`);
