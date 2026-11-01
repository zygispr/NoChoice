import type { Ref } from 'react';
import { VisuallyHidden } from '../VisuallyHidden';
import styles from './Switch.module.scss';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string | undefined;
  /** Stays focusable, unlike the native attribute, so keyboard users can still find the setting. */
  disabled?: boolean | undefined;
  ref?: Ref<HTMLButtonElement> | undefined;
  'aria-label'?: string | undefined;
  'aria-describedby'?: string | undefined;
}

export function Switch({ checked, onChange, disabled = false, ...buttonProps }: SwitchProps) {
  return (
    <button
      {...buttonProps}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled ? true : undefined}
      className={styles.switch}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
    >
      <span className={styles.knob} />
      <VisuallyHidden>{checked ? 'On' : 'Off'}</VisuallyHidden>
    </button>
  );
}
