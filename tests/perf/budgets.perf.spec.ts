import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { build, type Rollup } from 'vite';
import type { BadgeType } from '../../src/shared/badgeTypes';
import { parseFixture } from '../e2e/support/parseFixture';
import { manyCards } from '../helpers/syntheticFixtures';
import { CLASSIFY_BUDGET_MS, median, report, TOLERANCE } from './support/budgets';

const PAGE_URL = 'https://www.aliexpress.com/w/wholesale-phone-case.html';
const REPETITIONS = 5;
const LIMIT_MS = CLASSIFY_BUDGET_MS * TOLERANCE;

type ContentCode = typeof import('./support/contentCode');

/** The real content-script code, built like the extension's own bundle. */
async function bundleContentCode(): Promise<string> {
  const [output] = (await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(new URL('./support/contentCode.ts', import.meta.url)),
        formats: ['iife'],
        name: 'NoChoicePerf',
      },
    },
  })) as Rollup.RollupOutput[];
  const code = output?.output[0].code;
  if (code === undefined) throw new Error('The content code did not build');
  return code;
}

/** Times `run` in the page: 10 warm-up runs, then the p95 of 50 timed runs (plan § Budgets). */
async function measureP95(page: Page, run: 'classify' | 'count'): Promise<number> {
  return page.evaluate((which) => {
    const { classifyBatch, countHidden } = (window as unknown as { NoChoicePerf: ContentCode })
      .NoChoicePerf;
    const hidden: ReadonlySet<BadgeType> = new Set(['choice', 'brand-plus']);
    const cards = [...document.querySelectorAll('#card-list > *')];
    const once =
      which === 'classify'
        ? () => {
            classifyBatch(cards);
          }
        : () => {
            countHidden(document, hidden, false);
          };

    for (let warmUp = 0; warmUp < 10; warmUp++) once();
    const times: number[] = [];
    for (let timed = 0; timed < 50; timed++) {
      const start = performance.now();
      once();
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return times[Math.ceil(times.length * 0.95) - 1] ?? Number.POSITIVE_INFINITY;
  }, run);
}

// Timed in real Chromium: jsdom runs this same code about 30 times slower, so a budget measured
// there would say nothing about what shoppers get.
test.describe('content script budgets', () => {
  let contentCode: string;

  test.beforeAll(async () => {
    contentCode = await bundleContentCode();
  });

  async function openWith(page: Page, html: string): Promise<void> {
    await page.route('**/*', async (route) => {
      if (route.request().url() === PAGE_URL) {
        await route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
      } else {
        await route.abort('internetdisconnected');
      }
    });
    await page.goto(PAGE_URL);
    await page.addScriptTag({ content: contentCode });
  }

  async function medianOfP95s(page: Page, run: 'classify' | 'count'): Promise<number> {
    const p95s: number[] = [];
    for (let repetition = 0; repetition < REPETITIONS; repetition++) {
      p95s.push(await measureP95(page, run));
    }
    return median(p95s);
  }

  test('classifying a batch of 60 cards', async ({ page }) => {
    const html = parseFixture('search-com').documentElement.outerHTML;
    await openWith(page, html);
    await expect(page.locator('#card-list > *')).toHaveCount(60);

    const measured = await medianOfP95s(page, 'classify');

    report('classify 60 cards, p95', measured, `${String(CLASSIFY_BUDGET_MS)} ms`);
    expect(measured).toBeLessThanOrEqual(LIMIT_MS);
  });

  test('counting hidden cards over 500 cards', async ({ page }) => {
    await openWith(page, manyCards(parseFixture('search-com'), 500));
    await expect(page.locator('#card-list > *')).toHaveCount(500);
    await page.evaluate(() => {
      const { classifyBatch } = (window as unknown as { NoChoicePerf: ContentCode }).NoChoicePerf;
      classifyBatch(document.querySelectorAll('#card-list > *'));
    });

    const measured = await medianOfP95s(page, 'count');

    report('count hidden over 500 cards, p95', measured, `${String(CLASSIFY_BUDGET_MS)} ms`);
    expect(measured).toBeLessThanOrEqual(LIMIT_MS);
  });
});
