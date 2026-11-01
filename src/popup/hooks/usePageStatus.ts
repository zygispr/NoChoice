import { useEffect, useState } from 'react';
import { isSupportedAliExpressUrl } from '../../shared/aliexpressHosts';
import { isStatusMessage, STATUS_PORT_NAME, type StatusMessage } from '../../shared/messages';

const STATUS_TIMEOUT_MS = 1000;

export type PageStatusState =
  | { kind: 'loading' }
  | { kind: 'active'; status: StatusMessage }
  | { kind: 'not-aliexpress' }
  | { kind: 'reload-needed' };

async function findTargetTab(): Promise<chrome.tabs.Tab | undefined> {
  // Test seam: E2E tests open the popup as a page, where the active tab would be the popup itself.
  // It only reads the status of a tab, and does nothing in normal use (plan § Complexity Tracking).
  const tabIdFromUrl = new URLSearchParams(location.search).get('tabId');
  if (tabIdFromUrl !== null) return chrome.tabs.get(Number(tabIdFromUrl));

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return activeTab;
}

/** Follows the current tab's status over a port to its content script (contracts/messaging.md). */
export function usePageStatus(): PageStatusState {
  const [state, setState] = useState<PageStatusState>({ kind: 'loading' });

  useEffect(() => {
    let unmounted = false;
    let port: chrome.runtime.Port | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const connect = (tabId: number) => {
      let received = false;
      timeout = setTimeout(() => {
        setState({ kind: 'reload-needed' });
      }, STATUS_TIMEOUT_MS);

      port = chrome.tabs.connect(tabId, { name: STATUS_PORT_NAME, frameId: 0 });
      port.onMessage.addListener((message: unknown) => {
        if (!isStatusMessage(message)) return;
        received = true;
        clearTimeout(timeout);
        setState({ kind: 'active', status: message });
      });
      port.onDisconnect.addListener(() => {
        // Reading lastError also marks it as handled, so Chrome doesn't log it as unchecked: having
        // no content script to answer is an expected outcome here.
        if (received && chrome.runtime.lastError === undefined) return;
        clearTimeout(timeout);
        setState({ kind: 'reload-needed' });
      });
    };

    findTargetTab()
      .then((tab) => {
        if (unmounted) return;
        if (tab?.id !== undefined && isSupportedAliExpressUrl(tab.url)) connect(tab.id);
        else setState({ kind: 'not-aliexpress' });
      })
      .catch(() => {
        // A tab that can't be read can't be shown to be AliExpress.
        if (!unmounted) setState({ kind: 'not-aliexpress' });
      });

    return () => {
      unmounted = true;
      clearTimeout(timeout);
      port?.disconnect();
    };
  }, []);

  return state;
}
