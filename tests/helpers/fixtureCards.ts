import { BADGE_TYPES, type BadgeType } from '../../src/shared/badgeTypes';

/** A classified card as the page shows it, keyed as in `<fixture>.expected.json`. */
export interface ClassifiedCard {
  productId: string;
  badges: string[];
  hidden: boolean;
}

/**
 * Reads back every classified card in document order, using the key rule in the fixtures README:
 * the `/item/<id>.html` ID, else `image:<photo asset ID>`, with `#2`, `#3`, … on repeats. Elements
 * with neither (empty carousel slides) are not listings and are left out.
 *
 * Self-contained, so Playwright can run it in the page with `page.evaluate(readClassifiedCards)`.
 */
export function readClassifiedCards(): ClassifiedCard[] {
  const timesSeen = new Map<string, number>();
  const cards: ClassifiedCard[] = [];
  document.querySelectorAll('[data-nochoice-badges]').forEach((card) => {
    const productLink = card.querySelector('a[href*="/item/"]')?.getAttribute('href');
    const photo = card.querySelector('img[alt="Product photo"]')?.getAttribute('src');
    const productId = /\/item\/(\d+)\.html/.exec(productLink ?? '')?.[1];
    const photoId = /\/kf\/([A-Za-z0-9]+)/.exec(photo ?? '')?.[1];
    const key = productId ?? (photoId === undefined ? undefined : `image:${photoId}`);
    if (key === undefined) return;

    const seen = (timesSeen.get(key) ?? 0) + 1;
    timesSeen.set(key, seen);
    cards.push({
      productId: seen === 1 ? key : `${key}#${String(seen)}`,
      badges: (card.getAttribute('data-nochoice-badges') ?? '').split(' ').filter(Boolean),
      hidden: getComputedStyle(card).display === 'none',
    });
  });
  return cards;
}

/** Puts labels into one comparable shape: sorted by key, badges in `BADGE_TYPES` order. */
export function normaliseLabels(
  listings: readonly { productId: string; badges: readonly string[] }[],
): { productId: string; badges: BadgeType[] }[] {
  return listings
    .map(({ productId, badges }) => ({
      productId,
      badges: BADGE_TYPES.filter((badge) => badges.includes(badge)),
    }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}
