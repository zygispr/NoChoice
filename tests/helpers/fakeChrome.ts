import { vi } from 'vitest';

/**
 * In-memory fake of the `chrome.*` APIs the extension uses, installed as the global `chrome` for
 * every unit test (tests/setup.ts). It follows real Chrome where tests depend on it: stored values
 * are copied, `storage.onChanged` fires `(changes, "local")`, port messages arrive asynchronously,
 * and `tabs.connect` to a tab with no content script disconnects with `runtime.lastError` set.
 */

type Listener<Args extends unknown[]> = (...args: Args) => void;

export class FakeEvent<Args extends unknown[]> {
  readonly #listeners = new Set<Listener<Args>>();

  addListener(listener: Listener<Args>): void {
    this.#listeners.add(listener);
  }

  removeListener(listener: Listener<Args>): void {
    this.#listeners.delete(listener);
  }

  hasListener(listener: Listener<Args>): boolean {
    return this.#listeners.has(listener);
  }

  hasListeners(): boolean {
    return this.#listeners.size > 0;
  }

  /** Test control: fires the event, as the browser would. */
  dispatch(...args: Args): void {
    for (const listener of [...this.#listeners]) listener(...args);
  }
}

export interface StorageChange {
  oldValue?: unknown;
  newValue?: unknown;
}

type StorageChangedEvent = FakeEvent<[changes: Record<string, StorageChange>, areaName: string]>;

class FakeStorageArea {
  readonly #items = new Map<string, unknown>();
  readonly #onChanged: StorageChangedEvent;
  #nextSetError: Error | null = null;

  constructor(onChanged: StorageChangedEvent) {
    this.#onChanged = onChanged;
  }

  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const defaults = isPlainObject(keys) ? keys : {};
    const wanted =
      keys === null || keys === undefined
        ? [...this.#items.keys()]
        : typeof keys === 'string'
          ? [keys]
          : Array.isArray(keys)
            ? keys
            : Object.keys(keys);
    for (const key of wanted) {
      if (this.#items.has(key)) result[key] = structuredClone(this.#items.get(key));
      else if (key in defaults) result[key] = defaults[key];
    }
    return Promise.resolve(result);
  }

  set(items: Record<string, unknown>): Promise<void> {
    if (this.#nextSetError) {
      const error = this.#nextSetError;
      this.#nextSetError = null;
      return Promise.reject(error);
    }
    const changes: Record<string, StorageChange> = {};
    for (const [key, value] of Object.entries(items)) {
      const change: StorageChange = { newValue: structuredClone(value) };
      if (this.#items.has(key)) change.oldValue = this.#items.get(key);
      changes[key] = change;
      this.#items.set(key, structuredClone(value));
    }
    this.#onChanged.dispatch(changes, 'local');
    return Promise.resolve();
  }

  /** Test control: the next `set` rejects with `error` and stores nothing. */
  failNextSet(error: Error): void {
    this.#nextSetError = error;
  }
}

export class FakePort {
  readonly name: string;
  readonly onMessage = new FakeEvent<[message: unknown, port: FakePort]>();
  readonly onDisconnect = new FakeEvent<[port: FakePort]>();
  #peer: FakePort | null = null;
  #connected = true;

  constructor(name: string) {
    this.name = name;
  }

  static pair(name: string): [FakePort, FakePort] {
    const a = new FakePort(name);
    const b = new FakePort(name);
    a.#peer = b;
    b.#peer = a;
    return [a, b];
  }

  postMessage(message: unknown): void {
    if (!this.#connected) throw new Error('Attempting to use a disconnected port object');
    const peer = this.#peer;
    const copy = structuredClone(message);
    queueMicrotask(() => {
      if (peer && peer.#connected) peer.onMessage.dispatch(copy, peer);
    });
  }

  /** Closes both ends. Only the other end's `onDisconnect` fires, as in Chrome. */
  disconnect(): void {
    if (!this.#connected) return;
    this.#connected = false;
    const peer = this.#peer;
    if (!peer || !peer.#connected) return;
    peer.#connected = false;
    queueMicrotask(() => {
      peer.onDisconnect.dispatch(peer);
    });
  }
}

export interface FakeTab {
  id: number;
  url?: string;
  active?: boolean;
}

const NO_RECEIVER = 'Could not establish connection. Receiving end does not exist.';

export class FakeChrome {
  readonly runtime = {
    lastError: undefined as { message: string } | undefined,
    onConnect: new FakeEvent<[port: FakePort]>(),
  };

  readonly storage = (() => {
    const onChanged: StorageChangedEvent = new FakeEvent();
    return { local: new FakeStorageArea(onChanged), onChanged };
  })();

  readonly tabs = {
    query: (queryInfo: { active?: boolean; currentWindow?: boolean } = {}): Promise<FakeTab[]> =>
      Promise.resolve(
        this.#tabs
          .filter(
            (tab) => queryInfo.active === undefined || Boolean(tab.active) === queryInfo.active,
          )
          .map((tab) => ({ ...tab })),
      ),

    get: (tabId: number): Promise<FakeTab> => {
      const tab = this.#tabs.find((candidate) => candidate.id === tabId);
      return tab
        ? Promise.resolve({ ...tab })
        : Promise.reject(new Error(`No tab with id: ${String(tabId)}.`));
    },

    /**
     * Connects to the content script, represented by `runtime.onConnect` listeners registered in
     * the same test. With no listener, the port disconnects with "Receiving end does not exist".
     */
    connect: (_tabId: number, connectInfo: { name?: string; frameId?: number } = {}): FakePort => {
      const [popupEnd, contentEnd] = FakePort.pair(connectInfo.name ?? '');
      if (this.runtime.onConnect.hasListeners()) {
        queueMicrotask(() => {
          this.runtime.onConnect.dispatch(contentEnd);
        });
      } else {
        queueMicrotask(() => {
          this.runtime.lastError = { message: NO_RECEIVER };
          popupEnd.onDisconnect.dispatch(popupEnd);
          this.runtime.lastError = undefined;
        });
      }
      return popupEnd;
    },

    /** Test control: the browser's open tabs. */
    setTabs: (tabs: FakeTab[]): void => {
      this.#tabs = tabs.map((tab) => ({ ...tab }));
    },
  };

  #tabs: FakeTab[] = [];
}

let current = new FakeChrome();

/** Installs a fresh fake as the global `chrome` and returns it. */
export function installFakeChrome(): FakeChrome {
  current = new FakeChrome();
  vi.stubGlobal('chrome', current);
  return current;
}

/** Starts the next test with empty storage, no tabs, and no listeners. */
export function resetFakeChrome(): FakeChrome {
  return installFakeChrome();
}

/** The fake currently installed as `chrome`, for its test controls. */
export function getFakeChrome(): FakeChrome {
  return current;
}

/** Makes the next `chrome.storage.local.set` reject, to test write-failure handling. */
export function failNextSet(error: Error): void {
  current.storage.local.failNextSet(error);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
