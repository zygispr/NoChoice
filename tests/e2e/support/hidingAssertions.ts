import type { Page } from '@playwright/test';
import { normaliseLabels, readClassifiedCards } from '../../helpers/fixtureCards';
import { loadExpected } from '../../helpers/loadFixture';
import { expect } from './extensionTest';

/** Every card carries its labelled badges, and is hidden exactly when it has one (SC-001, SC-002). */
export async function expectHidingMatchesLabels(page: Page, fixtureName: string): Promise<void> {
  const cards = await page.evaluate(readClassifiedCards);

  expect(normaliseLabels(cards)).toEqual(normaliseLabels(loadExpected(fixtureName).listings));
  for (const card of cards) {
    expect(card.hidden, `hidden state of ${card.productId}`).toBe(card.badges.length > 0);
  }
}

/** Every visible card sits in the next free grid cell, so hiding left no holes (FR-004). */
export async function expectNoGridGaps(page: Page, gridSelector: string): Promise<void> {
  const layout = await page.evaluate((selector) => {
    const grid = document.querySelector(selector);
    if (!grid) throw new Error(`No grid matches ${selector}`);
    const style = getComputedStyle(grid);
    return {
      gridLeft: grid.getBoundingClientRect().left,
      columnWidths: style.gridTemplateColumns.split(' ').map(parseFloat),
      columnGap: parseFloat(style.columnGap),
      cells: [...grid.children]
        .filter((card) => getComputedStyle(card).display !== 'none')
        .map((card) => {
          const { left, top } = card.getBoundingClientRect();
          return { left, top };
        }),
    };
  }, gridSelector);

  const columns = layout.columnWidths.length;
  const columnWidth = layout.columnWidths[0] ?? 0;
  expect(layout.cells.length).toBeGreaterThan(0);
  layout.cells.forEach(({ left, top }, index) => {
    const column = index % columns;
    const rowStart = layout.cells[index - column];
    expect(left).toBeCloseTo(layout.gridLeft + column * (columnWidth + layout.columnGap), 0);
    expect(top).toBeCloseTo(rowStart?.top ?? top, 0);
    if (column === 0 && index > 0) {
      expect(top).toBeGreaterThan(layout.cells[index - columns]?.top ?? 0);
    }
  });
}
