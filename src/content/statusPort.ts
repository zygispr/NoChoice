import { STATUS_PORT_NAME, type StatusMessage } from '../shared/messages';

/**
 * Answers the popup's port with this page's status (contracts/messaging.md). Returns
 * `notifyChanged`, to call whenever the status may have changed. It coalesces to one update per
 * animation frame and does nothing while no popup is open, so browsing pays nothing for it.
 */
export function startStatusPort(getStatus: () => StatusMessage): () => void {
  const lastSent = new Map<chrome.runtime.Port, string>();
  let frameRequested = false;

  const send = (port: chrome.runtime.Port, status: StatusMessage): void => {
    const serialised = JSON.stringify(status);
    if (lastSent.get(port) === serialised) return;
    port.postMessage(status);
    lastSent.set(port, serialised);
  };

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== STATUS_PORT_NAME) return;
    port.onDisconnect.addListener(() => {
      lastSent.delete(port);
    });
    send(port, getStatus());
  });

  return () => {
    if (frameRequested || lastSent.size === 0) return;
    frameRequested = true;
    requestAnimationFrame(() => {
      frameRequested = false;
      if (lastSent.size === 0) return;
      const status = getStatus();
      for (const port of lastSent.keys()) send(port, status);
    });
  };
}
