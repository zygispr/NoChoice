# AliExpress fixtures

Sanitised captures of real AliExpress pages, used by the fixture contract test and E2E tests.

| Fixture      | URL                                                            | Captured   | Language | Currency | Ship to   | Browser    |
| ------------ | -------------------------------------------------------------- | ---------- | -------- | -------- | --------- | ---------- |
| search-com   | https://www.aliexpress.com/w/wholesale-phone-case.html         | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156 |
| search-us    | https://www.aliexpress.us/w/wholesale-phone-case.html          | 2026-11-01 | English  | EUR      | US        | Chrome 156 |
| search-pl    | https://pl.aliexpress.com/w/wholesale-etui.html                | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156 |
| category-com | https://www.aliexpress.com/w/wholesale-Mounts-%26-Holders.html | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156 |
| store-com    | https://www.aliexpress.com/store/1104686185                    | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156 |
| home-com     | https://www.aliexpress.com/                                    | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156 |
| pdp-com      | https://www.aliexpress.com/item/1005011879619630.html          | 2026-11-01 | English  | EUR      | Lithuania | Chrome 156 |

## How the labels were made

`<name>.expected.json` was generated from the HTML, not checked card by card by a person. Every
image without alt text on every card, across all fixtures, was listed (20 distinct images) and
inspected by eye, which identified the badge images:

| Badge  | Image asset IDs                                                            |
| ------ | -------------------------------------------------------------------------- |
| Choice | `S135d2af8d57840b28092ceba069bdb6c4`, `S1887a285b60743859ac7bdbfca5e0896Z` |
| Brand+ | `Sca1bcdd1057c4a388af0eed405d9a464x`                                       |

No card shows these badges as text or as a CSS background. The labels were spot-checked against
screenshots of `home-com` and `search-us`. Screenshots are local aids and are not committed.

**Card keys**: `productId` is the ID from the card's `/item/<id>.html` link. "Bundle deals" cards
lost their product ID when the query string was stripped during sanitising, so they use
`image:<photo asset ID>`. A key that repeats gets `#2`, `#3`, … in document order: the same product
can appear twice with different badges, because sponsored cards show none.

## What was removed

These pages are published with the repo, so third-party content is stripped and only the structure
the tests need remains:

- Everything except the listing containers, their ancestors, and (in `pdp-com`) the main product
  block `.pdp-info`.
- All visible text, which is replaced by `Text`. Image `alt` text becomes `Product photo`.
- AliExpress's scripts, stylesheets, icons, inline styles, and tracking attributes. Each listing
  container gets a small inline grid style so layout tests still work.
- Links other than product links. Product links are reduced to `/item/<id>.html`.

Classes, IDs, nesting, and image URLs are unchanged. Images are links, so none are stored here.

## Known gaps

- `search-pl` is `pl.aliexpress.com` markup, but in English and EUR, not Polish and PLN. No fixture
  covers a non-English page. Badges are detected by image, so language should not matter, but a
  localised badge image would go undetected, and those cards would stay visible (FR-016).
- `search-us` shows EUR, not USD.
- Sponsored cards ("Premium sponsored items") show no badge at all, even for products that are Choice
  in the main grid. Detection works from badges, so these stay visible.
- `store-com` contains only Choice cards, so no real store card tests that unbadged cards stay
  visible.
