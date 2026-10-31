import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  effectiveHiddenBadges,
  parseSettings,
  type Settings,
} from '../../src/shared/settings';

// contracts/settings-storage.md, schema v1.
const DEFAULTS: Settings = { version: 1, enabled: true, hide: { choice: true, brandPlus: true } };

describe('settings storage contract v1', () => {
  it('uses the defaults when nothing is stored', () => {
    expect(DEFAULT_SETTINGS).toStrictEqual(DEFAULTS);
    expect(parseSettings(undefined)).toStrictEqual(DEFAULTS);
  });

  it('round-trips a valid v1 object', () => {
    const stored: Settings = {
      version: 1,
      enabled: false,
      hide: { choice: true, brandPlus: false },
    };

    expect(parseSettings(structuredClone(stored))).toStrictEqual(stored);
  });

  it.each([
    [
      'enabled',
      { version: 1, enabled: 'no', hide: { choice: false, brandPlus: false } },
      { version: 1, enabled: true, hide: { choice: false, brandPlus: false } },
    ],
    [
      'hide.choice',
      { version: 1, enabled: false, hide: { choice: 0, brandPlus: false } },
      { version: 1, enabled: false, hide: { choice: true, brandPlus: false } },
    ],
    [
      'hide.brandPlus',
      { version: 1, enabled: false, hide: { choice: false, brandPlus: null } },
      { version: 1, enabled: false, hide: { choice: false, brandPlus: true } },
    ],
    [
      'hide (not an object)',
      { version: 1, enabled: false, hide: 'all' },
      { version: 1, enabled: false, hide: { choice: true, brandPlus: true } },
    ],
    [
      'missing fields',
      { hide: { brandPlus: false } },
      { version: 1, enabled: true, hide: { choice: true, brandPlus: false } },
    ],
  ])(
    'falls back to the default for an invalid %s and keeps the other fields',
    (_, raw, expected) => {
      expect(parseSettings(raw)).toStrictEqual(expected);
    },
  );

  it.each([null, 'x', 42, true, [], [{ enabled: false }]])(
    'uses all defaults for the non-object value %j',
    (raw) => {
      expect(parseSettings(raw)).toStrictEqual(DEFAULTS);
    },
  );

  it('uses all defaults for an unknown future version instead of guessing', () => {
    const fromNewerVersion = {
      version: 2,
      enabled: false,
      hide: { choice: false, brandPlus: false },
    };

    expect(parseSettings(fromNewerVersion)).toStrictEqual(DEFAULTS);
  });

  it('drops unknown fields', () => {
    const raw = {
      version: 1,
      enabled: false,
      theme: 'dark',
      hide: { choice: false, brandPlus: true, ad: true },
    };

    expect(parseSettings(raw)).toStrictEqual({
      version: 1,
      enabled: false,
      hide: { choice: false, brandPlus: true },
    });
  });

  it.each([
    Symbol('settings'),
    () => ({ enabled: false }),
    10n,
    Object.create(null) as unknown,
    { version: '1', enabled: false },
    { version: 1, hide: null },
  ])('never throws (%#)', (raw) => {
    expect(() => parseSettings(raw)).not.toThrow();
  });

  it('returns a fresh object, so callers cannot change the defaults', () => {
    const settings = parseSettings(undefined);
    settings.hide.choice = false;

    expect(parseSettings(undefined).hide.choice).toBe(true);
  });
});

describe('effectiveHiddenBadges', () => {
  it('is empty when hiding is off, and keeps the per-badge choices', () => {
    const settings: Settings = {
      version: 1,
      enabled: false,
      hide: { choice: true, brandPlus: false },
    };

    expect(effectiveHiddenBadges(settings)).toStrictEqual(new Set());
    expect(settings.hide).toStrictEqual({ choice: true, brandPlus: false });
  });

  it.each([
    [{ choice: true, brandPlus: true }, ['choice', 'brand-plus']],
    [{ choice: true, brandPlus: false }, ['choice']],
    [{ choice: false, brandPlus: true }, ['brand-plus']],
    [{ choice: false, brandPlus: false }, []],
  ])('follows the per-badge switches %j when hiding is on', (hide, expected) => {
    expect(effectiveHiddenBadges({ version: 1, enabled: true, hide })).toStrictEqual(
      new Set(expected),
    );
  });
});
