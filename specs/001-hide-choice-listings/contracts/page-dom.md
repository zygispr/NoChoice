# Contract: What the Content Script Writes into AliExpress Pages (v1)

The extension's footprint on AliExpress pages. Anything not listed here must not be changed
(FR-003, FR-009). All names use the `nochoice` prefix so they cannot clash with AliExpress's own.

## Injection

| Item | Value |
|---|---|
| Matches | `*://*.aliexpress.com/*`, `*://*.aliexpress.us/*`, `*://*.aliexpress.ru/*` (FR-007, FR-018) |
| `run_at` | `document_start` (FR-006) |
| `all_frames` | `false` (listings are in the top document) |
| Script | `content.js` (IIFE, no framework) |
| Stylesheet | `content.css` (manifest-injected, so it is in place before first paint) |

## Attributes

| Attribute | On | Values | Meaning |
|---|---|---|---|
| `data-nochoice-badges` | listing root (direct child of a known listing container) | space-separated `choice`, `brand-plus`, or `""` | Classification result. Set only on cards inside known listing containers. Never depends on settings |
| `data-nochoice-hide` | `<html>` | space-separated badge types to hide, or absent | Effective hidden set. Absent when hiding is off or the page is revealed |

## Stylesheet rules (behavioural contract)

```css
html[data-nochoice-hide~="choice"]     [data-nochoice-badges~="choice"],
html[data-nochoice-hide~="brand-plus"] [data-nochoice-badges~="brand-plus"] {
  display: none !important;
}
```

- `display: none` removes the card from layout, so the grid closes the gap (FR-004). If a
  container type turns out to use absolute positioning or virtualisation, it must be handled in
  that container's signature and covered by a fixture.
- No other rule may hide, restyle, or move AliExpress content.

## "All listings hidden" notice (FR-015)

- **Shown when**: hiding is active, not revealed, and **every** classified card in a listing
  container is hidden (at least one card).
- **Placement**: one notice per affected container, inserted as that container's previous
  sibling. A custom element host `<nochoice-notice>` with an **open shadow root**. Styles come
  from `allHiddenNotice.scss` (shared tokens) and sit inside the shadow root.
- **Content and semantics**:
  - Container `role="status"` so screen readers announce it once.
  - Text: "All *N* listings on this page were hidden by NoChoice (Choice / Brand+)."
  - A `<button>`: "Show hidden listings". Keyboard focusable, with a visible focus ring, and
    WCAG 2.2 AA contrast (FR-019 applies to all extension UI).
- **Button action**: sets `PageState.revealed = true`, removes `html[data-nochoice-hide]`, and
  removes the notice. Settings are not changed. Cards that load later on the same page stay
  visible. A `pageKey` change or a reload resets this.
- **Removed when**: any card in the container becomes visible, settings change so nothing is
  hidden, or the page is revealed.

## Lifecycle guarantees

- **Fail-safe**: if no container signature matches, the extension writes nothing at all to the
  page beyond the `<html>` attribute.
- **Navigation**: when the `pageKey` changes, the extension clears `revealed`, restores
  `data-nochoice-hide` from settings, and recomputes counts. Classification attributes stay where
  they are, because they are still valid.
- **Product detail pages**: only listings inside recommendation containers are touched. The main
  product is never inside a listing container (FR-009).
