import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Switch } from './Switch';

function renderSwitch(props: { checked?: boolean; disabled?: boolean } = {}) {
  const onChange = vi.fn();
  const view = render(
    <>
      <label htmlFor="hide">Hide listings</label>
      <Switch id="hide" checked={props.checked ?? false} onChange={onChange} {...props} />
    </>,
  );
  return { onChange, view, control: screen.getByRole('switch', { name: 'Hide listings' }) };
}

describe('Switch', () => {
  it('is a switch named by its visible label, showing its state', () => {
    const { control } = renderSwitch({ checked: true });

    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(control).toHaveAttribute('type', 'button');
  });

  it('exposes its state as text, so colour is not the only signal', () => {
    const { control, view } = renderSwitch({ checked: true });
    expect(within(control).getByText('On')).toBeInTheDocument();

    view.unmount();
    const off = renderSwitch({ checked: false });
    expect(within(off.control).getByText('Off')).toBeInTheDocument();
  });

  it('asks for the opposite state on click', async () => {
    const { control, onChange } = renderSwitch({ checked: false });

    await userEvent.click(control);

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it.each([['{Enter}'], [' ']])('toggles with the %j key', async (key) => {
    const { control, onChange } = renderSwitch({ checked: true });
    control.focus();

    await userEvent.keyboard(key);

    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('follows its checked value when controlled', async () => {
    function Controlled() {
      const [checked, setChecked] = useState(false);
      return <Switch aria-label="Hide" checked={checked} onChange={setChecked} />;
    }
    render(<Controlled />);
    const control = screen.getByRole('switch');

    await userEvent.click(control);

    expect(control).toHaveAttribute('aria-checked', 'true');
  });

  it('does not toggle when disabled, but stays reachable by keyboard', async () => {
    const { control, onChange } = renderSwitch({ checked: true, disabled: true });

    await userEvent.click(control);
    control.focus();
    await userEvent.keyboard('{Enter}');

    expect(onChange).not.toHaveBeenCalled();
    expect(control).toHaveAttribute('aria-disabled', 'true');
    expect(control).toHaveFocus();
    expect(control).toHaveAttribute('aria-checked', 'true');
  });

  it('has no accessibility violations', async () => {
    const { view } = renderSwitch({ checked: true });

    expect(await axe(view.container)).toHaveNoViolations();
  });
});
