import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import type { StatusMessage } from '../../../../shared/messages';
import type { PageStatusState } from '../../../hooks/usePageStatus';
import { PageStatus } from './PageStatus';

const status = (overrides: Partial<StatusMessage> = {}): StatusMessage => ({
  type: 'status',
  hiddenCount: 15,
  hiddenByBadge: { choice: 12, brandPlus: 3 },
  revealed: false,
  ...overrides,
});

const CASES: [name: string, state: PageStatusState, hidingEnabled: boolean, copy: string][] = [
  ['loading', { kind: 'loading' }, true, ''],
  [
    'active',
    { kind: 'active', status: status() },
    true,
    '15 hidden on this pageChoice 12 · Brand+ 3',
  ],
  [
    'active with nothing hidden',
    {
      kind: 'active',
      status: status({ hiddenCount: 0, hiddenByBadge: { choice: 0, brandPlus: 0 } }),
    },
    true,
    'Nothing hidden on this page',
  ],
  [
    'active, hiding off',
    {
      kind: 'active',
      status: status({ hiddenCount: 0, hiddenByBadge: { choice: 0, brandPlus: 0 } }),
    },
    false,
    'Hiding is off. All listings are shown.',
  ],
  [
    'active, revealed',
    {
      kind: 'active',
      status: status({
        hiddenCount: 0,
        hiddenByBadge: { choice: 0, brandPlus: 0 },
        revealed: true,
      }),
    },
    true,
    "Showing hidden listings on this page. They'll be hidden again when you reload or change results.",
  ],
  ['not AliExpress', { kind: 'not-aliexpress' }, true, 'NoChoice only works on AliExpress.'],
  [
    'reload needed',
    { kind: 'reload-needed' },
    true,
    'Reload this AliExpress page to start hiding listings.',
  ],
];

describe('PageStatus', () => {
  it.each(CASES)('shows the contract copy for %s', (_name, state, hidingEnabled, copy) => {
    const { container } = render(<PageStatus state={state} hidingEnabled={hidingEnabled} />);

    expect(container.textContent).toBe(copy);
  });

  it.each(CASES)('is a polite live region for %s', (_name, state, hidingEnabled) => {
    const { container } = render(<PageStatus state={state} hidingEnabled={hidingEnabled} />);

    expect(container.firstElementChild).toHaveAttribute('aria-live', 'polite');
  });

  it('prefers the hiding-off copy over a revealed page', () => {
    const { container } = render(
      <PageStatus
        state={{ kind: 'active', status: status({ revealed: true }) }}
        hidingEnabled={false}
      />,
    );

    expect(container.textContent).toBe('Hiding is off. All listings are shown.');
  });

  it('still asks for a reload while hiding is off', () => {
    const { container } = render(
      <PageStatus state={{ kind: 'reload-needed' }} hidingEnabled={false} />,
    );

    expect(container.textContent).toBe('Reload this AliExpress page to start hiding listings.');
  });

  it.each(CASES)('has no accessibility violations for %s', async (_name, state, hidingEnabled) => {
    const { container } = render(<PageStatus state={state} hidingEnabled={hidingEnabled} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
