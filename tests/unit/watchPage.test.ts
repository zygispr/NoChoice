import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectBadges } from '../../src/content/badges/detectBadges';
import { watchPage } from '../../src/content/page/watchPage';
import { loadFixture } from '../helpers/loadFixture';

// Passes through to the real code, so the tests can see when classification work actually happens.
vi.mock('../../src/content/badges/detectBadges', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/content/badges/detectBadges')>();
  return { detectBadges: vi.fn(original.detectBadges) };
});

const BADGES_ATTR = 'data-nochoice-badges';
const CHOICE_IMAGE =
  'https://ae-pic-a1.aliexpress-media.com/kf/S135d2af8d57840b28092ceba069bdb6c4/110x42.png';

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

function grid(): Element {
  const element = document.querySelector('#card-list');
  if (!element) throw new Error('The fixture has no results grid');
  return element;
}

/** A card with no badge and no classification yet. */
function newCard(content = ''): HTMLElement {
  const card = document.createElement('div');
  card.innerHTML = content;
  return card;
}

describe('watchPage', () => {
  const onPageKeyChange = vi.fn();
  const onBatchProcessed = vi.fn();
  const startUrl = location.href;
  let stop: () => void;

  beforeEach(() => {
    loadFixture('search-com');
    onPageKeyChange.mockClear();
    onBatchProcessed.mockClear();
    ({ stop } = watchPage(document, { onPageKeyChange, onBatchProcessed }));
    vi.mocked(detectBadges).mockClear();
  });

  afterEach(() => {
    stop();
    history.replaceState(null, '', startUrl);
  });

  it('classifies the cards that already exist', () => {
    expect(grid().querySelectorAll(`:scope > [${BADGES_ATTR}]`)).toHaveLength(60);
  });

  it('classifies an added card before the next animation frame (FR-006)', async () => {
    const card = newCard(`<img src="${CHOICE_IMAGE}">`);

    grid().append(card);
    await nextFrame();

    expect(card.getAttribute(BADGES_ATTR)).toBe('choice');
  });

  it('classifies cards inside a container added later', async () => {
    const lateGrid = document.createElement('div');
    grid().replaceWith(lateGrid);
    lateGrid.id = 'late-wrapper';
    lateGrid.innerHTML = `<div id="card-list"><div><img src="${CHOICE_IMAGE}"></div></div>`;
    await nextFrame();

    expect(lateGrid.querySelector('#card-list > div')?.getAttribute(BADGES_ATTR)).toBe('choice');
  });

  it('re-classifies a card when a badge image is added to it', async () => {
    const card = newCard('<span></span>');
    grid().append(card);
    await nextFrame();
    expect(card.getAttribute(BADGES_ATTR)).toBe('');

    const badge = document.createElement('img');
    badge.src = CHOICE_IMAGE;
    card.append(badge);
    await nextFrame();

    expect(card.getAttribute(BADGES_ATTR)).toBe('choice');
  });

  it('re-classifies a card when an image src changes', async () => {
    const card = newCard('<img src="https://example.test/kf/Splaceholder.png">');
    grid().append(card);
    await nextFrame();
    expect(card.getAttribute(BADGES_ATTR)).toBe('');

    card.querySelector('img')?.setAttribute('src', CHOICE_IMAGE);
    await nextFrame();

    expect(card.getAttribute(BADGES_ATTR)).toBe('choice');
  });

  it('re-classifies a card when its badge image is removed, so a reused card is not hidden', async () => {
    const card = newCard(`<img src="${CHOICE_IMAGE}">`);
    grid().append(card);
    await nextFrame();
    expect(card.getAttribute(BADGES_ATTR)).toBe('choice');

    card.querySelector('img')?.remove();
    await nextFrame();

    expect(card.getAttribute(BADGES_ATTR)).toBe('');
  });

  it('reports a changed page key once', async () => {
    history.pushState(null, '', '?page=2');
    grid().append(newCard());
    await nextFrame();
    grid().append(newCard());
    await nextFrame();

    expect(onPageKeyChange).toHaveBeenCalledTimes(1);
    expect(onPageKeyChange).toHaveBeenCalledWith(`${location.origin}${location.pathname}?page=2`);
  });

  it('does not treat a hash change as a new page', async () => {
    history.pushState(null, '', '#reviews');
    grid().append(newCard());
    await nextFrame();

    expect(onPageKeyChange).not.toHaveBeenCalled();
  });

  it('reports each processed batch once', async () => {
    grid().append(newCard(), newCard(), newCard());
    await nextFrame();

    expect(onBatchProcessed).toHaveBeenCalledTimes(1);
  });

  it('does no classification work for mutations outside listing containers', async () => {
    const elsewhere = document.createElement('div');
    elsewhere.innerHTML = `<div><img src="${CHOICE_IMAGE}"></div>`;

    document.body.append(elsewhere);
    elsewhere.querySelector('img')?.setAttribute('src', `${CHOICE_IMAGE}?changed`);
    await nextFrame();

    expect(detectBadges).not.toHaveBeenCalled();
    expect(elsewhere.querySelector(`[${BADGES_ATTR}]`)).toBeNull();
    expect(onBatchProcessed).toHaveBeenCalled();
  });

  it('stop() disconnects the observer', async () => {
    stop();
    const card = newCard(`<img src="${CHOICE_IMAGE}">`);

    grid().append(card);
    await nextFrame();

    expect(card.hasAttribute(BADGES_ATTR)).toBe(false);
    expect(onBatchProcessed).not.toHaveBeenCalled();
  });
});
