import { BADGE_TYPES, SETTINGS_KEY_BY_BADGE, type BadgeType } from './badgeTypes';

/** The shopper's stored preferences, schema v1 (contracts/settings-storage.md). */
export interface Settings {
  version: 1;
  enabled: boolean;
  hide: { choice: boolean; brandPlus: boolean };
}

const CURRENT_VERSION = 1;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  version: CURRENT_VERSION,
  enabled: true,
  hide: Object.freeze({ choice: true, brandPlus: true }),
});

type StoredObject = Record<string, unknown>;

/**
 * Upgrades stored settings one version at a time: `MIGRATIONS[n - 1]` turns a vN object into
 * vN+1, so its length is always `CURRENT_VERSION - 1`. Empty in v1. A breaking schema change bumps
 * the version and appends a migration here, so older stored settings keep the shopper's choices.
 */
const MIGRATIONS: readonly ((stored: StoredObject) => StoredObject)[] = [];

/**
 * Validates whatever is in storage. "Each field is checked separately. A missing or wrongly typed
 * field takes its default. Unknown fields are dropped. A non-object value means all defaults.
 * Reading never throws."
 */
export function parseSettings(raw: unknown): Settings {
  const stored = isObject(raw) ? migrateToCurrentVersion(raw) : null;
  if (!stored) return copyOfDefaults();

  const hide = isObject(stored.hide) ? stored.hide : {};
  return {
    version: CURRENT_VERSION,
    enabled: booleanOr(stored.enabled, DEFAULT_SETTINGS.enabled),
    hide: {
      choice: booleanOr(hide.choice, DEFAULT_SETTINGS.hide.choice),
      brandPlus: booleanOr(hide.brandPlus, DEFAULT_SETTINGS.hide.brandPlus),
    },
  };
}

/** The badge types to hide right now: `enabled ? { t | hide[t] } : ∅`. */
export function effectiveHiddenBadges(settings: Readonly<Settings>): ReadonlySet<BadgeType> {
  if (!settings.enabled) return new Set();
  return new Set(BADGE_TYPES.filter((badge) => settings.hide[SETTINGS_KEY_BY_BADGE[badge]]));
}

/**
 * Returns the object migrated to the current version, or null for a version this build doesn't
 * know (for example, after a downgrade): "falls back to defaults rather than guessing".
 * A missing version is read as the current one, and its fields are then validated one by one.
 */
function migrateToCurrentVersion(stored: StoredObject): StoredObject | null {
  const version = stored.version ?? CURRENT_VERSION;
  if (typeof version !== 'number' || !Number.isInteger(version)) return null;
  if (version < 1 || version > CURRENT_VERSION) return null;

  return MIGRATIONS.slice(version - 1).reduce((migrated, migrate) => migrate(migrated), stored);
}

function copyOfDefaults(): Settings {
  return { ...DEFAULT_SETTINGS, hide: { ...DEFAULT_SETTINGS.hide } };
}

function isObject(value: unknown): value is StoredObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
