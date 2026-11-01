import { BADGE_TYPES, type BadgeType } from '../../shared/badgeTypes';
import { HIDE_ATTR } from '../domContract';

/** Switches the hide rules in content.scss for the whole page, so every change is O(1). */
export function applyHiding(
  html: Element,
  hiddenBadges: ReadonlySet<BadgeType>,
  revealed: boolean,
): void {
  const badges = BADGE_TYPES.filter((badge) => hiddenBadges.has(badge));
  if (revealed || badges.length === 0) html.removeAttribute(HIDE_ATTR);
  else html.setAttribute(HIDE_ATTR, badges.join(' '));
}
