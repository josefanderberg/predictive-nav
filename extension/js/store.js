/**
 * Where what the bar learns is kept.
 *
 * Two places can hold it, and the difference matters less than it looks:
 *
 *   extension — chrome.storage.local. Shared by every tab of the extension and
 *               survives reloads from chrome://extensions.
 *   browser   — localStorage. A plain web page is allowed this, scoped to the
 *               origin serving the page, so the hosted demo can remember your
 *               sites without anything installed.
 *
 * Only the parts that reach into *other* sites — the arrival overlay and the
 * in-site search pick — genuinely need the extension. Remembering what you
 * type never did, and assuming otherwise left the hosted page unable to learn
 * for no reason.
 *
 * localStorage is synchronous, which also removes the write-then-navigate race
 * that extension storage has: there is nothing pending when the page unloads.
 */

const PREFIX = "predictive-nav:";

/** A store for this context, or a no-op one if nothing may be written. */
export function openStore() {
  return extensionStore() ?? browserStore() ?? nullStore();
}

function extensionStore() {
  const area = globalThis.chrome?.storage?.local;
  if (!area) return null;
  return {
    kind: "extension",
    async get(keys) {
      return (await area.get(keys)) ?? {};
    },
    async set(values) {
      await area.set(values);
    },
    async remove(key) {
      await area.remove(key);
    },
  };
}

function browserStore() {
  let storage;
  try {
    // Private windows and blocked-cookie settings expose localStorage but
    // throw on use, so it has to be exercised rather than merely detected.
    storage = globalThis.localStorage;
    const probe = `${PREFIX}probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
  } catch {
    return null;
  }

  return {
    kind: "browser",
    async get(keys) {
      const wanted = Array.isArray(keys) ? keys : [keys];
      const out = {};
      for (const key of wanted) {
        const raw = storage.getItem(PREFIX + key);
        if (raw === null) continue;
        try {
          out[key] = JSON.parse(raw);
        } catch {
          storage.removeItem(PREFIX + key); // corrupt entry, not worth keeping
        }
      }
      return out;
    },
    async set(values) {
      for (const [key, value] of Object.entries(values)) {
        storage.setItem(PREFIX + key, JSON.stringify(value));
      }
    },
    async remove(key) {
      storage.removeItem(PREFIX + key);
    },
  };
}

function nullStore() {
  return {
    kind: "none",
    async get() {
      return {};
    },
    async set() {},
    async remove() {},
  };
}
