import { isListingContainer, LISTING_CONTAINER_SELECTOR } from './listingContainers';

/**
 * The card that holds `node`: its ancestor (or itself) that is a direct child of a known listing
 * container. With no such container there is no card, so nothing gets hidden (FR-009, FR-016).
 */
export function findListingRoot(node: Element): Element | null {
  if (isListingContainer(node)) return null;
  const container = node.parentElement?.closest(LISTING_CONTAINER_SELECTOR);
  if (!container) return null;

  let root = node;
  while (root.parentElement !== container) {
    if (!root.parentElement) return null;
    root = root.parentElement;
  }
  return root;
}
