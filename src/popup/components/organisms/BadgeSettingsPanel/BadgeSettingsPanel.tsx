import type { Ref } from 'react';
import type { SettingName } from '../../../hooks/useSettings';
import { SettingRow } from '../../molecules/SettingRow';
import styles from './BadgeSettingsPanel.module.scss';

const SAVE_ERROR = "Couldn't save this setting. Please try again.";
const LOAD_ERROR =
  "Couldn't load your settings, so the defaults are shown. Changing a switch will try to save again.";

interface BadgeSettingsPanelProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  saveError: SettingName | null;
  loadError: boolean;
  firstSwitchRef?: Ref<HTMLButtonElement>;
}

export function BadgeSettingsPanel({
  enabled,
  onEnabledChange,
  saveError,
  loadError,
  firstSwitchRef,
}: BadgeSettingsPanelProps) {
  return (
    <div className={styles.panel}>
      {loadError && (
        <p role="alert" className={styles.error}>
          {LOAD_ERROR}
        </p>
      )}
      <SettingRow
        label="Hide listings"
        checked={enabled}
        onChange={onEnabledChange}
        errorMessage={saveError === 'enabled' ? SAVE_ERROR : undefined}
        {...(firstSwitchRef ? { switchRef: firstSwitchRef } : {})}
      />
    </div>
  );
}
