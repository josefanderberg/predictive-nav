# PreNav

A Chrome extension that replaces the New Tab page with a bar that navigates
**before you press Enter**.

Type `blo` — it goes to blocket.se. Type `in` — it goes to Instagram. No clicking,
no Enter, no search results to scroll through.

**[Try the demo or install it →](https://josefanderberg.github.io/predictive-nav/)**

---

## What it does

- **Site match** — `blo` → blocket.se. Catalog of 220+ sites, weighted for Swedish users.
- **URL** — `hemnet.se` goes there directly.
- **Search** — no match? Runs a Google search.
- **Ambiguous** — multiple close matches? Shows a list and waits for you to choose.

## Safety valves

Wrong guesses are cheap to undo:

- Only fires when the top candidate is clearly ahead (≥ 75% of score, ≥ 1.5× the runner-up)
- Start with a space to pause auto-navigation — still shows predictions, but waits for Enter or a click
- On arrival: a 5-second overlay shows runners-up and a search row, so landing on the wrong site is one click to fix

## Inside the sites

On catalog sites, PreNav also reads the site's own autocomplete and activates the
top suggestion. Type `mac` on Foodora → McDonald's opens. Type `mac` on Elgiganten
→ MacBook results open. It never runs on banks, health services, government sites,
payment pages, or checkout paths.

## Install (2 minutes, no store)

1. [Download the zip](https://github.com/josefanderberg/predictive-nav/releases/latest/download/predictive-nav-extension.zip) and unzip it — you get an `extension/` folder
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top right) — the load button is hidden until you do
4. Click **Load unpacked** and select the `extension/` folder

Open a new tab and type `blo`. Also works in Edge, Brave, and Vivaldi.

## Development

```bash
node tools/serve.mjs           # local dev server (no stale module cache)
node --test test/*.test.mjs    # run all tests
node tools/build-manifest.mjs  # regenerate manifest after adding sites
```

The extension has no build step and no framework dependencies. Edit the files,
hit ↻ on the extension card in `chrome://extensions`, reload the tab.

## Privacy

No data leaves the browser. Favicons are fetched from each site's own origin.
No analytics, no tracking service, no external API calls.
