import { describe, expect, it } from 'vitest';
import { buildStatusMessage, isStatusMessage, STATUS_PORT_NAME } from '../../src/shared/messages';

const VALID = {
  type: 'status',
  hiddenCount: 3,
  hiddenByBadge: { choice: 2, brandPlus: 2 },
  revealed: false,
};

describe('messaging contract (contracts/messaging.md)', () => {
  it('carries the protocol version in the port name', () => {
    expect(STATUS_PORT_NAME).toBe('nochoice/status@1');
  });

  describe('buildStatusMessage', () => {
    it('returns exactly the contract fields, dropping anything else in the counts', () => {
      const counts = {
        hiddenCount: 3,
        hiddenByBadge: { choice: 2, brandPlus: 2 },
        totalCount: 60,
        fullyHiddenContainers: [],
      };

      expect(buildStatusMessage(counts, true)).toStrictEqual({ ...VALID, revealed: true });
    });

    it('produces non-negative integers and keeps the count invariant', () => {
      const { hiddenCount, hiddenByBadge } = buildStatusMessage(
        { hiddenCount: 3, hiddenByBadge: { choice: 2, brandPlus: 2 } },
        false,
      );

      for (const value of [hiddenCount, hiddenByBadge.choice, hiddenByBadge.brandPlus]) {
        expect(Number.isInteger(value) && value >= 0).toBe(true);
      }
      expect(Math.max(hiddenByBadge.choice, hiddenByBadge.brandPlus)).toBeLessThanOrEqual(
        hiddenCount,
      );
      expect(hiddenCount).toBeLessThanOrEqual(hiddenByBadge.choice + hiddenByBadge.brandPlus);
    });
  });

  describe('isStatusMessage', () => {
    it('accepts a built message', () => {
      expect(isStatusMessage(VALID)).toBe(true);
    });

    it.each([
      ['null', null],
      ['a string', 'status'],
      ['an array', [VALID]],
      ['an unknown type', { ...VALID, type: 'status2' }],
      ['a missing count', { ...VALID, hiddenCount: undefined }],
      ['a negative count', { ...VALID, hiddenCount: -1 }],
      ['a fractional count', { ...VALID, hiddenCount: 1.5 }],
      ['a text count', { ...VALID, hiddenCount: '3' }],
      ['a missing breakdown', { ...VALID, hiddenByBadge: undefined }],
      ['a wrong breakdown field', { ...VALID, hiddenByBadge: { choice: 1 } }],
      ['a non-boolean revealed', { ...VALID, revealed: 'no' }],
    ])('rejects %s', (_name, value) => {
      expect(isStatusMessage(value)).toBe(false);
    });
  });
});
