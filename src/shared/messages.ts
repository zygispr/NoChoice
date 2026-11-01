/** The version in the name stops a stale content script from being misread (contracts/messaging.md). */
export const STATUS_PORT_NAME = 'nochoice/status@1';

/** Content script → popup: what is hidden on this page right now. */
export interface StatusMessage {
  type: 'status';
  hiddenCount: number;
  hiddenByBadge: { choice: number; brandPlus: number };
  /** True after "Show hidden listings" on this page (FR-015). */
  revealed: boolean;
}

export function buildStatusMessage(
  { hiddenCount, hiddenByBadge }: Pick<StatusMessage, 'hiddenCount' | 'hiddenByBadge'>,
  revealed: boolean,
): StatusMessage {
  return {
    type: 'status',
    hiddenCount,
    hiddenByBadge: { choice: hiddenByBadge.choice, brandPlus: hiddenByBadge.brandPlus },
    revealed,
  };
}

export function isStatusMessage(value: unknown): value is StatusMessage {
  if (!isRecord(value) || value.type !== 'status' || typeof value.revealed !== 'boolean') {
    return false;
  }
  return (
    isCount(value.hiddenCount) &&
    isRecord(value.hiddenByBadge) &&
    isCount(value.hiddenByBadge.choice) &&
    isCount(value.hiddenByBadge.brandPlus)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
