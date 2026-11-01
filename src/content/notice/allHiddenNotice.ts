import { BADGE_LABELS, BADGE_TYPES, type BadgeType } from '../../shared/badgeTypes';
import { NOTICE_TAG } from '../domContract';
import type { FullyHiddenContainer } from '../page/hiddenCount';
import styles from './allHiddenNotice.scss?inline';

/** Results render lazily, so a first batch that happens to be all Choice must not flash a notice. */
const SETTLE_MS = 500;

/** A fully hidden container, either waiting to settle or already showing its notice. */
interface TrackedContainer {
  hiddenCount: number;
  hiddenBadges: ReadonlySet<BadgeType>;
  onReveal: () => void;
  timer: ReturnType<typeof setTimeout> | null;
  /** Kept because the container may already be gone from the page when the notice has to go. */
  notice: Element | null;
}

const tracked = new Map<Element, TrackedContainer>();

function messageFor(count: number, hiddenBadges: ReadonlySet<BadgeType>): string {
  const labels = BADGE_TYPES.filter((badge) => hiddenBadges.has(badge)).map(
    (badge) => BADGE_LABELS[badge],
  );
  return `All ${String(count)} listings in these results were hidden by NoChoice (${labels.join(' and ')}).`;
}

/**
 * Not registered with `customElements.define`: `customElements` is null in a content script's
 * isolated world. `attachShadow` only needs a valid custom element name.
 */
function createNotice(container: Element): Element {
  const host = document.createElement(NOTICE_TAG);
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = styles;

  const notice = document.createElement('div');
  notice.className = 'notice';
  notice.setAttribute('role', 'status');

  const message = document.createElement('p');
  message.className = 'message';

  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'reveal';
  reveal.textContent = 'Show hidden listings';

  notice.append(message, reveal);
  shadow.append(style, notice);
  container.before(host);
  return host;
}

/** Shows or updates the one notice for `container`, leaving the DOM alone when nothing changed. */
export function renderAllHiddenNotice(
  container: Element,
  count: number,
  hiddenBadges: ReadonlySet<BadgeType>,
  onReveal: () => void,
): Element {
  const previous = container.previousElementSibling;
  const host = previous?.localName === NOTICE_TAG ? previous : createNotice(container);
  const message = host.shadowRoot?.querySelector('.message');
  const reveal = host.shadowRoot?.querySelector('button');
  if (message && reveal) {
    const text = messageFor(count, hiddenBadges);
    if (message.textContent !== text) message.textContent = text;
    reveal.onclick = () => {
      onReveal();
    };
  }
  return host;
}

/** Removes every notice and cancels any still waiting to settle. */
export function removeAllHiddenNotices(root: ParentNode): void {
  for (const { timer } of tracked.values()) {
    if (timer !== null) clearTimeout(timer);
  }
  tracked.clear();
  for (const notice of root.querySelectorAll(NOTICE_TAG)) {
    notice.remove();
  }
}

/**
 * Brings the notices in line with the containers that are fully hidden right now, applying the
 * settle rule: a notice appears once a container's hidden count has held still for 500 ms.
 */
export function updateAllHiddenNotices(
  fullyHiddenContainers: readonly FullyHiddenContainer[],
  hiddenBadges: ReadonlySet<BadgeType>,
  onReveal: () => void,
): void {
  const stillFullyHidden = new Set(fullyHiddenContainers.map(({ container }) => container));
  for (const [container, { timer, notice }] of tracked) {
    if (stillFullyHidden.has(container)) continue;
    if (timer !== null) clearTimeout(timer);
    notice?.remove();
    tracked.delete(container);
  }

  for (const { container, hiddenCount } of fullyHiddenContainers) {
    const existing = tracked.get(container);
    if (existing?.notice) {
      existing.notice = renderAllHiddenNotice(container, hiddenCount, hiddenBadges, onReveal);
      continue;
    }
    if (existing?.hiddenCount === hiddenCount) {
      existing.hiddenBadges = hiddenBadges;
      existing.onReveal = onReveal;
      continue;
    }

    if (existing?.timer) clearTimeout(existing.timer);
    const entry: TrackedContainer = {
      hiddenCount,
      hiddenBadges,
      onReveal,
      notice: null,
      timer: setTimeout(() => {
        entry.timer = null;
        entry.notice = renderAllHiddenNotice(
          container,
          entry.hiddenCount,
          entry.hiddenBadges,
          entry.onReveal,
        );
      }, SETTLE_MS),
    };
    tracked.set(container, entry);
  }
}
