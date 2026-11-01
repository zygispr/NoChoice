import { describe, expect, it, vi } from 'vitest';
import { followSettings } from '../../src/content/page/followSettings';
import { DEFAULT_SETTINGS, type Settings } from '../../src/shared/settings';
import { writeSettings } from '../../src/shared/settingsStore';
import { getFakeChrome } from '../helpers/fakeChrome';

const OFF: Settings = { version: 1, enabled: false, hide: { choice: true, brandPlus: true } };
const CHOICE_ONLY: Settings = {
  version: 1,
  enabled: true,
  hide: { choice: true, brandPlus: false },
};

const settled = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve);
  });

describe('followSettings', () => {
  it('reports the stored settings at start', async () => {
    await writeSettings(OFF);
    const onChange = vi.fn();

    followSettings(onChange);
    await settled();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(OFF);
  });

  it('reports the defaults when nothing is stored', async () => {
    const onChange = vi.fn();

    followSettings(onChange);
    await settled();

    expect(onChange).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });

  it('reports a later write straight away, within the same task', async () => {
    const onChange = vi.fn();
    followSettings(onChange);
    await settled();
    onChange.mockClear();

    void writeSettings(CHOICE_ONLY);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(CHOICE_ONLY);
  });

  it('ignores changes to other keys and areas', async () => {
    const onChange = vi.fn();
    followSettings(onChange);
    await settled();
    onChange.mockClear();

    const { onChanged } = getFakeChrome().storage;
    onChanged.dispatch({ other: { newValue: 1 } }, 'local');
    onChanged.dispatch({ settings: { newValue: OFF } }, 'sync');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not let a slow first read overwrite a newer change', async () => {
    await writeSettings(OFF);
    const onChange = vi.fn();

    followSettings(onChange);
    await writeSettings(CHOICE_ONLY);
    await settled();

    expect(onChange).toHaveBeenLastCalledWith(CHOICE_ONLY);
  });

  it('survives a failed read and keeps following changes (fail-safe)', async () => {
    vi.spyOn(getFakeChrome().storage.local, 'get').mockRejectedValueOnce(new Error('no storage'));
    const onChange = vi.fn();

    followSettings(onChange);
    await settled();
    expect(onChange).not.toHaveBeenCalled();

    await writeSettings(OFF);

    expect(onChange).toHaveBeenCalledWith(OFF);
  });

  it('stops when unsubscribed', async () => {
    const onChange = vi.fn();
    const stop = followSettings(onChange);
    await settled();
    onChange.mockClear();

    stop();
    await writeSettings(OFF);

    expect(onChange).not.toHaveBeenCalled();
  });
});
