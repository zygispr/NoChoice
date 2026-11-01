import { BADGE_TYPES, SETTINGS_KEY_BY_BADGE, type BadgeType } from '../../shared/badgeTypes';
import { BADGES_ATTR } from '../domContract';
import { isPrimaryResultsContainer } from '../listings/listingContainers';

export interface FullyHiddenContainer {
  container: Element;
  hiddenCount: number;
}

export interface HiddenCounts {
  hiddenCount: number;
  hiddenByBadge: { choice: number; brandPlus: number };
  totalCount: number;
  /** Primary results containers whose cards are all hidden, which the notice is for (FR-015). */
  fullyHiddenContainers: FullyHiddenContainer[];
}

/** Derives what is hidden right now from the classified cards. Nothing is stored per card. */
export function countHidden(
  root: ParentNode,
  hiddenBadges: ReadonlySet<BadgeType>,
  revealed: boolean,
): HiddenCounts {
  const activeBadges = revealed ? [] : BADGE_TYPES.filter((badge) => hiddenBadges.has(badge));
  const hiddenByBadge = { choice: 0, brandPlus: 0 };
  const containers = new Map<Element, { hidden: number; total: number }>();
  let hiddenCount = 0;

  const cards = root.querySelectorAll(`[${BADGES_ATTR}]`);
  for (const card of cards) {
    const badges = (card.getAttribute(BADGES_ATTR) ?? '').split(' ');
    const matched = activeBadges.filter((badge) => badges.includes(badge));
    for (const badge of matched) hiddenByBadge[SETTINGS_KEY_BY_BADGE[badge]]++;
    if (matched.length > 0) hiddenCount++;

    if (card.parentElement) {
      const tally = containers.get(card.parentElement) ?? { hidden: 0, total: 0 };
      tally.total++;
      if (matched.length > 0) tally.hidden++;
      containers.set(card.parentElement, tally);
    }
  }

  const fullyHiddenContainers = [...containers]
    .filter(
      ([container, { hidden, total }]) => hidden === total && isPrimaryResultsContainer(container),
    )
    .map(([container, { hidden }]) => ({ container, hiddenCount: hidden }));

  return { hiddenCount, hiddenByBadge, totalCount: cards.length, fullyHiddenContainers };
}
