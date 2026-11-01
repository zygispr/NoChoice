import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Text } from './Text';

describe('Text', () => {
  it('renders its children in a span by default', () => {
    render(<Text>Hello</Text>);

    expect(screen.getByText('Hello').tagName).toBe('SPAN');
  });

  it('can render a paragraph', () => {
    render(<Text as="p">Hello</Text>);

    expect(screen.getByText('Hello').tagName).toBe('P');
  });

  it.each(['body', 'muted', 'strong'] as const)('renders the %s variant', (variant) => {
    render(<Text variant={variant}>Hello</Text>);

    expect(screen.getByText('Hello').className).toContain(variant);
  });
});
