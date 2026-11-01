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

/**
 * The cards one batch of page changes affects. The parser delivers a card's parts one by one, about
 * a hundred per card, so cards are classified once at the end, and a part whose parent is already
 * known to be inside a card skips the selector lookups.
 */
export class ListingBatch {
  readonly #cards = new Set<Element>();
  readonly #nodesInCards = new Set<Element>();

  /** Handles a node added to the page: a container, a card, part of a card, or a wrapper. */
  addNode(node: Element): void {
    if (node.parentElement && this.#nodesInCards.has(node.parentElement)) {
      this.#nodesInCards.add(node);
      return;
    }
    if (isListingContainer(node)) {
      this.#addChildren(node);
      return;
    }
    if (this.addEnclosingListing(node)) {
      this.#nodesInCards.add(node);
      return;
    }
    for (const container of node.querySelectorAll(LISTING_CONTAINER_SELECTOR)) {
      this.#addChildren(container);
    }
  }

  /** Adds the card that holds `node`, returning whether there is one. */
  addEnclosingListing(node: Element): boolean {
    const card = findListingRoot(node);
    if (card) this.#cards.add(card);
    return card !== null;
  }

  classifyAll(): void {
    for (const card of this.#cards) classifyListing(card);
  }

  #addChildren(container: Element): void {
    for (const card of container.children) this.#cards.add(card);
  }
}

function classifyChildren(container: Element): void {
  for (const card of container.children) {
    classifyListing(card);
  }
}
