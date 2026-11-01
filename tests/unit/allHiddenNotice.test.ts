import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import {
  removeAllHiddenNotices,
  renderAllHiddenNotice,
  updateAllHiddenNotices,
} from '../../src/content/notice/allHiddenNotice';
import type { BadgeType } from '../../src/shared/badgeTypes';

const BOTH: ReadonlySet<BadgeType> = new Set(['choice', 'brand-plus']);
const CHOICE_ONLY: ReadonlySet<BadgeType> = new Set(['choice']);

function shadowOf(notice: Element | null | undefined): ShadowRoot {
  const shadow = notice?.shadowRoot;
  if (!shadow) throw new Error('Expected a notice with an open shadow root');
  return shadow;
}

function button(notice: Element | null | undefined): HTMLButtonElement {
  const element = shadowOf(notice).querySelector('button');
  if (!element) throw new Error('Expected the notice to have a button');
  return element;
}

const notices = (): Element[] => [...document.querySelectorAll('nochoice-notice')];

describe('all listings hidden notice', () => {
  let container: HTMLElement;
  const onReveal = vi.fn();

  beforeEach(() => {
    document.body.innerHTML = '<main><div id="card-list"></div></main>';
    const element = document.querySelector<HTMLElement>('#card-list');
    if (!element) throw new Error('Test setup failed');
    container = element;
    onReveal.mockClear();
  });

  afterEach(() => {
    removeAllHiddenNotices(document);
    vi.useRealTimers();
  });

  describe('renderAllHiddenNotice', () => {
    it('inserts one notice before the container, with an open shadow root', () => {
      renderAllHiddenNotice(container, 12, BOTH, onReveal);

      expect(notices()).toHaveLength(1);
      expect(container.previousElementSibling?.localName).toBe('nochoice-notice');
      expect(shadowOf(notices()[0]).mode).toBe('open');
    });

    it('announces the count and both hidden badges', () => {
      renderAllHiddenNotice(container, 12, BOTH, onReveal);

      expect(shadowOf(notices()[0]).querySelector('[role="status"]')?.textContent).toContain(
        'All 12 listings in these results were hidden by NoChoice (Choice and Brand+).',
      );
    });

    it('names only the badges that are hidden', () => {
      renderAllHiddenNotice(container, 3, CHOICE_ONLY, onReveal);

      expect(shadowOf(notices()[0]).textContent).toContain(
        'All 3 listings in these results were hidden by NoChoice (Choice).',
      );
    });

    it('has a "Show hidden listings" button', () => {
      renderAllHiddenNotice(container, 3, BOTH, onReveal);

      expect(button(notices()[0]).textContent).toBe('Show hidden listings');
      expect(button(notices()[0]).type).toBe('button');
    });

    it('calls onReveal once on click', async () => {
      renderAllHiddenNotice(container, 3, BOTH, onReveal);

      await userEvent.click(button(notices()[0]));

      expect(onReveal).toHaveBeenCalledTimes(1);
    });

    it.each([['{Enter}'], [' ']])('calls onReveal once on the %j key', async (key) => {
      renderAllHiddenNotice(container, 3, BOTH, onReveal);
      button(notices()[0]).focus();

      await userEvent.keyboard(key);

      expect(onReveal).toHaveBeenCalledTimes(1);
    });

    it('updates the existing notice instead of adding a second one', () => {
      renderAllHiddenNotice(container, 3, BOTH, onReveal);
      const status = shadowOf(notices()[0]).querySelector('[role="status"]');

      renderAllHiddenNotice(container, 4, BOTH, onReveal);

      expect(notices()).toHaveLength(1);
      expect(shadowOf(notices()[0]).querySelector('[role="status"]')).toBe(status);
      expect(status?.textContent).toContain('All 4 listings');
    });

    it('carries the stylesheet inside the shadow root, not on the page', () => {
      renderAllHiddenNotice(container, 3, BOTH, onReveal);

      expect(shadowOf(notices()[0]).querySelector('style')).not.toBeNull();
      expect(document.head.querySelector('style')).toBeNull();
    });

    it('has no accessibility violations', async () => {
      renderAllHiddenNotice(container, 3, BOTH, onReveal);

      expect(await axe(document.body)).toHaveNoViolations();
    });
  });

  describe('removeAllHiddenNotices', () => {
    it('removes every notice', () => {
      const other = document.createElement('div');
      document.body.append(other);
      renderAllHiddenNotice(container, 3, BOTH, onReveal);
      renderAllHiddenNotice(other, 3, BOTH, onReveal);

      removeAllHiddenNotices(document);

      expect(notices()).toHaveLength(0);
    });

    it('cancels notices still waiting to settle', () => {
      vi.useFakeTimers();
      updateAllHiddenNotices([{ container, hiddenCount: 3 }], BOTH, onReveal);

      removeAllHiddenNotices(document);
      vi.advanceTimersByTime(1000);

      expect(notices()).toHaveLength(0);
    });
  });

  describe('updateAllHiddenNotices settle rule', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('shows the notice only after 500 ms', () => {
      updateAllHiddenNotices([{ container, hiddenCount: 3 }], BOTH, onReveal);

      vi.advanceTimersByTime(499);
      expect(notices()).toHaveLength(0);

      vi.advanceTimersByTime(1);
      expect(notices()).toHaveLength(1);
    });

    it('does not restart the wait when nothing changed', () => {
      updateAllHiddenNotices([{ container, hiddenCount: 3 }], BOTH, onReveal);
      vi.advanceTimersByTime(300);

      updateAllHiddenNotices([{ container, hiddenCount: 3 }], BOTH, onReveal);
      vi.advanceTimersByTime(200);

      expect(notices()).toHaveLength(1);
    });

    it('restarts the 500 ms when a card is added', () => {
      updateAllHiddenNotices([{ container, hiddenCount: 3 }], BOTH, onReveal);
      vi.advanceTimersByTime(300);

      updateAllHiddenNotices([{ container, hiddenCount: 4 }], BOTH, onReveal);
      vi.advanceTimersByTime(499);
      expect(notices()).toHaveLength(0);

      vi.advanceTimersByTime(1);
      expect(shadowOf(notices()[0]).textContent).toContain('All 4 listings');
    });

    it('never shows a notice for a container that stops being fully hidden in time', () => {
      updateAllHiddenNotices([{ container, hiddenCount: 3 }], BOTH, onReveal);
      vi.advanceTimersByTime(300);

      updateAllHiddenNotices([], BOTH, onReveal);
      vi.advanceTimersByTime(1000);

      expect(notices()).toHaveLength(0);
    });

    it('removes a shown notice as soon as the container has a visible card', () => {
      updateAllHiddenNotices([{ container, hiddenCount: 3 }], BOTH, onReveal);
      vi.advanceTimersByTime(500);
      expect(notices()).toHaveLength(1);

      updateAllHiddenNotices([], BOTH, onReveal);

      expect(notices()).toHaveLength(0);
    });

    it('removes the notice of a container that has left the page', () => {
      updateAllHiddenNotices([{ container, hiddenCount: 3 }], BOTH, onReveal);
      vi.advanceTimersByTime(500);

      container.remove();
      updateAllHiddenNotices([], BOTH, onReveal);

      expect(notices()).toHaveLength(0);
    });

    it('updates the count of a shown notice straight away', () => {
      updateAllHiddenNotices([{ container, hiddenCount: 3 }], BOTH, onReveal);
      vi.advanceTimersByTime(500);

      updateAllHiddenNotices([{ container, hiddenCount: 5 }], BOTH, onReveal);

      expect(shadowOf(notices()[0]).textContent).toContain('All 5 listings');
    });

    it('settles each container on its own', () => {
      const other = document.createElement('div');
      document.body.append(other);
      updateAllHiddenNotices([{ container, hiddenCount: 3 }], BOTH, onReveal);
      vi.advanceTimersByTime(300);

      updateAllHiddenNotices(
        [
          { container, hiddenCount: 3 },
          { container: other, hiddenCount: 2 },
        ],
        BOTH,
        onReveal,
      );
      vi.advanceTimersByTime(200);

      expect(notices()).toHaveLength(1);
      expect(container.previousElementSibling?.localName).toBe('nochoice-notice');
    });
  });
});
