# Contract: Settings Storage (v1)

**Area**: `chrome.storage.local` | **Writers**: popup | **Readers**: popup, content scripts

## Key and shape

Single key `settings`:

```json
{
  "settings": {
    "version": 1,
    "enabled": true,
    "hide": { "choice": true, "brandPlus": true }
  }
}
```

| Path | Type | Default |
|---|---|---|
| `version` | `1` | `1` |
| `enabled` | boolean | `true` |
| `hide.choice` | boolean | `true` |
| `hide.brandPlus` | boolean | `true` |

## Rules

1. **Absent means defaults.** A fresh install has no `settings` key, and every reader uses the
   defaults (FR-010, SC-005). Nothing is written until the shopper changes something.
2. **Validate on read** (`parseSettings`). Each field is checked separately. A missing or wrongly
   typed field takes its default. Unknown fields are dropped. A non-object value means all
   defaults. Reading never throws.
3. **Whole-object writes.** Writers always store the complete, validated object (no partial
   writes), so readers never see half-updated settings.
4. **Change propagation.** Content scripts subscribe to `chrome.storage.onChanged` (area
   `local`, key `settings`) and apply the new value within one frame (FR-011: ≤ 1 s, budget
   ≤ 50 ms).
5. **Write failures** (e.g. quota or a storage error) are shown in the popup as the "couldn't
   save" state ([popup-ui.md](./popup-ui.md)). The switch reverts to the last stored value.
6. **No other data.** No other keys may be written (FR-017).

## Versioning and migration

- `version` increases on any **breaking** change (a renamed or removed field, or a changed
  meaning). Adding a new badge field with a default does **not** require a bump if rule 2 covers
  it.
- `parseSettings` holds an ordered list of migrations `vN → vN+1`. An unknown future version
  (e.g. after a downgrade) falls back to defaults rather than guessing.
- Contract tests: valid v1 round-trip, each field invalid, non-object, unknown version, extra
  fields.
