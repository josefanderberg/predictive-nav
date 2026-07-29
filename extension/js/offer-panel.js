/**
 * The second-chance panel.
 *
 * Shared by two callers so they can never drift apart:
 *   - js/content.js  renders it on the real destination page
 *   - js/main.js     renders it on the demo page, where navigation is only
 *                    simulated and there is no destination to land on
 *
 * Favicons are loaded from each site's own origin, so seeing this panel does
 * not tell any third party where you went. Sites without one fall back to a
 * letter tile.
 */
export const DEFAULT_VISIBLE_MS = 5000;

const ACCENT = "#4f8cff";
const SURFACE = "#1a1e26";
const TEXT = "#e8eaf0";
const TEXT_DIM = "#8a90a0";

/**
 * Render the panel and return a handle. `onPick(row)` receives the chosen row;
 * the caller decides what navigating means (real assign vs. demo banner).
 */
export function renderOfferPanel({
  rows,
  title = "Meant something else?",
  visibleMs = DEFAULT_VISIBLE_MS,
  onPick,
  container = document.documentElement,
}) {
  const panel = element("div", {
    position: "fixed",
    "z-index": "2147483647",
    top: "16px",
    left: "50%",
    translate: "-50% 0",
    width: "min(380px, calc(100vw - 32px))",
    padding: "12px",
    "border-radius": "14px",
    background: SURFACE,
    color: TEXT,
    font: "14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "box-shadow": "0 8px 32px rgb(0 0 0 / .4)",
    "text-align": "left",
  });
  panel.dataset.predictiveNavPanel = "true";

  panel.append(
    element(
      "div",
      { "font-size": "12px", color: TEXT_DIM, padding: "2px 6px 8px" },
      `${title} · ${Math.round(visibleMs / 1000)}s`
    ),
    ...rows.map((row) => buildRow(row, onPick)),
    progressBar(visibleMs)
  );

  container.appendChild(panel);

  const dismiss = () => panel.remove();
  const timer = setTimeout(dismiss, visibleMs);
  const onKey = (event) => {
    if (event.key !== "Escape") return;
    clearTimeout(timer);
    dismiss();
    document.removeEventListener("keydown", onKey);
  };
  document.addEventListener("keydown", onKey);

  return { dismiss, element: panel };
}

function buildRow(row, onPick) {
  const el = element("div", {
    display: "flex",
    "align-items": "center",
    gap: "10px",
    padding: "8px 6px",
    "border-radius": "8px",
    cursor: "pointer",
  });
  el.addEventListener("mouseenter", () => (el.style.background = "rgb(79 140 255 / .18)"));
  el.addEventListener("mouseleave", () => (el.style.background = "transparent"));
  el.addEventListener("click", () => onPick(row));
  el.append(icon(row), label(row.label));
  return el;
}

function icon(row) {
  if (!row.host) return glyph(row.label[0]?.toUpperCase() ?? "?");
  const img = document.createElement("img");
  img.width = 20;
  img.height = 20;
  img.alt = "";
  img.style.cssText = "border-radius:4px;flex:none";
  img.referrerPolicy = "no-referrer";
  img.src = `https://${row.host}/favicon.ico`;
  img.addEventListener("error", () => img.replaceWith(glyph(row.label[0]?.toUpperCase() ?? "?")), {
    once: true,
  });
  return img;
}

function glyph(char) {
  return element(
    "div",
    {
      width: "20px",
      height: "20px",
      flex: "none",
      "border-radius": "4px",
      background: ACCENT,
      color: "#fff",
      display: "grid",
      "place-items": "center",
      "font-size": "12px",
      "font-weight": "600",
    },
    char
  );
}

function label(text) {
  return element(
    "div",
    { overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" },
    text
  );
}

function progressBar(visibleMs) {
  const track = element("div", {
    height: "3px",
    "margin-top": "6px",
    background: "rgb(255 255 255 / .12)",
    "border-radius": "2px",
    overflow: "hidden",
  });
  const fill = element("div", {
    height: "100%",
    width: "100%",
    background: ACCENT,
    transition: `width ${visibleMs}ms linear`,
  });
  track.appendChild(fill);
  requestAnimationFrame(() => (fill.style.width = "0%"));
  return track;
}

function element(tag, styles, text) {
  const el = document.createElement(tag);
  el.style.cssText = Object.entries(styles)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  if (text) el.textContent = text;
  return el;
}
