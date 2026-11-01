# NoChoice

NoChoice is a browser extension for Chromium browsers and Firefox that hides AliExpress listings
carrying a "Choice" or "Brand+" badge. Listings are removed before they appear, and the grid closes
the gaps. It works with no setup. The toolbar popup shows how many listings are hidden on the
current page, and lets you turn hiding off or choose which badges to hide.

## Privacy

NoChoice collects nothing and sends nothing. It makes no network requests of its own, and your
settings are stored only in your browser, under one `settings` key. It runs only on `aliexpress.com`
(with its country subdomains) and `aliexpress.us`.

## Install

Build it first, with Node.js 24 and `npm ci && npm run build`, which creates `dist/`.

- **Chrome, Edge, Brave:** open `chrome://extensions`, turn on Developer mode, click **Load
  unpacked**, and choose `dist/`.
- **Firefox, temporary:** run `npx web-ext run --source-dir dist`, or use `about:debugging` → This
  Firefox → Load Temporary Add-on. It is removed when Firefox restarts.
- **Firefox, lasting:** set `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` from addons.mozilla.org, run
  `npm run sign:firefox`, and open the resulting `.xpi`. Unlisted means it isn't published.
  Firefox Developer Edition can also load it unsigned.

More detail is in the [quickstart](./specs/001-hide-choice-listings/quickstart.md).

## Development

| Command                | What it does                                                   |
| ---------------------- | -------------------------------------------------------------- |
| `npm run build`        | Builds the popup and content script into `dist/`               |
| `npm run dev:popup`    | Rebuilds the popup on change (run alongside `dev:content`)     |
| `npm run dev:content`  | Rebuilds the content script on change                          |
| `npm test`             | Unit, contract, and component tests                            |
| `npm run test:e2e`     | Builds, then runs Playwright against the extension in Chromium |
| `npm run test:perf`    | Builds, then checks the performance budgets in Chromium        |
| `npm run size`         | Checks the bundle size budgets                                 |
| `npm run lint`         | ESLint                                                         |
| `npm run format:check` | Prettier                                                       |
| `npm run typecheck`    | TypeScript                                                     |
| `npm run lint:ext`     | `web-ext lint` on `dist/`                                      |

Design documents and the constitution live in [`specs/`](./specs/001-hide-choice-listings/) and
[`.specify/memory/`](./.specify/memory/constitution.md).

## When AliExpress changes its markup

Badges are recognised by their logo image. If AliExpress changes a logo or adds a language, cards
with the new logo simply stay visible; nothing gets hidden by mistake.

1. Find the new image's asset ID, in the card's `/kf/<asset ID>` image URL.
2. Add it to [`badgeSignatures.ts`](./src/content/badges/badgeSignatures.ts) and
   [`badgeAssets.ts`](./tests/helpers/badgeAssets.ts).
3. Cover it with a fixture. See the
   [capture procedure](./specs/001-hide-choice-listings/quickstart.md#capturing-fixtures-first-implementation-task-and-whenever-aliexpress-changes)
   and the [fixtures README](./tests/fixtures/aliexpress/README.md).

Watch for two things: AliExpress serves each session one of two card layouts, each with its own
images, and it translates the Brand+ logo per language.

## Not included

Infinite scroll is deliberately left out. AliExpress paginates natively, and filling pages up would
mean requests made by the extension, which the privacy promise above rules out. See
[research R2](./specs/001-hide-choice-listings/research.md#r2-can-the-product-listing-use-infinite-scrolling-so-each-page-doesnt-end-up-with-a-random-number-of-products).
