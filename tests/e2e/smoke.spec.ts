import { expect, test } from './support/extensionTest';

// Hide-ready markup: the content stylesheet hides this card only where the extension is injected.
const PAGE_WITH_HIDDEN_CARD = `<!doctype html>
<html data-nochoice-hide="choice"><body>
  <div data-nochoice-badges="choice" id="card">Choice card</div>
</body></html>`;

test('the popup page loads with the NoChoice heading', async ({ openPopup }) => {
  const popup = await openPopup();

  await expect(popup.getByRole('heading', { name: 'NoChoice' })).toBeVisible();
});

test('the extension is injected on AliExpress pages only, and stays offline', async ({
  page,
  serveHtml,
  assertNoExtensionNetworkActivity,
}) => {
  serveHtml('https://www.aliexpress.com/w/wholesale-phone-case.html', PAGE_WITH_HIDDEN_CARD);
  serveHtml('https://example.com/', PAGE_WITH_HIDDEN_CARD);

  await page.goto('https://www.aliexpress.com/w/wholesale-phone-case.html');
  await expect(page.locator('#card')).toBeHidden();

  await page.goto('https://example.com/');
  await expect(page.locator('#card')).toBeVisible();

  assertNoExtensionNetworkActivity();
});

test('storage survives a browser relaunch on the same profile', async ({
  openPopup,
  relaunch,
  storedKeys,
}) => {
  const popup = await openPopup();
  await popup.evaluate(() => chrome.storage.local.set({ settings: { version: 1 } }));

  await relaunch();

  expect(await storedKeys()).toEqual(['settings']);
});
