import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StatusMessage } from '../../shared/messages';
import { STATUS_PORT_NAME } from '../../shared/messages';
import { getFakeChrome, type FakePort } from '../../../tests/helpers/fakeChrome';
import { usePageStatus } from './usePageStatus';

const ALIEXPRESS = 'https://www.aliexpress.com/w/wholesale-phone-case.html';
const startUrl = location.href;

const status = (hiddenCount: number): StatusMessage => ({
  type: 'status',
  hiddenCount,
  hiddenByBadge: { choice: hiddenCount, brandPlus: 0 },
  revealed: false,
});

function activeTab(url: string | undefined, id = 7): void {
  getFakeChrome().tabs.setTabs([
    url === undefined ? { id, active: true } : { id, url, active: true },
  ]);
}

/** Stands in for the content script, answering with `first` on connect. */
function contentScript(first?: unknown): { port: () => FakePort | null } {
  let connected: FakePort | null = null;
  getFakeChrome().runtime.onConnect.addListener((port) => {
    connected = port;
    if (first !== undefined) port.postMessage(first);
  });
  return { port: () => connected };
}

describe('usePageStatus', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    history.replaceState(null, '', startUrl);
  });

  it('starts as loading', async () => {
    activeTab(ALIEXPRESS);
    contentScript(status(1));

    const { result } = renderHook(() => usePageStatus());

    expect(result.current).toEqual({ kind: 'loading' });
    await waitFor(() => {
      expect(result.current.kind).toBe('active');
    });
  });

  it('asks for the active tab in the current window', async () => {
    activeTab(ALIEXPRESS);
    contentScript(status(1));
    const query = vi.spyOn(getFakeChrome().tabs, 'query');

    const { result } = renderHook(() => usePageStatus());
    await waitFor(() => {
      expect(result.current.kind).toBe('active');
    });

    expect(query).toHaveBeenCalledWith({ active: true, currentWindow: true });
  });

  it('uses the ?tabId= test seam when present', async () => {
    history.replaceState(null, '', '?tabId=42');
    getFakeChrome().tabs.setTabs([
      { id: 7, url: 'https://example.com/', active: true },
      { id: 42, url: ALIEXPRESS },
    ]);
    contentScript(status(1));
    const connect = vi.spyOn(getFakeChrome().tabs, 'connect');

    const { result } = renderHook(() => usePageStatus());
    await waitFor(() => {
      expect(result.current.kind).toBe('active');
    });

    expect(connect).toHaveBeenCalledWith(42, { name: STATUS_PORT_NAME, frameId: 0 });
  });

  it.each([
    ['another site', 'https://example.com/'],
    ['aliexpress.ru, which is out of scope', 'https://aliexpress.ru/wholesale'],
    ['a site whose URL the browser withholds', undefined],
  ])('reports not-aliexpress without connecting on %s', async (_name, url) => {
    activeTab(url);
    const connect = vi.spyOn(getFakeChrome().tabs, 'connect');

    const { result } = renderHook(() => usePageStatus());

    await waitFor(() => {
      expect(result.current).toEqual({ kind: 'not-aliexpress' });
    });
    expect(connect).not.toHaveBeenCalled();
  });

  it('reports not-aliexpress when there is no active tab', async () => {
    const { result } = renderHook(() => usePageStatus());

    await waitFor(() => {
      expect(result.current).toEqual({ kind: 'not-aliexpress' });
    });
  });

  it('reports not-aliexpress when the tab cannot be read', async () => {
    history.replaceState(null, '', '?tabId=404');

    const { result } = renderHook(() => usePageStatus());

    await waitFor(() => {
      expect(result.current).toEqual({ kind: 'not-aliexpress' });
    });
  });

  it.each([
    'https://www.aliexpress.com/',
    'https://pl.aliexpress.com/w/wholesale-etui.html',
    'https://www.aliexpress.us/',
  ])('connects to the content script on %s', async (url) => {
    activeTab(url);
    contentScript(status(3));
    const connect = vi.spyOn(getFakeChrome().tabs, 'connect');

    const { result } = renderHook(() => usePageStatus());

    await waitFor(() => {
      expect(result.current).toEqual({ kind: 'active', status: status(3) });
    });
    expect(connect).toHaveBeenCalledWith(7, { name: STATUS_PORT_NAME, frameId: 0 });
  });

  it('updates live as new status messages arrive', async () => {
    activeTab(ALIEXPRESS);
    const content = contentScript(status(3));
    const { result } = renderHook(() => usePageStatus());
    await waitFor(() => {
      expect(result.current.kind).toBe('active');
    });

    act(() => {
      content.port()?.postMessage(status(9));
    });

    await waitFor(() => {
      expect(result.current).toEqual({ kind: 'active', status: status(9) });
    });
  });

  it('ignores unknown messages', async () => {
    activeTab(ALIEXPRESS);
    const content = contentScript({ type: 'something-new' });
    const { result } = renderHook(() => usePageStatus());
    await waitFor(() => {
      expect(content.port()).not.toBeNull();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toEqual({ kind: 'loading' });
  });

  it('needs a reload when no content script answers the connection', async () => {
    activeTab(ALIEXPRESS);

    const { result } = renderHook(() => usePageStatus());

    await waitFor(() => {
      expect(result.current).toEqual({ kind: 'reload-needed' });
    });
  });

  it('needs a reload when no status arrives within 1 s', async () => {
    vi.useFakeTimers();
    activeTab(ALIEXPRESS);
    contentScript();
    const { result } = renderHook(() => usePageStatus());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(result.current).toEqual({ kind: 'loading' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current).toEqual({ kind: 'reload-needed' });
  });

  it('does not time out once a status has arrived', async () => {
    vi.useFakeTimers();
    activeTab(ALIEXPRESS);
    contentScript(status(3));
    const { result } = renderHook(() => usePageStatus());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current).toEqual({ kind: 'active', status: status(3) });
  });

  it('keeps the last status when the port closes normally after one', async () => {
    activeTab(ALIEXPRESS);
    const content = contentScript(status(3));
    const { result } = renderHook(() => usePageStatus());
    await waitFor(() => {
      expect(result.current.kind).toBe('active');
    });

    act(() => {
      content.port()?.disconnect();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toEqual({ kind: 'active', status: status(3) });
  });

  it('disconnects the port on unmount', async () => {
    activeTab(ALIEXPRESS);
    const content = contentScript(status(3));
    const { result, unmount } = renderHook(() => usePageStatus());
    await waitFor(() => {
      expect(result.current.kind).toBe('active');
    });
    const disconnected = vi.fn();
    content.port()?.onDisconnect.addListener(disconnected);

    unmount();

    await waitFor(() => {
      expect(disconnected).toHaveBeenCalledOnce();
    });
  });

  it('does not connect if unmounted while still finding the tab', async () => {
    activeTab(ALIEXPRESS);
    const connect = vi.spyOn(getFakeChrome().tabs, 'connect');

    const { unmount } = renderHook(() => usePageStatus());
    unmount();
    await act(async () => {
      await Promise.resolve();
    });

    expect(connect).not.toHaveBeenCalled();
  });
});
