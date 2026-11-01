import { useEffect, useRef } from 'react';
import { usePageStatus } from '../../../hooks/usePageStatus';
import { useSettings } from '../../../hooks/useSettings';
import { BadgeSettingsPanel } from '../../organisms/BadgeSettingsPanel';
import { PageStatus } from '../../organisms/PageStatus';
import { PopupLayout } from '../../templates/PopupLayout';

export function PopupPage() {
  const { settings, loaded, saveError, loadError, setEnabled } = useSettings();
  const pageStatus = usePageStatus();
  const firstSwitchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (loaded) firstSwitchRef.current?.focus();
  }, [loaded]);

  // Nothing depending on settings shows until they load, so hiding-off never flashes as on.
  return (
    <PopupLayout
      header="NoChoice"
      status={
        <PageStatus
          state={loaded ? pageStatus : { kind: 'loading' }}
          hidingEnabled={settings.enabled}
        />
      }
      settings={
        loaded && (
          <BadgeSettingsPanel
            enabled={settings.enabled}
            onEnabledChange={(enabled) => {
              void setEnabled(enabled);
            }}
            saveError={saveError}
            loadError={loadError}
            firstSwitchRef={firstSwitchRef}
          />
        )
      }
    />
  );
}
