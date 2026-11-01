import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '../../src/shared/settings';
import {
  readSettings,
  SETTINGS_STORAGE_KEY,
  subscribeSettings,
  writeSettings,
} from '../../src/shared/settingsStore';
import { failNextSet, getFakeChrome } from '../helpers/fakeChrome';

const CUSTOM: Settings = { version: 1, enabled: false, hide: { choice: true, brandPlus: false } };

describe('readSettings', () => {
  it('returns the defaults when nothing is stored', async () => {
    expect(await readSettings()).toStrictEqual(DEFAULT_SETTINGS);
  });

  it('returns the parsed stored settings', async () => {
    await chrome.storage.local.set({ settings: { ...CUSTOM, unknownField: 1 } });

    expect(await readSettings()).toStrictEqual(CUSTOM);
  });

  it('rejects when storage rejects, so each caller can choose its fallback', async () => {
    vi.spyOn(chrome.storage.local, 'get').mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(readSettings()).rejects.toThrow('storage unavailable');
  });
});

describe('writeSettings', () => {
  it('stores the complete validated object under the "settings" key only', async () => {
    await writeSettings({ ...CUSTOM, unknownField: 'x' } as Settings);

    expect(SETTINGS_STORAGE_KEY).toBe('settings');
    expect(await chrome.storage.local.get(null)).toStrictEqual({ settings: CUSTOM });
  });

  it('rejects when storage rejects, and stores nothing', async () => {
    failNextSet(new Error('QUOTA_BYTES quota exceeded'));

    await expect(writeSettings(CUSTOM)).rejects.toThrow('QUOTA_BYTES quota exceeded');
    expect(await chrome.storage.local.get(null)).toStrictEqual({});
  });
});

describe('subscribeSettings', () => {
  it('calls back with the parsed settings when the local "settings" key changes', async () => {
    const onChange = vi.fn();
    subscribeSettings(onChange);

    await writeSettings(CUSTOM);

    expect(onChange).toHaveBeenCalledExactlyOnceWith(CUSTOM);
  });

  it('ignores other storage areas and other keys', () => {
    const onChange = vi.fn();
    subscribeSettings(onChange);
    const { onChanged } = getFakeChrome().storage;

    onChanged.dispatch({ settings: { newValue: CUSTOM } }, 'sync');
    onChanged.dispatch({ other: { newValue: 1 } }, 'local');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports the defaults when the stored settings are removed', () => {
    const onChange = vi.fn();
    subscribeSettings(onChange);

    getFakeChrome().storage.onChanged.dispatch({ settings: { oldValue: CUSTOM } }, 'local');

    expect(onChange).toHaveBeenCalledExactlyOnceWith(DEFAULT_SETTINGS);
  });

  it('stops calling back after unsubscribing', async () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeSettings(onChange);

    unsubscribe();
    await writeSettings(CUSTOM);

    expect(onChange).not.toHaveBeenCalled();
  });
});
