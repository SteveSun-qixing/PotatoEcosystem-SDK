import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BridgeClient } from '../../../src/bridge';
import { ConnectionError, TimeoutError } from '../../../src/core';

interface MockBridge {
  invoke: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  once?: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
}

function createMockBridge(includeOnce = true): MockBridge {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();

  const on = vi.fn((event: string, callback: (payload: unknown) => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(callback);

    return () => {
      listeners.get(event)?.delete(callback);
    };
  });

  const emit = vi.fn((event: string, payload?: unknown) => {
    const handlers = listeners.get(event);
    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  });

  const invoke = vi.fn();

  const mockBridge: MockBridge = {
    invoke,
    on,
    emit,
  };

  if (includeOnce) {
    mockBridge.once = vi.fn((event: string, callback: (payload: unknown) => void) => {
      const unsubscribe = on(event, (payload) => {
        unsubscribe();
        callback(payload);
      });
      return unsubscribe;
    });
  }

  return mockBridge;
}

describe('BridgeClient', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should connect with injected bridge', async () => {
    const bridge = createMockBridge();
    const client = new BridgeClient({ bridge });

    await client.connect();

    expect(client.isConnected).toBe(true);
  });

  it('should connect via window.chips when bridge option is omitted', async () => {
    const bridge = createMockBridge();
    vi.stubGlobal('window', { chips: bridge });

    const client = new BridgeClient();
    await client.connect();

    expect(client.isConnected).toBe(true);
  });

  it('should throw connection error when bridge is unavailable', async () => {
    const client = new BridgeClient();

    await expect(client.connect()).rejects.toBeInstanceOf(ConnectionError);
  });

  it('should invoke namespace action with params', async () => {
    const bridge = createMockBridge();
    bridge.invoke.mockResolvedValue({ value: 1 });

    const client = new BridgeClient({ bridge });
    await client.connect();

    const data = await client.invoke<{ value: number }>('card', 'read', { path: '/a.card' });

    expect(data).toEqual({ value: 1 });
    expect(bridge.invoke).toHaveBeenCalledWith('card', 'read', { path: '/a.card' });
  });

  it('should return success response in request wrapper', async () => {
    const bridge = createMockBridge();
    bridge.invoke.mockResolvedValue({ exists: true });

    const client = new BridgeClient({ bridge });
    await client.connect();

    const response = await client.request<{ exists: boolean }>({
      service: 'file',
      method: 'exists',
      payload: { path: '/tmp/a.txt' },
    });

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ exists: true });
  });

  it('should return failed response when invoke rejects', async () => {
    const bridge = createMockBridge();
    bridge.invoke.mockRejectedValue({ code: 'PERMISSION_DENIED', message: 'No permission' });

    const client = new BridgeClient({ bridge });
    await client.connect();

    const response = await client.request({
      service: 'file',
      method: 'delete',
      payload: { path: '/tmp/a.txt' },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('No permission');
  });

  it('should subscribe and unsubscribe events', async () => {
    const bridge = createMockBridge();
    const handler = vi.fn();

    const client = new BridgeClient({ bridge });
    await client.connect();

    const unsubscribe = client.on('theme.changed', handler);
    bridge.emit('theme.changed', { themeId: 'chips.theme.default' });
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();
    bridge.emit('theme.changed', { themeId: 'chips.theme.dark' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support once subscription when bridge.once exists', async () => {
    const bridge = createMockBridge(true);
    const handler = vi.fn();

    const client = new BridgeClient({ bridge });
    await client.connect();

    client.once('system.ready', handler);
    bridge.emit('system.ready', {});
    bridge.emit('system.ready', {});

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should fallback once implementation when bridge.once is absent', async () => {
    const bridge = createMockBridge(false);
    const handler = vi.fn();

    const client = new BridgeClient({ bridge });
    await client.connect();

    client.once('system.ready', handler);
    bridge.emit('system.ready', {});
    bridge.emit('system.ready', {});

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should timeout invoke request', async () => {
    const bridge = createMockBridge();
    bridge.invoke.mockImplementation(() => new Promise(() => {}));

    const client = new BridgeClient({ bridge, timeout: 10 });
    await client.connect();

    await expect(client.invoke('file', 'read', { path: '/never' })).rejects.toBeInstanceOf(
      TimeoutError
    );
  });

  it('should publish event through emit', async () => {
    const bridge = createMockBridge();
    const client = new BridgeClient({ bridge });
    await client.connect();

    client.publish('custom.event', { foo: 'bar' });

    expect(bridge.emit).toHaveBeenCalledWith('custom.event', { foo: 'bar' });
  });
});
