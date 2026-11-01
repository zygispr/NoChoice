import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { BadgeSettingsPanel } from './BadgeSettingsPanel';

const SAVE_ERROR = "Couldn't save this setting. Please try again.";
const LOAD_ERROR =
  "Couldn't load your settings, so the defaults are shown. Changing a switch will try to save again.";

function renderPanel(props: Partial<ComponentProps<typeof BadgeSettingsPanel>> = {}) {
  const onEnabledChange = vi.fn();
  const onBadgeChange = vi.fn();
  const view = render(
    <BadgeSettingsPanel
      enabled
      onEnabledChange={onEnabledChange}
      hide={{ choice: true, brandPlus: true }}
      onBadgeChange={onBadgeChange}
      saveError={null}
      loadError={false}
      {...props}
    />,
  );
  return { onEnabledChange, onBadgeChange, ...view };
}

describe('BadgeSettingsPanel', () => {
  it('shows the master switch in its state', () => {
    renderPanel({ enabled: false });

    expect(screen.getByRole('switch', { name: 'Hide listings' })).not.toBeChecked();
  });

  it('reports master switch changes', async () => {
    const { onEnabledChange } = renderPanel({ enabled: true });

    await userEvent.click(screen.getByRole('switch', { name: 'Hide listings' }));

    expect(onEnabledChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('shows no messages normally', () => {
    renderPanel();

    expect(screen.queryByText(SAVE_ERROR)).not.toBeInTheDocument();
    expect(screen.queryByText(LOAD_ERROR)).not.toBeInTheDocument();
  });

  it('shows the save error beside the switch that failed', () => {
    renderPanel({ saveError: 'enabled' });

    expect(screen.getByRole('switch', { name: 'Hide listings' })).toHaveAccessibleDescription(
      SAVE_ERROR,
    );
  });

  it('shows the load error at the top, with the switch still usable', async () => {
    const { onEnabledChange, container } = renderPanel({ loadError: true });

    const message = screen.getByText(LOAD_ERROR);
    const control = screen.getByRole('switch', { name: 'Hide listings' });
    expect(message.compareDocumentPosition(control)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container).toHaveTextContent(LOAD_ERROR);

    await userEvent.click(control);

    expect(onEnabledChange).toHaveBeenCalledOnce();
  });

  it('shows a switch for each badge after the master switch, in their state', () => {
    renderPanel({ hide: { choice: true, brandPlus: false } });

    const [master, choice, brandPlus] = screen.getAllByRole('switch');
    expect(master).toHaveAccessibleName('Hide listings');
    expect(choice).toHaveAccessibleName('Choice');
    expect(choice).toBeChecked();
    expect(brandPlus).toHaveAccessibleName('Brand+');
    expect(brandPlus).not.toBeChecked();
  });

  it('groups the badge switches, so their short names make sense to a screen reader', () => {
    renderPanel();

    const group = screen.getByRole('group', { name: 'Hide listings with these badges' });
    expect(within(group).getAllByRole('switch')).toHaveLength(2);
  });

  it.each([
    ['Choice', 'choice'],
    ['Brand+', 'brand-plus'],
  ])('reports changes to the %s switch', async (label, badge) => {
    const { onBadgeChange } = renderPanel();

    await userEvent.click(screen.getByRole('switch', { name: label }));

    expect(onBadgeChange).toHaveBeenCalledExactlyOnceWith(badge, false);
  });

  it('disables the badge switches while the master is off, keeping their values', async () => {
    const { onBadgeChange } = renderPanel({
      enabled: false,
      hide: { choice: true, brandPlus: false },
    });

    const choice = screen.getByRole('switch', { name: 'Choice' });
    const brandPlus = screen.getByRole('switch', { name: 'Brand+' });
    expect(choice).toHaveAttribute('aria-disabled', 'true');
    expect(choice).toBeChecked();
    expect(brandPlus).toHaveAttribute('aria-disabled', 'true');
    expect(brandPlus).not.toBeChecked();

    await userEvent.click(choice);

    expect(onBadgeChange).not.toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'Hide listings' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('tabs from the master switch to Choice to Brand+', async () => {
    renderPanel();

    await userEvent.tab();
    expect(screen.getByRole('switch', { name: 'Hide listings' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('switch', { name: 'Choice' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('switch', { name: 'Brand+' })).toHaveFocus();
  });

  it('shows the save error beside the badge switch that failed, and only there', () => {
    renderPanel({ saveError: 'brand-plus' });

    expect(screen.getByRole('switch', { name: 'Brand+' })).toHaveAccessibleDescription(SAVE_ERROR);
    expect(screen.getByRole('switch', { name: 'Choice' })).not.toHaveAccessibleDescription();
    expect(screen.getByRole('switch', { name: 'Hide listings' })).not.toHaveAccessibleDescription();
  });

  it('has no accessibility violations with the master switch off', async () => {
    const { container } = renderPanel({ enabled: false });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations, including with both errors', async () => {
    const { container } = renderPanel({ saveError: 'enabled', loadError: true });

    expect(await axe(container)).toHaveNoViolations();
  });
});
