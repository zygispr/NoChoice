// Fails when a bundle goes over its budget (plan.md § Performance Goals).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const ASSETS = join(DIST, 'assets');
const CONTENT_BUDGET_KB = 20;
const POPUP_GZIP_BUDGET_KB = 100;

const kilobytes = (bytes) => bytes / 1024;

const contentKb = kilobytes(readFileSync(join(DIST, 'content.js')).length);
const popupFiles = readdirSync(ASSETS).filter((name) => name.endsWith('.js'));
if (popupFiles.length === 0) throw new Error(`No popup JavaScript found in ${ASSETS}`);
const popupKb = kilobytes(
  popupFiles.reduce((total, name) => total + gzipSync(readFileSync(join(ASSETS, name))).length, 0),
);

const checks = [
  { name: 'content.js, minified', kb: contentKb, budget: CONTENT_BUDGET_KB },
  { name: 'popup JS, gzipped', kb: popupKb, budget: POPUP_GZIP_BUDGET_KB },
];
for (const { name, kb, budget } of checks) {
  console.log(`${name}: ${kb.toFixed(1)} KB (budget: ${String(budget)} KB)`);
}
if (checks.some(({ kb, budget }) => kb > budget)) {
  console.error('A bundle is over its budget.');
  process.exit(1);
}
