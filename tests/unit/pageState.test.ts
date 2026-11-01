import { describe, expect, it } from 'vitest';
import { createPageState, pageKeyOf } from '../../src/content/page/pageState';

describe('pageKeyOf', () => {
  it('is the origin, path, and search, ignoring the hash', () => {
    const location = new URL('https://www.aliexpress.com/w/wholesale.html?page=2&sort=x#top');

    expect(pageKeyOf(location)).toBe('https://www.aliexpress.com/w/wholesale.html?page=2&sort=x');
  });
});

describe('createPageState', () => {
  it('starts on the current page, not revealed', () => {
    const state = createPageState();

    expect(state.pageKey).toBe(pageKeyOf(location));
    expect(state.revealed).toBe(false);
  });

  it('reveal() marks the page as revealed', () => {
    const state = createPageState();

    state.reveal();

    expect(state.revealed).toBe(true);
  });

  it('onNavigate clears the reveal when the key differs', () => {
    const state = createPageState();
    state.reveal();

    expect(state.onNavigate('https://www.aliexpress.com/w/other.html')).toBe(true);

    expect(state.revealed).toBe(false);
    expect(state.pageKey).toBe('https://www.aliexpress.com/w/other.html');
  });

  it('onNavigate keeps the reveal when the key is the same', () => {
    const state = createPageState();
    state.reveal();

    expect(state.onNavigate(state.pageKey)).toBe(false);

    expect(state.revealed).toBe(true);
  });
});
