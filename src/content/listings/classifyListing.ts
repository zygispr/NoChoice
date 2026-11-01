import { detectBadges } from '../badges/detectBadges';
import { BADGES_ATTR } from '../domContract';
import { findListingRoot } from './findListingRoot';
import { isListingContainer, LISTING_CONTAINER_SELECTOR } from './listingContainers';

/** Records a card's badges on the card. Settings never affect classification (page-dom contract). */
export function classifyListing(card: Element): void {
  card.setAttribute(BADGES_ATTR, detectBadges(card).join(' '));
}

/** Classifies every card in every listing container under `root`. */
export function classifyDocument(root: ParentNode): void {
  for (const container of root.querySelectorAll(LISTING_CONTAINER_SELECTOR)) {
    classifyChildren(container);
  }
}

/** Handles a node added to the page, which may be a container, a card, or part of a card. */
export function classifyAddedNode(node: Element): void {
  if (isListingContainer(node)) classifyChildren(node);
  else classifyEnclosingListing(node);
  classifyDocument(node);
}

/** Re-classifies the card that holds `node`, if there is one. */
export function classifyEnclosingListing(node: Element): void {
  const card = findListingRoot(node);
  if (card) classifyListing(card);
}

function classifyChildren(container: Element): void {
  for (const card of container.children) {
    classifyListing(card);
  }
}
