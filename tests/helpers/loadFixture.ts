import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BADGE_TYPES, type BadgeType } from '../../src/shared/badgeTypes';

/** Sanitised captures of real AliExpress pages (quickstart.md § Capturing fixtures). */
export const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/aliexpress/', import.meta.url));

/** Hand-verified labels for one fixture (`<name>.expected.json`). */
export interface ExpectedFixture {
  source: string;
  capturedAt: string;
  listings: { productId: string; badges: BadgeType[] }[];
}

/** Replaces the jsdom document with the fixture `<name>.html` and returns it. */
export function loadFixture(name: string): Document {
  document.documentElement.innerHTML = readFileSync(join(FIXTURES_DIR, `${name}.html`), 'utf8');
  return document;
}

/** Reads `<name>.expected.json`, failing loudly if a hand-written label file is malformed. */
export function loadExpected(name: string): ExpectedFixture {
  const file = join(FIXTURES_DIR, `${name}.expected.json`);
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  assertExpectedFixture(parsed, file);
  return parsed;
}

/** Every fixture name that has both its HTML and its labels. */
export function listFixtures(): string[] {
  if (!existsSync(FIXTURES_DIR)) return [];
  const files = new Set(readdirSync(FIXTURES_DIR));
  return [...files]
    .filter((file) => file.endsWith('.html'))
    .map((file) => file.slice(0, -'.html'.length))
    .filter((name) => files.has(`${name}.expected.json`))
    .sort();
}

function assertExpectedFixture(value: unknown, file: string): asserts value is ExpectedFixture {
  const fail = (problem: string): never => {
    throw new Error(`${file}: ${problem}`);
  };
  if (!isObject(value)) return fail('expected a JSON object');
  if (typeof value.source !== 'string') fail('"source" must be a string');
  if (typeof value.capturedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.capturedAt)) {
    fail('"capturedAt" must be a YYYY-MM-DD date');
  }
  if (!Array.isArray(value.listings)) return fail('"listings" must be an array');

  const seen = new Set<string>();
  value.listings.forEach((listing: unknown, index) => {
    const where = `listings[${String(index)}]`;
    if (!isObject(listing)) return fail(`${where} must be an object`);
    if (typeof listing.productId !== 'string' || listing.productId === '') {
      fail(`${where}.productId must be a non-empty string`);
    }
    if (seen.has(String(listing.productId))) fail(`${where}.productId is listed twice`);
    seen.add(String(listing.productId));
    if (!Array.isArray(listing.badges) || !listing.badges.every(isBadgeType)) {
      fail(`${where}.badges must only contain ${BADGE_TYPES.join(', ')}`);
    }
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBadgeType(value: unknown): value is BadgeType {
  return (BADGE_TYPES as readonly unknown[]).includes(value);
}
