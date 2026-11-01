# Validation Record

Results of the live checks in [quickstart.md](./quickstart.md#validation-scenarios), run on
2026-11-01 on `0.1.0`.

## How this was checked

The quickstart describes these as hand checks. Playwright's Chromium now receives real AliExpress
pages (research R5), so they were scripted against the live site with the built extension loaded.
The scripts were one-offs and are not part of the repository, because a test suite should not depend
on a live third-party site. A person confirmed V1 by hand in Chrome, which is how the Brand+ gap was
first found.

## Chromium: live pages (SC-001, SC-002, SC-003)

Each page was scrolled through, and a per-frame monitor replaced the frame-by-frame screen recording:
on every animation frame it counted badge images visible in the viewport inside a listing container.

| Page | Language | Layout | Cards | Badged | Badged visible | Unbadged hidden | Frames with a visible badge |
|---|---|---|---|---|---|---|---|
| `www.aliexpress.com/` | en | - | 3 | 0 | 0 | 0 | 0 of 358 |
| `www.aliexpress.com/w/wholesale-xiaomi.html` | en | us | 60 | 37 | 0 | 0 | 0 of 352 |
| `www.aliexpress.com/w/wholesale-phone-case.html?page=2` | en | - | 5 | 0 | 0 | 0 | 0 of 347 |
| `www.aliexpress.com/w/wholesale-Mounts-%26-Holders.html` | en | us | 65 | 45 | 0 | 0 | 0 of 347 |
| `www.aliexpress.com/store/1104686185` | - | - | 35 | 30 | 0 | 0 | 0 of 351 |
| `www.aliexpress.com/item/1005011879619630.html` | en | - | 44 | 32 | 0 | 0 | 0 of 341 |
| `www.aliexpress.us/w/wholesale-anker-charger.html` | en | us | 59 | 12 | 0 | 0 | 0 of 373 |
| `pl.aliexpress.com/w/wholesale-xiaomi.html` | pl | us | 60 | 36 | 0 | 0 | 0 of 350 |
| `pl.aliexpress.com/` | pl | - | 62 | 58 | 0 | 0 | 0 of 352 |
| `es.aliexpress.com/w/wholesale-xiaomi.html` | es | us | 60 | 37 | 0 | 0 | 0 of 351 |
| `de.aliexpress.com/w/wholesale-xiaomi.html` | de | us | 60 | 37 | 0 | 0 | 0 of 356 |
| `fr.aliexpress.com/w/wholesale-xiaomi.html` | fr | us | 60 | 37 | 0 | 0 | 0 of 356 |
| `nl.aliexpress.com/w/wholesale-xiaomi.html` | nl | us | 60 | 36 | 0 | 0 | 0 of 349 |
| `ar.aliexpress.com/w/wholesale-xiaomi.html` | ar | us | 60 | 36 | 0 | 0 | 0 of 348 |

**Result**: 0 badged listings visible and 0 unbadged listings hidden on all 14 pages, with no frame
showing a badge. The main product stayed visible on the product page (FR-009). No visible badge image
was found outside a classified card on any page.

Limits of this sample:

- "Badged" means carrying a logo known to `tests/helpers/badgeAssets.ts`, so an unidentified logo
  would not count as a miss. The first run of this check reported 0 misses in Polish while more than
  20 Brand+ cards were showing on one search, because the Polish logo was unknown. It was found by looking at the
  unrecognised images, and the same search now finds 36–37 badged cards in all seven languages tried.
- The `.com` homepage rendered 3 cards and `?page=2` rendered 5 in this run, so they add little. The
  `.us` and `pl.` homepages rendered 57 and 62 cards in an earlier run of the same check.
- The monitor samples at animation frames, in headless Chromium. It is good evidence, not proof.
- A card's status is read after scrolling, so a card replaced during the visit is judged as it ended.

## Chromium: other checks

| # | Check | Result |
|---|---|---|
| V1 | Default hiding | Pass (live table above; E2E; confirmed by hand by the project owner) |
| V2 | Lazy and later loads | Pass (flash monitor above; E2E). Sort and filter were not exercised live, only in-place replacement on fixtures |
| V3 | Page-type and region sample | Pass (table above) |
| V4 | Product page untouched | Pass (table above; E2E) |
| V5 | Toggle and count | Pass, live: count matched the page (36), off in 74 ms, on in 30 ms |
| V6 | Persistence | Pass (E2E, restart on the same profile) |
| V7 | Not AliExpress | Pass, live: `example.com` and `aliexpress.ru` untouched, popup says it only works on AliExpress |
| V8 | Per-badge | Pass, live, in both card layouts and across a restart |
| V9 | All hidden | Pass (E2E on synthetic pages). Not seen on a live page |
| V10 | Fail-safe | Pass (E2E) |
| V11 | No network, no data | Pass: no network APIs in `content.js` or the popup bundle, no requests from extension pages live, storage holds at most `settings` |
| V12 | Performance | Pass (`npm run test:perf`). Live load time: median 912 ms without the extension, 957 ms with it (about 5%; small and noisy sample) |
| V13 | Accessibility | Partial: axe and keyboard tests pass. Not yet tried with VoiceOver or NVDA |

`aliexpress.ru` was confirmed untouched live, with no attributes and no notice.

## Languages (FR-007)

Choice uses the same two logos in every language sampled. Brand+ is translated, and each language
has an image per card layout:

| Status | Languages |
|---|---|
| Both layouts known | English, Italian, and Japanese (these share one logo), Spanish, German, French, Portuguese, Polish, Dutch, Arabic, Hebrew |
| One layout known | Turkish, Thai, Korean |
| Not confirmed | Vietnamese, whose site returned English markup in the sample, and any other language AliExpress offers |

A logo that isn't known leaves its cards visible (FR-016), so a gap here means some Brand+ listings
show, and nothing is hidden by mistake.

## Firefox (FR-020)

Run on 2026-11-01 in Firefox 159 on macOS, headless, with a temporary profile and `dist/` installed as
a temporary add-on. Playwright can't load extensions in Firefox, so a one-off script drove it over
WebDriver BiDi, which is built into Firefox. Like the Chromium scripts, it is not in the repository.

### Live pages (SC-001, SC-002, SC-003)

The same per-frame monitor ran as in Chromium, while each page was scrolled.

| Page | Language | Layout | Cards | Badged | Badged visible | Unbadged hidden | Frames with a visible badge |
|---|---|---|---|---|---|---|---|
| `www.aliexpress.com/w/wholesale-xiaomi.html` | en | new | 60 | 40 | 0 | 0 | 0 of 1274 |
| `www.aliexpress.com/w/wholesale-Mounts-%26-Holders.html` | en | us | 65 | 46 | 0 | 0 | 0 of 1271 |
| `www.aliexpress.com/store/1104686185` | - | - | 30 | 30 | 0 | 0 | 0 of 1258 |
| `www.aliexpress.com/item/1005011879619630.html` | en | - | 35 | 32 | 0 | 0 | 0 of 1235 |
| `www.aliexpress.com/` | en | - | 60 | 57 | 0 | 0 | 0 of 1266 |
| `www.aliexpress.us/w/wholesale-anker-charger.html` | en | us | 60 | 3 | 0 | 0 | 0 of 1277 |
| `pl.aliexpress.com/w/wholesale-xiaomi.html` | pl | us | 59 | 37 | 0 | 0 | 0 of 1283 |
| `pl.aliexpress.com/` | en | - | 60 | 55 | 0 | 0 | 0 of 1250 |
| `de.aliexpress.com/w/wholesale-xiaomi.html` | de | us | 59 | 37 | 0 | 0 | 0 of 1270 |
| `www.aliexpress.com/w/wholesale-usb-cable.html` | en | us | 64 | 53 | 0 | 0 | 0 of 1259 |

**Result**: 0 badged listings visible and 0 unbadged listings hidden on all 10 pages, with no frame
showing a badge, in both card layouts. The main product stayed visible on the product page (FR-009).
`aliexpress.ru` and `example.com` were untouched. The limits listed for the Chromium sample apply here
too: "badged" means carrying a known logo, and the monitor samples at animation frames in a headless
browser. The `pl.` homepage rendered in English in this run.

### Other checks

| # | Check | Result |
|---|---|---|
| V1 | Default hiding | Pass (live table; all 9 fixtures match their labels; no grid gaps) |
| V2 | Lazy and later loads | Pass (flash monitor; on fixtures, added cards are hidden by the next frame and a replaced grid is reclassified). Sort and filter were not exercised live, as in Chromium |
| V3 | Page-type and region sample | Pass (live table) |
| V4 | Product page untouched | Pass (live table; fixture) |
| V5 | Toggle and count | Pass, live, in the real toolbar popup: count matched the page (40, shown as Choice 14 and Brand+ 26), off in 21 ms, on in 18 ms |
| V6 | Persistence | Partial: hiding stayed off across a restart, but a temporary add-on is removed on restart, so it was reinstalled with its storage kept. Not tried with a lasting install |
| V7 | Not AliExpress | Pass, on fixtures served at `example.com` and `aliexpress.ru`: page unchanged, popup says it only works on AliExpress. Page checked live too |
| V8 | Per-badge | Pass, live with Brand+ off (26 Brand+ cards shown, Choice stayed hidden). Kept across a restart, with the same caveat as V6 |
| V9 | All hidden | Pass on the `store-com` fixture: notice appears, its button shows the cards including later ones, a reload hides them again, settings unchanged. Not seen on a live page |
| V10 | Fail-safe | Pass: `search-com` with its badge images renamed hides nothing and shows no notice |
| V11 | No network, no data | Pass: only document and image requests across all fixture runs, none from the extension page live, storage holds only `settings` |
| V12 | Performance | Not measured: `test:perf` runs in Chromium only. `content.js` is the same file in both browsers |
| V13 | Accessibility | Partial: real Tab, Space, and Enter work on all three switches, and axe reports 0 violations on the popup as Firefox renders it. Not tried with VoiceOver or NVDA |

The real toolbar popup was opened with `action.openPopup()` and read directly, with no `?tabId=` seam. It
measured 320 × 224 with no overflow. Nobody has yet looked at it or clicked it by hand in Firefox.
