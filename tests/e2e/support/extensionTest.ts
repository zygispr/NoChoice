import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  test as base,
  chromium,
  expect,
  type BrowserContext,
  type Page,
  type Request,
} from '@playwright/test';

const DIST_URL = new URL('../../../dist/', import.meta.url);
const FIXTURES_URL = new URL('../../fixtures/aliexpress/', import.meta.url);
const POPUP_PATH = 'src/popup/index.html';

/** Request types a sanitised, script-free fixture page never makes, so they can only come from us. */
const SCRIPTED_REQUEST_TYPES = new Set(['fetch', 'xhr', 'websocket', 'eventsource']);

export interface ExtensionFixtures {
  /** The persistent context with the built extension loaded. Replaced by `relaunch()`. */
  context: BrowserContext;
  extensionId: string;
  /** Serves the fixture `tests/fixtures/aliexpress/<fixtureName>.html` at exactly `url`. */
  serveFixture: (url: string, fixtureName: string) => void;
  /** Serves `html` at exactly `url` (for synthetic pages built in the test). */
  serveHtml: (url: string, html: string) => void;
  /** Opens the popup as a page, pointed at `tabId` through the `?tabId=` test seam. */
  openPopup: (tabId?: number) => Promise<Page>;
  /** Closes the browser and reopens it on the same profile, as a browser restart would. */
  relaunch: () => Promise<BrowserContext>;
  /** Fails if the extension made any network request of its own (FR-017, SC-007). */
  assertNoExtensionNetworkActivity: () => void;
  /** Keys in `chrome.storage.local`, read from an extension page. */
  storedKeys: () => Promise<string[]>;
}

interface WorkerFixtures {
  distDir: string;
}

/**
 * Owns one browser profile across relaunches. Every network request is answered from the served
 * pages or aborted, so tests are offline and deterministic.
 */
class ExtensionSession {
  readonly #distDir: string;
  readonly #userDataDir = mkdtempSync(join(tmpdir(), 'nochoice-e2e-'));
  readonly #pages = new Map<string, string>();
  readonly #requests: Request[] = [];
  readonly #webSockets: string[] = [];
  #context: BrowserContext | null = null;

  constructor(distDir: string) {
    this.#distDir = distDir;
  }

  get context(): BrowserContext {
    if (!this.#context) throw new Error('The extension browser is not running');
    return this.#context;
  }

  serve(url: string, html: string): void {
    this.#pages.set(withoutHash(url), html);
  }

  async launch(): Promise<BrowserContext> {
    const context = await chromium.launchPersistentContext(this.#userDataDir, {
      channel: 'chromium',
      args: [`--disable-extensions-except=${this.#distDir}`, `--load-extension=${this.#distDir}`],
    });
    context.on('request', (request) => this.#requests.push(request));
    context.on('page', (page) => {
      page.on('websocket', (socket) => this.#webSockets.push(socket.url()));
    });
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (!/^https?:/.test(url)) {
        await route.fallback();
        return;
      }
      const html = this.#pages.get(withoutHash(url));
      if (html === undefined) {
        await route.abort('internetdisconnected');
        return;
      }
      await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    });
    this.#context = context;
    return context;
  }

  async relaunch(): Promise<BrowserContext> {
    await this.#context?.close();
    return this.launch();
  }

  extensionNetworkViolations(extensionOrigin: string): string[] {
    const violations = this.#requests.flatMap((request) => {
      const url = request.url();
      if (SCRIPTED_REQUEST_TYPES.has(request.resourceType())) {
        return [`${request.resourceType()} request to ${url}`];
      }
      const fromExtensionPage = frameUrlOf(request).startsWith(`${extensionOrigin}/`);
      if (fromExtensionPage && !url.startsWith(`${extensionOrigin}/`)) {
        return [`extension page requested ${url}`];
      }
      return [];
    });
    return [...violations, ...this.#webSockets.map((url) => `WebSocket to ${url}`)];
  }

  async close(): Promise<void> {
    await this.#context?.close();
    rmSync(this.#userDataDir, { recursive: true, force: true });
  }
}

export const test = base.extend<ExtensionFixtures & { session: ExtensionSession }, WorkerFixtures>({
  distDir: [
    // eslint-disable-next-line no-empty-pattern -- Playwright requires a destructured first argument
    async ({}, use) => {
      const distDir = fileURLToPath(DIST_URL);
      if (!existsSync(join(distDir, 'manifest.json'))) {
        throw new Error(
          'dist/ has no built extension. Run `npm run build` (or `npm run test:e2e`).',
        );
      }
      // Chrome derives the unpacked extension's ID from the resolved absolute path.
      await use(realpathSync(distDir));
    },
    { scope: 'worker' },
  ],

  session: async ({ distDir }, use) => {
    const session = new ExtensionSession(distDir);
    await session.launch();
    await use(session);
    await session.close();
  },

  context: async ({ session }, use) => {
    await use(session.context);
  },

  extensionId: async ({ distDir }, use) => {
    await use(unpackedExtensionId(distDir));
  },

  serveFixture: async ({ session }, use) => {
    await use((url, fixtureName) => {
      session.serve(url, readFileSync(new URL(`${fixtureName}.html`, FIXTURES_URL), 'utf8'));
    });
  },

  serveHtml: async ({ session }, use) => {
    await use((url, html) => {
      session.serve(url, html);
    });
  },

  openPopup: async ({ session, extensionId }, use) => {
    await use(async (tabId) => {
      const page = await session.context.newPage();
      const query = tabId === undefined ? '' : `?tabId=${String(tabId)}`;
      await page.goto(`chrome-extension://${extensionId}/${POPUP_PATH}${query}`);
      return page;
    });
  },

  relaunch: async ({ session }, use) => {
    await use(() => session.relaunch());
  },

  assertNoExtensionNetworkActivity: async ({ session, extensionId }, use) => {
    await use(() => {
      const violations = session.extensionNetworkViolations(`chrome-extension://${extensionId}`);
      expect(violations, 'requests made by the extension (FR-017, SC-007)').toEqual([]);
    });
  },

  storedKeys: async ({ session, extensionId }, use) => {
    await use(async () => {
      const page = await session.context.newPage();
      try {
        await page.goto(`chrome-extension://${extensionId}/${POPUP_PATH}`);
        return await page.evaluate(async () => Object.keys(await chrome.storage.local.get(null)));
      } finally {
        await page.close();
      }
    });
  },
});

export { expect };

/** Chrome's ID for an unpacked extension: SHA-256 of its path, first 32 hex digits mapped 0–f → a–p. */
function unpackedExtensionId(absolutePath: string): string {
  const hex = createHash('sha256').update(absolutePath).digest('hex').slice(0, 32);
  return hex.replace(/[0-9a-f]/g, (digit) => String.fromCharCode(97 + parseInt(digit, 16)));
}

function withoutHash(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  return parsed.href;
}

/** The URL of the page that made the request, or '' for requests with no frame (e.g. workers). */
function frameUrlOf(request: Request): string {
  try {
    return request.frame().url();
  } catch {
    return '';
  }
}
