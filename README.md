# Predictive Nav

A Chrome extension that replaces the New Tab page with a search bar that
**navigates before you press Enter**.

Every keystroke resolves your input to exactly one of four intents:

| You type | Intent | What happens |
| --- | --- | --- |
| `blo` | **site** | 157-site catalog matches `blocket` → goes to blocket.se |
| `hemnet.se` | **url** | recognised as an address → goes there directly |
| `teknik` | **lucky** | no site matches → jumps to the first *organic* search result, past the ads |
| `sv` | *ambiguous* | four sites match → shows a clickable list, navigates nowhere |

Regional by locale: a Swedish browser gets `amazon.se`, a German one
`amazon.de`. The catalog is weighted for a Swedish user (Blocket, Hemnet,
Swedbank, Skatteverket, SVT Play, 1177 …) alongside the global sites.

## Inside the sites: two more steps

**Search auto-pick.** On sites from the catalog, typing in the site's own
search box auto-activates the site's own top suggestion: type "mac" on
Foodora and it opens McDonald's; on Elgiganten it opens the "macbook"
results. We never guess what "mac" means — the site's autocomplete already
knows; we just read the `role="listbox"` / `role="option"` markup it renders
(walking open shadow DOM — verified live on foodora.se and elgiganten.se) and
click the top row when it clearly matches what you typed. A visible countdown
badge shows first; Escape cancels; typing more re-evaluates.

**Second-chance panel.** When the new-tab bar auto-navigates on a guess, the
destination page shows a small top-center panel for 5 seconds with the
runners-up (with favicons, loaded from each site's own origin — no tracking
service) plus a final "search the web" row. Land on LinkedIn when you meant
Lidl and the fix is one click, not a back-button round trip.

**Where this never runs:** banks, government, health, payment services, and
any checkout/login path — 18 sensitive hosts in the catalog are deliberately
excluded from the content script (`tools/build-manifest.mjs` enforces this),
and the script exits on sensitive paths elsewhere. Auto-activating controls
on a bank is not a feature.

## Why the New Tab page and not the address bar?

No browser allows an extension to auto-commit the native address bar — the
omnibox APIs deliberately require the user to press Enter. Replacing the New
Tab page is the closest sanctioned surface where an extension fully controls
every keystroke.

## Why DuckDuckGo for the "first result" jump?

Verified 2026-07:

- **DuckDuckGo** — the `\` operator redirects server-side straight to the
  first organic result. Clean, no interstitial. `\teknik` → `nyteknik.se`.
- **Google** — `&btnI=1` still resolves a result, but Google now parks you on
  a *"redirect notice"* page that needs a manual click, so it saves no
  keypress at all.

Google remains available in `js/lucky.js`; switch with the `PROVIDER` constant
in `js/main.js`.

## Safety valves

Auto-navigation only fires when the guess is *unambiguous*:

- at least 2 characters typed
- top candidate holds ≥ 75 % of all matched score
- top candidate outscores the runner-up ≥ 1.5×
- an exactly typed name beats longer names containing it (`svt` ≠ `svtplay`)
- typing silence: **450 ms** for a known site, **900 ms** for a search
  fallback (riskier, so you get more room to keep typing)
- start the input with a space and nothing fires on its own — predictions
  still appear, but only `Enter` or a click decides (`Esc` still cancels a
  pending countdown)
- set `AUTO_LUCKY = false` in `js/main.js` to require Enter for searches while
  keeping instant navigation for known sites

## Project layout

```
extension/
  manifest.json        MV3 manifest (generated matches — see tools/)
  newtab.html          the page Chrome shows on every new tab
  css/newtab.css       styling, suggestion list, commit progress ring
  js/sites.js          160+ site catalog + regional URL resolution
  js/predictor.js      pure ranking/confidence engine (no DOM — unit-tested)
  js/lucky.js          search providers + address detection (unit-tested)
  js/site-search.js    reads a site's own autocomplete safely (unit-tested)
  js/switcher.js       second-chance offer logic (unit-tested)
  js/user-sites.js     merges chrome.topSites for personalization
  js/main.js           intent resolution, commit timers, Esc/Enter handling
  js/content.js        in-site behavior: auto-pick + second-chance panel
tools/
  build-manifest.mjs   regenerates manifest matches from the catalog
test/
  predictor.test.mjs   ranking, thresholds, catalog integrity
  lucky.test.mjs       provider URLs, address detection
  site-search.test.mjs suggestion reading incl. shadow DOM, sensitive-site rules
  switcher.test.mjs    offer building, expiry, host matching
```

## Install in Chrome (2 minutes, no store, no server)

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top right) — the load button is hidden until you do
3. Click **Load unpacked** and select the `extension/` folder, or simply
   **drag the folder onto the page**
4. Open a new tab and type `blo`

Already installed? After editing files, click the **↻ reload** icon on the
extension's card to pick up changes.

Works the same in Edge/Brave/Vivaldi (`edge://extensions`, etc.).
Firefox needs a slightly different manifest; Safari needs an Xcode wrapper.

## Try it without installing anything

The page also runs as a plain website. Demo mode simulates navigation with a
banner instead of leaving the page:

```bash
node tools/serve.mjs
```

Then open `http://localhost:4173/newtab.html?demo=1` (simulated) or
`http://localhost:4173/newtab.html` (actually navigates).

Use this rather than `python3 -m http.server`: that one sends no cache
headers, so Chrome keeps serving stale ES modules after an edit and the page
silently behaves like older code — or stops responding entirely, with nothing
in the console to explain it. `tools/serve.mjs` sends `Cache-Control:
no-store`, so a plain reload always gets the current files.

`Address already in use` means a server is already running on that port — just
open the URL. To restart one: `kill $(lsof -ti:4173)` first. A server started
in the foreground holds the terminal until you press Ctrl+C; append ` &` to
run it in the background.

## Run the tests

```bash
node --test test/predictor.test.mjs test/lucky.test.mjs test/site-search.test.mjs test/switcher.test.mjs
```

After adding sites to the catalog, regenerate the manifest's match list:

```bash
node tools/build-manifest.mjs
```

## Tuning

- Site catalog and weights: `js/sites.js` — plain data, edit freely
- Confidence thresholds: `DEFAULTS` in `js/predictor.js`
- Commit delays and search provider: constants at the top of `js/main.js`
