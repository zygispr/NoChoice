import { LISTING_CONTAINERS } from '../../src/content/listings/listingContainers';

// Deliberately not read from BADGE_SIGNATURES, so a wrong signature can't also skew the test input.
const CHOICE_ASSET_IDS = [
  'S135d2af8d57840b28092ceba069bdb6c4',
  'S1887a285b60743859ac7bdbfca5e0896Z',
];
const BRAND_PLUS_ASSET_IDS = [
  'Sca1bcdd1057c4a388af0eed405d9a464x',
  'Sb008eb53e92f463eb0a2c17c539df530h',
];
const CHOICE_IMAGE = `https://ae-pic-a1.aliexpress-media.com/kf/${CHOICE_ASSET_IDS[0] ?? ''}/110x42.png`;

const RESULTS_GRID = '#card-list';
const SPONSORED_ROW = "[class*='p4p--p4pList']";

const hasChoiceImage = (card: Element): boolean =>
  CHOICE_ASSET_IDS.some((id) => card.querySelector(`img[src*="${id}"]`) !== null);

const allContainers = (doc: Document): Element[] =>
  LISTING_CONTAINERS.flatMap(({ selector }) => [...doc.querySelectorAll(selector)]);

const serialise = (doc: Document): string => `<!doctype html>${doc.documentElement.outerHTML}`;

function required(doc: Document, selector: string): Element {
  const element = doc.querySelector(selector);
  if (!element) throw new Error(`The fixture has no ${selector}`);
  return element;
}

/** Keeps only Choice cards in every container, so the primary results end up entirely hidden. */
export function allChoice(doc: Document): string {
  for (const container of allContainers(doc)) {
    for (const card of [...container.children]) {
      if (!hasChoiceImage(card)) card.remove();
    }
  }
  return serialise(doc);
}

/** Makes the whole sponsored row Choice and leaves the main grid mixed (use with `search-com`). */
export function sponsoredRowAllChoice(doc: Document): string {
  for (const card of required(doc, SPONSORED_ROW).children) {
    const badge = doc.createElement('img');
    badge.src = CHOICE_IMAGE;
    card.append(badge);
  }
  return serialise(doc);
}

/** Changes every badge image to an asset ID the extension has never seen. */
export function unknownMarkup(doc: Document): string {
  for (const id of [...CHOICE_ASSET_IDS, ...BRAND_PLUS_ASSET_IDS]) {
    for (const image of doc.querySelectorAll(`img[src*="${id}"]`)) {
      image.setAttribute('src', (image.getAttribute('src') ?? '').replace(id, 'Sunknownbadge'));
    }
  }
  return serialise(doc);
}

/** Clones cards in the results grid until it holds `count` cards, each with a unique product ID. */
export function manyCards(doc: Document, count: number): string {
  const grid = required(doc, RESULTS_GRID);
  const templates = [...grid.children];
  while (grid.children.length < count) {
    const template = templates[grid.children.length % templates.length];
    if (!template) throw new Error('The results grid has no cards to clone');
    grid.append(template.cloneNode(true));
  }
  [...grid.children].forEach((card, index) => {
    card.querySelector('a')?.setAttribute('href', `/item/${String(9_000_000 + index)}.html`);
  });
  return serialise(doc);
}
