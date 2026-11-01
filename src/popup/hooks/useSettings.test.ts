import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/settings';
import { writeSettings } from '../../shared/settingsStore';
import { failNextSet, getFakeChrome } from '../../../tests/helpers/fakeChrome';
import { useSettings } from './useSettings';

const OFF: Settings = { version: 1, enabled: false, hide: { choice: true, brandPlus: false } };

const stored = async (): Promise<unknown> =>
  (await getFakeChrome().storage.local.get('settings')).settings;

async function renderLoaded() {
  const view = renderHook(() => useSettings());
  await waitFor(() => {
    expect(view.result.current.loaded).toBe(true);
  });
  return view;
}

describe('useSettings', () => {
  it('is not loaded until storage answers, so it never shows a wrong state as real', async () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.loaded).toBe(false);
    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
  });

  it('loads the stored settings', async () => {
    await writeSettings(OFF);

    const { result } = await renderLoaded();

    expect(result.current.settings).toEqual(OFF);
    expect(result.current.loadError).toBe(false);
  });

  it('uses the defaults when nothing is stored, and writes nothing', async () => {
    const { result } = await renderLoaded();

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(await stored()).toBeUndefined();
  });

  it('setEnabled updates right away and persists the complete object', async () => {
    await writeSettings(OFF);
    const { result } = await renderLoaded();

    act(() => {
      void result.current.setEnabled(true);
    });
    expect(result.current.settings.enabled).toBe(true);

    await waitFor(async () => {
      expect(await stored()).toEqual({ ...OFF, enabled: true });
    });
  });

  it('setBadgeHidden updates one badge and persists the complete object', async () => {
    const { result } = await renderLoaded();

    await act(async () => {
      await result.current.setBadgeHidden('brand-plus', false);
    });

    expect(result.current.settings.hide).toEqual({ choice: true, brandPlus: false });
    expect(await stored()).toEqual({
      version: 1,
      enabled: true,
      hide: { choice: true, brandPlus: false },
    });
  });

  it('reverts to the stored value and names the failed setting when a write fails', async () => {
    await writeSettings(OFF);
    const { result } = await renderLoaded();
    failNextSet(new Error('quota'));

    await act(async () => {
      await result.current.setEnabled(true);
    });

    expect(result.current.settings).toEqual(OFF);
    expect(result.current.saveError).toBe('enabled');
    expect(await stored()).toEqual(OFF);
  });

  it('names the badge when a badge write fails', async () => {
    const { result } = await renderLoaded();
    failNextSet(new Error('quota'));

    await act(async () => {
      await result.current.setBadgeHidden('choice', false);
    });

    expect(result.current.saveError).toBe('choice');
    expect(result.current.settings.hide.choice).toBe(true);
  });

  it('clears the save error after the next successful write', async () => {
    const { result } = await renderLoaded();
    failNextSet(new Error('quota'));
    await act(async () => {
      await result.current.setEnabled(false);
    });

    await act(async () => {
      await result.current.setEnabled(false);
    });

    expect(result.current.saveError).toBeNull();
    expect(result.current.settings.enabled).toBe(false);
  });

  it('falls back to the defaults and reports a failed read', async () => {
    vi.spyOn(getFakeChrome().storage.local, 'get').mockRejectedValueOnce(new Error('no storage'));

    const { result } = await renderLoaded();

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.loadError).toBe(true);
  });

  it('clears the load error after a successful write', async () => {
    vi.spyOn(getFakeChrome().storage.local, 'get').mockRejectedValueOnce(new Error('no storage'));
    const { result } = await renderLoaded();

    await act(async () => {
      await result.current.setEnabled(false);
    });

    expect(result.current.loadError).toBe(false);
    expect(await stored()).toEqual({ ...DEFAULT_SETTINGS, enabled: false });
  });

  it('follows changes made elsewhere, such as another window', async () => {
    const { result } = await renderLoaded();

    await act(async () => {
      await writeSettings(OFF);
    });

    expect(result.current.settings).toEqual(OFF);
  });

  it('reverts to a change made elsewhere rather than an older value', async () => {
    const { result } = await renderLoaded();
    await act(async () => {
      await writeSettings(OFF);
    });
    failNextSet(new Error('quota'));

    await act(async () => {
      await result.current.setEnabled(true);
    });

    expect(result.current.settings).toEqual(OFF);
  });

  it('stops following changes after unmount', async () => {
    const { result, unmount } = await renderLoaded();
    const before = result.current.settings;

    unmount();
    await writeSettings(OFF);

    expect(result.current.settings).toEqual(before);
    expect(getFakeChrome().storage.onChanged.hasListeners()).toBe(false);
  });
});
