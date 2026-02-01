import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginManager } from '../../../src/plugin/manager';
import { Logger } from '../../../src/logger';
import { EventBus } from '../../../src/event';
import { ConfigManager } from '../../../src/config';
import { PluginError } from '../../../src/core/errors';
import { ErrorCodes } from '../../../src/core/error-codes';
import {
  PluginRegistration,
  PluginMetadata,
  PluginContext,
  RendererDefinition,
} from '../../../src/plugin/types';

// 创建 Mock 对象
function createMockLogger() {
  const mockChild = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createChild: vi.fn().mockReturnThis(),
  };
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createChild: vi.fn().mockReturnValue(mockChild),
  } as unknown as Logger;
}

function createMockEventBus() {
  return {
    on: vi.fn().mockReturnValue('sub-id'),
    off: vi.fn(),
    emit: vi.fn().mockResolvedValue(undefined),
    emitSync: vi.fn(),
  } as unknown as EventBus;
}

function createMockConfig() {
  return {
    get: vi.fn(),
    set: vi.fn(),
  } as unknown as ConfigManager;
}

// 创建测试用插件元数据
function createPluginMetadata(overrides?: Partial<PluginMetadata>): PluginMetadata {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    chipStandardsVersion: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    keywords: ['test', 'plugin'],
    ...overrides,
  };
}

// 创建测试用插件注册信息
function createPluginRegistration(overrides?: Partial<PluginRegistration>): PluginRegistration {
  return {
    id: 'test-plugin',
    metadata: createPluginMetadata(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    defaultConfig: { setting1: 'value1' },
    ...overrides,
  };
}

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockLogger: Logger;
  let mockEventBus: EventBus;
  let mockConfig: ConfigManager;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockEventBus = createMockEventBus();
    mockConfig = createMockConfig();
    pluginManager = new PluginManager(mockLogger, mockEventBus, mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('应该成功注册插件', () => {
      const registration = createPluginRegistration();

      pluginManager.register(registration);

      expect(pluginManager.count).toBe(1);
      expect(pluginManager.get('test-plugin')).toBeDefined();
      expect(pluginManager.getState('test-plugin')).toBe('installed');
    });

    it('应该使用默认配置', () => {
      const registration = createPluginRegistration({
        defaultConfig: { option1: true, option2: 'test' },
      });

      pluginManager.register(registration);

      const plugin = pluginManager.get('test-plugin');
      expect(plugin?.config).toEqual({ option1: true, option2: 'test' });
    });

    it('应该触发 plugin:registered 事件', () => {
      const registration = createPluginRegistration();

      pluginManager.register(registration);

      expect(mockEventBus.emitSync).toHaveBeenCalledWith('plugin:registered', {
        id: 'test-plugin',
        metadata: registration.metadata,
      });
    });

    it('应该抛出错误当插件已存在', () => {
      const registration = createPluginRegistration();
      pluginManager.register(registration);

      expect(() => pluginManager.register(registration)).toThrow(PluginError);
      expect(() => pluginManager.register(registration)).toThrow('already registered');
    });

    it('应该注册多个不同的插件', () => {
      const plugin1 = createPluginRegistration({ id: 'plugin-1' });
      const plugin2 = createPluginRegistration({
        id: 'plugin-2',
        metadata: createPluginMetadata({ id: 'plugin-2', name: 'Plugin 2' }),
      });

      pluginManager.register(plugin1);
      pluginManager.register(plugin2);

      expect(pluginManager.count).toBe(2);
    });
  });

  describe('unregister', () => {
    it('应该成功取消注册已安装的插件', async () => {
      const registration = createPluginRegistration();
      pluginManager.register(registration);

      await pluginManager.unregister('test-plugin');

      expect(pluginManager.count).toBe(0);
      expect(pluginManager.get('test-plugin')).toBeUndefined();
    });

    it('应该在取消注册前禁用已启用的插件', async () => {
      const deactivateFn = vi.fn();
      const registration = createPluginRegistration({ deactivate: deactivateFn });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      await pluginManager.unregister('test-plugin');

      expect(deactivateFn).toHaveBeenCalled();
    });

    it('应该触发 plugin:unregistered 事件', async () => {
      const registration = createPluginRegistration();
      pluginManager.register(registration);

      await pluginManager.unregister('test-plugin');

      expect(mockEventBus.emitSync).toHaveBeenCalledWith('plugin:unregistered', {
        id: 'test-plugin',
      });
    });

    it('应该静默处理不存在的插件', async () => {
      await expect(pluginManager.unregister('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('enable', () => {
    it('应该成功启用插件', async () => {
      const activateFn = vi.fn();
      const registration = createPluginRegistration({ activate: activateFn });
      pluginManager.register(registration);

      await pluginManager.enable('test-plugin');

      expect(activateFn).toHaveBeenCalled();
      expect(pluginManager.getState('test-plugin')).toBe('enabled');
      expect(pluginManager.isEnabled('test-plugin')).toBe(true);
    });

    it('应该传递正确的上下文给 activate 函数', async () => {
      let capturedContext: PluginContext | undefined;
      const activateFn = vi.fn((ctx: PluginContext) => {
        capturedContext = ctx;
      });
      const registration = createPluginRegistration({ activate: activateFn });
      pluginManager.register(registration);

      await pluginManager.enable('test-plugin');

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.pluginId).toBe('test-plugin');
      expect(capturedContext?.sdkVersion).toBe('1.0.0');
      expect(capturedContext?.config).toEqual({ setting1: 'value1' });
      expect(typeof capturedContext?.log).toBe('function');
      expect(typeof capturedContext?.registerCommand).toBe('function');
      expect(typeof capturedContext?.registerRenderer).toBe('function');
    });

    it('应该触发 plugin:enabled 事件', async () => {
      const registration = createPluginRegistration();
      pluginManager.register(registration);

      await pluginManager.enable('test-plugin');

      expect(mockEventBus.emit).toHaveBeenCalledWith('plugin:enabled', { id: 'test-plugin' });
    });

    it('应该抛出错误当插件不存在', async () => {
      await expect(pluginManager.enable('non-existent')).rejects.toThrow(PluginError);
      await expect(pluginManager.enable('non-existent')).rejects.toThrow('not found');
    });

    it('应该静默处理已启用的插件', async () => {
      const activateFn = vi.fn();
      const registration = createPluginRegistration({ activate: activateFn });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      await pluginManager.enable('test-plugin');

      expect(activateFn).toHaveBeenCalledTimes(1);
    });

    it('应该处理激活失败并设置错误状态', async () => {
      const error = new Error('Activation failed');
      const activateFn = vi.fn().mockRejectedValue(error);
      const registration = createPluginRegistration({ activate: activateFn });
      pluginManager.register(registration);

      await expect(pluginManager.enable('test-plugin')).rejects.toThrow(PluginError);
      expect(pluginManager.getState('test-plugin')).toBe('error');
      expect(pluginManager.get('test-plugin')?.error).toBeDefined();
    });
  });

  describe('disable', () => {
    it('应该成功禁用插件', async () => {
      const deactivateFn = vi.fn();
      const registration = createPluginRegistration({ deactivate: deactivateFn });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      await pluginManager.disable('test-plugin');

      expect(deactivateFn).toHaveBeenCalled();
      expect(pluginManager.getState('test-plugin')).toBe('disabled');
      expect(pluginManager.isEnabled('test-plugin')).toBe(false);
    });

    it('应该触发 plugin:disabled 事件', async () => {
      const registration = createPluginRegistration();
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      await pluginManager.disable('test-plugin');

      expect(mockEventBus.emit).toHaveBeenCalledWith('plugin:disabled', { id: 'test-plugin' });
    });

    it('应该静默处理不存在的插件', async () => {
      await expect(pluginManager.disable('non-existent')).resolves.toBeUndefined();
    });

    it('应该静默处理未启用的插件', async () => {
      const deactivateFn = vi.fn();
      const registration = createPluginRegistration({ deactivate: deactivateFn });
      pluginManager.register(registration);

      await pluginManager.disable('test-plugin');

      expect(deactivateFn).not.toHaveBeenCalled();
    });

    it('应该优雅处理 deactivate 错误', async () => {
      const error = new Error('Deactivation failed');
      const deactivateFn = vi.fn().mockRejectedValue(error);
      const registration = createPluginRegistration({ deactivate: deactivateFn });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      await expect(pluginManager.disable('test-plugin')).resolves.toBeUndefined();
    });
  });

  describe('依赖检查', () => {
    it('应该在启用时自动启用依赖插件', async () => {
      const depActivateFn = vi.fn();
      const depPlugin = createPluginRegistration({
        id: 'dep-plugin',
        metadata: createPluginMetadata({ id: 'dep-plugin', name: 'Dependency Plugin' }),
        activate: depActivateFn,
      });

      const mainActivateFn = vi.fn();
      const mainPlugin = createPluginRegistration({
        id: 'main-plugin',
        metadata: createPluginMetadata({
          id: 'main-plugin',
          name: 'Main Plugin',
          dependencies: [{ id: 'dep-plugin', version: '1.0.0' }],
        }),
        activate: mainActivateFn,
      });

      pluginManager.register(depPlugin);
      pluginManager.register(mainPlugin);

      await pluginManager.enable('main-plugin');

      expect(depActivateFn).toHaveBeenCalled();
      expect(mainActivateFn).toHaveBeenCalled();
      expect(pluginManager.isEnabled('dep-plugin')).toBe(true);
      expect(pluginManager.isEnabled('main-plugin')).toBe(true);
    });

    it('应该抛出错误当必需依赖不存在', async () => {
      const mainPlugin = createPluginRegistration({
        id: 'main-plugin',
        metadata: createPluginMetadata({
          id: 'main-plugin',
          dependencies: [{ id: 'missing-dep', version: '1.0.0', optional: false }],
        }),
      });

      pluginManager.register(mainPlugin);

      await expect(pluginManager.enable('main-plugin')).rejects.toThrow(PluginError);
      await expect(pluginManager.enable('main-plugin')).rejects.toThrow('Dependency');
    });

    it('应该忽略可选的缺失依赖', async () => {
      const mainActivateFn = vi.fn();
      const mainPlugin = createPluginRegistration({
        id: 'main-plugin',
        metadata: createPluginMetadata({
          id: 'main-plugin',
          dependencies: [{ id: 'optional-dep', version: '1.0.0', optional: true }],
        }),
        activate: mainActivateFn,
      });

      pluginManager.register(mainPlugin);

      await pluginManager.enable('main-plugin');

      expect(mainActivateFn).toHaveBeenCalled();
      expect(pluginManager.isEnabled('main-plugin')).toBe(true);
    });
  });

  describe('命令注册和执行', () => {
    it('应该通过上下文注册命令', async () => {
      let ctx: PluginContext | undefined;
      const registration = createPluginRegistration({
        activate: (context) => {
          ctx = context;
          context.registerCommand('test-command', () => 'result');
        },
      });
      pluginManager.register(registration);

      await pluginManager.enable('test-plugin');

      expect(ctx).toBeDefined();
      expect(pluginManager.getCommands()).toContain('test-plugin:test-command');
    });

    it('应该执行已注册的命令', async () => {
      const commandHandler = vi.fn().mockReturnValue('command-result');
      const registration = createPluginRegistration({
        activate: (context) => {
          context.registerCommand('my-command', commandHandler);
        },
      });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      const result = await pluginManager.executeCommand('test-plugin:my-command', { arg: 'value' });

      expect(commandHandler).toHaveBeenCalledWith({ arg: 'value' });
      expect(result).toBe('command-result');
    });

    it('应该执行异步命令', async () => {
      const asyncHandler = vi.fn().mockResolvedValue('async-result');
      const registration = createPluginRegistration({
        activate: (context) => {
          context.registerCommand('async-command', asyncHandler);
        },
      });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      const result = await pluginManager.executeCommand('test-plugin:async-command');

      expect(result).toBe('async-result');
    });

    it('应该抛出错误当命令不存在', async () => {
      await expect(pluginManager.executeCommand('non-existent:command')).rejects.toThrow(
        PluginError
      );
    });

    it('应该抛出错误当插件未启用', async () => {
      const registration = createPluginRegistration({
        activate: (context) => {
          context.registerCommand('my-command', () => 'result');
        },
      });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');
      await pluginManager.disable('test-plugin');

      await expect(pluginManager.executeCommand('test-plugin:my-command')).rejects.toThrow(
        PluginError
      );
    });

    it('应该在禁用插件时清理命令', async () => {
      const registration = createPluginRegistration({
        activate: (context) => {
          context.registerCommand('my-command', () => 'result');
        },
      });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      expect(pluginManager.getCommands()).toContain('test-plugin:my-command');

      await pluginManager.disable('test-plugin');

      expect(pluginManager.getCommands()).not.toContain('test-plugin:my-command');
    });
  });

  describe('渲染器注册', () => {
    it('应该通过上下文注册渲染器', async () => {
      const renderer: RendererDefinition = {
        name: 'test-renderer',
        cardTypes: ['custom-card'],
        render: vi.fn(),
      };

      const registration = createPluginRegistration({
        activate: (context) => {
          context.registerRenderer('custom', renderer);
        },
      });
      pluginManager.register(registration);

      await pluginManager.enable('test-plugin');

      expect(pluginManager.getRendererTypes()).toContain('custom-card');
    });

    it('应该获取注册的渲染器', async () => {
      const renderer: RendererDefinition = {
        name: 'my-renderer',
        cardTypes: ['my-type'],
        render: vi.fn(),
      };

      const registration = createPluginRegistration({
        activate: (context) => {
          context.registerRenderer('my', renderer);
        },
      });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      const foundRenderer = pluginManager.getRenderer('my-type');

      expect(foundRenderer).toBeDefined();
      expect(foundRenderer?.name).toBe('my-renderer');
    });

    it('应该返回 undefined 当渲染器不存在', () => {
      const renderer = pluginManager.getRenderer('non-existent-type');
      expect(renderer).toBeUndefined();
    });

    it('应该在禁用插件时清理渲染器', async () => {
      const renderer: RendererDefinition = {
        name: 'test-renderer',
        cardTypes: ['cleanup-type'],
        render: vi.fn(),
      };

      const registration = createPluginRegistration({
        activate: (context) => {
          context.registerRenderer('cleanup', renderer);
        },
      });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      expect(pluginManager.getRendererTypes()).toContain('cleanup-type');

      await pluginManager.disable('test-plugin');

      expect(pluginManager.getRendererTypes()).not.toContain('cleanup-type');
    });
  });

  describe('list', () => {
    beforeEach(() => {
      pluginManager.register(
        createPluginRegistration({
          id: 'plugin-1',
          metadata: createPluginMetadata({
            id: 'plugin-1',
            name: 'Plugin One',
            author: 'Author A',
            keywords: ['utility'],
          }),
        })
      );
      pluginManager.register(
        createPluginRegistration({
          id: 'plugin-2',
          metadata: createPluginMetadata({
            id: 'plugin-2',
            name: 'Plugin Two',
            description: 'A utility plugin',
            author: 'Author B',
          }),
        })
      );
    });

    it('应该返回所有插件', () => {
      const plugins = pluginManager.list();
      expect(plugins).toHaveLength(2);
    });

    it('应该按状态过滤', async () => {
      await pluginManager.enable('plugin-1');

      const enabledPlugins = pluginManager.list({ state: 'enabled' });
      const installedPlugins = pluginManager.list({ state: 'installed' });

      expect(enabledPlugins).toHaveLength(1);
      expect(installedPlugins).toHaveLength(1);
    });

    it('应该按关键词搜索名称', () => {
      const plugins = pluginManager.list({ keyword: 'One' });
      expect(plugins).toHaveLength(1);
      expect(plugins[0].metadata.name).toBe('Plugin One');
    });

    it('应该按关键词搜索描述', () => {
      const plugins = pluginManager.list({ keyword: 'utility' });
      expect(plugins).toHaveLength(2);
    });

    it('应该按作者过滤', () => {
      const plugins = pluginManager.list({ author: 'Author A' });
      expect(plugins).toHaveLength(1);
      expect(plugins[0].metadata.author).toBe('Author A');
    });
  });

  describe('updateConfig', () => {
    it('应该更新插件配置', () => {
      const registration = createPluginRegistration({
        defaultConfig: { option1: 'initial' },
      });
      pluginManager.register(registration);

      pluginManager.updateConfig('test-plugin', { option1: 'updated', option2: 'new' });

      const plugin = pluginManager.get('test-plugin');
      expect(plugin?.config).toEqual({ option1: 'updated', option2: 'new' });
    });

    it('应该触发 plugin:config:updated 事件', () => {
      const registration = createPluginRegistration();
      pluginManager.register(registration);

      pluginManager.updateConfig('test-plugin', { newSetting: true });

      expect(mockEventBus.emitSync).toHaveBeenCalledWith('plugin:config:updated', {
        id: 'test-plugin',
        config: { newSetting: true },
      });
    });

    it('应该抛出错误当插件不存在', () => {
      expect(() => pluginManager.updateConfig('non-existent', {})).toThrow(PluginError);
    });
  });

  describe('属性', () => {
    it('应该返回正确的 count', () => {
      expect(pluginManager.count).toBe(0);

      pluginManager.register(createPluginRegistration({ id: 'plugin-1' }));
      expect(pluginManager.count).toBe(1);

      pluginManager.register(
        createPluginRegistration({
          id: 'plugin-2',
          metadata: createPluginMetadata({ id: 'plugin-2' }),
        })
      );
      expect(pluginManager.count).toBe(2);
    });

    it('应该返回正确的 enabledCount', async () => {
      pluginManager.register(createPluginRegistration({ id: 'plugin-1' }));
      pluginManager.register(
        createPluginRegistration({
          id: 'plugin-2',
          metadata: createPluginMetadata({ id: 'plugin-2' }),
        })
      );

      expect(pluginManager.enabledCount).toBe(0);

      await pluginManager.enable('plugin-1');
      expect(pluginManager.enabledCount).toBe(1);

      await pluginManager.enable('plugin-2');
      expect(pluginManager.enabledCount).toBe(2);
    });
  });

  describe('getMetadata', () => {
    it('应该返回插件元数据', () => {
      const metadata = createPluginMetadata({ description: 'Test description' });
      pluginManager.register(createPluginRegistration({ metadata }));

      const result = pluginManager.getMetadata('test-plugin');

      expect(result).toEqual(metadata);
    });

    it('应该返回 undefined 当插件不存在', () => {
      const result = pluginManager.getMetadata('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('上下文事件方法', () => {
    it('应该通过上下文发送事件', async () => {
      let ctx: PluginContext | undefined;
      const registration = createPluginRegistration({
        activate: (context) => {
          ctx = context;
        },
      });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      ctx?.emit('custom-event', { data: 'test' });

      expect(mockEventBus.emitSync).toHaveBeenCalledWith('plugin:test-plugin:custom-event', {
        data: 'test',
      });
    });

    it('应该通过上下文订阅事件', async () => {
      let ctx: PluginContext | undefined;
      const registration = createPluginRegistration({
        activate: (context) => {
          ctx = context;
        },
      });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      const handler = vi.fn();
      ctx?.on('custom-event', handler);

      expect(mockEventBus.on).toHaveBeenCalledWith('plugin:test-plugin:custom-event', handler);
    });

    it('应该通过上下文记录日志', async () => {
      let ctx: PluginContext | undefined;
      const registration = createPluginRegistration({
        activate: (context) => {
          ctx = context;
        },
      });
      pluginManager.register(registration);
      await pluginManager.enable('test-plugin');

      ctx?.log('Test message', { key: 'value' });

      // 验证日志被调用（通过 mock logger 的子 logger）
      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0]
        .value;
      expect(childLogger.info).toHaveBeenCalled();
    });
  });
});
