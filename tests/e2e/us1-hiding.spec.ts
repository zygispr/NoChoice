import { loadExpected } from '../helpers/loadFixture';
import { expectHidingMatchesLabels, expectNoGridGaps } from './support/hidingAssertions';
import { expect, test } from './support/extensionTest';
import { parseFixture } from './support/parseFixture';

const SEARCH_URL = loadExpected('search-com').source;
const CHOICE_IMAGE_SELECTOR = 'img[src*="S135d2af8d57840b28092ceba069bdb6c4"]';

test.describe('US1: browse without Choice and Brand+ listings', () => {
  test.afterEach(({ assertNoExtensionNetworkActivity }) => {
    assertNoExtensionNetworkActivity(); // SC-007
  });

  test('Choice listings are removed from view and the grid closes the gaps', async ({
    page,
    serveFixture,
  }) => {
    serveFixture(SEARCH_URL, 'search-com');

    await page.goto(SEARCH_URL);

    await expectHidingMatchesLabels(page, 'search-com');
    await expectNoGridGaps(page, '#card-list');
  });

  test('Brand+ listings are removed from view', async ({ page, serveFixture }) => {
    const { source, listings } = loadExpected('home-com');
    expect(listings.some(({ badges }) => badges.includes('brand-plus'))).toBe(true);
    serveFixture(source, 'home-com');

    await page.goto(source);

    await expectHidingMatchesLabels(page, 'home-com');
    await expectNoGridGaps(page, '._1wVX7');
  });

  test('listings with only other tags stay visible', async ({ page, serveFixture }) => {
    serveFixture(SEARCH_URL, 'search-com');

    await page.goto(SEARCH_URL);

    // Sponsored cards ("Ad"), sale tags, and Bundle deals cards are all among these.
    const visible = await page
      .locator("#card-list > [data-nochoice-badges=''], [class*='p4p--p4pList'] > *")
      .all();
    expect(visible.length).toBeGreaterThan(0);
    for (const card of visible) await expect(card).toBeVisible();
  });

  test('cards loaded lazily are hidden before the next frame (FR-005, FR-006)', async ({
    page,
    serveFixture,
  }) => {
    serveFixture(SEARCH_URL, 'search-com');
    await page.goto(SEARCH_URL);

    const clones = await page.evaluate(
      (choiceImage) =>
        new Promise<{ choice: boolean; display: string }[]>((resolve) => {
          const grid = document.querySelector('#card-list');
          if (!grid) throw new Error('The fixture has no results grid');
          const added = [...grid.children].slice(0, 20).map((card) => {
            const clone = card.cloneNode(true) as Element;
            clone.removeAttribute('data-nochoice-badges');
            return clone;
          });
          grid.append(...added);
          requestAnimationFrame(() => {
            resolve(
              added.map((clone) => ({
                choice: clone.querySelector(choiceImage) !== null,
                display: getComputedStyle(clone).display,
              })),
            );
          });
        }),
      CHOICE_IMAGE_SELECTOR,
    );

    expect(clones.some(({ choice }) => choice)).toBe(true);
    expect(clones.some(({ choice }) => !choice)).toBe(true);
    for (const { choice, display } of clones) {
      expect(display === 'none').toBe(choice);
    }
  });

  test('results replaced in place are hidden with no reload (FR-005)', async ({
    page,
    serveFixture,
  }) => {
    serveFixture(SEARCH_URL, 'search-com');
    await page.goto(SEARCH_URL);
    const nextResults = parseFixture('search-us').querySelector('#card-list')?.innerHTML ?? '';

    await page.evaluate((html) => {
      // A reload would wipe this marker, unlike the history change.
      Object.assign(window, { sameDocument: true });
      history.pushState(null, '', '?page=2');
      const grid = document.querySelector('#card-list');
      if (grid) grid.innerHTML = html;
    }, nextResults);

    const grid = page.locator('#card-list > *');
    await expect(grid).toHaveCount(30);
    const cards = await grid.evaluateAll((elements) =>
      elements.map((element) => ({
        choice: element.querySelector('img[src*="S1887a285b60743859ac7bdbfca5e0896Z"]') !== null,
        display: getComputedStyle(element).display,
      })),
    );
    expect(cards.some(({ choice }) => choice)).toBe(true);
    for (const { choice, display } of cards) expect(display === 'none').toBe(choice);
    expect(await page.evaluate(() => 'sameDocument' in window)).toBe(true);
  });

  test('a fresh profile hides on the first visit, without writing settings (SC-005)', async ({
    page,
    serveFixture,
    storedKeys,
  }) => {
    serveFixture(SEARCH_URL, 'search-com');

    await page.goto(SEARCH_URL);

    await expect(page.locator('html')).toHaveAttribute('data-nochoice-hide', 'choice brand-plus');
    expect(await storedKeys()).toEqual([]);
  });
});
