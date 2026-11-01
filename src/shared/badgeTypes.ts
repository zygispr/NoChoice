/** The promotional badges a shopper can hide (data-model § BadgeType). A closed set in v1. */
export const BADGE_TYPES = ['choice', 'brand-plus'] as const;

export type BadgeType = (typeof BADGE_TYPES)[number];

/** Copy rule: "Use the badge names exactly as AliExpress shows them." */
export const BADGE_LABELS: Readonly<Record<BadgeType, string>> = {
  choice: 'Choice',
  'brand-plus': 'Brand+',
};

/** The `Settings.hide` field that holds each badge's switch. */
export const SETTINGS_KEY_BY_BADGE: Readonly<Record<BadgeType, 'choice' | 'brandPlus'>> = {
  choice: 'choice',
  'brand-plus': 'brandPlus',
};
