---

description: "Task list for Hide Choice & Brand+ Listings on AliExpress"
---

# Tasks: Hide Choice & Brand+ Listings on AliExpress

**Input**: Design documents from `/specs/001-hide-choice-listings/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Required.** Constitution Principle III (NON-NEGOTIABLE) mandates test-first, with an automated acceptance test per user story and contract tests at boundaries. Every test task MUST be written and **observed failing** before its implementation task.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1, US2, US3)
- **[MANUAL]**: Written for a human with a normal desktop browser, because AliExpress served automated browsers a reduced anti-bot page during research. Since 2026-11-01 Playwright has received real pages ([research R5](./research.md#r5-badge-signatures-how-a-choice-or-brand-badge-is-recognised)), so try an automated check first

## Path Conventions

Single package at repo root: `src/{shared,content,popup}/`, `tests/{fixtures,helpers,unit,contract,e2e,perf}/`, `public/` (see [plan.md § Project Structure](./plan.md#project-structure)). Popup component tests sit next to their components.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Toolchain, configs, and an empty extension that builds, lints, and loads.

- [X] T001 Create `package.json` (name `nochoice`, `private: true`, `type: "module"`, `engines.node: ">=24"`) and `.nvmrc` (`24`). Add scripts: `build` = `vite build && vite build -c vite.content.config.ts`, `dev:popup` = `vite build --watch`, `dev:content` = `vite build -c vite.content.config.ts --watch` (run in two terminals; no task-runner package, per plan § Primary Dependencies), `lint` = `eslint .`, `format` = `prettier --write .`, `format:check` = `prettier --check .`, `typecheck` = `tsc -b`, `test` = `vitest run --project unit --passWithNoTests`, `test:e2e` = `npm run build && playwright test`, `test:perf` = `npm run build && playwright test -c playwright.perf.config.ts` (changed by T076), `lint:ext` = `web-ext lint --source-dir dist`
- [X] T002 Install **exactly** the packages in [plan.md § Primary Dependencies](./plan.md#technical-context), and nothing else (anything new must be added to that table with a reason first), pinned to the latest stable versions. Run `npm audit` (no high or critical findings). Runtime: `react@19`, `react-dom@19`. Dev: `vite@7` (pinned major, see plan), `@vitejs/plugin-react`, `sass`, `typescript`, `@types/chrome`, `@types/react`, `@types/react-dom`, `@types/node`, `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `vitest-axe`, `@playwright/test`, `web-ext`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-config-prettier`, `globals`, `prettier`. Then run `npx playwright install chromium`
- [X] T003 [P] Create the TypeScript configs as a solution, so `src/` never sees Node globals while tests and tooling get Node types:
  - `tsconfig.json`: `{ "files": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }] }`, which `tsc -b` and typescript-eslint's `projectService` both follow.
  - `tsconfig.app.json`: include `src`, exclude `src/**/*.test.{ts,tsx}`, `types: ["chrome", "vite/client"]`.
  - `tsconfig.node.json`: include `tests`, `src/**/*.test.{ts,tsx}`, `scripts`, and the root `*.config.ts` files; `types: ["node", "chrome", "vite/client", "@testing-library/jest-dom"]`.
  - Shared options in both (`tsconfig.base.json`, extended by both): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `target`/`lib` `ES2023` + `DOM` + `DOM.Iterable`, `noEmit: true`, `tsBuildInfoFile: "node_modules/.tmp/<name>.tsbuildinfo"`. Do **not** set `composite`: it requires every imported file to be in the config's own `include`, so tests importing `src/` modules would fail with TS6307. Without it, imported `src/` files are pulled into the Node program automatically, while `tsconfig.app.json` still keeps Node APIs out of `src/`.
  - Add `src/vite-env.d.ts` declaring the `*.module.scss` and `*.scss?inline` modules.
- [X] T004 [P] Create `eslint.config.js` (flat config): `@eslint/js` recommended, `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` with `parserOptions.projectService`, `eslint-plugin-react-hooks` recommended and `eslint-plugin-jsx-a11y` recommended for `src/popup/**`, browser globals, ignore `dist/`, `coverage/`, `playwright-report/`, and `eslint-config-prettier` last
- [X] T005 [P] Create `.prettierrc.json` (`singleQuote: true`, `printWidth: 100`, `trailingComma: "all"`) and `.prettierignore` (`dist`, `coverage`, `playwright-report`, `test-results`, `tests/fixtures/**/*.html`, `package-lock.json`)
- [X] T006 [P] Create `vite.config.ts` for the popup build: `@vitejs/plugin-react`, `build.outDir: "dist"`, `build.emptyOutDir: true`, `build.rollupOptions.input: { popup: "src/popup/index.html" }` (emits `dist/src/popup/index.html`), `publicDir: "public"`, `css.modules.localsConvention: "camelCaseOnly"`
- [X] T007 [P] Create `vite.content.config.ts` for the content script: library mode, `entry: "src/content/main.ts"`, `formats: ["iife"]`, `name: "NoChoice"`, `fileName: () => "content.js"`, CSS emitted as `dist/content.css` (`build.lib.cssFileName: "content"` or `rollupOptions.output.assetFileNames`), `build.emptyOutDir: false` (must not delete the popup build), `publicDir: false`, and production builds drop `console.debug` (`esbuild.pure: ["console.debug"]`) per plan Complexity Tracking
- [X] T008 [P] Create `vitest.config.ts` with `environment: "jsdom"`, `setupFiles: ["tests/setup.ts"]`, coverage provider `v8`, and `include: ["tests/unit/**/*.test.ts", "tests/contract/**/*.test.ts", "src/**/*.test.{ts,tsx}"]` (T076 removed the separate `perf` project), and `tests/setup.ts` registering `@testing-library/jest-dom/vitest` and the `vitest-axe` matchers
- [X] T009 [P] Create `playwright.config.ts` (`testDir: "tests/e2e"`, `fullyParallel: false`, `workers: 1` because extension contexts are persistent, `retries: 0`, `reporter: [["list"], ["html", { open: "never" }]]`, `use.trace: "retain-on-failure"`) and `playwright.perf.config.ts` (`testDir: "tests/perf"`, `testMatch: "**/*.perf.spec.ts"`, otherwise the same)
- [X] T010 [P] Create `public/manifest.json` exactly per [contracts/page-dom.md § Injection](./contracts/page-dom.md#injection) and [research R3](./research.md#r3-extension-platform-manifest-version-and-cross-browser-apis): `manifest_version: 3`, `name: "NoChoice"`, `version: "0.1.0"`, `description` (one clear sentence), `permissions: ["storage"]`, `host_permissions` and `content_scripts[0].matches` both `["*://*.aliexpress.com/*", "*://*.aliexpress.us/*"]` (**not** `aliexpress.ru`, which is out of scope per FR-007/FR-018), `content_scripts[0]`: `js: ["content.js"]`, `css: ["content.css"]`, `run_at: "document_start"`, `all_frames: false`, `action.default_popup: "src/popup/index.html"`, `action.default_title: "NoChoice"`, `icons` and `action.default_icon` → `icons/icon-{16,32,48,128}.png`, `browser_specific_settings.gecko: { id: "nochoice@zygispr", strict_min_version: "128.0", data_collection_permissions: { required: ["none"] } }` (declares FR-017 and is needed for AMO signing, see [research R3](./research.md#r3-extension-platform-manifest-version-and-cross-browser-apis); confirm the key against current MDN, and `npm run lint:ext` must pass). **No** `background`, `tabs`, `activeTab`, `scripting`, or `webRequest`
- [X] T011 [P] Create the extension icons `public/icons/icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png` (a simple, generic "crossed-out tag" mark, no AliExpress branding), plus the source `public/icons/icon.svg`
- [X] T012 [P] Create `.github/workflows/ci.yml`: on push and PR, Node from `.nvmrc`, `npm ci`, then `lint`, `format:check`, `typecheck`, `test -- --coverage`, `build`, `lint:ext`, `npx playwright install --with-deps chromium`, `test:e2e`. Upload `playwright-report/` when it fails
- [X] T013 Create the minimal entrypoints so the pipeline runs end-to-end: `src/popup/index.html` (`<html lang="en">`, `<title>NoChoice</title>`, `<div id="root">`, module script `./main.tsx`), `src/popup/main.tsx` (renders a placeholder heading "NoChoice"), and `src/content/main.ts` (empty module with a one-line comment explaining it is the content-script entry). Then confirm `npm run build`, `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run lint:ext` all exit 0, and that `dist/` contains `manifest.json`, `content.js`, `content.css`, `src/popup/index.html`, and `icons/`

**Checkpoint**: an empty extension builds, lints, and loads unpacked in Chrome without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Real AliExpress fixtures, test harnesses, and the shared settings model that every story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T014 [MANUAL] Capture AliExpress fixtures per [quickstart.md § Capturing fixtures](./quickstart.md#capturing-fixtures-first-implementation-task-and-whenever-aliexpress-changes): sanitised `tests/fixtures/aliexpress/{search-com,search-us,search-pl,category-com,store-com,home-com,pdp-com}.html`, with capture details in `tests/fixtures/aliexpress/README.md`. Scope reduced by user decision on 2026-11-01 to limit manual work: the first complete capture is kept, with its known gaps recorded in that README (no Polish/PLN or USD page; `store-com` is all Choice; "Bundle deals" cards have no product ID). Because the repo will be public, the captures are stripped to the structure the tests need, with no third-party text, CSS, or scripts (rules in that README). No `aliexpress.ru` fixture is needed (out of scope)
- [X] T015 Create `tests/fixtures/aliexpress/<name>.expected.json` with the shape `{ "source": string, "capturedAt": "YYYY-MM-DD", "listings": [{ "productId": string, "badges": ("choice" | "brand-plus")[] }] }`, covering **every** listing card in the fixture. Generated by the agent, not verified card by card by a human (user decision, 2026-11-01): every interface image on every card was inspected by eye to identify the badge images, and labels were spot-checked against screenshots. `productId` is the `/item/<id>.html` ID, or `image:<photo asset ID>` for "Bundle deals" cards, and a key that repeats gets `#2`, `#3`, … in document order (sponsored cards show no badges, so one product can appear with different labels); T025–T027 read cards back with the same rule. For `pdp-com.html`, the main product is **not** a listing and must not appear in `listings`
- [X] T016 [P] Create `tests/helpers/loadFixture.ts`: `loadFixture(name)` reads `tests/fixtures/aliexpress/<name>.html`, replaces `document.documentElement.innerHTML` in jsdom, and returns `document`. `loadExpected(name)` reads and type-checks `<name>.expected.json`. `listFixtures()` returns every fixture name that has both files
- [X] T017 [P] Create `tests/helpers/fakeChrome.ts`: an in-memory fake of the `chrome` APIs used by the code (`storage.local.get/set` returning promises, `storage.onChanged.addListener/removeListener` firing `(changes, "local")`, `tabs.query`, `tabs.connect` returning a fake `Port` pair with `postMessage`/`onMessage`/`onDisconnect`/`disconnect`, `runtime.onConnect`, `runtime.lastError`), with `installFakeChrome()` and `resetFakeChrome()`. Install it globally in `tests/setup.ts` and reset it `beforeEach`. Also add `failNextSet(error)` to simulate storage write failures
- [X] T018 [P] Create `src/shared/badgeTypes.ts`: `export const BADGE_TYPES = ["choice", "brand-plus"] as const`, `type BadgeType`, `BADGE_LABELS: Record<BadgeType, string>` = `{ choice: "Choice", "brand-plus": "Brand+" }` (copy rule: "Use the badge names exactly as AliExpress shows them"), and `SETTINGS_KEY_BY_BADGE: Record<BadgeType, "choice" | "brandPlus">`
- [X] T019 [P] Write the failing contract test `tests/contract/settingsStorage.contract.test.ts` per [contracts/settings-storage.md](./contracts/settings-storage.md). Cases: absent → `{ version: 1, enabled: true, hide: { choice: true, brandPlus: true } }`; valid v1 round-trip; each field with the wrong type falls back to its default (field by field, others kept); non-object (`null`, `"x"`, `42`, array) → all defaults; unknown future `version` (e.g. `2`) → all defaults; extra fields dropped; `parseSettings` never throws; `effectiveHiddenBadges` returns `∅` when `enabled` is false and keeps `hide` unchanged
- [X] T020 Implement `src/shared/settings.ts` to pass T019: `type Settings = { version: 1; enabled: boolean; hide: { choice: boolean; brandPlus: boolean } }`, `DEFAULT_SETTINGS`, `parseSettings(raw: unknown): Settings` (rules quoted from the contract: "Each field is checked separately. A missing or wrongly typed field takes its default. Unknown fields are dropped. A non-object value means all defaults. Reading never throws." and "An unknown future version … falls back to defaults rather than guessing"), an ordered `MIGRATIONS` array (empty in v1, with a comment explaining its purpose), and `effectiveHiddenBadges(settings): ReadonlySet<BadgeType>` = `enabled ? { t | hide[t] } : ∅` (depends on T018)
- [X] T021 [P] Write the failing test `tests/unit/settingsStore.test.ts` (using fakeChrome): `readSettings()` returns defaults when the key is absent and parsed settings otherwise; `writeSettings(s)` stores the **complete** validated object under key `settings` ("Whole-object writes"); `writeSettings` rejects when storage rejects; `subscribeSettings(cb)` calls `cb(parsed)` only for area `local` and key `settings`, and returns an unsubscribe function
- [X] T022 Implement `src/shared/settingsStore.ts` to pass T021: `SETTINGS_STORAGE_KEY = "settings"`, `readSettings`, `writeSettings`, `subscribeSettings`. No other storage keys are ever written (FR-017)
- [X] T023 [P] Create `src/shared/styles/_tokens.scss`: colour tokens (text, muted text, surface, border, accent, error) meeting WCAG 2.2 AA (text ≥ 4.5:1 on its surface, UI and focus ≥ 3:1; note the measured ratios in comments), spacing scale, font stack, font sizes, border radius, a `focus-ring` mixin (always visible, ≥ 2 px), and a `prefers-color-scheme: dark` variant of the colour tokens
- [X] T024 Create the Playwright extension harness `tests/e2e/support/extensionTest.ts`: a `test` extended with fixtures that (a) `chromium.launchPersistentContext(tmpUserDataDir, { channel: "chromium", args: ["--disable-extensions-except=<dist>", "--load-extension=<dist>"] })`, (b) compute `extensionId` from the absolute `dist` path (Chrome's unpacked-extension ID: SHA-256 of the path, first 32 hex chars, each hex digit `0–f` mapped to `a–p`), (c) `serveFixture(url, fixtureName)` routes that exact AliExpress URL to the fixture HTML, (d) aborts every other network request so tests are offline and deterministic, (e) `openPopup(tabId?)` opens `chrome-extension://<id>/src/popup/index.html?tabId=<id>`, (f) `relaunch()` reopens the context with the **same** user data dir (for persistence tests), (g) records every request in the context (`context.on("request")`) and provides `assertNoExtensionNetworkActivity()` (FR-017/SC-007). It fails if any request has `resourceType()` in `fetch`, `xhr`, `websocket`, or `eventsource` (sanitised fixtures contain no scripts, so any such request must come from the extension), or if an extension page (`chrome-extension://…`) requested anything outside its own origin. (h) Provides `storedKeys()`, which runs `chrome.storage.local.get(null)` from an extension page and returns its keys. Add `tests/e2e/smoke.spec.ts` asserting the popup page loads with heading "NoChoice"

**Checkpoint**: fixtures are labelled, settings are tested, and the harness loads the extension. User stories can start.

---

## Phase 3: User Story 1 - Browse AliExpress without Choice and Brand+ listings (Priority: P1) 🎯 MVP

**Goal**: With no setup, every listing carrying a Choice or Brand+ badge is removed from view on every AliExpress listing surface. This includes lazily loaded and in-place-navigated results, with no flash, and the grid closes the gaps. When everything is hidden, a notice explains it and offers a one-page reveal (FR-001–FR-010, FR-015, FR-016, FR-018).

**Independent Test**: Load the built extension, open an AliExpress search for "phone case", and confirm no visible listing has a Choice/Brand+ badge while "Ad", "11.11 Sale", and "Bundle deals" listings are still visible (automated: `tests/e2e/us1-*.spec.ts`; manual: quickstart V1–V4, V9, V10).

### Tests for User Story 1 ⚠️ write first, observe failing

- [X] T025 [P] [US1] Write `tests/unit/detectBadges.test.ts`: for each fixture listing, `detectBadges(listingRoot)` equals the expected `badges` (order-insensitive). An unknown badge image (src changed) → `[]`. A title containing the text "Choice" or "Brand+" with no badge element → `[]` (rule: "Must not rely on text alone"). Other tags ("Ad", "11.11 Sale", "Bundle deals") → `[]`. A card with both Choice and a sale tag → `["choice"]`
- [X] T026 [P] [US1] Write `tests/unit/findListingRoot.test.ts`: from a badge node inside each fixture listing, `findListingRoot(node)` returns the element that is a **direct child of a known listing container** and contains that node; a node outside any known container → `null`; in `pdp-com.html` the main product block → `null` (FR-009); calling it on a container itself → `null`
- [X] T027 [P] [US1] Write the fixture contract test `tests/contract/fixtureLabels.contract.test.ts`: for **every** fixture from `listFixtures()`, run `classifyDocument(document)` and assert that the set of `{productId, badges}` read back from `data-nochoice-badges` equals `<name>.expected.json` **exactly**. 100% badged listings marked (SC-001) and 0 unbadged listings marked (SC-002). Also assert every signature in `BADGE_SIGNATURES` matches at least once across the fixtures ("Every signature must be covered by at least one fixture")
- [X] T028 [P] [US1] Write `tests/unit/applySettings.test.ts`: `applyHiding(root, hiddenSet, revealed)` sets `<html data-nochoice-hide="choice brand-plus">` for both, `"choice"` for one, **removes** the attribute for an empty set or `revealed = true`; and with the content stylesheet injected into jsdom, a card with `data-nochoice-badges="choice"` gets `display: none` only when `choice` is in the hidden set
- [X] T029 [P] [US1] Write `tests/unit/watchPage.test.ts`: after `watchPage(document, callbacks)` starts, (a) appending a fixture card into a listing container classifies it **before** the next `requestAnimationFrame` callback runs (FR-006 timing), (b) appending a badge `<img>` into an existing unclassified card, or changing its `src`, re-classifies that card, (c) a mutation batch whose `location.href` (minus `#hash`) differs from the last one calls `onPageKeyChange` once, (d) mutations outside listing containers do no classification work (spy on `classifyListing`), (e) `stop()` disconnects the observer
- [X] T030 [P] [US1] Write `tests/unit/pageState.test.ts`: `pageKeyOf(location)` = `origin + pathname + search` (hash ignored); `createPageState()` starts with `revealed: false`; `reveal()` sets it to true; `onNavigate(newKey)` resets `revealed` to false only when the key differs
- [X] T031 [P] [US1] Write `tests/unit/hiddenCount.test.ts`: `countHidden(document, hiddenSet, revealed)` returns `{ hiddenCount, hiddenByBadge: { choice, brandPlus }, totalCount, fullyHiddenContainers }`. A card with two hidden badges counts once in `hiddenCount` and once under each badge; a badge not in the hidden set counts 0; `revealed` → all zeros; `fullyHiddenContainers` lists (as `{ container, hiddenCount }`) only **primary results** containers (`isPrimaryResults: true`) where every classified card (≥ 1) is hidden. A sponsored row, homepage feed, or product-page recommendation container that is entirely hidden is **not** listed
- [X] T032 [P] [US1] Write `tests/unit/allHiddenNotice.test.ts`: `renderAllHiddenNotice(container, count, hiddenSet, onReveal)` inserts one `<nochoice-notice>` as the container's previous sibling with an **open shadow root** that contains `role="status"`, the text per [contracts/page-dom.md](./contracts/page-dom.md#all-listings-hidden-notice-fr-015) ("All 12 listings in these results were hidden by NoChoice (Choice and Brand+)." with both badges hidden, "… (Choice)." with only Choice hidden, where N is that container's hidden count), and a `<button>` "Show hidden listings". Clicking it or pressing Enter/Space calls `onReveal` once; calling render twice does not duplicate the notice; `removeAllHiddenNotices(document)` removes them all; axe reports 0 violations on the shadow content. Also test the settle rule with fake timers via `updateAllHiddenNotices(fullyHiddenContainers, hiddenSet, onReveal)`: a container that becomes fully hidden gets its notice only after **500 ms** with no new cards added to it; a card added within that window restarts the 500 ms; a container that stops being fully hidden before 500 ms never shows a notice; a shown notice is removed immediately once the container has a visible card
- [X] T033 [P] [US1] Write the E2E acceptance test `tests/e2e/us1-hiding.spec.ts` (fixture `search-com` served at `https://www.aliexpress.com/w/wholesale-phone-case.html`): Scenario 1, every expected-Choice card has computed `display: none`, every unbadged card is visible, and visible cards fill the grid with no empty slots (each visible card's top-left equals the position of the n-th grid cell); Scenario 2, the same for Brand+ (`home-com`); Scenario 3, cards with only other tags are visible; Scenario 4, inject 20 cloned fixture cards (Choice and non-Choice) into the container from `page.evaluate`, and inside the next `requestAnimationFrame` assert the Choice clones are already `display: none`; Scenario 5, call `history.pushState` to `?page=2`, replace the container's children with cards from `search-us`, and assert hiding applies with no reload. Also check SC-005: a fresh profile with no settings hides on the first visit. End every scenario with `assertNoExtensionNetworkActivity()` (SC-007)
- [X] T034 [P] [US1] Write the E2E edge-case test `tests/e2e/us1-edge-cases.spec.ts`: (a) `pdp-com` served at a `/item/<id>.html` URL shows the main product but hides badged cards in the recommendations (FR-009, FR-008); (b) the `unknownMarkup` synthetic page (badge src changed) hides nothing (FR-016); (c) the same badge markup served at `https://example.com/` **and** at `https://aliexpress.ru/wholesale?SearchText=phone+case` gets **no** `data-nochoice-*` attributes and no notice (FR-018; `.ru` is out of scope); (d) the `sponsoredRowAllChoice` synthetic page (sponsored row all Choice, main grid mixed) shows **no** notice; (e) the `allChoice` synthetic page shows the notice only after the 500 ms settle, clicking "Show hidden listings" shows every card, cards injected afterwards also stay visible, the stored settings are unchanged, and after `history.pushState` to a new `?page=` (or a reload) hiding resumes (FR-015); (f) every fixture category (search, category, store, home, pdp) hides its expected cards (FR-008), and `search-pl` served at `https://pl.aliexpress.com/w/wholesale-etui.html` hides its expected cards (FR-007, country subdomain; this capture is in English, see the fixtures README)
- [X] T035 [P] [US1] Create `tests/helpers/syntheticFixtures.ts` used by T033/T034 and Phase 6: `allChoice(doc)` keeps only Choice cards in each container; `sponsoredRowAllChoice(doc)` (from `search-com`) makes the sponsored-row container all Choice while leaving the main grid mixed; `unknownMarkup(doc)` rewrites every badge signature attribute (e.g. image src) to an unknown value; `manyCards(doc, n)` clones fixture cards into one container until there are `n`, with unique product IDs. Return HTML strings so Playwright can serve them

### Implementation for User Story 1

- [X] T036 [P] [US1] Create `src/content/domContract.ts` with the names from [contracts/page-dom.md](./contracts/page-dom.md): `BADGES_ATTR = "data-nochoice-badges"`, `HIDE_ATTR = "data-nochoice-hide"`, `NOTICE_TAG = "nochoice-notice"`
- [X] T037 [US1] Create `src/content/badges/badgeSignatures.ts` by analysing the T014 fixtures: `type BadgeSignature = { badge: BadgeType; id: string; assetId: string }` (reduced from a selector and matcher on 2026-11-01, because every badge is a logo image and one lookup per image keeps the cost flat as logos are added) and `BADGE_SIGNATURES`, with at least one signature per badge type. Prefer the badge image asset ID in `src` (locale-independent); text may only be a supporting check combined with a structural one. **Do not** key on hashed CSS-module class suffixes (e.g. `--OeEGppz`); stable prefixes are allowed only together with another signal. Give each signature a dated `id` (e.g. `choice-img-2026-11`) and a one-line comment naming the fixture that shows it
- [X] T038 [US1] Implement `src/content/badges/detectBadges.ts` (pure): `detectBadges(card: Element): BadgeType[]` looks up each image's asset ID in the signature table; no match → `[]` (FR-016); deduplicated, in `BADGE_TYPES` order (makes T025 pass)
- [X] T039 [P] [US1] Create `src/content/listings/listingContainers.ts` from the fixtures: `LISTING_CONTAINERS: { id: string; selector: string; isPrimaryResults: boolean }[]` with ids `search-grid` (also category pages, which share its selector) and `store-grid` (`isPrimaryResults: true`), and `search-sponsored`, `home-feed`, `pdp-more-to-love`, `pdp-store-recommended`, `pdp-related` (`isPrimaryResults: false`), where each selector matches the element whose **direct children** are listing cards, plus `isListingContainer(el)`. Comment if any container uses absolute positioning (see page-dom contract)
- [X] T040 [US1] Implement `src/content/listings/findListingRoot.ts`: walk up from the node to the nearest ancestor whose parent `isListingContainer`; return that ancestor, or `null` if none is found or the node is a container (makes T026 pass)
- [X] T041 [US1] Implement `src/content/listings/classifyListing.ts`: `classifyListing(card)` writes `data-nochoice-badges` = space-joined `detectBadges(card)` (empty string when none), and **never** reads settings ("Settings never affect classification"). `classifyDocument(root)` classifies every direct child of every listing container under `root`. `ListingBatch` handles a container, card, or badge node being added, classifying each affected card once per observer batch (makes T027 pass)
- [X] T042 [P] [US1] Create `src/content/content.scss` with exactly the rules in [contracts/page-dom.md § Stylesheet rules](./contracts/page-dom.md#stylesheet-rules-behavioural-contract) (one selector pair per badge type, `display: none !important`) and nothing else. Import it from `src/content/main.ts` so the content build emits `content.css`
- [X] T043 [P] [US1] Implement `src/content/page/applySettings.ts`: `applyHiding(htmlEl, hiddenSet, revealed)` sets `data-nochoice-hide` to the space-joined set, or removes it when the set is empty or `revealed` (makes T028 pass)
- [X] T044 [P] [US1] Implement `src/content/page/pageState.ts`: `pageKeyOf`, `createPageState()` returning `{ pageKey, revealed, reveal(), onNavigate(key): boolean }` per data-model PageState ("`revealed` is never persisted") (makes T030 pass)
- [X] T045 [US1] Implement `src/content/page/hiddenCount.ts`: `countHidden(root, hiddenSet, revealed)` per T031, using one `querySelectorAll('[data-nochoice-badges]')` pass (makes T031 pass)
- [X] T046 [US1] Implement `src/content/page/watchPage.ts`: one `MutationObserver` on `document.documentElement` with `{ childList: true, subtree: true, attributes: true, attributeFilter: ["src"] }`; for each record, add added element nodes to a `ListingBatch`, along with the listing root for `src` changes and removed nodes (a card reused for another product must not keep its old mark); compare `pageKeyOf(location)` once per callback and call `onPageKeyChange`; call `onBatchProcessed()` once per callback. Returns `{ stop }`. Before observing, run `classifyDocument(document)` once for nodes that already exist (makes T029 pass)
- [X] T047 [US1] Implement `src/content/notice/allHiddenNotice.ts` and `src/content/notice/allHiddenNotice.scss` per [contracts/page-dom.md § notice](./contracts/page-dom.md#all-listings-hidden-notice-fr-015): create a `nochoice-notice` element with an open shadow root (unregistered: `customElements` is `null` in a content script's isolated world, and `attachShadow` only needs a valid custom element name), inject the SCSS via `import styles from "./allHiddenNotice.scss?inline"` (uses `_tokens.scss`, visible focus ring), plus `renderAllHiddenNotice`, `removeAllHiddenNotices`, and `updateAllHiddenNotices(fullyHiddenContainers, hiddenSet, onReveal)`, which owns the per-container **500 ms settle timer** from the page-dom contract (restarted when cards are added to that container; cleared when the container stops being fully hidden) (makes T032 pass)
- [X] T048 [US1] Wire `src/content/main.ts`: on start, call `applyHiding(document.documentElement, effectiveHiddenBadges(DEFAULT_SETTINGS), false)` **synchronously** (defaults before storage resolves, research R4), then `readSettings()` and re-apply; create the page state; start `watchPage` with `onPageKeyChange` → `pageState.onNavigate` + re-apply hiding + clear notices, and `onBatchProcessed` → `countHidden` → `updateAllHiddenNotices(fullyHiddenContainers, …)` (reveal callback → `pageState.reveal()` + `applyHiding(..., true)` + `removeAllHiddenNotices`). Defer `watchPage` until `document.documentElement` exists (it does at `document_start`). Catch and `console.debug` storage read errors, falling back to defaults (fail-safe, never throw into the page)
- [X] T049 [US1] Make all US1 tests pass (`npm test`, `npx playwright test tests/e2e/us1-*`). Then load `dist/` unpacked in Chrome and run [quickstart V1](./quickstart.md#validation-scenarios) on live AliExpress by hand. If live markup differs from the fixtures, recapture (T014/T015) and update signatures before closing the story. Done on 2026-11-01: the user's check found Brand+ still visible, which led to the second card layout, its Brand+ logo, and the `search-com-us-layout` fixture; the user then confirmed the fix. Also confirm the Vite 7 build output (plan § Primary Dependencies): a production `npm run build` gives a `dist/content.css` containing the `data-nochoice-hide` rules and a `dist/content.js` with no `console.debug`

**Checkpoint**: MVP. Hiding works on all listing surfaces with defaults and no UI.

---

## Phase 4: User Story 2 - Turn hiding off and on, and see what was hidden (Priority: P2)

**Goal**: A toolbar popup shows the live hidden count for the active AliExpress page and a master switch that updates open pages within 1 s and is remembered across restarts (FR-011, FR-012, FR-014, FR-019).

**Independent Test**: On a results page, open the popup, note the count, switch hiding off (listings reappear with no reload), switch it on (they disappear), restart the browser, and confirm the state was kept; on a non-AliExpress page the popup says it only works on AliExpress (automated: `tests/e2e/us2-toggle-count.spec.ts`; manual: quickstart V5–V7, V13).

### Tests for User Story 2 ⚠️ write first, observe failing

- [X] T050 [P] [US2] Write the contract test `tests/contract/messaging.contract.test.ts` per [contracts/messaging.md](./contracts/messaging.md): `STATUS_PORT_NAME === "nochoice/status@1"`; `buildStatusMessage(counts, revealed)` returns exactly `{ type: "status", hiddenCount, hiddenByBadge: { choice, brandPlus }, revealed }` with non-negative integers; invariant `max(choice, brandPlus) ≤ hiddenCount ≤ choice + brandPlus`; `isStatusMessage(x)` rejects unknown `type`s and wrong shapes
- [X] T051 [P] [US2] Write `tests/unit/statusPort.test.ts` (fakeChrome): the content side accepts only ports named `STATUS_PORT_NAME` and ignores others; it sends one `status` right after connect; several `notifyChanged()` calls within one animation frame send at most one message, and only when a field changed; a disconnected port is dropped and not posted to
- [X] T052 [P] [US2] Write `tests/unit/followSettings.test.ts` (fakeChrome): `followSettings(onChange)` calls `onChange` with the parsed stored settings at start and on every `storage.onChanged` for key `settings`; a write via `writeSettings` reaches `onChange` (budget: same task, ≤ 50 ms)
- [X] T053 [P] [US2] Write the atom tests `src/popup/components/atoms/Switch/Switch.test.tsx`, `src/popup/components/atoms/Text/Text.test.tsx`, and `src/popup/components/atoms/VisuallyHidden/VisuallyHidden.test.tsx`. Switch: renders `role="switch"` with `aria-checked`, is labelled by its visible label, toggles on click, Space, and Enter, honours `disabled` (no toggle, `aria-disabled`), exposes "On"/"Off" state text to screen readers (colour is not the only signal), and has 0 axe violations
- [X] T054 [P] [US2] Write the molecule tests `src/popup/components/molecules/SettingRow/SettingRow.test.tsx` (label + Switch + optional inline error message linked via `aria-describedby`) and `src/popup/components/molecules/HiddenCountSummary/HiddenCountSummary.test.tsx` ("**N** hidden on this page" with breakdown "Choice 12 · Brand+ 3"; N = 0 → "Nothing hidden on this page"; a badge with count 0 is left out of the breakdown)
- [X] T055 [P] [US2] Write the organism tests `src/popup/components/organisms/PageStatus/PageStatus.test.tsx`: renders the **exact copy** from [contracts/popup-ui.md § Page status states](./contracts/popup-ui.md#page-status-states) for `loading` (empty, space reserved), `active`, `active-off` ("Hiding is off. All listings are shown."), `active-revealed` ("Showing hidden listings on this page. They'll be hidden again when you reload or change results."), `not-aliexpress` ("NoChoice only works on AliExpress."), and `reload-needed` ("Reload this AliExpress page to start hiding listings."); the region is `aria-live="polite"`; 0 axe violations in every state. Also write `src/popup/components/organisms/BadgeSettingsPanel/BadgeSettingsPanel.test.tsx` for the master switch "Hide listings" (checked state, `onChange`, "Couldn't save this setting. Please try again." shown when `saveError` is set, and "Couldn't load your settings, so the defaults are shown. Changing a switch will try to save again." shown at the top when `loadError` is set, with switches still usable)
- [X] T056 [P] [US2] Write the hook tests `src/popup/hooks/useSettings.test.ts` (loads stored settings; `setEnabled` updates right away and persists the **complete** object; when the write fails it **reverts** to the last stored value and exposes `saveError`; when the initial read rejects it exposes `DEFAULT_SETTINGS` plus `loadError`, and a later successful write clears `loadError`) and `src/popup/hooks/usePageStatus.test.ts` (uses `?tabId=` when present, otherwise `tabs.query({ active: true, currentWindow: true })`; a non-AliExpress `tab.url` (including `https://aliexpress.ru/…`) → `not-aliexpress` without connecting, while `https://www.aliexpress.com/…`, `https://pl.aliexpress.com/…`, and `https://www.aliexpress.us/…` are supported; a `status` message → `active` with counts and live updates; `onDisconnect` before the first status, or no status within **1 s** → `reload-needed`; the port disconnects on unmount)
- [X] T057 [P] [US2] Write `src/popup/components/pages/PopupPage/PopupPage.test.tsx` (fakeChrome): the full popup renders the header "NoChoice", the page status, and the master switch; the first switch gets focus on open; tab order is master → (later) per-badge; toggling writes storage; 0 axe violations
- [X] T058 [P] [US2] Write the E2E acceptance test `tests/e2e/us2-toggle-count.spec.ts` (fixture `search-com` in tab A; popup via `openPopup(tabA.id)`): Scenario 1, popup shows "{N} hidden on this page" where N = expected Choice+Brand+ card count; Scenario 2, switch off → all previously hidden cards visible in tab A within 1 s (poll ≤ 1000 ms) with no navigation event; Scenario 3, switch on → hidden again within 1 s; Scenario 4, switch off → `relaunch()` → load the fixture → cards visible and the popup switch is still off; Scenario 5, popup targeted at an `https://example.com/` tab shows "NoChoice only works on AliExpress." and no count. Also, "reload needed": let tab A's load of the AliExpress URL fail, which leaves an AliExpress tab with no content script, open `openPopup(tabA.id)`, and assert "Reload this AliExpress page to start hiding listings." Then serve the fixture, reload tab A, and assert the popup shows the count again. (A page left open across `chrome.runtime.reload()` can't be used: Playwright's Chromium never brings a command-line extension back after it.) Finally, after the toggling scenarios, assert `storedKeys()` equals `["settings"]` and call `assertNoExtensionNetworkActivity()` (FR-017, SC-007)

### Implementation for User Story 2

- [X] T059 [P] [US2] Implement `src/shared/messages.ts`: `STATUS_PORT_NAME = "nochoice/status@1"`, `type StatusMessage`, `buildStatusMessage`, `isStatusMessage` (makes T050 pass)
- [X] T060 [US2] Implement `src/content/statusPort.ts`: `startStatusPort(getStatus)` listens to `chrome.runtime.onConnect`, accepts only `STATUS_PORT_NAME`, sends the current status on connect, and returns `notifyChanged()`, which coalesces with `requestAnimationFrame` and posts only when the status differs from the last one sent (makes T051 pass)
- [X] T061 [US2] Implement `src/content/page/followSettings.ts` (read + `subscribeSettings`, makes T052 pass) and update `src/content/main.ts` to use it in place of the one-off `readSettings()`: on every change, `applyHiding(...)` with the new effective set and the current `revealed`, recount, re-evaluate notices, and `notifyChanged()`. Also call `notifyChanged()` from `onBatchProcessed` and from reveal/navigation
- [X] T062 [P] [US2] Implement the atoms in `src/popup/components/atoms/`: `Switch/Switch.tsx` + `Switch.module.scss` (`<button type="button" role="switch" aria-checked>`, visible knob position, focus ring from tokens, ≥ 24×24 px target), `Text/Text.tsx` (variants `body` | `muted` | `strong`) + `Text.module.scss`, and `VisuallyHidden/VisuallyHidden.tsx` + `.module.scss`. Add an `index.ts` per component (makes T053 pass)
- [X] T063 [US2] Implement the molecules in `src/popup/components/molecules/`: `SettingRow/SettingRow.tsx` + `.module.scss` and `HiddenCountSummary/HiddenCountSummary.tsx` + `.module.scss`, using `BADGE_LABELS` for the breakdown (makes T054 pass)
- [X] T064 [US2] Implement `src/popup/hooks/useSettings.ts`: loads via `readSettings`, follows `subscribeSettings`, exposes `settings`, `setEnabled(boolean)`, `setBadgeHidden(badge, boolean)`, `saveError`, and `loadError`; optimistic update with revert on a rejected `writeSettings`; a rejected initial `readSettings` falls back to `DEFAULT_SETTINGS` and sets `loadError` (settings-storage contract rule 6) (makes T056 useSettings cases pass)
- [X] T065 [US2] Implement `src/popup/hooks/usePageStatus.ts`: resolves the target tab (`?tabId=` test seam, documented in a comment, else the active tab), checks `tab.url` against the supported AliExpress hosts (shared `isSupportedAliExpressUrl(url)` in `src/shared/aliexpressHosts.ts`, mirroring the manifest matches: `aliexpress.com` and its subdomains, and `aliexpress.us`; `aliexpress.ru` → `not-aliexpress`), connects with `chrome.tabs.connect(tabId, { name: STATUS_PORT_NAME, frameId: 0 })`, and returns `{ kind: "loading" | "active" | "not-aliexpress" | "reload-needed", status? }` with the 1 s timeout (makes T056 usePageStatus cases pass)
- [X] T066 [US2] Implement the organisms in `src/popup/components/organisms/`: `PageStatus/PageStatus.tsx` + `.module.scss` (maps `kind`, `settings.enabled`, and `status.revealed` to the contract states and copy; `aria-live="polite"`) and `BadgeSettingsPanel/BadgeSettingsPanel.tsx` + `.module.scss` (master switch "Hide listings" only for now, plus the `saveError` and `loadError` messages from the popup-ui contract) (makes T055 pass)
- [X] T067 [US2] Implement the template `src/popup/components/templates/PopupLayout/PopupLayout.tsx` + `.module.scss`: header slot ("NoChoice"), status slot, settings slot; fixed popup width (≈ 320 px); uses tokens
- [X] T068 [US2] Implement the page `src/popup/components/pages/PopupPage/PopupPage.tsx` (the only component that uses the hooks; focuses the first switch on mount), replace the placeholder in `src/popup/main.tsx` with `createRoot(...).render(<StrictMode><PopupPage /></StrictMode>)`, and add `src/popup/popup.scss` (reset, body font and colours from tokens, dark mode) imported from `main.tsx` (makes T057 pass)
- [X] T069 [US2] Make all US2 tests pass (`npm test`, `npx playwright test tests/e2e/us2-*`), confirm the US1 tests still pass, then run [quickstart V5–V7](./quickstart.md#validation-scenarios) by hand in Chrome. Done on 2026-11-01 with an automated browser on live AliExpress rather than by hand (V5, V7; V6 is covered by the E2E restart test), and `us2-toggle-count.spec.ts` also drives the real toolbar popup

**Checkpoint**: US1 + US2 work on their own; the popup is a fully working escape hatch.

---

## Phase 5: User Story 3 - Choose which badges to hide (Priority: P3)

**Goal**: Separate Choice and Brand+ switches that apply live and persist (FR-013, FR-014). Hiding logic already supports any badge set (T020, T043), so this story adds the UI and its acceptance tests.

**Independent Test**: Turn off Brand+ only, load a page with both badges, and confirm Choice listings are hidden while Brand+ listings are visible; it survives a restart (automated: `tests/e2e/us3-per-badge.spec.ts`; manual: quickstart V8).

### Tests for User Story 3 ⚠️ write first, observe failing

- [X] T070 [P] [US3] Extend `src/popup/components/organisms/BadgeSettingsPanel/BadgeSettingsPanel.test.tsx`: renders per-badge switches labelled "Choice" and "Brand+" after the master switch; each calls `onBadgeChange(badge, value)`; while the master is off they are **disabled but keep their values** ("disabled (but keep their values) while the master switch is off"); tab order master → Choice → Brand+; 0 axe violations
- [X] T071 [P] [US3] Extend `src/popup/components/pages/PopupPage/PopupPage.test.tsx`: toggling Brand+ off writes `{ ..., hide: { choice: true, brandPlus: false } }`; turning the master off and on again brings back the previous per-badge selection (data-model: "The master switch keeps the per-badge choices")
- [X] T072 [P] [US3] Write the E2E acceptance test `tests/e2e/us3-per-badge.spec.ts` (fixture `home-com`, which contains both badge types): Scenario 1, defaults hide both; Scenario 2, Brand+ off in the popup → within 1 s Choice cards hidden and Brand+ cards visible, and the popup count/breakdown shows only Choice; Scenario 3, with the page left open, Choice off and Brand+ on → the page reflects it without a reload, then `relaunch()` → selection kept. Also: a card carrying both badges stays hidden while either of its badges is selected

### Implementation for User Story 3

- [X] T073 [US3] Add per-badge `SettingRow`s to `src/popup/components/organisms/BadgeSettingsPanel/BadgeSettingsPanel.tsx` (iterate `BADGE_TYPES`, labels from `BADGE_LABELS`, `disabled={!enabled}`, per-row `saveError`) and its `.module.scss` (indent the per-badge rows under the master) (makes T070 pass)
- [X] T074 [US3] Wire `setBadgeHidden` from `useSettings` into `BadgeSettingsPanel` in `src/popup/components/pages/PopupPage/PopupPage.tsx` (makes T071 pass)
- [X] T075 [US3] Make all US3 tests pass (`npm test`, `npx playwright test tests/e2e/us3-*`), confirm the US1 and US2 tests still pass, then run [quickstart V8](./quickstart.md#validation-scenarios) by hand. Done on 2026-11-01 with an automated browser on live AliExpress rather than by hand, in both card layouts and across a restart

**Checkpoint**: all user stories work on their own.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance gates, Firefox parity, docs, and final validation.

- [X] T076 [P] Write `tests/perf/budgets.perf.spec.ts`, which runs the real content-script code in real Chromium through Playwright, following plan § "How budgets are enforced": for each measurement (classifying a 60-card batch, `countHidden` over 500 cards from `manyCards`), 10 warm-up runs then 50 timed runs, take the p95; repeat 5 times and use the **median** p95; **fail only if it exceeds 2.2 ms** (2 ms budget + the constitution's 10% tolerance). Print the measured value next to the 2 ms budget in the test output. Changed from a Vitest bench on 2026-11-01: jsdom runs this code about 30 times slower than Chromium (33–40 ms against about 1 ms), so a budget measured there says nothing, and the Vitest `perf` project and `vitest bench` were removed
- [X] T077 [P] Write `tests/perf/scroll-500.perf.spec.ts` (Playwright + extension harness, `manyCards(500)` served at a search URL): record a trace with `page.context().tracing` / CDP `Performance` while scrolling to the bottom in steps, and assert **no main-thread task > 55 ms** (50 ms budget + 10%) comes from the content script. **Page-load overhead (SC-004)**: an init script (`page.addInitScript`) records `usable` = `performance.now()` at the first `requestAnimationFrame` in which the primary results container has ≥ 1 card with a non-`none` computed display. Serve `search-com` with its images (served locally, no network) 7 times with the extension and 7 times in a second persistent context **without** it, take the medians, and fail only if the overhead is **> 10% of the no-extension median and > 16 ms** (plan § "How budgets are enforced"). **Settings latency**: fail if a settings toggle → `<html>` attribute update (`performance.now()` around a storage write and a `MutationObserver` on the attribute, median of 5) exceeds **55 ms**. Print every measured value next to its budget
- [X] T078 Create `scripts/check-bundle-size.mjs` and the npm script `size`: fail if `dist/content.js` > **20 KB** minified or the gzipped popup JS total > **100 KB**. Then update `.github/workflows/ci.yml`: add `npm run size` after `build`, and `npm run test:perf` after `test:e2e`. Performance budget regressions then fail CI and block merge (constitution Principle V: "a regression beyond 10% of the agreed budget MUST block merge"; merge gate: "performance checks where defined"). Depends on T076 and T077, because `test:perf` fails when no perf tests exist
- [X] T079 [P] Enforce coverage in `vitest.config.ts`: `coverage.thresholds` lines **80** for `src/**` (excluding `src/**/index.ts` and `src/popup/main.tsx`); CI already runs `test -- --coverage`
- [X] T080 [P] Add the npm script `sign:firefox` = `web-ext sign --channel=unlisted --source-dir dist --artifacts-dir web-ext-artifacts` (reads `WEB_EXT_API_KEY`/`WEB_EXT_API_SECRET` from the environment; never commit them) and add `web-ext-artifacts/` to `.gitignore`
- [X] T081 [P] Write `README.md`: what NoChoice does (one paragraph), privacy statement (no data collected or sent; settings stored locally only; FR-017), install steps for Chrome and Firefox (temporary, unlisted-signed, Developer Edition; link to [quickstart.md](./specs/001-hide-choice-listings/quickstart.md)), dev commands, and "When AliExpress changes its markup" (link to the fixture capture procedure). Note that infinite scroll is deliberately out of scope, with a link to research R2
- [ ] T082 [MANUAL] Firefox parity pass (FR-020): `npm run build`, run `npx web-ext run --source-dir dist`, then execute [quickstart V1–V13](./quickstart.md#validation-scenarios) in current Firefox. For V6 use the unlisted-signed `.xpi` or Developer Edition. Record pass/fail per scenario in `specs/001-hide-choice-listings/validation.md`
- [ ] T083 [MANUAL] Live-site acceptance sample in Chrome **and** Firefox (SC-001, SC-002, SC-003, SC-007): ≥ 10 pages across search, category, store, homepage, and product-page recommendations on `aliexpress.com`, `aliexpress.us`, and `pl.aliexpress.com` (Polish, PLN). Also confirm `aliexpress.ru` is untouched (no extension effect). For each page record badged-visible (must be 0) and unbadged-hidden (must be 0), do one screen recording of fast scrolling checked frame by frame for flashes, and confirm the Network panel shows 0 extension-initiated requests and storage holds only `settings`. Append the results to `specs/001-hide-choice-listings/validation.md`. Chromium half done on 2026-11-01 with an automated browser (a per-frame monitor replaces the screen recording); the Firefox half is open
- [X] T084 Final gate: run `npm run lint`, `format:check`, `typecheck`, `test -- --coverage`, `build`, `size`, `lint:ext`, `test:e2e`, `test:perf`. All exit 0, and no warnings are suppressed without an inline justification. No `TODO`s without an issue link (`grep -rn "TODO" src tests` is clean)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T013 depends on T001–T012.
- **Foundational (Phase 2)**: depends on Setup. **T014 → T015 are manual and block US1 signature work (T037, T039)**. T016–T024 can proceed while fixtures are being captured.
- **US1 (Phase 3)**: depends on Foundational. The MVP.
- **US2 (Phase 4)**: depends on Foundational. It reuses `hiddenCount.ts` (T045) and `main.ts` (T048) from US1. Its E2E tests assert hiding, so in practice US1 should be complete first.
- **US3 (Phase 5)**: depends on US2's popup components (T066, T068) and `useSettings` (T064).
- **Polish (Phase 6)**: depends on all stories. T076/T077 need US1. T078 needs T076 and T077 (it adds `test:perf` to CI). T082/T083 need everything.

### Within Each User Story

- Test tasks first, run, and **observed failing** (Red) → implementation (Green) → refactor.
- US1 order: T036 → T037 → T038; T039 → T040 → T041; T042/T043/T044 in any order; T045 → T046 → T047 → T048 → T049.
- US2 order: T059 → T060 → T061; T062 → T063 → T066 → T067 → T068; T064/T065 before T068.

### Parallel Opportunities

- Setup: T003–T012 all [P] once T001–T002 are done.
- Foundational: T016, T017, T018, T019, T021, T023 in parallel; T024 after T013.
- US1: all test tasks T025–T035 in parallel; T036, T039, T042, T043, T044 in parallel.
- US2: all test tasks T050–T058 in parallel; T059 and T062 in parallel.
- US3: T070, T071, T072 in parallel.
- Polish: T076, T077, T079, T080, T081 in parallel; T078 after T076 and T077.

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests together (each must fail first):
Task: "detectBadges unit test in tests/unit/detectBadges.test.ts"
Task: "findListingRoot unit test in tests/unit/findListingRoot.test.ts"
Task: "Fixture contract test in tests/contract/fixtureLabels.contract.test.ts"
Task: "applySettings unit test in tests/unit/applySettings.test.ts"
Task: "watchPage unit test in tests/unit/watchPage.test.ts"
Task: "E2E acceptance in tests/e2e/us1-hiding.spec.ts"

# Then the independent implementation files together:
Task: "DOM contract constants in src/content/domContract.ts"
Task: "Listing container signatures in src/content/listings/listingContainers.ts"
Task: "Hide rules in src/content/content.scss"
Task: "applyHiding in src/content/page/applySettings.ts"
Task: "Page state in src/content/page/pageState.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Messaging contract test in tests/contract/messaging.contract.test.ts"
Task: "Switch/Text/VisuallyHidden atom tests in src/popup/components/atoms/**"
Task: "PageStatus + BadgeSettingsPanel organism tests in src/popup/components/organisms/**"
Task: "useSettings + usePageStatus hook tests in src/popup/hooks/*.test.ts"
Task: "E2E acceptance in tests/e2e/us2-toggle-count.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational (**get the manual fixture capture T014/T015 done first**; it is the critical path).
2. Phase 3 US1 → **STOP and validate**: load unpacked in Chrome and browse AliExpress. Hiding works with defaults and no popup.

### Incremental Delivery

1. Setup + Foundational → harness and settings ready.
2. US1 → hiding MVP (personal use already worthwhile).
3. US2 → popup with count and master switch (escape hatch).
4. US3 → per-badge switches.
5. Polish → perf gates, Firefox parity, live-site acceptance.

### Maintenance Loop (when AliExpress changes markup)

Recapture the affected fixture (T014 procedure) → update the labels (T015) → the contract test T027 goes red → update `badgeSignatures.ts` / `listingContainers.ts` → green.

---

## Notes

- [P] = different files, no dependencies on incomplete tasks; [MANUAL] = requires a human browser session.
- Commit after each task or logical group; each commit leaves lint, typecheck, and tests green.
- Never key detection on hashed AliExpress class names; never hide on uncertainty (FR-016).
- Do not add a background script, extra permissions, network calls, or other storage keys. These would break [research R3](./research.md#r3-extension-platform-manifest-version-and-cross-browser-apis) and FR-017/SC-007.
