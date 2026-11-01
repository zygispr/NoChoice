import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type BrowserContext } from '@playwright/test';
import { expect, test } from '../e2e/support/extensionTest';
import { parseFixture } from '../e2e/support/parseFixture';
import { manyCards } from '../helpers/syntheticFixtures';
import {
  LOAD_OVERHEAD_FLOOR_MS,
  LOAD_OVERHEAD_LIMIT,
  median,
  report,
  SETTINGS_BUDGET_MS,
  TASK_BUDGET_MS,
  TOLERANCE,
} from './support/budgets';

const SEARCH_URL = 'https://www.aliexpress.com/w/wholesale-phone-case.html';
const LOAD_RUNS = 7;
const WARM_UP_RUNS = 2;
const SETTINGS_RUNS = 5;

interface TraceEvent {
  name: string;
  ph: string;
  dur?: number;
  args?: { data?: { url?: string; scriptName?: string } };
}

test.describe.configure({ timeout: 120_000 });

test('no long task comes from the content script while scrolling 500 cards', async ({
  page,
  context,
  serveHtml,
  extensionId,
}) => {
  serveHtml(SEARCH_URL, manyCards(parseFixture('search-com'), 500));
  await page.goto(SEARCH_URL);
  // AliExpress renders results as the shopper scrolls, so hold the cards back and feed them in the
  // same way. Only that is traced: no real page delivers 500 cards in its first HTML.
  await page.evaluate(() => {
    const grid = document.querySelector('#card-list');
    if (!grid) throw new Error('The page has no results grid');
    const waiting = [...grid.children].slice(60);
    for (const card of waiting) card.remove();
    Object.assign(window, { waitingCards: waiting });
  });

  const cdp = await context.newCDPSession(page);
  const events: TraceEvent[] = [];
  cdp.on('Tracing.dataCollected', ({ value }) => {
    events.push(...(value as unknown as TraceEvent[]));
  });
  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { includedCategories: ['devtools.timeline'] },
  });

  await page.evaluate(async () => {
    const grid = document.querySelector('#card-list');
    const { waitingCards } = window as unknown as { waitingCards: Element[] };
    while (waitingCards.length > 0) {
      grid?.append(...waitingCards.splice(0, 60));
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });
    }
  });
  await expect(page.locator('#card-list > *')).toHaveCount(500);

  const finished = new Promise<void>((resolve) => {
    cdp.once('Tracing.tracingComplete', () => {
      resolve();
    });
  });
  await cdp.send('Tracing.end');
  await finished;

  const contentScript = `chrome-extension://${extensionId}/content.js`;
  const durations = events
    .filter(({ name, ph }) => ph === 'X' && (name === 'FunctionCall' || name === 'EvaluateScript'))
    .filter(({ args }) => (args?.data?.url ?? args?.data?.scriptName) === contentScript)
    .map(({ dur }) => (dur ?? 0) / 1000);
  expect(durations.length, 'the trace should show the content script running').toBeGreaterThan(0);

  const longest = Math.max(...durations);
  report('longest content script task', longest, `${String(TASK_BUDGET_MS)} ms`);
  expect(longest).toBeLessThanOrEqual(TASK_BUDGET_MS * TOLERANCE);
});

/** Records when the page first shows a result, as the plan defines "usable". */
function recordUsable(): void {
  const check = () => {
    const visible = [...(document.querySelector('#card-list')?.children ?? [])].some(
      (card) => getComputedStyle(card).display !== 'none',
    );
    if (visible) Object.assign(window, { usableAt: performance.now() });
    else requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

async function serveAndRecord(context: BrowserContext, html: string): Promise<void> {
  await context.route('**/*', async (route) => {
    if (!route.request().url().startsWith('http')) {
      await route.fallback();
    } else if (route.request().url() === SEARCH_URL) {
      await route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
    } else {
      await route.abort('internetdisconnected');
    }
  });
  await context.addInitScript(recordUsable);
}

async function usableTime(context: BrowserContext): Promise<number> {
  const page = await context.newPage();
  await page.goto(SEARCH_URL);
  await page.waitForFunction(() => 'usableAt' in window);
  const time = await page.evaluate(() => (window as unknown as { usableAt: number }).usableAt);
  await page.close();
  return time;
}

test('the extension adds little to the time until results are usable (SC-004)', async ({
  context,
}) => {
  const html = parseFixture('search-com').documentElement.outerHTML;
  const userDataDir = mkdtempSync(join(tmpdir(), 'nochoice-perf-'));
  const plain = await chromium.launchPersistentContext(userDataDir, { channel: 'chromium' });
  try {
    await serveAndRecord(context, html);
    await serveAndRecord(plain, html);
    // Warmed up and taken in turns, so a cold start or a change in machine load can't favour one.
    for (let warmUp = 0; warmUp < WARM_UP_RUNS; warmUp++) {
      await usableTime(context);
      await usableTime(plain);
    }
    const withTimes: number[] = [];
    const withoutTimes: number[] = [];
    for (let run = 0; run < LOAD_RUNS; run++) {
      withTimes.push(await usableTime(context));
      withoutTimes.push(await usableTime(plain));
    }

    const withoutExtension = median(withoutTimes);
    const overhead = median(withTimes) - withoutExtension;
    report('usable without the extension', withoutExtension, 'baseline');
    report(
      'overhead with the extension',
      overhead,
      `${String(LOAD_OVERHEAD_LIMIT * 100)}% and ${String(LOAD_OVERHEAD_FLOOR_MS)} ms`,
    );
    expect(
      overhead <= withoutExtension * LOAD_OVERHEAD_LIMIT || overhead <= LOAD_OVERHEAD_FLOOR_MS,
      `overhead of ${overhead.toFixed(1)} ms on ${withoutExtension.toFixed(1)} ms`,
    ).toBe(true);
  } finally {
    await plain.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});

test('a settings change reaches the page quickly', async ({ page, serveFixture, openPopup }) => {
  serveFixture(SEARCH_URL, 'search-com');
  await page.goto(SEARCH_URL);
  const extensionPage = await openPopup();
  await page.bringToFront();
  await page.evaluate(() => {
    new MutationObserver(() => {
      Object.assign(window, { changedAt: Date.now() });
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-nochoice-hide'],
    });
  });

  // Date.now, because this crosses processes, and only the system clock is shared between them.
  const latencies: number[] = [];
  for (let run = 0; run < SETTINGS_RUNS; run++) {
    await page.evaluate(() => Object.assign(window, { changedAt: 0 }));
    const startedAt = await extensionPage.evaluate(
      async (enabled) => {
        const started = Date.now();
        await chrome.storage.local.set({
          settings: { version: 1, enabled, hide: { choice: true, brandPlus: true } },
        });
        return started;
      },
      run % 2 === 1,
    );
    await page.waitForFunction(() => (window as unknown as { changedAt: number }).changedAt > 0);
    const changedAt = await page.evaluate(
      () => (window as unknown as { changedAt: number }).changedAt,
    );
    latencies.push(changedAt - startedAt);
  }

  const measured = median(latencies);
  report('settings change to page update', measured, `${String(SETTINGS_BUDGET_MS)} ms`);
  expect(measured).toBeLessThanOrEqual(SETTINGS_BUDGET_MS * TOLERANCE);
});
