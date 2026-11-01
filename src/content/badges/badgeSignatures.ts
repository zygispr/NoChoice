import type { BadgeType } from '../../shared/badgeTypes';

/** One way of recognising a badge in AliExpress markup (data-model § BadgeSignature). */
export interface BadgeSignature {
  badge: BadgeType;
  /** Dated, because a signature describes the markup at one point in time. */
  id: string;
  /** Finds candidate badge nodes inside a card. */
  selector: string;
  matches: (element: Element) => boolean;
}

/**
 * Badges are logos, so their image asset ID is the same in every language and currency (research
 * R5). The ID must be a whole path segment, so a longer ID that merely contains it is not a badge.
 */
function imageSignature(badge: BadgeType, id: string, assetId: string): BadgeSignature {
  const assetPath = new RegExp(`/kf/${assetId}(?:[/.]|$)`);
  return {
    badge,
    id,
    selector: `img[src*="${assetId}"]`,
    matches: (element) => assetPath.test(element.getAttribute('src') ?? ''),
  };
}

export const BADGE_SIGNATURES: readonly BadgeSignature[] = [
  // Fixtures search-com, category-com, home-com, pdp-com, search-pl.
  imageSignature('choice', 'choice-img-2026-11', 'S135d2af8d57840b28092ceba069bdb6c4'),
  // Fixtures search-us, store-com.
  imageSignature('choice', 'choice-img-large-2026-11', 'S1887a285b60743859ac7bdbfca5e0896Z'),
  // Fixtures category-com, home-com, pdp-com, search-pl.
  imageSignature('brand-plus', 'brand-plus-img-2026-11', 'Sca1bcdd1057c4a388af0eed405d9a464x'),
  // Fixture search-com-us-layout: sessions on the `us--` card layout get this logo instead.
  imageSignature(
    'brand-plus',
    'brand-plus-img-large-2026-11',
    'Sb008eb53e92f463eb0a2c17c539df530h',
  ),
];
