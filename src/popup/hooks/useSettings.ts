import { useCallback, useEffect, useRef, useState } from 'react';
import { SETTINGS_KEY_BY_BADGE, type BadgeType } from '../../shared/badgeTypes';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/settings';
import { readSettings, subscribeSettings, writeSettings } from '../../shared/settingsStore';

/** One switch in the popup, so a failed save can be shown beside the right one. */
export type SettingName = 'enabled' | BadgeType;

export interface UseSettings {
  settings: Settings;
  loaded: boolean;
  saveError: SettingName | null;
  loadError: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setBadgeHidden: (badge: BadgeType, hidden: boolean) => Promise<void>;
}

export function useSettings(): UseSettings {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<SettingName | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Refs, because the next change builds on the last one even before React has re-rendered.
  const shown = useRef<Settings>(DEFAULT_SETTINGS);
  const lastStored = useRef<Settings>(DEFAULT_SETTINGS);

  const show = useCallback((next: Settings) => {
    shown.current = next;
    setSettings(next);
  }, []);

  useEffect(() => {
    let mounted = true;
    let changedDuringRead = false;
    const applyStored = (stored: Settings) => {
      lastStored.current = stored;
      show(stored);
    };

    const unsubscribe = subscribeSettings((stored) => {
      changedDuringRead = true;
      applyStored(stored);
    });
    readSettings()
      .then((stored) => {
        if (mounted && !changedDuringRead) applyStored(stored);
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      })
      .finally(() => {
        if (mounted) setLoaded(true);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [show]);

  const save = useCallback(
    async (name: SettingName, next: Settings) => {
      show(next);
      try {
        await writeSettings(next);
        lastStored.current = next;
        setSaveError(null);
        setLoadError(false);
      } catch {
        show(lastStored.current);
        setSaveError(name);
      }
    },
    [show],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => save('enabled', { ...shown.current, enabled }),
    [save],
  );

  const setBadgeHidden = useCallback(
    (badge: BadgeType, hidden: boolean) =>
      save(badge, {
        ...shown.current,
        hide: { ...shown.current.hide, [SETTINGS_KEY_BY_BADGE[badge]]: hidden },
      }),
    [save],
  );

  return { settings, loaded, saveError, loadError, setEnabled, setBadgeHidden };
}
