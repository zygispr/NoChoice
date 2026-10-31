# Feature Specification: Hide Choice & Brand+ Listings on AliExpress

**Feature Branch**: `001-hide-choice-listings`

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: "I want to make a browser extension that would work for AliExpress and hide those pesky product listings with "Choice" and "Brand+" banner tags, because I always skip them."

## Clarifications

### Session 2026-10-31

- Q: Which browsers should the first version of the extension support? → A: Chrome-family and Firefox desktop; Safari possibly in future.
- Q: Is the extension being published to browser add-on stores, or only for personal use? → A: Personal use for v1 (installed from the project folder), kept ready to publish later.
- Q: Should v1 let the shopper hide "Choice" and "Brand+" separately, or offer one switch for both? → A: Separate per-badge switches in v1 (User Story 3 stays in scope).
- Q: When all listings on a page are hidden and the shopper clicks "show them", how long do they stay visible? → A: Only on the current page; hiding resumes on navigating elsewhere or reloading.
- Q: Should the extension work on aliexpress.ru? → A: No. aliexpress.ru is out of scope; the extension does nothing there.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse AliExpress without Choice and Brand+ listings (Priority: P1)

A shopper who always skips "Choice" and "Brand+" products installs the extension and browses AliExpress as usual. Wherever product listings appear (search results, category pages, recommendation feeds), any listing that carries a "Choice" or "Brand+" badge next to its title is removed from view. The remaining listings close up the gaps, so the shopper sees only the products they actually want to consider. This works with no setup after installation.

**Why this priority**: This is the entire reason the product exists. On its own it delivers the core value: less scrolling past listings the shopper will never pick.

**Independent Test**: Install the extension, search AliExpress for a common product (e.g., "phone case"), and check that no visible listing has a "Choice" or "Brand+" badge, while listings without those badges (including ones with other tags such as "11.11 Sale" or "Ad") are still shown.

**Acceptance Scenarios**:

1. **Given** the extension is installed and enabled, **When** the shopper opens an AliExpress search results page, **Then** every listing with a "Choice" badge is hidden and the remaining listings reflow with no empty gaps.
2. **Given** the extension is installed and enabled, **When** the shopper opens a page containing listings with a "Brand+" badge, **Then** those listings are hidden.
3. **Given** a listing carries only other tags (e.g., "11.11 Sale", "Ad", "Bundle deals") and no "Choice" or "Brand+" badge, **When** the page is displayed, **Then** that listing stays visible.
4. **Given** the shopper scrolls and more listings load automatically, **When** the new listings appear, **Then** any "Choice" or "Brand+" listings among them are hidden before the shopper can see them.
5. **Given** the shopper moves to the next page of results or applies a filter or sort, **When** the new results are displayed, **Then** "Choice" and "Brand+" listings are hidden without reloading the browser tab.

---

### User Story 2 - Turn hiding off and on, and see what was hidden (Priority: P2)

Sometimes the shopper wants to see everything, for example to compare prices or to find a specific item that happens to be a Choice product. From the extension's control in the browser toolbar, the shopper can see how many listings were hidden on the current page and switch hiding off or back on. The change applies to the open page immediately, and the setting is remembered next time.

**Why this priority**: Without an escape hatch, the shopper would have to uninstall or disable the whole extension to see hidden items. The hidden count also confirms the extension is working. It is secondary to the hiding itself.

**Independent Test**: With an AliExpress results page open, open the extension's control, note the hidden count, switch hiding off, and confirm the previously hidden listings appear. Switch it back on and confirm they disappear again. Restart the browser and confirm the last chosen state is kept.

**Acceptance Scenarios**:

1. **Given** an AliExpress page where some listings are hidden, **When** the shopper opens the extension's control, **Then** it shows the number of listings hidden on the current page.
2. **Given** hiding is on, **When** the shopper switches it off, **Then** all previously hidden listings on the open page reappear within 1 second without a page reload.
3. **Given** hiding is off, **When** the shopper switches it on, **Then** matching listings on the open page are hidden again within 1 second without a page reload.
4. **Given** the shopper switched hiding off, **When** they close and reopen the browser and visit AliExpress, **Then** hiding is still off until they switch it on.
5. **Given** the shopper is on a page that is not AliExpress, **When** they open the extension's control, **Then** it says the extension only works on AliExpress, not a hidden count.

---

### User Story 3 - Choose which badges to hide (Priority: P3)

A shopper may want to hide only one kind of badge, for example hide "Choice" listings but keep "Brand+" listings because they sometimes buy branded goods. From the extension's control, the shopper can turn hiding on or off separately for "Choice" and for "Brand+".

**Why this priority**: The original request hides both badges together, so the default covers it. Per-badge control is a convenience for shoppers whose preferences differ. It is confirmed in scope for v1 and is built after User Stories 1 and 2.

**Independent Test**: Turn off "Brand+" hiding only, load a page containing both badge types, and confirm that "Choice" listings are hidden while "Brand+" listings are visible.

**Acceptance Scenarios**:

1. **Given** both badge types are selected for hiding (the default), **When** a page loads, **Then** listings with either badge are hidden.
2. **Given** only "Choice" is selected, **When** a page loads, **Then** "Choice" listings are hidden and "Brand+" listings are visible.
3. **Given** the shopper changes the badge selection, **When** they return to the open AliExpress page, **Then** the page reflects the new selection without a reload, and the selection is remembered across browser restarts.

---

### Edge Cases

- **Every listing on the page is hidden**: the shopper sees a short notice in the results area saying that all listings on this page were hidden by the extension, with a one-click way to show them, not a blank page. Showing them is a one-off peek at the current page only. It does not change the shopper's settings, and hiding resumes when they reload or move to different results.
- **A listing carries both "Choice" and another tag (e.g., "11.11 Sale")**: it is hidden, because it carries a "Choice" badge.
- **The shopper opens a Choice or Brand+ product's own page directly** (from a link, bookmark, or order history): the product page is shown normally. Only listings are hidden, never whole pages.
- **AliExpress changes its page design so badges can no longer be recognised**: the extension hides nothing it isn't sure about. Showing an unwanted listing is acceptable; hiding a wanted one is not.
- **Regional AliExpress sites and languages** (e.g., aliexpress.com in EUR, aliexpress.us, country sites such as es.aliexpress.com or pl.aliexpress.com): hiding works the same on all of them, whatever the display language or currency. aliexpress.ru is not supported: the extension leaves it untouched.
- **Pages that mix listings into other content** (homepage feeds, "More to love", "Related items" on a product page): matching listings in these sections are hidden too, and the surrounding layout stays intact.
- **Very long infinite-scroll sessions** (hundreds of listings loaded): hiding keeps up and scrolling does not become noticeably slower.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extension MUST hide every product listing on AliExpress pages that displays a "Choice" badge.
- **FR-002**: The extension MUST hide every product listing on AliExpress pages that displays a "Brand+" badge.
- **FR-003**: The extension MUST NOT hide any listing that has neither a "Choice" nor a "Brand+" badge, whatever other tags, labels, or ad markers it carries.
- **FR-004**: When a listing is hidden, the remaining listings MUST close the gap so that no empty slot is left where the hidden listing was.
- **FR-005**: The extension MUST apply hiding to listings that appear after the initial page load (infinite scroll, pagination, filtering, sorting, and recommendation sections that load later) without the shopper having to reload the page.
- **FR-006**: Hidden listings MUST NOT be visibly shown to the shopper before they are hidden. Newly appearing matching listings MUST be hidden before they are rendered on screen, or within the same visual frame.
- **FR-007**: The extension MUST work on all supported AliExpress sites, in all display languages and currencies. Supported sites are aliexpress.com with all its country subdomains (e.g., www., es., pl.) and aliexpress.us. aliexpress.ru is not supported.
- **FR-008**: The extension MUST hide listings on every AliExpress page type that shows product listings, including search results, category pages, store pages, the homepage feed, and recommendation sections on product pages.
- **FR-009**: The extension MUST NOT hide, block, or redirect a product's own detail page; it acts only on listings.
- **FR-010**: Hiding MUST be on by default for both badge types immediately after installation, with no setup required.
- **FR-011**: Shoppers MUST be able to switch hiding off and on from the extension's toolbar control. The change MUST take effect on open AliExpress pages within 1 second without a reload.
- **FR-012**: The extension's toolbar control MUST show the number of listings currently hidden on the active AliExpress page.
- **FR-013**: Shoppers MUST be able to turn hiding on or off separately for "Choice" and for "Brand+".
- **FR-014**: The extension MUST remember the shopper's on/off and per-badge choices across page loads and browser restarts.
- **FR-015**: When all listings in a page's results area are hidden, the extension MUST show a brief notice in that area explaining why it is empty and offering a one-click way to show the hidden listings for that page. The reveal MUST apply only to the current page: listings that load later on the same page (e.g., by scrolling) are shown too. The reveal MUST NOT change the shopper's saved settings. Hiding MUST resume when the page is reloaded or the shopper moves to different results (a new search, filter, sort, results page number, or another AliExpress page).
- **FR-016**: When the extension cannot confidently tell whether a listing has a "Choice" or "Brand+" badge, it MUST leave the listing visible.
- **FR-017**: The extension MUST NOT collect, store, or send any browsing data, product data, or personal information anywhere. The only data it keeps is the shopper's own settings, stored locally.
- **FR-018**: The extension MUST be active only on supported AliExpress sites (FR-007). On any other website, including aliexpress.ru, it MUST do nothing to the page.
- **FR-019**: The extension's toolbar control MUST be fully usable by keyboard and screen reader and meet WCAG 2.2 AA contrast.
- **FR-020**: The extension MUST behave identically, meeting every requirement above, in current desktop Chromium-based browsers (Chrome, Edge, Brave, and similar) and current desktop Firefox.

### Key Entities

- **Product listing**: one product card shown in a list or grid on an AliExpress page. Relevant attributes: which badges it shows ("Choice", "Brand+", or neither) and whether it is currently hidden.
- **Badge type**: a category of promotional tag the shopper can choose to hide. In scope: "Choice" and "Brand+".
- **Shopper settings**: the shopper's preferences: hiding on/off overall, plus on/off for each badge type. Kept locally and persistent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a sample of at least 10 AliExpress listing pages (search, category, store, homepage, and product-page recommendations), 100% of listings with a "Choice" or "Brand+" badge are hidden.
- **SC-002**: On the same sample, 0 listings without a "Choice" or "Brand+" badge are hidden.
- **SC-003**: Newly loaded matching listings are never seen by the shopper during normal scrolling: in recorded test sessions, no matching listing is visible on screen for any frame.
- **SC-004**: With the extension enabled, AliExpress listing pages become usable no more than 10% slower than without it, and scrolling through 500 listings shows no visible stutter.
- **SC-005**: A first-time shopper sees Choice and Brand+ listings hidden on their first AliExpress page visit after installing, with zero configuration steps.
- **SC-006**: Switching hiding off or on, or changing a badge selection, updates the open page in under 1 second, in 100% of trials.
- **SC-007**: The extension makes no outgoing network requests of its own during normal use.

## Assumptions

- **Target browsers**: desktop Chromium-based browsers (Chrome, Edge, Brave, and similar) and desktop Firefox are the v1 targets (FR-020). Safari is out of scope for v1 but a likely future target, so v1 should avoid choices that would block a later Safari version. Mobile browsers and the AliExpress mobile app are out of scope.
- **Hide means remove from view**: listings are removed from the layout entirely, not dimmed or blurred, because the shopper said they always skip these listings. The on/off switch (User Story 2) covers occasions when they want to see them.
- **Badge identity**: the "Choice" and "Brand+" badges look the same across AliExpress regional sites and languages, as in the shopper's screenshot (yellow "Choice" label and blue "Brand+" label before the listing title), so they can be recognised regardless of locale.
- **aliexpress.ru is out of scope**: it is run separately from the other AliExpress sites, with its own page design. The extension does not request access to it and does nothing there.
- **Ads and other tags are out of scope**: listings marked "Ad", "11.11 Sale", "Bundle deals", etc. are not hidden unless they also carry a "Choice" or "Brand+" badge. Hiding other badge types may be added later but is not part of this feature.
- **Filtering, not removal**: the extension only changes what is shown on the shopper's own screen. It does not change AliExpress search results or the shopper's account, and it does not affect what other people see.
- **Distribution**: v1 is for personal use, installed straight from the project folder in each supported browser. Publishing to the Chrome Web Store or Firefox Add-ons (store listing, screenshots, privacy policy, review) is out of scope for v1. v1 should still meet store rules so it can be published later without redesign: it asks only for the permissions it needs, has an icon and a clear name, and collects no data (FR-017).
- **Single shopper, no accounts**: the extension has no sign-in, sync, or server component. Settings are per browser profile.
- **Page changes by AliExpress**: AliExpress may change its page structure at any time. Keeping badge recognition working after such changes is expected maintenance, and FR-016 ensures that a break makes the extension fail safely (show everything) and never hide the wrong listings.
