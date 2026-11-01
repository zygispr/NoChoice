// What the budget test times, bundled on its own so it can run in a real browser page.
import { ListingBatch } from '../../../src/content/listings/classifyListing';

export { countHidden } from '../../../src/content/page/hiddenCount';

/** What the page observer does for a batch of added nodes. */
export function classifyBatch(nodes: Iterable<Element>): void {
  const batch = new ListingBatch();
  for (const node of nodes) batch.addNode(node);
  batch.classifyAll();
}
