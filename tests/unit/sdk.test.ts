import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChipsSDK, SDKState } from '../../src/sdk';
import { ChipsError, ErrorCodes } from '../../src/core';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  // 测试辅助方法
  triggerOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  triggerMessage(data: string): void {
    this.onmessage?.({ data });
  }

  triggerError(): void {
    this.onerror?.(new Event('error'));
  }

  triggerClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

describe('ChipsSDK', () => {
  let sdk: ChipsSDK;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    vi.stubGlobal('WebSocket', vi.fn(() => mockWs));
  });

  afterEach(() => {
    if (sdk) {
      sdk.destroy();
    }
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('应该创建 SDK 实例', () => {
      sdk = new ChipsSDK();
      expect(sdk).toBeInstanceOf(ChipsSDK);
    });

    it('应该使用默认配置', () => {
      sdk = new ChipsSDK();
      expect(sdk.state).toBe('idle');
      expect(sdk.isReady).toBe(false);
    });

    it('应该使用自定义配置', () => {
      sdk = new ChipsSDK({
        connector: { url: 'ws://custom:8080' },
        debug: true,
      });
      expect(sdk).toBeInstanceOf(ChipsSDK);
    });

    it('初始状态应该是 idle', () => {
      sdk = new ChipsSDK();
      expect(sdk.state).toBe('idle');
    });

    it('应该有版本信息', () => {
      expect(ChipsSDK.VERSION).toBeDefined();
      expect(ChipsSDK.VERSION.sdk).toBe('1.0.0');
      expect(ChipsSDK.VERSION.protocol).toBe('1.0.0');
      expect(ChipsSDK.VERSION.buildTime).toBeDefined();
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      sdk = new ChipsSDK({ connector: { reconnect: false } });
    });

    it('应该成功初始化', async () => {
      const initPromise = sdk.initialize();
      mockWs.triggerOpen();

      await expect(initPromise).resolves.toBeUndefined();
      expect(sdk.state).toBe('ready');
      expect(sdk.isReady).toBe(true);
    });

    it('应该在初始化完成后设置状态为 ready', async () => {
      expect(sdk.state).toBe('idle');

      const initPromise = sdk.initialize();
      expect(sdk.state).toBe('initializing');

      mockWs.triggerOpen();
      await initPromise;

      expect(sdk.state).toBe('ready');
    });

    it('应该在已就绪时跳过重复初始化', async () => {
      const initPromise = sdk.initialize();
      mockWs.triggerOpen();
      await initPromise;

      // 再次初始化应该立即返回
      await expect(sdk.initialize()).resolves.toBeUndefined();
      expect(sdk.state).toBe('ready');
    });

    it('应该在正在初始化时抛出错误', async () => {
      sdk.initialize(); // 不等待

      await expect(sdk.initialize()).rejects.toThrow('SDK is already initializing');
    });

    it('应该在已销毁时抛出错误', async () => {
      sdk.destroy();

      await expect(sdk.initialize()).rejects.toThrow('SDK has been destroyed');
    });

    it('应该在连接失败时设置状态为 error', async () => {
      const initPromise = sdk.initialize();
      mockWs.triggerError();

      await expect(initPromise).rejects.toThrow();
      expect(sdk.state).toBe('error');
    });

    it('应该在禁用自动连接时跳过连接', async () => {
      sdk = new ChipsSDK({ autoConnect: false });
      await sdk.initialize();

      expect(sdk.state).toBe('ready');
      expect(sdk.isConnected).toBe(false);
    });

    it('应该触发 sdk:ready 事件', async () => {
      const readyHandler = vi.fn();
      sdk.on('sdk:ready', readyHandler);

      const initPromise = sdk.initialize();
      mockWs.triggerOpen();
      await initPromise;

      // 等待事件处理
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(readyHandler).toHaveBeenCalled();
    });

    it('应该在初始化失败时触发 sdk:error 事件', async () => {
      const errorHandler = vi.fn();
      sdk.on('sdk:error', errorHandler);

      const initPromise = sdk.initialize();
      mockWs.triggerError();

      await initPromise.catch(() => {});

      // 等待事件处理
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    beforeEach(async () => {
      sdk = new ChipsSDK({ connector: { reconnect: false } });
      const initPromise = sdk.initialize();
      mockWs.triggerOpen();
      await initPromise;
    });

    it('应该销毁 SDK', () => {
      sdk.destroy();
      expect(sdk.state).toBe('destroyed');
    });

    it('应该断开连接', () => {
      sdk.destroy();
      expect(mockWs.close).toHaveBeenCalled();
    });

    it('应该在已销毁时跳过重复销毁', () => {
      sdk.destroy();
      expect(sdk.state).toBe('destroyed');

      // 再次销毁不应抛出错误
      expect(() => sdk.destroy()).not.toThrow();
      expect(sdk.state).toBe('destroyed');
    });

    it('应该触发 sdk:destroyed 事件', () => {
      const destroyedHandler = vi.fn();
      sdk.on('sdk:destroyed', destroyedHandler);

      sdk.destroy();

      expect(destroyedHandler).toHaveBeenCalled();
    });
  });

  describe('connect/disconnect', () => {
    beforeEach(() => {
      sdk = new ChipsSDK({ autoConnect: false, connector: { reconnect: false } });
    });

    it('应该手动连接', async () => {
      const connectPromise = sdk.connect();
      mockWs.triggerOpen();

      await connectPromise;
      expect(sdk.isConnected).toBe(true);
    });

    it('应该在已连接时跳过重复连接', async () => {
      const connectPromise = sdk.connect();
      mockWs.triggerOpen();
      await connectPromise;

      // 再次连接应该立即返回
      await expect(sdk.connect()).resolves.toBeUndefined();
    });

    it('应该手动断开连接', async () => {
      const connectPromise = sdk.connect();
      mockWs.triggerOpen();
      await connectPromise;

      sdk.disconnect();
      expect(sdk.isConnected).toBe(false);
    });

    it('应该在连接时触发 sdk:connected 事件', async () => {
      const connectedHandler = vi.fn();
      sdk.on('sdk:connected', connectedHandler);

      const connectPromise = sdk.connect();
      mockWs.triggerOpen();
      await connectPromise;

      // 等待事件处理
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(connectedHandler).toHaveBeenCalled();
    });

    it('应该在断开时触发 sdk:disconnected 事件', async () => {
      const connectPromise = sdk.connect();
      mockWs.triggerOpen();
      await connectPromise;

      const disconnectedHandler = vi.fn();
      sdk.on('sdk:disconnected', disconnectedHandler);

      sdk.disconnect();

      expect(disconnectedHandler).toHaveBeenCalled();
    });
  });

  describe('状态访问器', () => {
    beforeEach(() => {
      sdk = new ChipsSDK({ connector: { reconnect: false } });
    });

    it('state 应该返回当前状态', () => {
      expect(sdk.state).toBe('idle');
    });

    it('isReady 应该返回是否就绪', async () => {
      expect(sdk.isReady).toBe(false);

      const initPromise = sdk.initialize();
      mockWs.triggerOpen();
      await initPromise;

      expect(sdk.isReady).toBe(true);
    });

    it('isConnected 应该返回是否已连接', async () => {
      expect(sdk.isConnected).toBe(false);

      const initPromise = sdk.initialize();
      mockWs.triggerOpen();
      await initPromise;

      expect(sdk.isConnected).toBe(true);
    });
  });

  describe('核心组件访问器', () => {
    beforeEach(() => {
      sdk = new ChipsSDK({ connector: { reconnect: false } });
    });

    it('connector 应该返回连接器实例', () => {
      expect(sdk.connector).toBeDefined();
    });

    it('logger 应该返回日志实例', () => {
      expect(sdk.logger).toBeDefined();
    });

    it('config 应该返回配置管理器', () => {
      expect(sdk.config).toBeDefined();
    });

    it('events 应该返回事件总线', () => {
      expect(sdk.events).toBeDefined();
    });

    it('i18n 应该返回多语言管理器', () => {
      expect(sdk.i18n).toBeDefined();
    });
  });

  describe('功能模块访问器', () => {
    beforeEach(async () => {
      sdk = new ChipsSDK({ connector: { reconnect: false } });
      const initPromise = sdk.initialize();
      mockWs.triggerOpen();
      await initPromise;
    });

    it('file 应该返回文件 API', () => {
      expect(sdk.file).toBeDefined();
    });

    it('card 应该返回卡片 API', () => {
      expect(sdk.card).toBeDefined();
    });

    it('box 应该返回箱子 API', () => {
      expect(sdk.box).toBeDefined();
    });

    it('plugins 应该返回插件管理器', () => {
      expect(sdk.plugins).toBeDefined();
    });

    it('themes 应该返回主题管理器', () => {
      expect(sdk.themes).toBeDefined();
    });

    it('renderer 应该返回渲染引擎', () => {
      expect(sdk.renderer).toBeDefined();
    });

    it('resources 应该返回资源管理器', () => {
      expect(sdk.resources).toBeDefined();
    });
  });

  describe('未初始化时访问模块应抛出错误', () => {
    beforeEach(() => {
      sdk = new ChipsSDK({ connector: { reconnect: false } });
    });

    it('访问 file 应该抛出错误', () => {
      expect(() => sdk.file).toThrow(ChipsError);
      expect(() => sdk.file).toThrow('SDK is not initialized');
    });

    it('访问 card 应该抛出错误', () => {
      expect(() => sdk.card).toThrow(ChipsError);
      expect(() => sdk.card).toThrow('SDK is not initialized');
    });

    it('访问 box 应该抛出错误', () => {
      expect(() => sdk.box).toThrow(ChipsError);
      expect(() => sdk.box).toThrow('SDK is not initialized');
    });

    it('访问 plugins 应该抛出错误', () => {
      expect(() => sdk.plugins).toThrow(ChipsError);
      expect(() => sdk.plugins).toThrow('SDK is not initialized');
    });

    it('访问 themes 应该抛出错误', () => {
      expect(() => sdk.themes).toThrow(ChipsError);
      expect(() => sdk.themes).toThrow('SDK is not initialized');
    });

    it('访问 renderer 应该抛出错误', () => {
      expect(() => sdk.renderer).toThrow(ChipsError);
      expect(() => sdk.renderer).toThrow('SDK is not initialized');
    });

    it('访问 resources 应该抛出错误', () => {
      expect(() => sdk.resources).toThrow(ChipsError);
      expect(() => sdk.resources).toThrow('SDK is not initialized');
    });
  });

  describe('便捷方法', () => {
    describe('setLocale', () => {
      beforeEach(() => {
        sdk = new ChipsSDK({ connector: { reconnect: false } });
      });

      it('应该设置语言', () => {
        sdk.setLocale('en-US');
        // setLocale 不需要初始化即可调用
        expect(() => sdk.setLocale('zh-CN')).not.toThrow();
      });
    });

    describe('t (翻译)', () => {
      beforeEach(() => {
        sdk = new ChipsSDK({ connector: { reconnect: false } });
      });

      it('应该翻译文本', () => {
        const result = sdk.t('test.key');
        // 如果没有翻译，返回原始 key
        expect(result).toBeDefined();
      });

      it('应该支持插值参数', () => {
        const result = sdk.t('test.key', { name: 'value' });
        expect(result).toBeDefined();
      });
    });

    describe('on/off (事件)', () => {
      beforeEach(() => {
        sdk = new ChipsSDK({ connector: { reconnect: false } });
      });

      it('on 应该订阅事件', () => {
        const handler = vi.fn();
        const handlerId = sdk.on('test:event', handler);
        expect(handlerId).toBeDefined();
        expect(typeof handlerId).toBe('string');
      });

      it('off 应该取消订阅', () => {
        const handler = vi.fn();
        const handlerId = sdk.on('test:event', handler);
        expect(() => sdk.off('test:event', handlerId)).not.toThrow();
      });

      it('off 应该取消所有订阅', () => {
        const handler = vi.fn();
        sdk.on('test:event', handler);
        expect(() => sdk.off('test:event')).not.toThrow();
      });
    });

    describe('setTheme', () => {
      beforeEach(async () => {
        sdk = new ChipsSDK({ connector: { reconnect: false } });
        const initPromise = sdk.initialize();
        mockWs.triggerOpen();
        await initPromise;
      });

      it('应该设置已注册的主题', () => {
        // 设置默认主题应该不会抛出错误
        expect(() => sdk.setTheme('chips-official.default-theme')).not.toThrow();
      });

      it('设置不存在的主题不应该抛出错误（静默失败）', () => {
        // ThemeManager 对不存在的主题是静默失败（仅记录警告日志）
        expect(() => sdk.setTheme('non-existent-theme')).not.toThrow();
      });
    });

    describe('registerPlugin', () => {
      beforeEach(async () => {
        sdk = new ChipsSDK({ connector: { reconnect: false } });
        const initPromise = sdk.initialize();
        mockWs.triggerOpen();
        await initPromise;
      });

      it('应该注册插件', () => {
        const mockPlugin = {
          id: 'test-plugin',
          metadata: {
            id: 'test-plugin',
            name: '测试插件',
            version: '1.0.0',
            description: 'Test plugin',
            chipStandardsVersion: '1.0.0',
          },
          activate: vi.fn(),
          deactivate: vi.fn(),
        };

        expect(() => sdk.registerPlugin(mockPlugin)).not.toThrow();
      });

      it('未初始化时注册插件应该抛出错误', () => {
        const uninitializedSdk = new ChipsSDK({ connector: { reconnect: false } });
        const mockPlugin = {
          id: 'test-plugin',
          metadata: {
            id: 'test-plugin',
            name: '测试插件',
            version: '1.0.0',
            description: 'Test plugin',
            chipStandardsVersion: '1.0.0',
          },
          activate: vi.fn(),
          deactivate: vi.fn(),
        };

        expect(() => uninitializedSdk.registerPlugin(mockPlugin)).toThrow('SDK is not initialized');
      });
    });

    describe('registerTheme', () => {
      beforeEach(async () => {
        sdk = new ChipsSDK({ connector: { reconnect: false } });
        const initPromise = sdk.initialize();
        mockWs.triggerOpen();
        await initPromise;
      });

      // 创建完整的 Theme 对象用于测试
      const createMockTheme = (id: string) => ({
        metadata: {
          id,
          name: '测试主题',
          type: 'light' as const,
          version: '1.0.0',
          description: 'Test theme',
        },
        colors: {
          primary: '#3b82f6',
          secondary: '#6366f1',
          accent: '#f59e0b',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textSecondary: '#64748b',
          border: '#e2e8f0',
          error: '#ef4444',
          warning: '#f59e0b',
          success: '#22c55e',
          info: '#3b82f6',
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          xxl: '3rem',
        },
        radius: {
          none: '0',
          sm: '0.25rem',
          md: '0.5rem',
          lg: '0.75rem',
          full: '9999px',
        },
        shadow: {
          none: 'none',
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        },
        typography: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontFamilyMono: 'ui-monospace, monospace',
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            xxl: '1.5rem',
          },
          lineHeight: {
            tight: '1.25',
            normal: '1.5',
            relaxed: '1.75',
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

      it('应该注册主题', () => {
        const mockTheme = createMockTheme('test-theme');
        expect(() => sdk.registerTheme(mockTheme)).not.toThrow();
      });

      it('注册后应该能设置主题', () => {
        const mockTheme = createMockTheme('test-theme');
        sdk.registerTheme(mockTheme);
        expect(() => sdk.setTheme('test-theme')).not.toThrow();
      });
    });
  });

  describe('错误处理', () => {
    it('初始化错误应该包含正确的错误码', async () => {
      sdk = new ChipsSDK({ connector: { reconnect: false } });
      sdk.destroy();

      try {
        await sdk.initialize();
      } catch (error) {
        expect(error).toBeInstanceOf(ChipsError);
        expect((error as ChipsError).code).toBe(ErrorCodes.SDK_DESTROYED);
      }
    });

    it('正在初始化错误应该包含正确的错误码', async () => {
      sdk = new ChipsSDK({ connector: { reconnect: false } });
      sdk.initialize(); // 不等待

      try {
        await sdk.initialize();
      } catch (error) {
        expect(error).toBeInstanceOf(ChipsError);
        expect((error as ChipsError).code).toBe(ErrorCodes.SDK_INITIALIZING);
      }
    });

    it('未初始化错误应该包含正确的错误码', () => {
      sdk = new ChipsSDK({ connector: { reconnect: false } });

      try {
        // 访问需要初始化的模块
        sdk.file;
      } catch (error) {
        expect(error).toBeInstanceOf(ChipsError);
        expect((error as ChipsError).code).toBe(ErrorCodes.SDK_NOT_INITIALIZED);
      }
    });
  });

  describe('状态转换', () => {
    beforeEach(() => {
      sdk = new ChipsSDK({ connector: { reconnect: false } });
    });

    it('应该正确转换 idle -> initializing -> ready', async () => {
      const states: SDKState[] = [];

      // 记录初始状态
      states.push(sdk.state);
      expect(states[0]).toBe('idle');

      // 开始初始化
      const initPromise = sdk.initialize();
      states.push(sdk.state);
      expect(states[1]).toBe('initializing');

      // 完成初始化
      mockWs.triggerOpen();
      await initPromise;
      states.push(sdk.state);
      expect(states[2]).toBe('ready');
    });

    it('应该正确转换 idle -> initializing -> error', async () => {
      const states: SDKState[] = [];

      states.push(sdk.state);
      expect(states[0]).toBe('idle');

      const initPromise = sdk.initialize();
      states.push(sdk.state);
      expect(states[1]).toBe('initializing');

      mockWs.triggerError();

      try {
        await initPromise;
      } catch {
        states.push(sdk.state);
        expect(states[2]).toBe('error');
      }
    });

    it('应该正确转换 ready -> destroyed', async () => {
      const initPromise = sdk.initialize();
      mockWs.triggerOpen();
      await initPromise;

      expect(sdk.state).toBe('ready');

      sdk.destroy();
      expect(sdk.state).toBe('destroyed');
    });

    it('应该正确转换 idle -> destroyed', () => {
      expect(sdk.state).toBe('idle');
      sdk.destroy();
      expect(sdk.state).toBe('destroyed');
    });
  });

  describe('调试模式', () => {
    it('启用调试模式应该设置配置', () => {
      sdk = new ChipsSDK({ debug: true });
      expect(sdk.config.get('sdk.debug')).toBe(true);
    });

    it('不启用调试模式时配置不应该设置为 true', () => {
      sdk = new ChipsSDK({ debug: false });
      expect(sdk.config.get('sdk.debug')).not.toBe(true);
    });

    it('不提供 debug 选项时配置不应该设置为 true', () => {
      sdk = new ChipsSDK();
      expect(sdk.config.get('sdk.debug')).not.toBe(true);
    });
  });
});
