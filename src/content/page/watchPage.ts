import {
  classifyAddedNode,
  classifyDocument,
  classifyEnclosingListing,
} from '../listings/classifyListing';
import { pageKeyOf } from './pageState';

export interface WatchPageCallbacks {
  /** AliExpress changes results in place, so a new key is how navigation shows up (research R4). */
  onPageKeyChange: (pageKey: string) => void;
  onBatchProcessed: () => void;
}

/**
 * Classifies cards as they appear. Observer callbacks run as microtasks, before the browser can
 * paint what was added, which is what keeps matching cards from ever showing (FR-006).
 */
export function watchPage(doc: Document, callbacks: WatchPageCallbacks): { stop: () => void } {
  let pageKey = pageKeyOf(doc.location);

  classifyDocument(doc);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) classifyAddedNode(node);
      }
      // A src change can bring a badge in. A removal can take one out when AliExpress reuses a
      // card for another product, and leaving the old mark would hide an unbadged listing.
      if (
        (record.type === 'attributes' || record.removedNodes.length > 0) &&
        record.target instanceof Element
      ) {
        classifyEnclosingListing(record.target);
      }
    }

    const currentKey = pageKeyOf(doc.location);
    if (currentKey !== pageKey) {
      pageKey = currentKey;
      callbacks.onPageKeyChange(currentKey);
    }
    callbacks.onBatchProcessed();
  });
  observer.observe(doc.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src'],
  });

  return {
    stop: () => {
      observer.disconnect();
    },
  };
}
