import type { PageStatusState } from '../../../hooks/usePageStatus';
import { Text } from '../../atoms/Text';
import { HiddenCountSummary } from '../../molecules/HiddenCountSummary';
import styles from './PageStatus.module.scss';

interface PageStatusProps {
  state: PageStatusState;
  hidingEnabled: boolean;
}

/** What the popup says about the current tab (contracts/popup-ui.md § Page status states). */
export function PageStatus({ state, hidingEnabled }: PageStatusProps) {
  return (
    <div aria-live="polite" className={styles.status}>
      <StatusContent state={state} hidingEnabled={hidingEnabled} />
    </div>
  );
}

function StatusContent({ state, hidingEnabled }: PageStatusProps) {
  switch (state.kind) {
    case 'loading':
      return null;
    case 'not-aliexpress':
      return <Text as="p">NoChoice only works on AliExpress.</Text>;
    case 'reload-needed':
      return <Text as="p">Reload this AliExpress page to start hiding listings.</Text>;
    case 'active':
      if (!hidingEnabled) return <Text as="p">Hiding is off. All listings are shown.</Text>;
      if (state.status.revealed) {
        return (
          <Text as="p">
            Showing hidden listings on this page. They&apos;ll be hidden again when you reload or
            change results.
          </Text>
        );
      }
      return (
        <HiddenCountSummary
          hiddenCount={state.status.hiddenCount}
          hiddenByBadge={state.status.hiddenByBadge}
        />
      );
  }
}
