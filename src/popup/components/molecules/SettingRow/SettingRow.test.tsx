import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { SettingRow } from './SettingRow';

describe('SettingRow', () => {
  it('labels the switch with its visible label', () => {
    render(<SettingRow label="Hide listings" checked onChange={vi.fn()} />);

    expect(screen.getByText('Hide listings')).toBeVisible();
    expect(screen.getByRole('switch', { name: 'Hide listings' })).toBeChecked();
  });

  it('passes changes on', async () => {
    const onChange = vi.fn();
    render(<SettingRow label="Hide listings" checked onChange={onChange} />);

    await userEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('has no error message by default', () => {
    render(<SettingRow label="Hide listings" checked onChange={vi.fn()} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toHaveAttribute('aria-describedby');
  });

  it('links an error message to the switch', () => {
    render(
      <SettingRow label="Hide listings" checked onChange={vi.fn()} errorMessage="Couldn't save." />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save.");
    expect(screen.getByRole('switch')).toHaveAccessibleDescription("Couldn't save.");
  });

  it('passes disabled on', async () => {
    const onChange = vi.fn();
    render(<SettingRow label="Choice" checked disabled onChange={onChange} />);

    await userEvent.click(screen.getByRole('switch'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('has no accessibility violations, with or without an error', async () => {
    const { container } = render(
      <>
        <SettingRow label="One" checked onChange={vi.fn()} />
        <SettingRow label="Two" checked onChange={vi.fn()} errorMessage="Couldn't save." />
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
