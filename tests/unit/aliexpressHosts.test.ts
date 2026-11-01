import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isSupportedAliExpressUrl } from '../../src/shared/aliexpressHosts';

const MANIFEST = join(dirname(fileURLToPath(import.meta.url)), '../../public/manifest.json');

describe('isSupportedAliExpressUrl', () => {
  it('mirrors the hosts in the manifest', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
      content_scripts: { matches: string[] }[];
    };

    expect(manifest.content_scripts[0]?.matches).toEqual([
      '*://*.aliexpress.com/*',
      '*://*.aliexpress.us/*',
    ]);
  });

  it.each([
    'https://www.aliexpress.com/w/wholesale-phone-case.html',
    'https://aliexpress.com/',
    'https://pl.aliexpress.com/item/1.html',
    'https://www.aliexpress.us/',
    'http://www.aliexpress.com/',
  ])('supports %s', (url) => {
    expect(isSupportedAliExpressUrl(url)).toBe(true);
  });

  it.each([
    undefined,
    '',
    'not a url',
    'https://aliexpress.ru/wholesale',
    'https://www.aliexpress.ru/',
    'https://example.com/',
    'https://notaliexpress.com/',
    'https://aliexpress.com.example.com/',
    'https://example.com/?u=https://www.aliexpress.com/',
    'chrome://extensions/',
    'ftp://www.aliexpress.com/',
  ])('does not support %s', (url) => {
    expect(isSupportedAliExpressUrl(url)).toBe(false);
  });
});
