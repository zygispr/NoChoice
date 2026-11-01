import { describe, expect, it } from 'vitest';
import { detectBadges } from '../../src/content/badges/detectBadges';
import { LISTING_CONTAINERS } from '../../src/content/listings/listingContainers';
import { normaliseLabels, readClassifiedCards } from '../helpers/fixtureCards';
import { listFixtures, loadExpected, loadFixture } from '../helpers/loadFixture';

const CHOICE_IMAGE =
  'https://ae-pic-a1.aliexpress-media.com/kf/S135d2af8d57840b28092ceba069bdb6c4/110x42.png';
const BRAND_PLUS_IMAGE =
  'https://ae-pic-a1.aliexpress-media.com/kf/Sca1bcdd1057c4a388af0eed405d9a464x.png';
// AliExpress serves some sessions an alternative card layout with its own badge images.
const BRAND_PLUS_ALT_LAYOUT_IMAGE =
  'https://ae-pic-a1.aliexpress-media.com/kf/Sb008eb53e92f463eb0a2c17c539df530h.png';
const SALE_TAG_IMAGE =
  'https://ae-pic-a1.aliexpress-media.com/kf/S323d529ca7784ceaacd61bc391a03044D.png';

function card(html: string): Element {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element;
}

describe('detectBadges', () => {
  it.each(listFixtures())('finds the labelled badges on every card in %s', (name) => {
    const doc = loadFixture(name);
    for (const { selector } of LISTING_CONTAINERS) {
      for (const container of doc.querySelectorAll(selector)) {
        for (const listing of container.children) {
          listing.setAttribute('data-nochoice-badges', detectBadges(listing).join(' '));
        }
      }
    }

    expect(normaliseLabels(readClassifiedCards())).toEqual(
      normaliseLabels(loadExpected(name).listings),
    );
  });

  it('recognises each badge image', () => {
    expect(detectBadges(card(`<img src="${CHOICE_IMAGE}">`))).toEqual(['choice']);
    expect(detectBadges(card(`<img src="${BRAND_PLUS_IMAGE}">`))).toEqual(['brand-plus']);
    expect(detectBadges(card(`<img src="${BRAND_PLUS_ALT_LAYOUT_IMAGE}">`))).toEqual([
      'brand-plus',
    ]);
  });

  it('returns both badges in BADGE_TYPES order, without duplicates', () => {
    const both = card(
      `<img src="${BRAND_PLUS_IMAGE}"><img src="${CHOICE_IMAGE}"><img src="${CHOICE_IMAGE}">`,
    );

    expect(detectBadges(both)).toEqual(['choice', 'brand-plus']);
  });

  it('finds nothing when the badge image is unknown (FR-016)', () => {
    expect(detectBadges(card('<img src="https://example.test/kf/Sunknownbadge.png">'))).toEqual([]);
  });

  it('does not match an asset ID that only contains a known one', () => {
    const lookalike = CHOICE_IMAGE.replace('/kf/S135', '/kf/XS135');

    expect(detectBadges(card(`<img src="${lookalike}">`))).toEqual([]);
  });

  it('does not rely on text: a title saying Choice or Brand+ is not a badge', () => {
    const titled = card(
      '<h3>Choice of colours</h3><span>Brand+ phone case</span><span>Choice</span>',
    );

    expect(detectBadges(titled)).toEqual([]);
  });

  it('ignores other tags', () => {
    const tagged = card(`<span>Ad</span><span>11.11 Sale</span><span>Bundle deals</span>
      <img src="${SALE_TAG_IMAGE}">`);

    expect(detectBadges(tagged)).toEqual([]);
  });

  it('finds Choice on a card that also has a sale tag', () => {
    const tagged = card(`<img src="${SALE_TAG_IMAGE}"><img src="${CHOICE_IMAGE}">`);

    expect(detectBadges(tagged)).toEqual(['choice']);
  });
});
