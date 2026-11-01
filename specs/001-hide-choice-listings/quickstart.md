# Quickstart & Validation Guide: Hide Choice & Brand+ Listings

How to set up, build, install, and **check that the feature works** against the spec's success
criteria. For design details see [plan.md](./plan.md), [data-model.md](./data-model.md), and
[contracts/](./contracts/).

## Prerequisites

- Node.js **24 LTS** (`nvm use` reads `.nvmrc`) and npm.
- Desktop Chrome (or Edge or Brave) and desktop Firefox, both current stable.
- For a lasting Firefox install: a free addons.mozilla.org account and API keys (for unlisted
  signing), **or** Firefox Developer Edition / Nightly ([research R10](./research.md#r10-personal-use-installation-spec-installed-from-the-project-folder)).

## Setup and quality gates

```bash
npm ci
npm run lint          # ESLint: zero errors
npm run format:check  # Prettier: zero diffs
npm run typecheck     # tsc --noEmit: zero errors
npm test              # Vitest: unit + contract + component (incl. axe)
npm run test:e2e      # Playwright Chromium + unpacked extension + fixture-routed AliExpress
npm run test:perf     # Budgets in real Chromium, including a 500-card scroll trace
npm run build         # → dist/ (popup + content.js + content.css + manifest)
npm run size          # Bundle size budgets
npm run lint:ext      # web-ext lint on dist/
```

**Expected**: every command exits 0. `test:perf` prints measured values next to the budgets in
[plan.md § Performance Goals](./plan.md#technical-context).

## Install for personal use

**Chromium**: `chrome://extensions` → Developer mode → **Load unpacked** → choose `dist/`. After
rebuilding, click the reload ↻ icon on the extension card.

**Firefox (quick, temporary)**: `npx web-ext run --source-dir dist` (or `about:debugging` → This
Firefox → Load Temporary Add-on → `dist/manifest.json`). ⚠ Removed when Firefox restarts.

**Firefox (lasting)**: `npx web-ext sign --channel=unlisted --source-dir dist` (with AMO API key
and secret in the environment), then open the resulting `.xpi` in Firefox. Unlisted means not
published.

## Capturing fixtures (first implementation task, and whenever AliExpress changes)

1. In a desktop browser session, open each page type (a normal one is safest, but since
   2026-11-01 Playwright has also received real pages; keep automated visits few and spaced out): search, category, store, homepage, product page with "More to love", on
   `aliexpress.com` (English, EUR). Also capture a search page on `aliexpress.us` (English, USD),
   and on `pl.aliexpress.com` with Polish language and PLN currency (non-English, third currency).
   Make sure the search page includes the "Premium sponsored items" row.
2. Scroll to the bottom so every lazily rendered card exists. In DevTools, copy the `outerHTML`
   of the listing container, or use "Save page as… → Web page, complete".
3. **Sanitise** before committing: remove cookies and inline `<script>` blocks, session and
   tracking IDs (`data-session-id`, `eurl`, `data-spm*`, `p4p_pvid`), and any account name,
   address, or order data.
4. Save as `tests/fixtures/aliexpress/<page-type>-<region>.html`. An agent generates the matching
   `<name>.expected.json` from the HTML: it lists each card's product ID and badges, after inspecting
   every interface image on the cards, and strips third-party content from the HTML (rules in
   `tests/fixtures/aliexpress/README.md`).
5. Run `npm test`. The fixture contract test must classify 100% of cards as labelled.

## Validation scenarios

Automated scenarios run in `npm run test:e2e` on fixtures. The live checks are done by hand on
real AliExpress in **both** Chrome and Firefox (FR-020).

| # | Scenario | Steps | Expected | Covers |
|---|---|---|---|---|
| V1 | Default hiding | Fresh install → open AliExpress search "phone case" | No visible card has a Choice/Brand+ badge. Cards tagged "Ad", "11.11 Sale", or "Bundle deals" (without those badges) are visible. No gaps in the grid | US1, FR-001–004, FR-010, SC-005 |
| V2 | Lazy and later loads | Scroll to the bottom of the results, then go to page 2, then change sort, then apply a filter | Matching cards never appear, not even for one frame (record the screen and step through frames). No reload needed | FR-005, FR-006, SC-003 |
| V3 | Page-type and region sample | Visit ≥ 10 pages: search, category, store, homepage, product page recommendations, on `.com`, `.us`, and `pl.aliexpress.com` (Polish, PLN) | 100% of badged cards hidden, 0 unbadged cards hidden (compare with the extension off) | SC-001, SC-002, FR-007, FR-008 |
| V4 | Product page untouched | Open a Choice product's own page directly | Page shows normally. Only its recommendation cards are filtered | FR-009 |
| V5 | Toggle and count | Open the popup on a results page → note the count → switch off → switch on | Count shown. Cards reappear and disappear again within 1 s, without a reload | US2, FR-011, FR-012, SC-006 |
| V6 | Persistence | Switch hiding off → restart the browser → open AliExpress | Hiding still off (Firefox: needs a lasting install) | FR-014 |
| V7 | Not AliExpress | Open the popup on another site, and on `aliexpress.ru` | "NoChoice only works on AliExpress." The page is unchanged | US2-5, FR-018 |
| V8 | Per-badge | Turn Brand+ off only → load a page with both badges | Choice hidden, Brand+ visible. Kept after a restart | US3, FR-013 |
| V9 | All hidden | Search a term where every result is Choice (or use the `all-choice` fixture) | Notice with "Show hidden listings". Clicking it shows the cards, including ones loaded later by scrolling. Reloading or changing page hides them again. Popup settings unchanged | FR-015 |
| V10 | Fail-safe | Run E2E against the `unknown-markup` fixture (badge markup changed) | Nothing hidden | FR-016 |
| V11 | No network, no data | Automated in `test:e2e` (no fetch, XHR, WebSocket, or other non-extension requests; storage keys ⊆ `settings`). On the live site: DevTools Network panel, filtered to the extension's requests; check the storage contents | Zero requests made by the extension. Storage contains only the `settings` key | FR-017, SC-007 |
| V12 | Performance | `npm run test:perf`; by hand, scroll through about 500 listings on the homepage feed | Within budgets. No visible stutter | SC-004 |
| V13 | Accessibility | Use the popup and the notice with the keyboard only and with VoiceOver/NVDA | Everything works by keyboard, labels are announced, the count is announced politely. axe reports 0 violations | FR-019 |
