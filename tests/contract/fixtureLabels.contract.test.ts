import { describe, expect, it } from 'vitest';
import { BADGE_SIGNATURES } from '../../src/content/badges/badgeSignatures';
import { classifyDocument } from '../../src/content/listings/classifyListing';
import { LISTING_CONTAINERS } from '../../src/content/listings/listingContainers';
import { normaliseLabels, readClassifiedCards } from '../helpers/fixtureCards';
import { listFixtures, loadExpected, loadFixture } from '../helpers/loadFixture';

describe('fixture labels contract (contracts/page-dom.md, SC-001, SC-002)', () => {
  it('covers all nine fixtures', () => {
    expect(listFixtures()).toEqual([
      'category-com',
      'home-com',
      'pdp-com',
      'search-com',
      'search-com-us-layout',
      'search-locales',
      'search-pl',
      'search-us',
      'store-com',
    ]);
  });

  it.each(listFixtures())('classifies every card in %s exactly as labelled', (name) => {
    const doc = loadFixture(name);

    classifyDocument(doc);

    expect(normaliseLabels(readClassifiedCards())).toEqual(
      normaliseLabels(loadExpected(name).listings),
    );
  });

  it.each(BADGE_SIGNATURES.map((signature) => signature.id))(
    'signature %s matches at least once across the fixtures',
    (id) => {
      const signature = BADGE_SIGNATURES.find((candidate) => candidate.id === id);
      const matched = listFixtures().some(
        (name) =>
          loadFixture(name).querySelector(`img[src*="${signature?.assetId ?? ''}"]`) !== null,
      );

      expect(matched).toBe(true);
    },
  );

  it.each(LISTING_CONTAINERS.map((container) => container.id))(
    'container %s matches at least once across the fixtures',
    (id) => {
      const container = LISTING_CONTAINERS.find((candidate) => candidate.id === id);
      const matched = listFixtures().some(
        (name) => loadFixture(name).querySelector(container?.selector ?? '') !== null,
      );

      expect(matched).toBe(true);
    },
  );

  it('leaves a store card unmarked once its badge is gone', () => {
    // store-com is all Choice (see the fixtures README), so this card is modified to cover the case.
    const doc = loadFixture('store-com');
    const card = doc.querySelector('#right > div > div > *');
    card?.querySelector('img[src*="S1887a285b60743859ac7bdbfca5e0896Z"]')?.remove();

    classifyDocument(doc);

    expect(card?.getAttribute('data-nochoice-badges')).toBe('');
  });

  it('never marks the main product on a product page (FR-009)', () => {
    const doc = loadFixture('pdp-com');

    classifyDocument(doc);

    expect(doc.querySelector('.pdp-info')?.closest('[data-nochoice-badges]')).toBeNull();
  });
});
