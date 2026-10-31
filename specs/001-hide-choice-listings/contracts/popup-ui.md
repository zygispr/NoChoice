# Contract: Toolbar Popup UI (v1)

The popup is the extension's toolbar control (US2, US3; FR-011–FR-013, FR-019). It is built from
atomic-design components ([plan.md](../plan.md#project-structure)).

## Layout (top to bottom)

1. **Header**: extension name "NoChoice".
2. **Page status** (organism `PageStatus`): one of the states below.
3. **Settings** (organism `BadgeSettingsPanel`):
   - Master switch: **"Hide listings"** (on/off).
   - Per-badge switches: **"Choice"**, **"Brand+"**. These are disabled (but keep their values)
     while the master switch is off, so it is clear they have no effect.

Settings are shown in every state. They can be changed from any tab and apply to all AliExpress
tabs.

## Page status states

| State | When | Shown text (copy) |
|---|---|---|
| **Loading** | Before the first status or URL check (≤ 100 ms budget; usually never seen) | Nothing (space reserved, no spinner flash) |
| **Active** | AliExpress tab, status received, hiding on | "**N** hidden on this page" with a per-badge breakdown, e.g. "Choice 12 · Brand+ 3". When N = 0: "Nothing hidden on this page" |
| **Active, hiding off** | AliExpress tab, master off | "Hiding is off. All listings are shown." |
| **Active, revealed** | AliExpress tab, page revealed via the notice | "Showing hidden listings on this page. They'll be hidden again when you reload or change results." |
| **Not AliExpress** | Active tab isn't a supported AliExpress host (`aliexpress.ru` counts as unsupported) | "NoChoice only works on AliExpress." (no count; US2 scenario 5) |
| **Reload needed** | AliExpress tab but no content script answered | "Reload this AliExpress page to start hiding listings." |
| **Couldn't save** | `storage.local.set` rejected | Inline message beside the changed switch: "Couldn't save this setting. Please try again." The switch reverts |
| **Couldn't load** | `storage.local.get` rejected when the popup opens | Message at the top of the settings area: "Couldn't load your settings, so the defaults are shown. Changing a switch will try to save again." Switches show `DEFAULT_SETTINGS` and stay usable |

The count updates live while the popup is open ([messaging.md](./messaging.md)).

## Interaction

- Each switch writes settings right away (no Save button). Feedback within 100 ms comes from the
  switch's own state change. The page updates within 1 s (FR-011, budget 50 ms).
- Settings persist across restarts (FR-014) through [settings-storage.md](./settings-storage.md).

## Accessibility (WCAG 2.2 AA, FR-019)

- Switches are `<button role="switch" aria-checked>` (or native `<input type="checkbox"
  role="switch">`), each with a visible `<label>`. Space and Enter toggle them.
- Tab order: master switch → Choice → Brand+. The first switch gets focus when the popup opens.
- The page-status region is `aria-live="polite"`, so count changes are announced without
  stealing focus.
- Text contrast ≥ 4.5:1, switch and focus indicators ≥ 3:1, focus ring always visible. Colour is
  never the only signal: switch state is also shown by knob position and "On"/"Off" text for
  screen readers.
- Must pass vitest-axe with zero violations in every state above.

## Copy rules

- Use the badge names exactly as AliExpress shows them: "Choice", "Brand+".
- Use the same terms in the popup and the in-page notice ("hidden listings", "Show hidden
  listings").
