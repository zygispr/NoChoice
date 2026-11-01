import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('keeps its text available to screen readers', () => {
    render(
      <button type="button">
        <VisuallyHidden>Close</VisuallyHidden>
      </button>,
    );

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
