import { listFixtures, loadExpected } from '../helpers/loadFixture';
import { allChoice, sponsoredRowAllChoice, unknownMarkup } from '../helpers/syntheticFixtures';
import { expectHidingMatchesLabels } from './support/hidingAssertions';
import { expect, test } from './support/extensionTest';
import { parseFixture } from './support/parseFixture';

const SEARCH_URL = loadExpected('search-com').source;
const NOTICE_BUTTON = { name: 'Show hidden listings' };

test.describe('US1 edge cases', () => {
  test.afterEach(({ assertNoExtensionNetworkActivity }) => {
    assertNoExtensionNetworkActivity();
  });

  test('a product page keeps its main product and hides only recommendations (FR-009)', async ({
    page,
    serveFixture,
  }) => {
    const { source } = loadExpected('pdp-com');
    serveFixture(source, 'pdp-com');

    await page.goto(source);

    await expect(page.locator('.pdp-info')).toBeVisible();
    await expect(page.locator('h1[data-pl="product-title"]')).toBeVisible();
    await expect(page.locator('.pdp-info [data-nochoice-badges]')).toHaveCount(0);
    await expectHidingMatchesLabels(page, 'pdp-com');
  });

  test('unrecognised markup hides nothing (FR-016)', async ({ page, serveHtml }) => {
    serveHtml(SEARCH_URL, unknownMarkup(parseFixture('search-com')));

    await page.goto(SEARCH_URL);

    const cards = page.locator('#card-list > *');
    await expect(cards).toHaveCount(60);
    for (const card of await cards.all()) await expect(card).toBeVisible();
    await expect(page.locator('nochoice-notice')).toHaveCount(0);
  });

  for (const url of [
    'https://example.com/',
    'https://aliexpress.ru/wholesale?SearchText=phone+case',
  ]) {
    test(`does nothing at ${url} (FR-018)`, async ({ page, serveFixture }) => {
      serveFixture(url, 'search-com');

      await page.goto(url);

      await expect(page.locator('#card-list > *')).toHaveCount(60);
      await expect(page.locator('[data-nochoice-badges]')).toHaveCount(0);
      await expect(page.locator('html')).not.toHaveAttribute('data-nochoice-hide');
      await expect(page.locator('nochoice-notice')).toHaveCount(0);
    });
  }

  test('an all-Choice sponsored row gets no notice (FR-015)', async ({ page, serveHtml }) => {
    serveHtml(SEARCH_URL, sponsoredRowAllChoice(parseFixture('search-com')));

    await page.goto(SEARCH_URL);

    const sponsored = page.locator("[class*='p4p--p4pList'] > *");
    await expect(sponsored).toHaveCount(5);
    for (const card of await sponsored.all()) await expect(card).toBeHidden();
    // Wait past the settle time: the notice would have appeared by now.
    await page.waitForTimeout(700);
    await expect(page.locator('nochoice-notice')).toHaveCount(0);
  });

  test('all results hidden: a notice after 500 ms offers a one-page reveal (FR-015)', async ({
    page,
    serveHtml,
    storedKeys,
  }) => {
    await page.addInitScript(() => {
      const times = { lastCard: 0, notice: 0 };
      Object.assign(window, { noticeTimes: times });
      new MutationObserver((records) => {
        for (const { addedNodes } of records) {
          for (const node of addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.localName === 'nochoice-notice') times.notice = performance.now();
            else if (node.parentElement?.id === 'card-list') times.lastCard = performance.now();
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });
    const allChoicePage = allChoice(parseFixture('search-com'));
    serveHtml(SEARCH_URL, allChoicePage);
    serveHtml(`${SEARCH_URL}?page=2`, allChoicePage);
    await page.goto(SEARCH_URL);

    const reveal = page.getByRole('button', NOTICE_BUTTON);
    await expect(reveal).toBeVisible();
    await expect(page.locator('nochoice-notice')).toHaveCount(1);
    await expect(page.getByRole('status')).toHaveText(
      /All 44 listings in these results were hidden by NoChoice \(Choice and Brand\+\)\./,
    );
    const waited = await page.evaluate(() => {
      const { noticeTimes } = window as unknown as {
        noticeTimes: { lastCard: number; notice: number };
      };
      return noticeTimes.notice - noticeTimes.lastCard;
    });
    expect(waited).toBeGreaterThanOrEqual(480);

    await reveal.click();

    await expect(page.locator('nochoice-notice')).toHaveCount(0);
    const cards = page.locator('#card-list > *');
    await expect(cards).toHaveCount(44);
    for (const card of await cards.all()) await expect(card).toBeVisible();
    expect(await storedKeys()).toEqual([]);

    // Cards that load later on the same page stay visible.
    await page.evaluate(() => {
      const grid = document.querySelector('#card-list');
      const clone = grid?.firstElementChild?.cloneNode(true) as Element | undefined;
      if (!grid || !clone) throw new Error('The page has no card to clone');
      clone.removeAttribute('data-nochoice-badges');
      clone.id = 'late-card';
      grid.append(clone);
    });
    await expect(page.locator('#late-card')).toHaveAttribute('data-nochoice-badges', 'choice');
    await expect(page.locator('#late-card')).toBeVisible();

    // Moving to different results resumes hiding, and the notice comes back after settling.
    await page.evaluate(() => {
      history.pushState(null, '', '?page=2');
      document.querySelector('#late-card')?.remove();
    });
    await expect(cards.first()).toBeHidden();
    await expect(reveal).toBeVisible();

    await reveal.click();
    await expect(cards.first()).toBeVisible();

    // So does a reload.
    await page.reload();
    await expect(cards.first()).toBeHidden();
  });

  for (const name of listFixtures()) {
    test(`${name} hides exactly its labelled cards at its own URL (FR-007, FR-008)`, async ({
      page,
      serveFixture,
    }) => {
      const { source } = loadExpected(name);
      serveFixture(source, name);

      await page.goto(source);

      await expectHidingMatchesLabels(page, name);
    });
  }
});
