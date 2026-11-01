import { useId, type Ref } from 'react';
import { Switch } from '../../atoms/Switch';
import styles from './SettingRow.module.scss';

interface SettingRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  errorMessage?: string | undefined;
  switchRef?: Ref<HTMLButtonElement>;
}

export function SettingRow({
  label,
  checked,
  onChange,
  disabled,
  errorMessage,
  switchRef,
}: SettingRowProps) {
  const switchId = useId();
  const errorId = useId();
  return (
    <div>
      <div className={styles.row}>
        <label htmlFor={switchId} className={styles.label}>
          {label}
        </label>
        <Switch
          id={switchId}
          ref={switchRef}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          aria-describedby={errorMessage === undefined ? undefined : errorId}
        />
      </div>
      {errorMessage !== undefined && (
        <p id={errorId} role="alert" className={styles.error}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
