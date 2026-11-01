import { BADGE_TYPES, type BadgeType } from '../../shared/badgeTypes';
import { BADGE_SIGNATURES } from './badgeSignatures';

const IMAGE_ASSET_ID = /\/kf\/([A-Za-z0-9]+)(?:[/.]|$)/;

const BADGE_BY_ASSET_ID: ReadonlyMap<string, BadgeType> = new Map(
  BADGE_SIGNATURES.map(({ assetId, badge }) => [assetId, badge]),
);

/** The badges a card carries, in `BADGE_TYPES` order. No matching signature means no badge (FR-016). */
export function detectBadges(card: Element): BadgeType[] {
  const found = new Set<BadgeType>();
  // One lookup per image, so the cost doesn't grow as logos for more languages are added.
  for (const image of card.getElementsByTagName('img')) {
    const assetId = IMAGE_ASSET_ID.exec(image.getAttribute('src') ?? '')?.[1];
    const badge = assetId === undefined ? undefined : BADGE_BY_ASSET_ID.get(assetId);
    if (badge) found.add(badge);
  }
  return BADGE_TYPES.filter((badge) => found.has(badge));
}
