import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HiddenCountSummary } from './HiddenCountSummary';

describe('HiddenCountSummary', () => {
  it('shows the count and the breakdown', () => {
    const { container } = render(
      <HiddenCountSummary hiddenCount={15} hiddenByBadge={{ choice: 12, brandPlus: 3 }} />,
    );

    expect(screen.getByText('15').tagName).toBe('STRONG');
    expect(container).toHaveTextContent('15 hidden on this page');
    expect(container).toHaveTextContent('Choice 12 · Brand+ 3');
  });

  it('leaves a badge with no hidden cards out of the breakdown', () => {
    const { container } = render(
      <HiddenCountSummary hiddenCount={12} hiddenByBadge={{ choice: 12, brandPlus: 0 }} />,
    );

    expect(container).toHaveTextContent('Choice 12');
    expect(container).not.toHaveTextContent('Brand+');
    expect(container).not.toHaveTextContent('·');
  });

  it('says nothing is hidden when the count is zero', () => {
    const { container } = render(
      <HiddenCountSummary hiddenCount={0} hiddenByBadge={{ choice: 0, brandPlus: 0 }} />,
    );

    expect(container.textContent).toBe('Nothing hidden on this page');
  });
});
