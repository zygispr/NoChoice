import { beforeEach, describe, expect, it } from 'vitest';
import { countHidden } from '../../src/content/page/hiddenCount';
import type { BadgeType } from '../../src/shared/badgeTypes';

const BOTH: ReadonlySet<BadgeType> = new Set(['choice', 'brand-plus']);
const CHOICE_ONLY: ReadonlySet<BadgeType> = new Set(['choice']);

const cards = (...badges: string[]): string =>
  badges.map((value) => `<div data-nochoice-badges="${value}"></div>`).join('');

describe('countHidden', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('counts a card with two hidden badges once in total and once per badge', () => {
    document.body.innerHTML = `<div id="card-list">${cards('choice brand-plus', 'choice', '')}</div>`;

    expect(countHidden(document, BOTH, false)).toEqual({
      hiddenCount: 2,
      hiddenByBadge: { choice: 2, brandPlus: 1 },
      totalCount: 3,
      fullyHiddenContainers: [],
    });
  });

  it('does not count a badge outside the hidden set', () => {
    document.body.innerHTML = `<div id="card-list">${cards('brand-plus', 'choice')}</div>`;

    const counts = countHidden(document, CHOICE_ONLY, false);

    expect(counts.hiddenCount).toBe(1);
    expect(counts.hiddenByBadge).toEqual({ choice: 1, brandPlus: 0 });
  });

  it('counts nothing as hidden when the page is revealed', () => {
    document.body.innerHTML = `<div id="card-list">${cards('choice', 'choice')}</div>`;

    expect(countHidden(document, BOTH, true)).toEqual({
      hiddenCount: 0,
      hiddenByBadge: { choice: 0, brandPlus: 0 },
      totalCount: 2,
      fullyHiddenContainers: [],
    });
  });

  it('lists a primary results container whose cards are all hidden', () => {
    document.body.innerHTML = `<div id="card-list">${cards('choice', 'brand-plus')}</div>`;

    expect(countHidden(document, BOTH, false).fullyHiddenContainers).toEqual([
      { container: document.querySelector('#card-list'), hiddenCount: 2 },
    ]);
  });

  it('does not list a primary container with a visible card', () => {
    document.body.innerHTML = `<div id="card-list">${cards('choice', '')}</div>`;

    expect(countHidden(document, BOTH, false).fullyHiddenContainers).toEqual([]);
  });

  it('does not list a primary container when its badge is not hidden', () => {
    document.body.innerHTML = `<div id="card-list">${cards('brand-plus')}</div>`;

    expect(countHidden(document, CHOICE_ONLY, false).fullyHiddenContainers).toEqual([]);
  });

  it('does not list an empty primary container', () => {
    document.body.innerHTML = '<div id="card-list"></div>';

    expect(countHidden(document, BOTH, false).fullyHiddenContainers).toEqual([]);
  });

  it.each([
    ['sponsored row', '<div class="p4p--p4pList--2B-vc3X">CARDS</div>'],
    [
      'homepage feed',
      '<div class="pc2023-more-to-love--motolove-warp--3jVaS6A"><div>CARDS</div></div>',
    ],
    [
      'product-page recommendations',
      '<div id="nav-moretolove"><div class="pdp-wrap"><div>CARDS</div></div></div>',
    ],
  ])('never lists a %s, even when entirely hidden', (_name, markup) => {
    document.body.innerHTML = markup.replace('CARDS', cards('choice', 'choice'));

    const counts = countHidden(document, BOTH, false);

    expect(counts.hiddenCount).toBe(2);
    expect(counts.fullyHiddenContainers).toEqual([]);
  });
});
