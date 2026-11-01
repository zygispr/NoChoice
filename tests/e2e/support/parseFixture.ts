import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { FIXTURES_DIR } from '../../helpers/loadFixture';

/** Parses a fixture into its own document, for building synthetic pages in the Playwright process. */
export function parseFixture(name: string): Document {
  const html = readFileSync(join(FIXTURES_DIR, `${name}.html`), 'utf8');
  return new JSDOM(html).window.document;
}
