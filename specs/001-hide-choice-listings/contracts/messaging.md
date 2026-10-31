# Contract: Popup ↔ Content Script Messaging (v1)

**Transport**: `chrome.tabs.connect(tabId, { name: "nochoice/status@1" })` from the popup to the
active tab's top-frame content script (`frameId: 0`). There is no background script.

Settings changes do **not** go through this channel. They go through storage
([settings-storage.md](./settings-storage.md)). This channel carries only **page status** and the
**reveal reset** information the popup needs to display.

## Messages

### Content → Popup: `status`

Sent once right after the port connects, then again whenever any field changes. Updates are
coalesced to at most one per animation frame.

```ts
type StatusMessage = {
  type: "status";
  hiddenCount: number;      // listings currently hidden on this page (FR-012)
  hiddenByBadge: { choice: number; brandPlus: number };
  revealed: boolean;        // true after "Show hidden listings" on this page (FR-015)
};
```

There are no Popup → Content messages in v1. The port exists so the popup gets live counts while
it is open, for example while the shopper scrolls.

## Popup behaviour by connection outcome

| Outcome | How detected | Popup state ([popup-ui.md](./popup-ui.md)) |
|---|---|---|
| Port connects and `status` arrives | first message | **Active page** with count |
| Tab URL not on an AliExpress host | `tab.url` doesn't match the host patterns (readable thanks to host permissions) | **Not AliExpress** (US2 scenario 5) |
| AliExpress tab, but the port disconnects with no message (`chrome.runtime.lastError` "Receiving end does not exist") | `onDisconnect` before the first `status` | **Reload needed**: the page was opened before install or update |
| No `status` within 1 s | timeout | **Reload needed** (same copy) |

## Versioning

- The port name carries the protocol version (`@1`). A breaking change uses a new name. The
  popup and content script ship together, so there is no runtime negotiation, but the version
  stops a stale content script (left over from before an update) from being misread.
- Content scripts ignore unknown port names. The popup ignores unknown message `type`s.

## Contract tests

- Message shape: the `status` builder produces exactly the fields above, with non-negative
  integers.
- `hiddenByBadge.<t>` counts hidden cards that carry badge *t*, but only while *t* is in the
  effective hidden set (otherwise it is 0). A card carrying two hidden badges counts once in
  `hiddenCount` and once under each badge, so
  `max(choice, brandPlus) ≤ hiddenCount ≤ choice + brandPlus`.
