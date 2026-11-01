import { BADGE_TYPES, type BadgeType } from '../../shared/badgeTypes';
import { BADGE_SIGNATURES } from './badgeSignatures';

/** The badges a card carries, in `BADGE_TYPES` order. No matching signature means no badge (FR-016). */
export function detectBadges(card: Element): BadgeType[] {
  const found = new Set<BadgeType>();
  for (const { badge, selector, matches } of BADGE_SIGNATURES) {
    if (found.has(badge)) continue;
    for (const candidate of card.querySelectorAll(selector)) {
      if (matches(candidate)) {
        found.add(badge);
        break;
      }
    }
  }
  return BADGE_TYPES.filter((badge) => found.has(badge));
}
