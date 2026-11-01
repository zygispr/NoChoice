# AliExpress fixtures

Sanitised captures of real AliExpress pages, used by the fixture contract test and E2E tests.

| Fixture              | URL                                                            | Captured   | Language | Currency | Ship to   | Browser             |
| -------------------- | -------------------------------------------------------------- | ---------- | -------- | -------- | --------- | ------------------- |
| search-com           | https://www.aliexpress.com/w/wholesale-phone-case.html         | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156          |
| search-us            | https://www.aliexpress.us/w/wholesale-phone-case.html          | 2026-11-01 | English  | EUR      | US        | Chrome 156          |
| search-pl            | https://pl.aliexpress.com/w/wholesale-etui.html                | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156          |
| category-com         | https://www.aliexpress.com/w/wholesale-Mounts-%26-Holders.html | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156          |
| store-com            | https://www.aliexpress.com/store/1104686185                    | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156          |
| home-com             | https://www.aliexpress.com/                                    | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156          |
| pdp-com              | https://www.aliexpress.com/item/1005011879619630.html          | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156          |
| search-com-us-layout | https://www.aliexpress.com/w/wholesale-phone-case.html?page=2  | 2026-11-01 | English  | EUR      | Lithuania | Playwright Chromium |

## How the labels were made

`<name>.expected.json` was generated from the HTML, not checked card by card by a person. Every
image without alt text on every card, across all fixtures, was listed (20 distinct images) and
inspected by eye, which identified the badge images:

| Badge  | Image asset IDs                                                            |
| ------ | -------------------------------------------------------------------------- |
| Choice | `S135d2af8d57840b28092ceba069bdb6c4`, `S1887a285b60743859ac7bdbfca5e0896Z` |
| Brand+ | 21 translated logos, listed in `tests/helpers/badgeAssets.ts`              |

No card shows these badges as text or as a CSS background. The labels were spot-checked against
screenshots of `home-com` and `search-us`. Screenshots are local aids and are not committed.

**Card layouts**: AliExpress serves one of two card layouts, whatever the domain: `new--…` or
`us--…`. Each has its own badge images, so a badge needs a fixture in both layouts. Which one a page
gets isn't predictable, and it can change in the same session, even when a sort replaces the results. `search-com-us-layout` was added
after the second Brand+ image was found on the live site, with an automated browser, which is why
it has only one Brand+ card.

**Card keys**: `productId` is the ID from the card's `/item/<id>.html` link. "Bundle deals" cards
lost their product ID when the query string was stripped during sanitising, so they use
`image:<photo asset ID>`. `search-com-us-layout` was captured with those IDs, so its Bundle deals
links are reduced to `/item/<id>.html` too. A key that repeats gets `#2`, `#3`, … in document order: the same product
can appear twice with different badges, because sponsored cards show none.

**Languages**: Choice is one logo in every language sampled. Brand+ is translated (Marcas+, Marke+,
Marque+, Marka+, …), per card layout. No attribute on a card marks it as Brand+ in a language-independent
way, so each logo is listed. They were found on 2026-11-01 by listing the images in the title of cards
on 14 language sites and inspecting them by eye. Turkish, Thai, and Korean were seen in one layout only.

`search-locales` is **assembled, not captured**: real stripped cards with their badges removed, each
given one real translated logo, so every signature is covered by a fixture without storing a capture
per language. Its URL is made up.

## What was removed

These pages are published with the repo, so third-party content is stripped and only the structure
the tests need remains:

- Everything except the listing containers, their ancestors, and (in `pdp-com`) the main product
  block `.pdp-info` and the emptied title `.recommend-store--title`, which locates the "Recommended"
  grid.
- All visible text, which is replaced by `Text`. Image `alt` text becomes `Product photo`.
- AliExpress's scripts, stylesheets, icons, inline styles, and tracking attributes. Each listing
  container gets a small inline grid style so layout tests still work.
- Links other than product links. Product links are reduced to `/item/<id>.html`.

Classes, IDs, nesting, and image URLs are unchanged. Images are links, so none are stored here.

## Known gaps

- `search-pl` is `pl.aliexpress.com` markup, but in English and EUR, not Polish and PLN. The Polish
  logos are covered by `search-locales` and were checked live (see `validation.md`).
- A language not listed above, or a new logo, goes undetected, and its cards stay visible (FR-016).
- `search-us` shows EUR, not USD.
- Sponsored cards ("Premium sponsored items") show no badge at all, even for products that are Choice
  in the main grid. Detection works from badges, so these stay visible.
- `store-com` contains only Choice cards, so no real store card tests that unbadged cards stay
  visible.
