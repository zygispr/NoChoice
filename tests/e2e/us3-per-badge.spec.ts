import type { Page } from '@playwright/test';
import type { BadgeType } from '../../src/shared/badgeTypes';
import { readClassifiedCards } from '../helpers/fixtureCards';
import { loadExpected } from '../helpers/loadFixture';
import { expect, test } from './support/extensionTest';

const FIXTURE = 'home-com';
const { source: HOME_URL, listings: LABELS } = loadExpected(FIXTURE);
const countWith = (badge: BadgeType) =>
  LABELS.filter(({ badges }) => badges.includes(badge)).length;
const CHOICE_COUNT = countWith('choice');
const BRAND_PLUS_COUNT = countWith('brand-plus');

const CHOICE_IMAGE =
  'https://ae-pic-a1.aliexpress-media.com/kf/S135d2af8d57840b28092ceba069bdb6c4/110x42.png';

/** FR-011's limit for a change to reach an open page. */
const ONE_SECOND = { timeout: 1000 };

const toggle = (popup: Page, name: string) => popup.getByRole('switch', { name, exact: true });

/** Fixture cards whose hidden state doesn't match `shouldHide`, to poll until there are none. */
async function wronglyShown(page: Page, shouldHide: (badges: string[]) => boolean) {
  const cards = await page.evaluate(readClassifiedCards);
  expect(cards.length).toBeGreaterThanOrEqual(LABELS.length);
  return cards
    .filter(({ badges, hidden }) => hidden !== shouldHide(badges))
    .map(({ productId }) => productId);
}

const expectHiding = (page: Page, shouldHide: (badges: string[]) => boolean) =>
  expect.poll(() => wronglyShown(page, shouldHide), ONE_SECOND).toEqual([]);

test.describe('US3: choose which badges to hide', () => {
  test.beforeAll(() => {
    expect(CHOICE_COUNT).toBeGreaterThan(0);
    expect(BRAND_PLUS_COUNT).toBeGreaterThan(0);
  });

  test.afterEach(({ assertNoExtensionNetworkActivity }) => {
    assertNoExtensionNetworkActivity(); // SC-007
  });

  test('both badges are hidden by default, with both switches on', async ({
    page,
    serveFixture,
    openPopup,
    tabIdOf,
  }) => {
    serveFixture(HOME_URL, FIXTURE);
    await page.goto(HOME_URL);

    const popup = await openPopup(await tabIdOf(page));

    await expectHiding(page, (badges) => badges.length > 0);
    await expect(toggle(popup, 'Choice')).toHaveAttribute('aria-checked', 'true');
    await expect(toggle(popup, 'Brand+')).toHaveAttribute('aria-checked', 'true');
  });

  test('turning Brand+ off shows Brand+ listings and keeps Choice hidden, within 1 s', async ({
    page,
    serveFixture,
    openPopup,
    tabIdOf,
  }) => {
    serveFixture(HOME_URL, FIXTURE);
    await page.goto(HOME_URL);
    const popup = await openPopup(await tabIdOf(page));
    await expect(popup.getByText('hidden on this page')).toBeVisible();

    await toggle(popup, 'Brand+').click();

    await expectHiding(page, (badges) => badges.includes('choice'));
    await expect(popup.getByText('hidden on this page')).toHaveText(
      `${String(CHOICE_COUNT)} hidden on this page`,
    );
    await expect(popup.getByText(`Choice ${String(CHOICE_COUNT)}`)).toBeVisible();
    await expect(popup.getByText(/Brand\+ \d/)).toHaveCount(0);
  });

  test('swapping the selection applies to the open page and survives a restart', async ({
    page,
    serveFixture,
    openPopup,
    relaunch,
    tabIdOf,
  }) => {
    serveFixture(HOME_URL, FIXTURE);
    await page.goto(HOME_URL);
    await page.evaluate(() => Object.assign(window, { sameDocument: true }));
    const popup = await openPopup(await tabIdOf(page));

    await toggle(popup, 'Choice').click();

    await expectHiding(page, (badges) => badges.includes('brand-plus'));
    expect(await page.evaluate(() => 'sameDocument' in window)).toBe(true);
    await expect(popup.getByText('hidden on this page')).toHaveText(
      `${String(BRAND_PLUS_COUNT)} hidden on this page`,
    );

    const context = await relaunch();
    const reopened = await context.newPage();
    await reopened.goto(HOME_URL);

    await expectHiding(reopened, (badges) => badges.includes('brand-plus'));
    const reopenedPopup = await openPopup(await tabIdOf(reopened));
    await expect(toggle(reopenedPopup, 'Choice')).toHaveAttribute('aria-checked', 'false');
    await expect(toggle(reopenedPopup, 'Brand+')).toHaveAttribute('aria-checked', 'true');
  });

  test('a card with both badges stays hidden while either badge is selected', async ({
    page,
    serveFixture,
    openPopup,
    tabIdOf,
  }) => {
    serveFixture(HOME_URL, FIXTURE);
    await page.goto(HOME_URL);
    // No captured card carries both badges, so give one a second badge.
    await page.evaluate((choiceImage) => {
      const card = document.querySelector('[data-nochoice-badges="brand-plus"]');
      const badge = document.createElement('img');
      badge.src = choiceImage;
      card?.setAttribute('id', 'both-badges');
      card?.append(badge);
    }, CHOICE_IMAGE);
    const both = page.locator('#both-badges');
    await expect(both).toHaveAttribute('data-nochoice-badges', 'choice brand-plus');
    const popup = await openPopup(await tabIdOf(page));

    await toggle(popup, 'Brand+').click();
    await expect(toggle(popup, 'Brand+')).toHaveAttribute('aria-checked', 'false');
    await expect(both).toBeHidden(ONE_SECOND);

    await toggle(popup, 'Brand+').click();
    await toggle(popup, 'Choice').click();
    await expect(toggle(popup, 'Choice')).toHaveAttribute('aria-checked', 'false');
    await expect(both).toBeHidden(ONE_SECOND);

    await toggle(popup, 'Brand+').click();

    await expect(both).toBeVisible(ONE_SECOND);
  });

  test('the master switch overrides the badges and keeps their selection', async ({
    page,
    serveFixture,
    openPopup,
    tabIdOf,
  }) => {
    serveFixture(HOME_URL, FIXTURE);
    await page.goto(HOME_URL);
    const popup = await openPopup(await tabIdOf(page));
    await toggle(popup, 'Brand+').click();
    await expectHiding(page, (badges) => badges.includes('choice'));

    await toggle(popup, 'Hide listings').click();

    await expectHiding(page, () => false);
    await expect(toggle(popup, 'Choice')).toHaveAttribute('aria-disabled', 'true');
    await expect(toggle(popup, 'Brand+')).toHaveAttribute('aria-checked', 'false');

    await toggle(popup, 'Hide listings').click();

    await expectHiding(page, (badges) => badges.includes('choice'));
  });
});
