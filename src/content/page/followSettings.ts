import type { Settings } from '../../shared/settings';
import { readSettings, subscribeSettings } from '../../shared/settingsStore';

/** Calls `onChange` with the stored settings now and on every change. Returns an unsubscribe. */
export function followSettings(onChange: (settings: Settings) => void): () => void {
  let changedDuringRead = false;
  const unsubscribe = subscribeSettings((settings) => {
    changedDuringRead = true;
    onChange(settings);
  });

  readSettings()
    .then((settings) => {
      // The first read may have started before a change that has already been reported.
      if (!changedDuringRead) onChange(settings);
    })
    .catch((error: unknown) => {
      // Fail-safe: the caller keeps the defaults it applied, and this never throws into the page.
      console.debug('NoChoice: could not read settings', error);
    });

  return unsubscribe;
}
