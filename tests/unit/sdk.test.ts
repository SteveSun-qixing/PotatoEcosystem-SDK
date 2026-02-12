import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChipsSDK, SDKState } from '../../src/sdk';
import { ChipsError, ErrorCodes } from '../../src/core';

interface MockWindowBridge {
  invoke: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
}

function createMockWindowBridge(): MockWindowBridge {
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

  const once = vi.fn((event: string, callback: (payload: unknown) => void) => {
    const unsubscribe = on(event, (payload) => {
      unsubscribe();
      callback(payload);
    });
    return unsubscribe;
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

  return {
    invoke: vi.fn().mockResolvedValue(undefined),
    on,
    once,
    emit,
  };
}

describe('ChipsSDK', () => {
  let sdk: ChipsSDK;
  let mockBridge: MockWindowBridge;

  beforeEach(() => {
    mockBridge = createMockWindowBridge();
    vi.stubGlobal('window', {
      chips: mockBridge,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    if (sdk) {
      sdk.destroy();
    }
    vi.unstubAllGlobals();
  });

  it('should create sdk instance with default state', () => {
    sdk = new ChipsSDK();
    expect(sdk).toBeInstanceOf(ChipsSDK);
    expect(sdk.state).toBe('idle');
    expect(sdk.isReady).toBe(false);
  });

  it('should expose sdk version info', () => {
    expect(ChipsSDK.VERSION.sdk).toBe('1.0.0');
    expect(ChipsSDK.VERSION.protocol).toBe('1.0.0');
    expect(ChipsSDK.VERSION.buildTime).toBeDefined();
  });

  it('should initialize with bridge auto connect', async () => {
    sdk = new ChipsSDK();

    await sdk.initialize();

    expect(sdk.state).toBe('ready');
    expect(sdk.isConnected).toBe(true);
  });

  it('should initialize without auto connect', async () => {
    sdk = new ChipsSDK({ autoConnect: false });

    await sdk.initialize();

    expect(sdk.state).toBe('ready');
    expect(sdk.isConnected).toBe(false);
  });

  it('should emit sdk:ready when initialized', async () => {
    sdk = new ChipsSDK();
    const handler = vi.fn();
    sdk.on('sdk:ready', handler);

    await sdk.initialize();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should set error state when bridge connect fails', async () => {
    vi.stubGlobal('window', { chips: undefined });
    sdk = new ChipsSDK();

    await expect(sdk.initialize()).rejects.toThrow();
    expect(sdk.state).toBe('error');
  });

  it('should emit sdk:error when initialization fails', async () => {
    vi.stubGlobal('window', { chips: undefined });
    sdk = new ChipsSDK();
    const handler = vi.fn();
    sdk.on('sdk:error', handler);

    await sdk.initialize().catch(() => {
      return;
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should throw initializing error when initialize is called twice concurrently', async () => {
    sdk = new ChipsSDK();
    const first = sdk.initialize();

    await expect(sdk.initialize()).rejects.toThrow('SDK is already initializing');

    await first;
  });

  it('should throw destroyed error when initialize after destroy', async () => {
    sdk = new ChipsSDK();
    sdk.destroy();

    await expect(sdk.initialize()).rejects.toBeInstanceOf(ChipsError);
    await expect(sdk.initialize()).rejects.toMatchObject({ code: ErrorCodes.SDK_DESTROYED });
  });

  it('should support manual connect and disconnect', async () => {
    sdk = new ChipsSDK({ autoConnect: false });

    await sdk.connect();
    expect(sdk.isConnected).toBe(true);

    sdk.disconnect();
    expect(sdk.isConnected).toBe(false);
  });

  it('should emit sdk:connected and sdk:disconnected', async () => {
    sdk = new ChipsSDK({ autoConnect: false });

    const connectedHandler = vi.fn();
    const disconnectedHandler = vi.fn();

    sdk.on('sdk:connected', connectedHandler);
    sdk.on('sdk:disconnected', disconnectedHandler);

    await sdk.connect();
    sdk.disconnect();

    expect(connectedHandler).toHaveBeenCalledTimes(1);
    expect(disconnectedHandler).toHaveBeenCalledTimes(1);
  });

  it('should expose bridge and connector alias', async () => {
    sdk = new ChipsSDK({ autoConnect: false });

    expect(sdk.bridge).toBeDefined();
    expect(sdk.connector).toBe(sdk.bridge);
  });

  it('should expose modules after initialization', async () => {
    sdk = new ChipsSDK();
    await sdk.initialize();

    expect(sdk.file).toBeDefined();
    expect(sdk.card).toBeDefined();
    expect(sdk.box).toBeDefined();
    expect(sdk.conversion).toBeDefined();
    expect(sdk.imageViewer).toBeDefined();
    expect(sdk.plugins).toBeDefined();
    expect(sdk.themes).toBeDefined();
    expect(sdk.renderer).toBeDefined();
    expect(sdk.resources).toBeDefined();
  });

  it('should expose composables bundle', async () => {
    sdk = new ChipsSDK();
    await sdk.initialize();

    expect(sdk.composables.useTheme).toBeTypeOf('function');
    expect(sdk.composables.useI18n).toBeTypeOf('function');
    expect(sdk.composables.useCard).toBeTypeOf('function');
    expect(sdk.composables.useConfig).toBeTypeOf('function');
  });

  it('should throw SDK_NOT_INITIALIZED when accessing module before initialize', () => {
    sdk = new ChipsSDK({ autoConnect: false });

    expect(() => sdk.file).toThrow(ChipsError);
    expect(() => sdk.file).toThrow('SDK is not initialized');
  });

  it('should set locale and translate string', () => {
    sdk = new ChipsSDK({ autoConnect: false });

    sdk.setLocale('en-US');
    const result = sdk.t('common.save');

    expect(result).toBe('Save');
  });

  it('should register plugin and theme via shortcut methods', async () => {
    sdk = new ChipsSDK();
    await sdk.initialize();

    sdk.registerPlugin({
      id: 'demo-plugin',
      metadata: {
        id: 'demo-plugin',
        name: 'Demo Plugin',
        version: '1.0.0',
        chipStandardsVersion: '1.0.0',
      },
    });

    sdk.registerTheme({
      metadata: {
        id: 'demo-theme',
        name: 'Demo Theme',
        version: '1.0.0',
        type: 'light',
      },
      colors: {
        primary: '#111111',
        secondary: '#222222',
        accent: '#333333',
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#000000',
        textSecondary: '#666666',
        border: '#dddddd',
        error: '#ff0000',
        warning: '#ffaa00',
        success: '#00aa00',
        info: '#0088ff',
      },
      spacing: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        xxl: '24px',
      },
      radius: {
        none: '0',
        sm: '2px',
        md: '4px',
        lg: '8px',
        full: '9999px',
      },
      shadow: {
        none: 'none',
        sm: '0 1px 2px rgba(0,0,0,0.1)',
        md: '0 2px 4px rgba(0,0,0,0.1)',
        lg: '0 4px 8px rgba(0,0,0,0.1)',
        xl: '0 8px 16px rgba(0,0,0,0.1)',
      },
      typography: {
        fontFamily: 'sans-serif',
        fontFamilyMono: 'monospace',
        fontSize: {
          xs: '12px',
          sm: '14px',
          base: '16px',
          lg: '18px',
          xl: '20px',
          xxl: '24px',
        },
        lineHeight: {
          tight: '1.2',
          normal: '1.5',
          relaxed: '1.8',
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
        },
      },
      animation: {
        duration: {
          fast: '100ms',
          normal: '200ms',
          slow: '300ms',
        },
        easing: {
          default: 'ease',
          in: 'ease-in',
          out: 'ease-out',
          inOut: 'ease-in-out',
        },
      },
    });

    expect(sdk.plugins.get('demo-plugin')).toBeDefined();
    expect(sdk.themes.hasTheme('demo-theme')).toBe(true);
  });

  it('should destroy sdk and emit sdk:destroyed', async () => {
    sdk = new ChipsSDK();
    await sdk.initialize();

    const handler = vi.fn();
    sdk.on('sdk:destroyed', handler);

    sdk.destroy();

    expect(sdk.state).toBe('destroyed');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should maintain expected state transitions', async () => {
    sdk = new ChipsSDK();
    const states: SDKState[] = [sdk.state];

    const initPromise = sdk.initialize();
    states.push(sdk.state);
    await initPromise;
    states.push(sdk.state);

    sdk.destroy();
    states.push(sdk.state);

    expect(states).toEqual(['idle', 'initializing', 'ready', 'destroyed']);
  });
});
