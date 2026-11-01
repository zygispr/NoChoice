// The badge images identified by eye on live AliExpress (fixtures README). Kept apart from
// BADGE_SIGNATURES, so a wrong signature can't also skew what the tests expect.
export const CHOICE_ASSET_IDS = [
  'S135d2af8d57840b28092ceba069bdb6c4',
  'S1887a285b60743859ac7bdbfca5e0896Z',
];

/** Brand+ is translated, and most languages have one image per card layout. */
export const BRAND_PLUS_ASSET_IDS_BY_LANGUAGE: Readonly<Record<string, readonly string[]>> = {
  'English, Italian, Japanese': [
    'Sca1bcdd1057c4a388af0eed405d9a464x',
    'Sb008eb53e92f463eb0a2c17c539df530h',
  ],
  Spanish: ['S29a6b4dab6c04c1bb7044c50de262ec7o', 'S665c6e6f93204283a76340704b9957d4S'],
  German: ['Sd3587a28ecb64db1a7cb97cc8def15356', 'S833c1647a3c94723a293b13d878584182'],
  French: ['S47f57d5a3bd44d328319a447678f7b65l', 'Sadfae257af6d4e4187fb3e1bb34133edc'],
  Portuguese: ['S5e5b49b699ce4fd7a633cfb20a7afbd1A', 'S0ed1419959bf4b64b9316ea563c05a716'],
  Polish: ['S877a80e2c15a4275bb2b74ee3f892069Q', 'S26f11a87544b431c9a71f21b3583b1d37'],
  Dutch: ['Sb47ca399b1b8433d80da9d6fc863c2f8d', 'S114c71321465452aa713ebeb43390f44P'],
  Arabic: ['Sb61778788a1d4b4a8e93556a7684d6b4v', 'S1a392929c6604f7f8073e9a31bc97fa0R'],
  Hebrew: ['Sae0c0600de94452098cffef4d35d77a1E', 'S88898094a4234138913ac943ae6b88a2L'],
  Turkish: ['Sdeda2dbc76d04796904ef65830c707b7X'],
  Thai: ['S85b3276227f94e87b68f7215ade7082d9'],
  Korean: ['Sd11e9e7507af41ea9402560e2bb3d5c0F'],
};

export const BRAND_PLUS_ASSET_IDS = Object.values(BRAND_PLUS_ASSET_IDS_BY_LANGUAGE).flat();

export const BADGE_ASSET_IDS = [...CHOICE_ASSET_IDS, ...BRAND_PLUS_ASSET_IDS];

/** Selects every badge image, for tests that need to find or change them. */
export const BADGE_IMAGE_SELECTOR = BADGE_ASSET_IDS.map((id) => `img[src*="${id}"]`).join(', ');
