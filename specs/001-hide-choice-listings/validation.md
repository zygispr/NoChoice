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

## Firefox (FR-020): not done

T082 and the Firefox half of T083 are open. Playwright can't load extensions in Firefox, Firefox isn't
installed on the machine used, and downloading it for this run was not permitted. Parity rests for now
on using only APIs that behave the same in both browsers and on `web-ext lint` passing.

