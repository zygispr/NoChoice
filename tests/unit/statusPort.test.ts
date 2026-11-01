import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startStatusPort } from '../../src/content/statusPort';
import { STATUS_PORT_NAME, type StatusMessage } from '../../src/shared/messages';
import { FakePort, getFakeChrome } from '../helpers/fakeChrome';

const statusWith = (hiddenCount: number): StatusMessage => ({
  type: 'status',
  hiddenCount,
  hiddenByBadge: { choice: hiddenCount, brandPlus: 0 },
  revealed: false,
});

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

describe('startStatusPort', () => {
  let current: StatusMessage;
  const getStatus = vi.fn(() => current);

  function connect(name = STATUS_PORT_NAME): { port: FakePort; received: unknown[] } {
    const port = getFakeChrome().tabs.connect(1, { name });
    const received: unknown[] = [];
    port.onMessage.addListener((message) => received.push(message));
    return { port, received };
  }

  beforeEach(() => {
    current = statusWith(5);
    getStatus.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends one status right after connecting', async () => {
    startStatusPort(getStatus);

    const { received } = connect();
    await nextFrame();

    expect(received).toEqual([statusWith(5)]);
  });

  it('ignores ports with any other name', async () => {
    startStatusPort(getStatus);

    const { received } = connect('nochoice/status@2');
    await nextFrame();

    expect(received).toEqual([]);
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('sends at most one message for several changes within a frame', async () => {
    const notifyChanged = startStatusPort(getStatus);
    const { received } = connect();
    await nextFrame();

    current = statusWith(6);
    notifyChanged();
    current = statusWith(7);
    notifyChanged();
    notifyChanged();
    await nextFrame();

    expect(received).toEqual([statusWith(5), statusWith(7)]);
  });

  it('sends nothing when no field changed', async () => {
    const notifyChanged = startStatusPort(getStatus);
    const { received } = connect();
    await nextFrame();

    current = statusWith(5);
    notifyChanged();
    await nextFrame();

    expect(received).toEqual([statusWith(5)]);
  });

  it('does no work while no popup is connected', async () => {
    const notifyChanged = startStatusPort(getStatus);

    notifyChanged();
    await nextFrame();

    expect(getStatus).not.toHaveBeenCalled();
  });

  it('drops a disconnected port and does not post to it', async () => {
    const notifyChanged = startStatusPort(getStatus);
    const { port } = connect();
    await nextFrame();
    const postMessage = vi.spyOn(FakePort.prototype, 'postMessage');

    port.disconnect();
    await nextFrame();
    current = statusWith(6);
    notifyChanged();
    await nextFrame();

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('keeps each connected popup up to date separately', async () => {
    const notifyChanged = startStatusPort(getStatus);
    const first = connect();
    await nextFrame();
    current = statusWith(6);
    const second = connect();
    await nextFrame();

    notifyChanged();
    await nextFrame();

    expect(first.received).toEqual([statusWith(5), statusWith(6)]);
    expect(second.received).toEqual([statusWith(6)]);
  });
});
