import { BADGE_LABELS, BADGE_TYPES, SETTINGS_KEY_BY_BADGE } from '../../../../shared/badgeTypes';
import type { StatusMessage } from '../../../../shared/messages';
import { Text } from '../../atoms/Text';

type HiddenCountSummaryProps = Pick<StatusMessage, 'hiddenCount' | 'hiddenByBadge'>;

export function HiddenCountSummary({ hiddenCount, hiddenByBadge }: HiddenCountSummaryProps) {
  if (hiddenCount === 0) return <Text as="p">Nothing hidden on this page</Text>;

  const breakdown = BADGE_TYPES.map((badge) => ({
    label: BADGE_LABELS[badge],
    count: hiddenByBadge[SETTINGS_KEY_BY_BADGE[badge]],
  }))
    .filter(({ count }) => count > 0)
    .map(({ label, count }) => `${label} ${String(count)}`)
    .join(' · ');

  return (
    <>
      <Text as="p">
        <Text as="strong" variant="strong">
          {hiddenCount}
        </Text>{' '}
        hidden on this page
      </Text>
      <Text as="p" variant="muted">
        {breakdown}
      </Text>
    </>
  );
}
