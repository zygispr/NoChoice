# Implementation Plan: Hide Choice & Brand+ Listings on AliExpress

**Branch**: `001-hide-choice-listings` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-hide-choice-listings/spec.md`

## Summary

A Manifest V3 browser extension for desktop Chromium browsers and Firefox. It hides AliExpress
product listings that carry a "Choice" or "Brand+" badge. A plain-TypeScript **content script**
runs at `document_start`. It labels each listing card with its badges as the card is added (a
`MutationObserver` marks it before the first paint) and hides labelled cards with CSS rules
switched on by one attribute on `<html>`. That makes settings changes, per-badge switches, and the
per-page reveal instant and cheap. A small **React + Vite popup** with atomic-design components
and SCSS modules shows the per-page hidden count and the on/off and per-badge switches. Settings
live in `chrome.storage.local`. There is **no backend and no background script**, and the
extension makes no network requests of its own.
**Infinite scroll is not part of v1**: AliExpress paginates natively, and filling pages up would
mean extension-made requests, which SC-007 forbids and which trigger AliExpress's anti-bot
protection. See [research.md § R2](./research.md#r2-can-the-product-listing-use-infinite-scrolling-so-each-page-doesnt-end-up-with-a-random-number-of-products).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), on Node.js 24 LTS (toolchain only)

**Primary Dependencies**: the complete list. Adding any package means updating this table
first (constitution: "every new dependency is justified in the plan").

| Package | Kind | Why it is needed |
|---|---|---|
| `react`, `react-dom` (19.x) | runtime (popup only) | User-mandated UI library for the toolbar popup (research R7) |
| `vite` (**7.x**, pinned major) | dev | User-mandated build tool for the popup and content script bundles (R6). Pinned because T007 relies on Vite 7's library-mode CSS naming and esbuild minifier options; moving to a later major means re-checking those first |
| `@vitejs/plugin-react` | dev | Vite's JSX transform for the React popup |
| `sass` | dev | Compiles the user-mandated SCSS (Vite's Sass peer dependency) |
| `typescript` | dev | User-mandated type safety, `tsc --noEmit` gate |
| `@types/chrome`, `@types/react`, `@types/react-dom` | dev | Type definitions for the extension APIs and React |
| `@types/node` | dev | Types for the Node APIs (`fs`, `crypto`, `zlib`, `path`) used by tests, the Playwright harness, build scripts, and `*.config.ts`. Only loaded by `tsconfig.node.json`, never by `src/` |
| `eslint`, `@eslint/js` | dev | User-mandated linter. `@eslint/js` provides the core recommended rules the flat config needs |
| `typescript-eslint` | dev | Type-aware lint rules (`strictTypeChecked`) |
| `eslint-plugin-react-hooks` | dev | Catches hook misuse in the popup |
| `eslint-plugin-jsx-a11y` | dev | Static accessibility checks toward WCAG 2.2 AA (FR-019) |
| `globals` | dev | Browser and Node global definitions for the ESLint flat config |
| `eslint-config-prettier` | dev | Turns off ESLint rules that conflict with Prettier |
| `prettier` | dev | User-mandated formatter |
| `vitest` | dev | Unit, contract, and component test runner, Vite-native (R9) |
| `@vitest/coverage-v8` | dev | Coverage reports and the 80% line threshold the constitution requires |
| `jsdom` | dev | DOM environment for Vitest (fixture-based content-script tests) |
| `@types/jsdom` | dev | Types for `jsdom`, which the E2E and perf tests also use in Node to build synthetic pages from fixtures |
| `@testing-library/react` | dev | Renders popup components through their public interface |
| `@testing-library/dom` | dev | Required peer dependency of `@testing-library/react` 16 (queries, `screen`); npm does not install it automatically |
| `@testing-library/user-event` | dev | Realistic keyboard and pointer input for the FR-019 keyboard tests |
| `@testing-library/jest-dom` | dev | DOM assertions (`toBeChecked`, `toHaveAccessibleName`, …) for readable tests |
| `vitest-axe` | dev | Automated axe accessibility checks in component tests (FR-019) |
| `@playwright/test` | dev | E2E tests with the unpacked extension loaded in Chromium (R9) |
| `web-ext` | dev | Firefox manifest lint, run, and unlisted signing (R8, R10) |

No other runtime dependencies. The `dev` workflow uses two npm scripts (`dev:popup`,
`dev:content`) run in separate terminals, not a task-runner package.

**Storage**: `chrome.storage.local` holds one versioned `settings` object
([contracts/settings-storage.md](./contracts/settings-storage.md)). Per-page state is in memory
in the content script.

**Testing**: Vitest + jsdom (unit, contract, against sanitised AliExpress fixtures), React Testing
Library + vitest-axe (popup components), Playwright Chromium with the unpacked extension loaded and
fixture-routed AliExpress URLs (E2E), Vitest bench + Playwright trace (performance)

**Target Platform**: desktop Chromium-based browsers (Chrome, Edge, Brave; current stable) and
desktop Firefox (current stable, 128+ / ESR). Manifest V3. Safari kept possible (no Chrome-only
APIs).

**Project Type**: browser extension (content script + popup UI); single package

**Performance Goals**:

- Classifying one batch of ≤ 60 newly added cards: **≤ 2 ms** p95, and no main-thread task over
  **50 ms** caused by the content script while scrolling through 500 cards (SC-004).
- Content script work at page load: **≤ 10%** added time to the page becoming usable (SC-004).
  "Usable" means the first animation frame in which the primary results container shows at least
  one visible card.

**How budgets are enforced (deterministic gate)**: `npm run test:perf` runs in CI, on the same
runner type every time. The constitution blocks merge on a regression "beyond 10% of the agreed
budget", so each gate fails only above **budget × 1.10**: classify p95 > **2.2 ms**, any content
script task > **55 ms**, settings-change latency > **55 ms**. Each value is the **median of 5
repeated measurements** (each measurement = 50 runs after 10 warm-up runs), which makes a pass or
fail stable. Real code is expected to sit far below the budgets, and the test prints the measured
values beside them. For page-load overhead (`usable` time with the extension minus without,
median of 7 runs each), the gate is **> 10% of the no-extension time *and* > 16 ms**. The 16 ms
(one frame) floor stops timer noise on a fast local fixture from failing the build; on the live
site, where pages take seconds, the 10% rule is the one that bites (checked by hand in quickstart V12).
- Settings change or reveal → page updated: **≤ 50 ms** (spec limit 1 s, FR-011/SC-006).
- Popup open → interactive with count shown: **≤ 100 ms** (constitution interactive budget).
- Bundle sizes: content script **≤ 20 KB** minified (no framework). Popup **≤ 100 KB** gzipped.

**Constraints**: no network requests of its own (SC-007, FR-017). Permissions limited to `storage`
plus AliExpress hosts. Matching listings never painted (FR-006). Fail-safe: anything unrecognised
stays visible (FR-016). Never act on non-AliExpress sites (FR-018). WCAG 2.2 AA popup and notice
(FR-019).

**Scale/Scope**: one shopper and browser profile. Pages with up to about 500 listings loaded per
session (SC-004). 2 badge types, 1 settings object, 1 popup screen with 5 UI states, 1 in-page
notice. About 6 page types × 2 supported domains (`aliexpress.com` with its country subdomains,
and `aliexpress.us`) of AliExpress markup to recognise. `aliexpress.ru` is out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-design | Post-design |
|---|---|---|---|
| **I. Code Quality** | Formatter, linter, and type checker at zero errors. Single-responsibility units. Errors handled where they can be acted on. | ✅ Prettier + ESLint (`strictTypeChecked`, jsx-a11y) + `tsc --noEmit` strict, all in CI (R8). | ✅ Content script split into small units (detect / locate / classify / apply / count / observe / notice). Storage and messaging errors are handled at the popup boundary with user-facing states ([contracts/popup-ui.md](./contracts/popup-ui.md)). |
| **II. Simplicity** | Every dependency or layer justified. YAGNI. | ✅ No backend, no background script, no state library, no router, no extension framework (R1, R3, R6). React, atomic design, and SCSS are user-mandated → Complexity Tracking. | ✅ Design adds only what the FRs need: one storage key, one port protocol, one root attribute. Infinite scroll deferred (R2). |
| **III. Testing (NON-NEGOTIABLE)** | Test-first. E2E per user story. Contract tests at boundaries. | ✅ Vitest/RTL/Playwright stack chosen (R9). | ✅ Boundaries with contracts: AliExpress markup (fixture contract), storage schema, popup↔content messages. E2E for US1–US3 in Chromium. Firefox parity is a manual check (see Complexity Tracking). |
| **IV. Great UX** | User-perspective states, immediate feedback, WCAG 2.2 AA, no lost data. | ✅ Spec covers primary, empty (all hidden), off, not-AliExpress, and error states. | ✅ Popup UI contract lists every state, including "reload needed" and "settings couldn't be saved". The notice is keyboard-reachable and announced through `role="status"`. Settings persist (FR-014). Shared SCSS tokens keep the popup and notice consistent. |
| **V. Performance** | Measurable budgets plus automated perf tests. | ✅ Budgets above. | ✅ O(1) setting toggles (root attribute). Observer processes only added nodes. Bench + trace tests in `tests/perf/` run in CI as a merge gate (`npm run test:perf`, added by T078), so a > 10% budget regression blocks merge. |
| **VI. Scalability** | Bounded collections, versioned schemas, observability. | ✅ No unbounded caches: state lives on DOM attributes, which are freed with the nodes. | ✅ `settings.version` and message `type` names are versioned with a migration rule. Observability exception (no telemetry, by FR-017) → Complexity Tracking. |

**Result**: PASS (pre- and post-design). The deviations below are justified.

## Project Structure

### Documentation (this feature)

```text
specs/001-hide-choice-listings/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R11 (backend, infinite scroll, platform, …)
├── data-model.md        # Phase 1: Settings, ListingClassification, PageState, BadgeSignature
├── quickstart.md        # Phase 1: setup, run, and validation scenarios
├── contracts/
│   ├── settings-storage.md   # chrome.storage.local schema v1, defaults, validation, migration
│   ├── messaging.md          # popup ↔ content script port protocol
│   ├── page-dom.md           # attributes/CSS the content script writes into AliExpress pages + notice
│   └── popup-ui.md           # popup states, copy, and accessibility contract
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
public/
├── manifest.json                 # MV3; one manifest for Chromium + Firefox
└── icons/                        # 16/32/48/128 px

src/
├── shared/                       # used by both content script and popup
│   ├── settings.ts               # Settings type, DEFAULT_SETTINGS, parseSettings (validate + migrate)
│   ├── settingsStore.ts          # read/write/subscribe over chrome.storage.local
│   ├── messages.ts               # port name + message types (contracts/messaging.md)
│   ├── badgeTypes.ts             # 'choice' | 'brand-plus', display labels
│   └── styles/_tokens.scss       # colours, spacing, type, focus ring (popup + notice)
├── content/                      # plain TypeScript, no React — runs on AliExpress pages
│   ├── main.ts                   # entry: wires settings, observer, messaging
│   ├── content.scss              # root-attribute hide rules (manifest-injected CSS)
│   ├── badges/
│   │   ├── badgeSignatures.ts    # data table of locale-independent badge signatures
│   │   └── detectBadges.ts       # (element) → BadgeType[]; pure
│   ├── listings/
│   │   ├── listingContainers.ts  # known listing container signatures per page type
│   │   ├── findListingRoot.ts    # badge node → card grid item, or null (fail-safe)
│   │   └── classifyListing.ts    # writes data-nochoice-badges
│   ├── page/
│   │   ├── applySettings.ts      # writes <html data-nochoice-hide="…">
│   │   ├── pageState.ts          # page key, reveal flag, reset on results change
│   │   ├── hiddenCount.ts        # count of currently hidden listings
│   │   └── watchPage.ts          # MutationObserver loop
│   ├── notice/
│   │   ├── allHiddenNotice.ts    # shadow-root notice + "Show N hidden listings"
│   │   └── allHiddenNotice.scss
│   └── statusPort.ts             # answers popup port (contracts/messaging.md)
└── popup/
    ├── index.html
    ├── main.tsx
    ├── hooks/
    │   ├── useSettings.ts        # settings state + persistence
    │   └── usePageStatus.ts      # active tab → port → live hidden count / page kind
    └── components/               # atomic design (levels created only when populated)
        ├── atoms/                # Switch, Text, VisuallyHidden   (+ .module.scss, .test.tsx)
        ├── molecules/            # SettingRow, HiddenCountSummary
        ├── organisms/            # BadgeSettingsPanel, PageStatus
        ├── templates/            # PopupLayout
        └── pages/                # PopupPage (only level that uses hooks / chrome.*)

tests/
├── fixtures/aliexpress/          # sanitised captured pages + <name>.expected.json labels
├── unit/                         # content logic + shared settings
├── contract/                     # fixture labels, storage schema, message shapes
├── e2e/                          # Playwright: us1-hiding, us2-toggle-count, us3-per-badge, edge cases
└── perf/                         # classify bench, 500-card scroll trace

vite.config.ts                    # popup build
vite.content.config.ts            # content script IIFE + content.css
eslint.config.js · .prettierrc · tsconfig.json · playwright.config.ts · vitest.config.ts · .nvmrc
```

**Structure Decision**: one package with three source areas: `content/` (performance-critical, no
framework), `popup/` (React, atomic design), and `shared/` (types, settings, messages, tokens used
by both). Popup component tests live next to their components, as atomic design usually does.
Logic, contract, E2E, and perf tests live under `tests/`. There is no `backend/` (research R1).

## Complexity Tracking

| Violation / deviation | Why needed | Simpler alternative rejected because |
|---|---|---|
| **React + Vite for a one-screen popup** | User-mandated stack. It also gives a tested, accessible component model if the popup grows (Safari, more badge types). | Plain HTML + TS popup would be smaller, but the user chose React. Cost is limited to the popup (local, about 60 KB gzipped). The content script stays framework-free. |
| **Atomic design for about 8 components** | User-mandated structure. It keeps the popup and any future options page consistent. | A flat `components/` folder is simpler at this size. Mitigation: levels are created only when they hold a component, and no speculative atoms. |
| **SCSS (Sass) instead of plain CSS** | User-mandated. Shared `_tokens.scss` partial keeps the popup and in-page notice consistent (Principle IV). | Plain CSS custom properties could share tokens, but the user chose SCSS. One dev dependency (`sass`). |
| **Two Vite build configs** | Content scripts must be classic (IIFE) scripts, while the popup builds as ES modules. One Vite build can't output both formats. | One build with a plugin framework (WXT/CRXJS) adds a framework layer; see research R6. |
| **No structured logs or metrics (Principle VI)** | FR-017 and SC-007 forbid collecting or sending any data. | Telemetry is forbidden by the spec. Only dev-build `console.debug` diagnostics (stripped from production builds) are allowed for local debugging. |
| **Firefox parity verified manually, not by automated E2E** | Playwright cannot load extensions in Firefox. | A second E2E stack (Selenium + geckodriver) is a large addition for v1. Mitigated by using only APIs that behave the same in both browsers, `web-ext lint` in CI, and the quickstart Firefox pass. |
| **Test seam: popup `?tabId=` query parameter** | E2E must point the popup at a fixture tab; a popup opened as a tab sees itself as active. | Driving the real toolbar popup is not supported by Playwright. The seam is read-only and does nothing in normal use. |
