import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { failNextSet, getFakeChrome } from '../../../../../tests/helpers/fakeChrome';
import { writeSettings } from '../../../../shared/settingsStore';
import { PopupPage } from './PopupPage';

function onAliExpressPage(hiddenCount = 15): void {
  const fake = getFakeChrome();
  fake.tabs.setTabs([{ id: 1, url: 'https://www.aliexpress.com/w/x.html', active: true }]);
  fake.runtime.onConnect.addListener((port) => {
    port.postMessage({
      type: 'status',
      hiddenCount,
      hiddenByBadge: { choice: hiddenCount, brandPlus: 0 },
      revealed: false,
    });
  });
}

const masterSwitch = () => screen.findByRole('switch', { name: 'Hide listings' });

describe('PopupPage', () => {
  it('renders the header, the page status, and the master switch', async () => {
    onAliExpressPage();

    render(<PopupPage />);

    expect(screen.getByRole('heading', { name: 'NoChoice' })).toBeInTheDocument();
    expect(await screen.findByText('hidden on this page', { exact: false })).toHaveTextContent(
      '15 hidden on this page',
    );
    expect(await masterSwitch()).toBeChecked();
  });

  it('focuses the first switch on open', async () => {
    onAliExpressPage();

    render(<PopupPage />);

    const control = await masterSwitch();
    await waitFor(() => {
      expect(control).toHaveFocus();
    });
  });

  it('has the master switch first in the tab order', async () => {
    onAliExpressPage();
    render(<PopupPage />);
    const control = await masterSwitch();
    // Wait for the popup's own focus, which would otherwise undo this blur.
    await waitFor(() => {
      expect(control).toHaveFocus();
    });
    control.blur();

    await userEvent.tab();

    expect(control).toHaveFocus();
  });

  it('writes storage when toggled and shows the hiding-off copy', async () => {
    onAliExpressPage();
    render(<PopupPage />);

    await userEvent.click(await masterSwitch());

    const { settings } = await getFakeChrome().storage.local.get('settings');
    expect(settings).toEqual({
      version: 1,
      enabled: false,
      hide: { choice: true, brandPlus: true },
    });
    expect(await screen.findByText('Hiding is off. All listings are shown.')).toBeInTheDocument();
  });

  it('shows hiding as off from the start when stored that way', async () => {
    await writeSettings({ version: 1, enabled: false, hide: { choice: true, brandPlus: true } });
    onAliExpressPage();

    render(<PopupPage />);

    expect(await masterSwitch()).not.toBeChecked();
    expect(await screen.findByText('Hiding is off. All listings are shown.')).toBeInTheDocument();
  });

  it('reverts the switch and explains when saving fails', async () => {
    onAliExpressPage();
    render(<PopupPage />);
    const control = await masterSwitch();
    failNextSet(new Error('quota'));

    await userEvent.click(control);

    expect(
      await screen.findByText("Couldn't save this setting. Please try again."),
    ).toBeInTheDocument();
    expect(control).toBeChecked();
  });

  it('shows the defaults and an explanation when loading fails', async () => {
    vi.spyOn(getFakeChrome().storage.local, 'get').mockRejectedValueOnce(new Error('no storage'));
    onAliExpressPage();

    render(<PopupPage />);

    expect(
      await screen.findByText(
        "Couldn't load your settings, so the defaults are shown. Changing a switch will try to save again.",
      ),
    ).toBeInTheDocument();
    expect(await masterSwitch()).toBeChecked();
  });

  it('still offers the settings on another site', async () => {
    getFakeChrome().tabs.setTabs([{ id: 1, url: 'https://example.com/', active: true }]);

    render(<PopupPage />);

    expect(await screen.findByText('NoChoice only works on AliExpress.')).toBeInTheDocument();
    expect(await masterSwitch()).toBeInTheDocument();
  });

  it('writes the complete settings when a badge switch is toggled', async () => {
    onAliExpressPage();
    render(<PopupPage />);

    await userEvent.click(await screen.findByRole('switch', { name: 'Brand+' }));

    const { settings } = await getFakeChrome().storage.local.get('settings');
    expect(settings).toEqual({
      version: 1,
      enabled: true,
      hide: { choice: true, brandPlus: false },
    });
    expect(await screen.findByRole('switch', { name: 'Brand+' })).not.toBeChecked();
  });

  it('brings back the per-badge choices after the master goes off and on', async () => {
    onAliExpressPage();
    render(<PopupPage />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Brand+' }));

    await userEvent.click(await masterSwitch());
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Brand+' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
    expect(screen.getByRole('switch', { name: 'Brand+' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Choice' })).toBeChecked();

    await userEvent.click(await masterSwitch());

    const { settings } = await getFakeChrome().storage.local.get('settings');
    expect(settings).toEqual({
      version: 1,
      enabled: true,
      hide: { choice: true, brandPlus: false },
    });
    expect(screen.getByRole('switch', { name: 'Brand+' })).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('switch', { name: 'Brand+' })).not.toBeChecked();
  });

  it('reverts only the badge that failed to save, and explains beside it', async () => {
    onAliExpressPage();
    render(<PopupPage />);
    const choice = await screen.findByRole('switch', { name: 'Choice' });
    failNextSet(new Error('quota'));

    await userEvent.click(choice);

    await waitFor(() => {
      expect(choice).toHaveAccessibleDescription("Couldn't save this setting. Please try again.");
    });
    expect(choice).toBeChecked();
    expect(await masterSwitch()).not.toHaveAccessibleDescription();
  });

  it('tabs from the master switch to the badge switches', async () => {
    onAliExpressPage();
    render(<PopupPage />);
    await waitFor(async () => {
      expect(await masterSwitch()).toHaveFocus();
    });

    await userEvent.tab();
    expect(screen.getByRole('switch', { name: 'Choice' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('switch', { name: 'Brand+' })).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    onAliExpressPage();
    const { container } = render(<PopupPage />);
    await masterSwitch();

    expect(await axe(container)).toHaveNoViolations();
  });
});
