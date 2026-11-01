/** Identifies "the current results" for the per-page reveal (FR-015). The hash doesn't change them. */
export function pageKeyOf({
  origin,
  pathname,
  search,
}: Pick<Location, 'origin' | 'pathname' | 'search'>): string {
  return `${origin}${pathname}${search}`;
}

export interface PageState {
  readonly pageKey: string;
  /** True after "Show hidden listings". Never persisted, so a reload starts hiding again. */
  readonly revealed: boolean;
  reveal: () => void;
  /** Moves to `pageKey`, returning whether that is a different page. */
  onNavigate: (pageKey: string) => boolean;
}

export function createPageState(initialKey: string = pageKeyOf(location)): PageState {
  let pageKey = initialKey;
  let revealed = false;
  return {
    get pageKey() {
      return pageKey;
    },
    get revealed() {
      return revealed;
    },
    reveal() {
      revealed = true;
    },
    onNavigate(newKey) {
      if (newKey === pageKey) return false;
      pageKey = newKey;
      revealed = false;
      return true;
    },
  };
}
