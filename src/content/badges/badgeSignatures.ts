import type { BadgeType } from '../../shared/badgeTypes';

/** One way of recognising a badge in AliExpress markup (data-model § BadgeSignature). */
export interface BadgeSignature {
  badge: BadgeType;
  /** Dated, because a signature describes the markup at one point in time. */
  id: string;
  /** Badges are logos, so their image asset ID identifies one exactly, whatever the text says. */
  assetId: string;
}

function imageSignature(badge: BadgeType, id: string, assetId: string): BadgeSignature {
  return { badge, id, assetId };
}

/**
 * Brand+ is translated (Marcas+, Marke+, Marque+, Marka+, …), and most languages have one image per
 * card layout. The first line is in fixtures category-com and search-com-us-layout, the rest in
 * search-locales. Turkish, Thai, and Korean were only seen in one layout, so the other is missing:
 * those cards stay visible (FR-016).
 */
const BRAND_PLUS_LOGOS: readonly (readonly [language: string, assetIds: readonly string[]])[] = [
  ['en', ['Sca1bcdd1057c4a388af0eed405d9a464x', 'Sb008eb53e92f463eb0a2c17c539df530h']],
  ['es', ['S29a6b4dab6c04c1bb7044c50de262ec7o', 'S665c6e6f93204283a76340704b9957d4S']],
  ['de', ['Sd3587a28ecb64db1a7cb97cc8def15356', 'S833c1647a3c94723a293b13d878584182']],
  ['fr', ['S47f57d5a3bd44d328319a447678f7b65l', 'Sadfae257af6d4e4187fb3e1bb34133edc']],
  ['pt', ['S5e5b49b699ce4fd7a633cfb20a7afbd1A', 'S0ed1419959bf4b64b9316ea563c05a716']],
  ['pl', ['S877a80e2c15a4275bb2b74ee3f892069Q', 'S26f11a87544b431c9a71f21b3583b1d37']],
  ['nl', ['Sb47ca399b1b8433d80da9d6fc863c2f8d', 'S114c71321465452aa713ebeb43390f44P']],
  ['ar', ['Sb61778788a1d4b4a8e93556a7684d6b4v', 'S1a392929c6604f7f8073e9a31bc97fa0R']],
  ['he', ['Sae0c0600de94452098cffef4d35d77a1E', 'S88898094a4234138913ac943ae6b88a2L']],
  ['tr', ['Sdeda2dbc76d04796904ef65830c707b7X']],
  ['th', ['S85b3276227f94e87b68f7215ade7082d9']],
  ['ko', ['Sd11e9e7507af41ea9402560e2bb3d5c0F']],
];

export const BADGE_SIGNATURES: readonly BadgeSignature[] = [
  // Choice is the same in every language sampled, with one image per card layout.
  // Fixtures search-com, category-com, home-com, pdp-com, search-pl.
  imageSignature('choice', 'choice-img-2026-11', 'S135d2af8d57840b28092ceba069bdb6c4'),
  // Fixtures search-us, store-com.
  imageSignature('choice', 'choice-img-large-2026-11', 'S1887a285b60743859ac7bdbfca5e0896Z'),
  ...BRAND_PLUS_LOGOS.flatMap(([language, assetIds]) =>
    assetIds.map((assetId, index) =>
      imageSignature(
        'brand-plus',
        `brand-plus-img-${language}-${String(index + 1)}-2026-11`,
        assetId,
      ),
    ),
  ),
];
