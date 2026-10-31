# Phase 0 Research: Hide Choice & Brand+ Listings on AliExpress

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-31

Each topic records the **Decision**, the **Rationale**, and the **Alternatives considered**.
User-mandated choices (React + Vite, ESLint + Prettier, TypeScript, atomic design, SCSS) are
recorded as decisions. Research covers *how* to apply them to a browser extension, not *whether*
to use them.

---

## R1. Is a backend needed? If so, .NET or Node.js?

**Decision**: **No backend.** Node.js (24 LTS) is used only as the **build and test toolchain**
(Vite, Vitest, Playwright, ESLint). It is not used as a server.

**Rationale**:

- The spec rules out a server: "no sign-in, sync, or server component" (Assumptions). The
  extension may not collect or send data (FR-017) and must make no outgoing network requests of
  its own (SC-007). A backend would have nothing to do, and calling one would break SC-007.
- Everything the feature needs runs in the browser: detecting badges (content script), settings
  (`storage.local`), and the toolbar control (popup).
- Node.js has to be installed anyway, because Vite, Vitest, and Playwright run on it, so it adds
  nothing.

**If a backend is ever needed** (for example a future, opt-in settings sync or a remotely updated
list of badge signatures): prefer **Node.js + TypeScript** over .NET. It would share the
`Settings` and message types with the extension, with one language, one toolchain, and one CI
pipeline. .NET's strengths (raw throughput, a mature enterprise stack) matter little for a tiny
personal-use service, and they would add a second language, SDK, and test stack (Principle II).
Revisit only if the backend's needs grow far beyond the extension's.

**Alternatives considered**:

- *ASP.NET Core minimal API*: rejected. There are no server requirements, and it would add a
  second language and toolchain.
- *Node.js server (Fastify/Hono)*: rejected for v1 because no requirement needs it. This is the
  preferred option if one is ever required.
- *Serverless function for remote badge signatures*: rejected. It breaks SC-007 and FR-017, and
  signature updates ship fine with the extension itself.

---

## R2. Can the product listing use infinite scrolling, so each page doesn't end up with a random number of products?

**Context (verified on the live site, 2026-10-31)**: Desktop AliExpress search
(`/w/wholesale-<query>.html`) uses **numbered pagination** (`comet-pagination`; "phone case"
showed pages 1–60). It does not use infinite scroll. Each page holds about 60 products. The grid
renders them **lazily** as the shopper scrolls: only the first few cards are in the DOM at load,
and the rest arrive as the page scrolls. All 60 are embedded in the page as JSON
(`itemList.content`). An automated browser triggered AliExpress's **baxia anti-bot system**, which
suppressed the organic results and showed only sponsored cards. The page also offers a "Choice"
**include** filter, but no **exclude** filter.

So the concern is real. If 40% of a page is Choice/Brand+, the shopper sees about 36 cards
instead of 60, and the number changes from page to page.

**Decision**: **v1 does not add infinite scrolling.** It keeps AliExpress's own pagination and
lets the remaining listings close up (FR-004). The count in the toolbar control (FR-012) and the
"all hidden" notice (FR-015) tell the shopper what happened. Infinite scrolling ("fill the page
up from the next results page") is recorded as a **candidate follow-up feature**. It would need
its own spec, because it conflicts with this spec in the ways listed below.

**Rationale**: the only ways to keep a page full are to fetch more results, or to navigate for the
shopper. Each has a hard problem:

| Option | How it would work | Why it is not in v1 |
|---|---|---|
| **A. Fetch and render more results** (true infinite scroll) | When the shopper nears the end of the grid, the content script fetches page N+1 (its HTML, or the `itemList` JSON), filters out Choice/Brand+, and adds cards to the grid. | **Breaks SC-007** (the extension would make its own network requests). Automated fetching of search pages **triggers baxia anti-bot captchas and IP throttling**, as seen during this research. The extension would have to **rebuild AliExpress's card markup** (price, currency, shipping, ratings, tracking links) from internal JSON. That breaks whenever AliExpress changes it, and the cards might look different from AliExpress's own. It also adds a lot of complexity (Principle II). |
| **B. Auto-advance to the next page** | When the shopper reaches the bottom of page N, the extension follows AliExpress's own "next page" link. | Still a full page load, so it is not continuous scrolling. It moves the shopper without asking (Principle IV), and the back button and scroll position behave in surprising ways. It also ties in with the FR-015 reset rules (a new page number resets the reveal). |
| **C. Hidden iframe that preloads the next page** | Load page N+1 in an invisible iframe, move its non-Choice cards over. | Has all the problems of option A. AliExpress may also refuse to load in a frame, and it doubles memory use and network load. |
| **D. Keep native pagination (chosen)** | Hide in place and let the grid reflow. Show the count in the popup, and the notice when a page is empty. | Meets every FR/SC. No network activity, no copied UI, and it fails safe. |

**What would make infinite scroll feasible later**: (1) a spec amendment that allows extension
requests to AliExpress's own origin, only when the shopper triggers them; (2) a design that
**clones real AliExpress card nodes** from fetched HTML instead of rebuilding cards from JSON; and
(3) rate limiting plus captcha detection, with a fallback to normal pagination. This is a
standalone feature that builds on v1's badge detection. v1's design does not block it: detection
is a pure function over a card element, so it works the same on fetched cards.

**What v1 does about the uneven count**: the popup shows "*N* hidden on this page", so the shopper
knows why a page looks short. Because the grid lazy-renders while scrolling, hiding happens as
cards arrive, so there are no empty slots and no sudden layout jumps.

**Alternatives considered**: A, B, and C above. Also *pressing AliExpress's own "Choice" filter in
reverse*: not possible, because there is no exclude option.

---

## R3. Extension platform: Manifest version and cross-browser APIs

**Decision**: **Manifest V3**, one `manifest.json` for Chromium and Firefox, using the
**`chrome.*` namespace** with promise-based calls. **No background script.**

**Rationale**:

- MV3 is required by Chrome and supported by Firefox (109+) and Safari, so the Safari path stays
  open (spec Assumptions).
- Firefox MV3 supports `chrome.*` with promises, so no `webextension-polyfill` is needed.
- **No background/service worker**: the popup writes settings to `chrome.storage.local`, content
  scripts react through `chrome.storage.onChanged`, and the popup talks to the active tab's
  content script directly (`chrome.tabs.connect`). This also avoids the one real MV3 difference
  between the browsers: Firefox does not support `background.service_worker` and needs
  `background.scripts` instead ([MDN](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background),
  [Mozilla blog](https://blog.mozilla.org/addons/?p=9142)).
- Firefox needs `browser_specific_settings.gecko.id` (for signing and stable storage). It also
  needs `gecko.data_collection_permissions: { required: ["none"] }`, which Mozilla requires of new
  extensions it signs (unlisted ones included), and which states FR-017 in the manifest. Check the
  exact key against current MDN at implementation time; `web-ext lint` must accept it. Chrome
  ignores the whole `browser_specific_settings` key with a harmless "unrecognized manifest key"
  warning. One manifest is simpler
  than generating one per browser.

**Permissions** (smallest possible set, store-ready):
`"permissions": ["storage"]`, plus `host_permissions` and `content_scripts.matches` for
`*://*.aliexpress.com/*` and `*://*.aliexpress.us/*` (the `*.` form also covers the bare domain
and every country subdomain such as `es.aliexpress.com`). `aliexpress.ru` is deliberately left out
(spec FR-007/FR-018): it is run separately with its own markup, so the extension asks for no access
there.
`host_permissions` repeats the match patterns so that (a) Firefox MV3 grants the content script
access at install, and (b) the popup can read the active tab's URL to tell "not AliExpress" apart
from "AliExpress, but the page was opened before installing". No `tabs`, `activeTab`,
`scripting`, or `webRequest`.

**Alternatives considered**: MV2 (deprecated in Chrome, rejected). A background service worker that
relays messages (an unneeded layer, and different between browsers; rejected).
`webextension-polyfill` (not needed in MV3; rejected).

---

## R4. Detecting and hiding listings without a flash (FR-006, FR-016, SC-003)

**Decision**: a **content script at `document_start`** with three parts:

1. **Classify, don't hide.** A single `MutationObserver` on `document.documentElement`
   (`childList`, `subtree`, plus `attributes` filtered to `src`, for lazily swapped badge images)
   runs `classifyListing(card)` on cards that were added or changed. Each card gets
   `data-nochoice-badges="choice brand-plus"` (or an empty value) based only on its markup.
   **Settings never affect classification.**
2. **Hide with CSS that is keyed off the root element.** A stylesheet injected by the manifest
   (`content_scripts.css`, which applies before the first paint) contains rules such as
   `html[data-nochoice-hide~="choice"] [data-nochoice-badges~="choice"] { display: none !important; }`.
   Settings only change one attribute on `<html>`. Switching hiding off or on, changing one badge,
   or revealing a page is **O(1)** and visible in the next frame (FR-011: well under 1 s).
3. **Timing.** MutationObserver callbacks run as microtasks after a DOM change and **before the
   browser's next render**, so a card is marked before it is ever painted (FR-006). `display:none`
   on the grid item lets CSS grid or flex layout close the gap (FR-004).

**Fail-safe (FR-016)**: a card is marked as a badge type only when a **known badge signature**
matches exactly (see R5). Unknown markup leads to no mark, so the card stays visible. Cards are
found by walking up from a matched badge node to the **nearest grid item inside a known listing
container**. If no such container is found, nothing is hidden. This also protects product detail
pages (FR-009), because the main product is never a grid item in a listing container.

**Settings load race**: `storage.local.get` is asynchronous. `<html>` starts with the **default
settings** (hide both, FR-010) and is corrected once storage resolves, usually in a few
milliseconds, before the results render. The only possible glitch is that a shopper who has
hiding turned *off* may briefly see cards hidden. That is a brief absence, never a flash of
unwanted listings.

**Navigation without reload (FR-005, FR-015)**: AliExpress changes results in place for filter,
sort, and page changes. The observer callback compares `location.href` (minus `#hash`) with the
last value it saw. When it changes, the per-page reveal resets and the hidden count is recomputed.
This needs no hook into the page's history API, which an isolated world cannot reach reliably.

**Alternatives considered**:

- *CSS `:has()` alone* (`card:has(img[src*=…]) {display:none}`): flash-free and simple, but it
  cannot count hidden cards (FR-012) or drive the notice (FR-015), and signature logic in CSS is
  hard to unit test. Kept in mind as a possible perf optimisation only if measurement shows a need.
- *Inline `style.display = 'none'` per card*: switching settings would then touch every card
  (O(n)), and it fights AliExpress's own inline styles. Rejected.
- *Polling or `setInterval`*: can flash, and wastes CPU. Rejected.

---

## R5. Badge signatures (how a "Choice" or "Brand+" badge is recognised)

**Decision**: badge recognition is a **data-driven signature table** (`badgeSignatures.ts`). The
**first implementation task captures real fixtures** (see quickstart § "Capturing fixtures").
Signatures use **locale-independent signals**, in order of preference:

1. The badge `<img>` **asset ID** in its `src` (for example
   `…/kf/S<hash>.png`). The "Choice" and "Brand+" logos are images, so they are the same in every
   language and currency (spec Assumptions, FR-007).
2. Stable structural markers next to the title, if AliExpress renders the badge as styled markup
   instead of an image.

Text matching (e.g. `"Choice"`) is used **only** as a supporting signal together with a
structural one, never alone, so a product titled "Choice of colours" is never hidden (FR-003).

**Why fixtures can't be captured automatically**: during research, the automated browser was
served a reduced page (anti-bot) with only 5 sponsored cards and no organic results. Fixtures must
come from a normal desktop browser session, saved with "Save page as… (complete)", or by copying
`outerHTML` of the results grid in DevTools, then stripped of personal data (see the sanitising
checklist in quickstart). This is also the procedure to follow whenever AliExpress changes its
markup. It is expected maintenance (spec Assumptions).

**Required fixture set** (feeds SC-001/SC-002): search results, category page, store page,
homepage feed, product page "More to love"/"Related items", and three regional variants that
together cover **two languages and three currencies**: `aliexpress.com` (English, EUR),
`aliexpress.us` (English, USD), and `pl.aliexpress.com` (Polish, PLN). The non-English fixture
shows that the signatures really are locale-independent (FR-007). `aliexpress.ru` is out of scope
and needs no fixture.

**Alternatives considered**: hard-coded selectors spread through the code (brittle, and every
markup change would mean code changes; rejected). Matching on AliExpress's hashed CSS-module class
names such as `cards2023--sale328--OeEGppz` (these change with every AliExpress build; avoid, or
use only the stable prefix together with another signal).

---

## R6. Build tooling: Vite for an extension

**Decision**: **plain Vite** with **two build configs** and a static manifest:

- `vite.config.ts`: builds the **popup** (`src/popup/index.html` → ES modules; extension pages
  allow module scripts).
- `vite.content.config.ts`: builds the **content script** in library mode as a single **IIFE**
  (content scripts are classic scripts and cannot use ES module imports), plus its compiled
  `content.css`.
- `public/manifest.json` and icons are copied as-is. `npm run build` runs both builds into `dist/`.
  The same `dist/` folder is loaded in Chrome and Firefox.
- Dev loop: `vite build --watch` for both configs. Reload with Chrome's extension reload button,
  or `web-ext run` (Firefox reloads on change).

**Rationale**: two short config files, no framework layer, and full control over the
manifest (Principle II). Vite's Sass support handles SCSS and CSS Modules out of the box, and
`?inline` imports put the notice's styles into a shadow root as a string.

**Alternatives considered**:

- *WXT* (Vite-based extension framework): handles manifest generation, cross-browser builds, and
  hot reload well. Rejected for v1 because its file-based entrypoints and generated manifest add a
  framework the project doesn't yet need. **Revisit when Safari is added**, since its
  per-browser manifest output would earn its keep then.
- *@crxjs/vite-plugin*: Chrome-focused, with weaker Firefox support. Rejected.
- *esbuild/Rollup directly*: would lose the Vite dev server for working on the popup and contradict
  the user's choice. Rejected.

---

## R7. React, atomic design, and SCSS: where they apply

**Decision**:

- **React (19.x) + TypeScript is used only for the popup** (the toolbar control). The popup is a
  small React app laid out with **atomic design**:
  `atoms/` (Switch, Text, VisuallyHidden) → `molecules/` (SettingRow, HiddenCountSummary) →
  `organisms/` (BadgeSettingsPanel, PageStatus) → `templates/` (PopupLayout) → `pages/` (PopupPage,
  the only component that touches `chrome.*`, through hooks).
- **The content script is plain TypeScript, without React.** It runs on every AliExpress page,
  and the performance budget (SC-004) and FR-006's paint timing call for the smallest, most direct
  DOM code. Its only UI, the "all hidden" notice, is about 10 elements, rendered into a
  **shadow root** so neither AliExpress's CSS nor ours leaks across.
- **SCSS**: CSS Modules (`*.module.scss`) per component in the popup. A shared
  `src/shared/styles/_tokens.scss` (colours, spacing, typography, focus ring) is used by both the
  popup and the notice, so the two look the same (Principle IV). The notice SCSS is imported with
  `?inline` and placed inside the shadow root.

**Rationale**: matches the user's chosen stack where there is a real UI, and keeps the
performance-critical code path out of the framework. Atomic design is kept **flat and minimal**:
a level is created only when it has a component, and no "design system" scaffolding is added
ahead of need (Principle II, see Complexity Tracking).

**Alternatives considered**: React in the content script for the notice (≈60 KB gzipped added to
every AliExpress page for one small banner; rejected). Preact for a smaller popup (popup loads
from local disk, so size hardly matters, and the user chose React; rejected). Global SCSS
without CSS Modules (styles would leak between atomic components; rejected).

---

## R8. Code quality tooling

**Decision**:

- **TypeScript 5.x**, `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
  `tsc --noEmit` runs in CI. Types: `@types/chrome`.
- **ESLint (flat config)**: `typescript-eslint` (`strictTypeChecked` + `stylisticTypeChecked`),
  `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` (helps meet FR-019 / WCAG), and
  `eslint-config-prettier` last.
- **Prettier** for TS, TSX, SCSS, JSON, and Markdown. Checked in CI (`prettier --check`).
- **`web-ext lint`** on `dist/` to catch manifest and permission problems Firefox would reject
  (keeps the build store-ready).

**Alternatives considered**: Stylelint for SCSS (another tool and config; Prettier plus CSS Modules
scoping is enough for this little SCSS; revisit if styles grow). Biome in place of ESLint +
Prettier (the user chose ESLint + Prettier; rejected).

---

## R9. Testing strategy

**Decision**:

| Layer | Tool | What it covers |
|---|---|---|
| Unit | **Vitest** + **jsdom** | `classifyListing`, signature matching, finding the listing root, settings parse/validate/migrate, hidden-count logic, page-key/reveal-reset logic, run against **sanitised HTML fixtures** of real AliExpress pages. |
| Component | Vitest + **React Testing Library** + `user-event` + **vitest-axe** | Each popup atom, molecule, and organism, including keyboard operation and automated a11y checks. |
| Contract | Vitest | (a) Fixture contract: every fixture card has an expected label file (`*.expected.json`), and classification must match 100% (SC-001/SC-002). (b) Settings storage schema and message protocol shapes ([contracts/](./contracts/)). |
| End-to-end | **Playwright** (Chromium, `launchPersistentContext` with `--load-extension`) | One or more acceptance tests per user story. AliExpress URLs are **served from fixtures with `page.route`**, so tests are deterministic and offline. The content script still matches because the URL is a real AliExpress URL. |
| Performance | Vitest `bench` + a Playwright trace | Classifying a 60-card page, and a 500-card synthetic infinite-scroll fixture: no long tasks (> 50 ms) from the content script, and per-batch budgets (see plan § Performance Goals). |

**Testing the popup in E2E**: a popup opened as a tab would see *itself* as the active tab. The
popup accepts an optional `?tabId=<n>` query parameter that overrides the active-tab lookup. This
is a small, documented test seam that does nothing in normal use.

**Firefox**: Playwright cannot load extensions into Firefox. Firefox parity (FR-020) is covered
by (1) using only APIs that behave the same in both browsers (R3), (2) `web-ext lint` in CI, and
(3) the manual Firefox pass in [quickstart.md](./quickstart.md). An automated Firefox E2E stack
(Selenium + geckodriver) was rejected for v1 as a second E2E framework (Principle II). Revisit
if a Firefox-only regression ever slips through.

**Live-site checks are manual**, not in CI. Automated hits on AliExpress trigger anti-bot
protection (R2), which makes them flaky. The quickstart's 10-page sample is the SC-001/SC-002
acceptance check, repeated whenever fixtures are refreshed.

---

## R10. Personal-use installation (spec: "installed from the project folder")

**Decision**:

- **Chromium (Chrome, Edge, Brave)**: Developer mode → "Load unpacked" → `dist/`. Stays installed
  across restarts (FR-014 testable).
- **Firefox**: a **temporary add-on** (`about:debugging` or `web-ext run`) is **removed when Firefox
  restarts**, together with its settings, so it cannot pass the FR-014 restart check. For a lasting
  personal install, use one of:
  1. **Unlisted self-signing on AMO** (`web-ext sign --channel=unlisted`): free and automated. The
     extension is **not published or listed**; Mozilla only signs the `.xpi`, which is then
     installed from the file. **Recommended.**
  2. **Firefox Developer Edition / Nightly / ESR** with `xpinstall.signatures.required = false`,
     installing the unsigned `.xpi`.

**Rationale**: release Firefox only installs signed add-ons permanently. Unlisted signing is
not "publishing to a store" (out of scope in the spec). It is the standard way to self-distribute,
and needs only a free AMO account.

---

## R11. Runtime and package manager versions

**Decision**: **Node.js 24 LTS** (pinned in `.nvmrc` and `package.json#engines`). **npm** (comes
with Node, so no extra tool). Dependencies are pinned to the latest stable versions at
implementation time (React 19.x, Vite 7.x or newer, TypeScript 5.x, Vitest matching the Vite major,
Playwright latest). Each new dependency is checked with `npm audit` (constitution: no known
high or critical vulnerabilities).

**Alternatives considered**: pnpm (faster, but one more tool for a single-package repo; rejected
for now).

---

## Resolved clarifications

All Technical Context unknowns are resolved:

- Backend → none (R1).
- Infinite scroll → not in v1; native pagination kept, follow-up feature recorded (R2).
- Platform/APIs → MV3, `chrome.*`, no background (R3).
- Detection and timing → classify with MutationObserver + root-attribute CSS (R4).
- Badge signatures → captured from fixtures; that capture is the first implementation task (R5).
- Build, UI, styling, lint, test, install, versions → R6–R11.

## Sources

- [MDN: manifest.json `background`](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background): Firefox does not support `background.service_worker`; it uses event pages.
- [Mozilla Add-ons blog: MV3 background compatibility](https://blog.mozilla.org/addons/?p=9142)
- [Apify AliExpress scraper](https://apify.com/s-r/aliexpress-scraper) and [DataImpulse scraping write-up](https://dataimpulse.com/?p=373348): page size of about 60, the embedded `itemList` JSON, and rate-limit/IP-block warnings. These are vendor claims; page size and pagination were checked against the live site.
- Live check of `https://www.aliexpress.com/w/wholesale-phone-case.html` (2026-10-31): numbered pagination with 60 pages, lazy grid rendering, baxia anti-bot interstitial for automated browsers, and a "Choice" include filter with no exclude option.
