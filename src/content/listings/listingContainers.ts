/** One kind of element whose direct children are listing cards (data-model § ListingContainer). */
export interface ListingContainer {
  id: string;
  selector: string;
  /** Only primary results can show the "all listings hidden" notice (FR-015). */
  isPrimaryResults: boolean;
}

// Hashed class suffixes change with AliExpress's builds, so selectors use IDs and class prefixes.
// None of these grids uses absolute positioning: `display: none` closes the gaps (FR-004). A
// selector may also match a harmless sibling such as a title row: its children have no badges, so
// they are marked `""` and stay visible. What matters is that none reaches the main product (FR-009).
export const LISTING_CONTAINERS: readonly ListingContainer[] = [
  // Search and category pages share this grid (fixtures search-*, category-com).
  { id: 'search-grid', selector: '#card-list', isPrimaryResults: true },
  // The "All items" grid has no classes or IDs of its own (fixture store-com).
  { id: 'store-grid', selector: '#right > div > div', isPrimaryResults: true },
  // "Premium sponsored items" (fixtures search-*, category-com).
  { id: 'search-sponsored', selector: "[class*='p4p--p4pList']", isPrimaryResults: false },
  // "More to love" (fixture home-com).
  {
    id: 'home-feed',
    selector: "[class*='more-to-love--motolove-warp'] > div",
    isPrimaryResults: false,
  },
  // "More to love" (fixture pdp-com).
  {
    id: 'pdp-more-to-love',
    selector: '#nav-moretolove .pdp-wrap > div',
    isPrimaryResults: false,
  },
  // "Recommended from <store>" (fixture pdp-com).
  {
    id: 'pdp-store-recommended',
    selector: "[class*='recommend-store--title'] + div > div",
    isPrimaryResults: false,
  },
  // "Related items": a carousel whose slides are filled in as they scroll into view (fixture pdp-com).
  { id: 'pdp-related', selector: '#nav-review .slick-track', isPrimaryResults: false },
];

/** Matches any listing container, for native `matches`, `closest`, and `querySelectorAll`. */
export const LISTING_CONTAINER_SELECTOR = LISTING_CONTAINERS.map(({ selector }) => selector).join();

const PRIMARY_RESULTS_SELECTOR = LISTING_CONTAINERS.filter(
  ({ isPrimaryResults }) => isPrimaryResults,
)
  .map(({ selector }) => selector)
  .join();

export function isListingContainer(element: Element): boolean {
  return element.matches(LISTING_CONTAINER_SELECTOR);
}

export function isPrimaryResultsContainer(element: Element): boolean {
  return element.matches(PRIMARY_RESULTS_SELECTOR);
}
