import { describe, expect, it, vi } from 'vitest';
import { FakePort, getFakeChrome } from '../helpers/fakeChrome';

// The fake stands in for the browser in every unit test, so its behaviour must match Chrome's.
describe('fakeChrome', () => {
  it('delivers port messages asynchronously, as copies', async () => {
    const [a, b] = FakePort.pair('test');
    const onMessage = vi.fn();
    b.onMessage.addListener(onMessage);
    const message = { count: 1 };

    a.postMessage(message);
    message.count = 2;
    expect(onMessage).not.toHaveBeenCalled();
    await Promise.resolve();

    expect(onMessage).toHaveBeenCalledExactlyOnceWith({ count: 1 }, b);
  });

  it('fires onDisconnect only on the other end, and refuses to post afterwards', async () => {
    const [a, b] = FakePort.pair('test');
    const onDisconnectA = vi.fn();
    const onDisconnectB = vi.fn();
    a.onDisconnect.addListener(onDisconnectA);
    b.onDisconnect.addListener(onDisconnectB);

    a.disconnect();
    await Promise.resolve();

    expect(onDisconnectA).not.toHaveBeenCalled();
    expect(onDisconnectB).toHaveBeenCalledExactlyOnceWith(b);
    expect(() => {
      b.postMessage('late');
    }).toThrow('disconnected port');
  });

  it('connects a tab port to the content script listening on runtime.onConnect', async () => {
    const onConnect = vi.fn();
    chrome.runtime.onConnect.addListener(onConnect);

    chrome.tabs.connect(7, { name: 'nochoice/status@1', frameId: 0 });
    await Promise.resolve();

    expect(onConnect).toHaveBeenCalledOnce();
    expect(onConnect.mock.calls[0]?.[0]).toMatchObject({ name: 'nochoice/status@1' });
  });

  it('disconnects with "Receiving end does not exist" when no content script listens', async () => {
    const lastErrors: (string | undefined)[] = [];
    const port = chrome.tabs.connect(7, { name: 'nochoice/status@1' });
    port.onDisconnect.addListener(() => lastErrors.push(chrome.runtime.lastError?.message));

    await Promise.resolve();

    expect(lastErrors).toEqual(['Could not establish connection. Receiving end does not exist.']);
    expect(chrome.runtime.lastError).toBeUndefined();
  });

  it('answers tabs.query and tabs.get from the configured tabs', async () => {
    getFakeChrome().tabs.setTabs([
      { id: 1, url: 'https://example.com/' },
      { id: 2, url: 'https://www.aliexpress.com/', active: true },
    ]);

    expect(await chrome.tabs.query({ active: true, currentWindow: true })).toEqual([
      { id: 2, url: 'https://www.aliexpress.com/', active: true },
    ]);
    expect(await chrome.tabs.get(1)).toEqual({ id: 1, url: 'https://example.com/' });
    await expect(chrome.tabs.get(3)).rejects.toThrow('No tab with id: 3.');
  });

  it('starts every test with empty storage', async () => {
    expect(await chrome.storage.local.get(null)).toEqual({});
  });
});
