import { render, screen } from '@testing-library/react';
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
  const view = render(
    <BadgeSettingsPanel
      enabled
      onEnabledChange={onEnabledChange}
      saveError={null}
      loadError={false}
      {...props}
    />,
  );
  return { onEnabledChange, ...view };
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

  it('has no accessibility violations, including with both errors', async () => {
    const { container } = renderPanel({ saveError: 'enabled', loadError: true });

    expect(await axe(container)).toHaveNoViolations();
  });
});
