import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyHiding } from '../../src/content/page/applySettings';
import type { BadgeType } from '../../src/shared/badgeTypes';

const CONTENT_STYLESHEET = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/content/content.scss',
);

const hiding = (...badges: BadgeType[]): ReadonlySet<BadgeType> => new Set(badges);

describe('applyHiding', () => {
  const html = document.documentElement;

  afterEach(() => {
    html.removeAttribute('data-nochoice-hide');
  });

  it('lists both hidden badges on <html>', () => {
    applyHiding(html, hiding('brand-plus', 'choice'), false);

    expect(html.getAttribute('data-nochoice-hide')).toBe('choice brand-plus');
  });

  it('lists a single hidden badge', () => {
    applyHiding(html, hiding('choice'), false);

    expect(html.getAttribute('data-nochoice-hide')).toBe('choice');
  });

  it('removes the attribute when nothing is hidden', () => {
    applyHiding(html, hiding('choice'), false);

    applyHiding(html, hiding(), false);

    expect(html.hasAttribute('data-nochoice-hide')).toBe(false);
  });

  it('removes the attribute when the page is revealed', () => {
    applyHiding(html, hiding('choice'), false);

    applyHiding(html, hiding('choice'), true);

    expect(html.hasAttribute('data-nochoice-hide')).toBe(false);
  });

  describe('with the content stylesheet', () => {
    let style: HTMLStyleElement;
    let choiceCard: HTMLElement;
    let brandPlusCard: HTMLElement;
    let plainCard: HTMLElement;

    const cardWith = (badges: string): HTMLElement => {
      const card = document.createElement('div');
      card.setAttribute('data-nochoice-badges', badges);
      document.body.append(card);
      return card;
    };

    beforeEach(() => {
      style = document.createElement('style');
      style.textContent = compile(CONTENT_STYLESHEET).css;
      document.head.append(style);
      choiceCard = cardWith('choice');
      brandPlusCard = cardWith('brand-plus');
      plainCard = cardWith('');
    });

    afterEach(() => {
      style.remove();
      choiceCard.remove();
      brandPlusCard.remove();
      plainCard.remove();
    });

    it('hides a card only when its badge is in the hidden set', () => {
      applyHiding(html, hiding('choice'), false);

      expect(getComputedStyle(choiceCard).display).toBe('none');
      expect(getComputedStyle(brandPlusCard).display).not.toBe('none');
      expect(getComputedStyle(plainCard).display).not.toBe('none');
    });

    it('shows every card once the page is revealed', () => {
      applyHiding(html, hiding('choice', 'brand-plus'), true);

      expect(getComputedStyle(choiceCard).display).not.toBe('none');
      expect(getComputedStyle(brandPlusCard).display).not.toBe('none');
    });
  });
});
