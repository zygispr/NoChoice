# Data Model: Hide Choice & Brand+ Listings on AliExpress

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

There is no database. The model has one **persisted** entity (Settings), one **static** table
(BadgeSignature), and **runtime** state that lives on the AliExpress DOM and in the content
script's memory for the life of the page.

---

## BadgeType

The kinds of promotional badge the shopper can hide (spec: *Badge type*).

| Value | Display label | Notes |
|---|---|---|
| `choice` | Choice | Yellow "Choice" label before the title |
| `brand-plus` | Brand+ | Blue "Brand+" label before the title |

- Closed set in v1. Adding a type is a code change (new signature + label + settings field) with
  a settings `version` bump ([contracts/settings-storage.md](./contracts/settings-storage.md)).
- The hyphenated form is used in data attributes and storage. Display labels are only used in UI.

---

## Settings (persisted)

The shopper's preferences (spec: *Shopper settings*; FR-010, FR-011, FR-013, FR-014).

| Field | Type | Default | Rule |
|---|---|---|---|
| `version` | `1` (literal) | `1` | Schema version; see migration rules in the contract |
| `enabled` | boolean | `true` | Master switch (US2) |
| `hide.choice` | boolean | `true` | Per-badge switch (US3) |
| `hide.brandPlus` | boolean | `true` | Per-badge switch (US3) |

**Effective hidden badge set** = `enabled ? { t | hide[t] } : ∅`.
The master switch keeps the per-badge choices: turning hiding off and on again brings back the
shopper's previous per-badge selection.

**Validation** (`parseSettings`, run on every read): a missing value, wrong type, unknown
`version`, or corrupt object falls back to defaults, field by field. Invalid input is never
thrown at the UI. Unknown extra fields are dropped.

**Lifecycle**: absent (fresh install) → defaults used (not written until the first change) →
written on every popup change → read by every content script at start and on `storage.onChanged`.

---

## BadgeSignature (static, shipped with the extension)

One way of recognising a badge in AliExpress markup ([research R5](./research.md#r5-badge-signatures-how-a-choice-or-brand-badge-is-recognised)).

| Field | Type | Rule |
|---|---|---|
| `badge` | BadgeType | Which badge this signature identifies |
| `id` | string | Stable name for tests/diagnostics, e.g. `choice-img-2026-10` |
| `selector` | string (CSS) | Finds candidate badge nodes inside a card |
| `matches` | `(el: Element) => boolean` | Exact, locale-independent check (e.g. image asset ID). Must not rely on text alone |

- A card has badge *t* only if **at least one** signature for *t* matches (FR-016: no match means
  no badge).
- Every signature must be covered by at least one fixture in `tests/fixtures/aliexpress/`.

## ListingContainer signature (static)

| Field | Type | Rule |
|---|---|---|
| `id` | string | e.g. `search-grid`, `store-grid`, `home-feed`, `pdp-more-to-love` |
| `selector` | string (CSS) | Matches the container whose **direct children** are listing cards |
| `isPrimaryResults` | boolean | `true` only for the main search, category, and store result grids. Only these can show the "all listings hidden" notice (FR-015). `false` for sponsored rows, the homepage feed, and product-page recommendations |

A listing root is the direct child of a matched container that contains the badge node. If there
is no such container, there is no listing root and the card is not hidden (FR-009, FR-016).

---

## ListingClassification (runtime, on the DOM)

One product card (spec: *Product listing*).

| Representation | Values | Set by |
|---|---|---|
| `data-nochoice-badges` attribute on the listing root | space-separated BadgeTypes, or `""` | `classifyListing` |

- Written **once per card**, when it is added or its badge image `src` changes. It is based only on
  markup and **does not depend on settings**.
- "Is hidden" is **derived**, not stored: a card is hidden when its badges overlap the effective
  hidden set and the page is not revealed. CSS applies it; `hiddenCount` reports it.
- Freed together with the DOM node, so the content script keeps no per-card memory.

---

## PageState (runtime, in content-script memory, one per tab/frame)

| Field | Type | Rule |
|---|---|---|
| `pageKey` | string | `location.origin + pathname + search` (no hash). Identifies "the current results" for FR-015 |
| `revealed` | boolean | `true` after the shopper clicks the notice's "Show" button. Default `false` |
| `effectiveHidden` | Set&lt;BadgeType&gt; | Taken from Settings |
| `hiddenCount` | number | Listings currently hidden. Recomputed per mutation batch / settings change, and pushed to a connected popup |
| `totalCount` | number | Classified listing roots currently in the DOM (used for "all hidden" detection) |

**State transitions**

```text
             settings change (storage.onChanged)
   ┌──────────────────────────────────────────────┐
   ▼                                              │
[Hiding] ──(all listings in a container hidden)──► [Hiding + notice shown]
   ▲                                              │
   │                                    click "Show N hidden listings"
   │                                              ▼
   └──── pageKey changes or page reload ──── [Revealed]
         (new search/filter/sort/page)      (revealed=true; later-loaded cards also shown;
                                              settings unchanged — FR-015)
```

- `revealed` is never persisted. A reload starts a new content-script instance with
  `revealed = false`.
- When hiding is off (`effectiveHidden = ∅`), `hiddenCount = 0` and the notice is not shown.

---

## Relationships

```text
Settings ──(derive)──► effectiveHidden ─┐
                                        ├─► <html data-nochoice-hide="…"> ─► CSS hides matching cards
PageState.revealed ─────────────────────┘
BadgeSignature* + ListingContainer* ──► classifyListing ──► data-nochoice-badges on each card
PageState.hiddenCount ──(port)──► popup
```
