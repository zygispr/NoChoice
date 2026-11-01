import type { Page } from '@playwright/test';
import { readClassifiedCards } from '../helpers/fixtureCards';
import { loadExpected } from '../helpers/loadFixture';
import { expect, test } from './support/extensionTest';
import { expectHidingMatchesLabels } from './support/hidingAssertions';

const FIXTURE = 'search-com';
const SEARCH_URL = loadExpected(FIXTURE).source;
const LABELS = loadExpected(FIXTURE).listings;
const HIDDEN_COUNT = LABELS.filter(({ badges }) => badges.length > 0).length;

/** FR-011's limit for a change to reach an open page. */
const ONE_SECOND = { timeout: 1000 };

const masterSwitch = (popup: Page) => popup.getByRole('switch', { name: 'Hide listings' });

const hiddenCardCount = async (page: Page): Promise<number> =>
  (await page.evaluate(readClassifiedCards)).filter(({ hidden }) => hidden).length;

test.describe('US2: turn hiding off and on, and see what was hidden', () => {
  test.afterEach(({ assertNoExtensionNetworkActivity }) => {
    assertNoExtensionNetworkActivity(); // SC-007
  });

  test('the popup shows how many listings are hidden on the page', async ({
    page,
    serveFixture,
    openPopup,
    tabIdOf,
  }) => {
    serveFixture(SEARCH_URL, FIXTURE);
    await page.goto(SEARCH_URL);

    const popup = await openPopup(await tabIdOf(page));

    await expect(popup.getByText('hidden on this page')).toHaveText(
      `${String(HIDDEN_COUNT)} hidden on this page`,
    );
    await expect(masterSwitch(popup)).toBeFocused();
  });

  test('the switch turns hiding off and on within 1 s, with no reload', async ({
    page,
    serveFixture,
    openPopup,
    tabIdOf,
    storedKeys,
  }) => {
    serveFixture(SEARCH_URL, FIXTURE);
    await page.goto(SEARCH_URL);
    await page.evaluate(() => Object.assign(window, { sameDocument: true }));
    const popup = await openPopup(await tabIdOf(page));
    await expect(popup.getByText('hidden on this page')).toBeVisible();

    await masterSwitch(popup).click();

    await expect(masterSwitch(popup)).toHaveAttribute('aria-checked', 'false');
    await expect.poll(() => hiddenCardCount(page), ONE_SECOND).toBe(0);
    await expect(popup.getByText('Hiding is off. All listings are shown.')).toBeVisible();

    await masterSwitch(popup).click();

    await expect(masterSwitch(popup)).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => hiddenCardCount(page), ONE_SECOND).toBe(HIDDEN_COUNT);
    await expect(popup.getByText('hidden on this page')).toHaveText(
      `${String(HIDDEN_COUNT)} hidden on this page`,
    );
    await expectHidingMatchesLabels(page, FIXTURE);

    expect(await page.evaluate(() => 'sameDocument' in window)).toBe(true);
    expect(await storedKeys()).toEqual(['settings']); // FR-017
  });

  test('the choice survives a browser restart (FR-014)', async ({
    page,
    serveFixture,
    openPopup,
    relaunch,
    tabIdOf,
  }) => {
    serveFixture(SEARCH_URL, FIXTURE);
    await page.goto(SEARCH_URL);
    const popup = await openPopup(await tabIdOf(page));
    await masterSwitch(popup).click();
    await expect(masterSwitch(popup)).toHaveAttribute('aria-checked', 'false');

    const context = await relaunch();
    const reopened = await context.newPage();
    await reopened.goto(SEARCH_URL);

    await expect.poll(() => hiddenCardCount(reopened)).toBe(0);
    await expect(reopened.locator('html')).not.toHaveAttribute('data-nochoice-hide');
    const reopenedPopup = await openPopup(await tabIdOf(reopened));
    await expect(masterSwitch(reopenedPopup)).toHaveAttribute('aria-checked', 'false');
  });

  test('the popup says it only works on AliExpress elsewhere, with no count', async ({
    page,
    serveHtml,
    openPopup,
    tabIdOf,
  }) => {
    serveHtml('https://example.com/', '<!doctype html><title>Elsewhere</title><p>Elsewhere</p>');
    await page.goto('https://example.com/');

    const popup = await openPopup(await tabIdOf(page));

    await expect(popup.getByText('NoChoice only works on AliExpress.')).toBeVisible();
    await expect(popup.getByText('hidden on this page')).toHaveCount(0);
    await expect(masterSwitch(popup)).toBeVisible();
  });

  // The real trigger, a page left open across an extension update, can't be reproduced here:
  // Playwright's Chromium never brings a command-line extension back after chrome.runtime.reload().
  // A failed load reaches the same state, an AliExpress tab with no content script to answer.
  test('a page with no content script asks for a reload, and works after one', async ({
    page,
    serveFixture,
    openPopup,
    tabIdOf,
  }) => {
    await page.goto(SEARCH_URL).catch(() => undefined);
    const tabId = await tabIdOf(page);

    const popup = await openPopup(tabId);

    await expect(
      popup.getByText('Reload this AliExpress page to start hiding listings.'),
    ).toBeVisible();
    await expect(popup.getByText('hidden on this page')).toHaveCount(0);

    serveFixture(SEARCH_URL, FIXTURE);
    await page.reload();

    const reloadedPopup = await openPopup(tabId);
    await expect(reloadedPopup.getByText('hidden on this page')).toHaveText(
      `${String(HIDDEN_COUNT)} hidden on this page`,
    );
  });

  test('the real toolbar popup finds the active tab by itself', async ({
    page,
    serveFixture,
    openPopup,
  }) => {
    serveFixture(SEARCH_URL, FIXTURE);
    await page.goto(SEARCH_URL);
    // Any extension page can open the toolbar popup. Playwright doesn't list that popup as a page,
    // so it is read and driven from this one.
    const extensionPage = await openPopup();
    await page.bringToFront();

    await extensionPage.evaluate(() => chrome.action.openPopup());

    const popupText = () =>
      extensionPage.evaluate(
        () => chrome.extension.getViews({ type: 'popup' })[0]?.document.body.textContent,
      );
    await expect.poll(popupText).toContain(`${String(HIDDEN_COUNT)} hidden on this page`);

    await extensionPage.evaluate(() => {
      const popup = chrome.extension.getViews({ type: 'popup' })[0];
      popup?.document.querySelector<HTMLElement>('[role="switch"]')?.click();
    });

    await expect.poll(() => hiddenCardCount(page), ONE_SECOND).toBe(0);
    await expect.poll(popupText).toContain('Hiding is off. All listings are shown.');
  });

  test('the count follows cards loaded while the popup is open (FR-012)', async ({
    page,
    serveFixture,
    openPopup,
    tabIdOf,
  }) => {
    serveFixture(SEARCH_URL, FIXTURE);
    await page.goto(SEARCH_URL);
    const popup = await openPopup(await tabIdOf(page));
    await expect(popup.getByText('hidden on this page')).toBeVisible();

    await page.evaluate(() => {
      const grid = document.querySelector('#card-list');
      const choiceCard = grid?.querySelector('[data-nochoice-badges="choice"]');
      const clone = choiceCard?.cloneNode(true) as Element | undefined;
      if (!grid || !clone) throw new Error('The fixture has no Choice card');
      clone.removeAttribute('data-nochoice-badges');
      grid.append(clone);
    });

    await expect(popup.getByText('hidden on this page')).toHaveText(
      `${String(HIDDEN_COUNT + 1)} hidden on this page`,
    );
  });

  test('the popup reports a page revealed through the notice (FR-015)', async ({
    page,
    serveFixture,
    openPopup,
    tabIdOf,
  }) => {
    serveFixture(SEARCH_URL, FIXTURE);
    await page.goto(SEARCH_URL);
    await page.evaluate(() => {
      document.querySelectorAll('#card-list > [data-nochoice-badges=""]').forEach((card) => {
        card.remove();
      });
    });
    await page.getByRole('button', { name: 'Show hidden listings' }).click();

    const popup = await openPopup(await tabIdOf(page));

    await expect(
      popup.getByText(
        "Showing hidden listings on this page. They'll be hidden again when you reload or change results.",
      ),
    ).toBeVisible();
  });
});
