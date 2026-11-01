import { describe, expect, it } from 'vitest';
import { findListingRoot } from '../../src/content/listings/findListingRoot';
import {
  isListingContainer,
  LISTING_CONTAINERS,
} from '../../src/content/listings/listingContainers';
import { BADGE_IMAGE_SELECTOR } from '../helpers/badgeAssets';
import { listFixtures, loadFixture } from '../helpers/loadFixture';

describe('findListingRoot', () => {
  it.each(listFixtures())('finds the direct child of a container for badges in %s', (name) => {
    const doc = loadFixture(name);
    const badges = [...doc.querySelectorAll(BADGE_IMAGE_SELECTOR)];
    expect(badges.length).toBeGreaterThan(0);

    for (const badge of badges) {
      const root = findListingRoot(badge);

      expect(root).not.toBeNull();
      expect(root?.contains(badge)).toBe(true);
      expect(root?.parentElement && isListingContainer(root.parentElement)).toBe(true);
    }
  });

  it('returns the card itself when given the card', () => {
    const doc = loadFixture('search-com');
    const card = doc.querySelector('#card-list > *');

    expect(card && findListingRoot(card)).toBe(card);
  });

  it('returns null outside any known container', () => {
    const doc = loadFixture('search-com');
    const stray = doc.createElement('div');
    stray.innerHTML = '<img src="https://example.test/kf/S135d2af8d57840b28092ceba069bdb6c4.png">';
    doc.body.append(stray);

    expect(stray.firstElementChild && findListingRoot(stray.firstElementChild)).toBeNull();
    expect(findListingRoot(doc.body)).toBeNull();
  });

  it('returns null for the main product on a product page (FR-009)', () => {
    const doc = loadFixture('pdp-com');
    const mainProduct = doc.querySelector('.pdp-info');
    const title = doc.querySelector('.pdp-info h1');

    expect(mainProduct && findListingRoot(mainProduct)).toBeNull();
    expect(title && findListingRoot(title)).toBeNull();
  });

  it('returns null for a container itself', () => {
    const doc = loadFixture('search-com');
    const containers = LISTING_CONTAINERS.flatMap(({ selector }) => [
      ...doc.querySelectorAll(selector),
    ]);
    expect(containers.length).toBeGreaterThan(0);

    for (const container of containers) {
      expect(findListingRoot(container)).toBeNull();
    }
  });
});
