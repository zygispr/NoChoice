import { parseSettings, type Settings } from './settings';

/** The only storage key the extension ever writes (FR-017). */
export const SETTINGS_STORAGE_KEY = 'settings';

/** Stored settings, or the defaults when none are stored. Rejects if storage fails. */
export async function readSettings(): Promise<Settings> {
  const items = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  return parseSettings(items[SETTINGS_STORAGE_KEY]);
}

/** Whole-object write of the validated settings, so readers never see half-updated settings. */
export async function writeSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: parseSettings(settings) });
}

/** Calls `onChange` with the parsed settings whenever they change. Returns an unsubscribe. */
export function subscribeSettings(onChange: (settings: Settings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    const change = changes[SETTINGS_STORAGE_KEY];
    if (areaName !== 'local' || !change) return;
    onChange(parseSettings(change.newValue));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
