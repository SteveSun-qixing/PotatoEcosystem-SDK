/**
 * 插件系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginSystem } from '@/plugin/PluginSystem';
import { Logger } from '@/core/logger';
import { PluginStatus } from '@/types/plugin';
import type { Plugin, PluginContext } from '@/types';

describe('PluginSystem', () => {
  let pluginSystem: PluginSystem;
  let testPlugin: Plugin;

  beforeEach(() => {
    const logger = new Logger({ enableConsole: false });
    pluginSystem = new PluginSystem(logger);

    testPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      install: vi.fn(),
      uninstall: vi.fn(),
    };
  });

  describe('use', () => {
    it('应该安装插件', async () => {
      await pluginSystem.use(testPlugin);

      expect(testPlugin.install).toHaveBeenCalled();
      expect(pluginSystem.hasPlugin('test-plugin')).toBe(true);
      expect(pluginSystem.getPluginStatus('test-plugin')).toBe(
        PluginStatus.Enabled
      );
    });

    it('应该安装多个插件', async () => {
      const plugin2: Plugin = {
        id: 'test-plugin-2',
        name: 'Test Plugin 2',
        version: '1.0.0',
        install: vi.fn(),
      };

      await pluginSystem.use([testPlugin, plugin2]);

      expect(pluginSystem.hasPlugin('test-plugin')).toBe(true);
      expect(pluginSystem.hasPlugin('test-plugin-2')).toBe(true);
    });

    it('应该传递上下文给插件', async () => {
      let receivedContext: PluginContext | null = null;

      const plugin: Plugin = {
        id: 'context-test',
        name: 'Context Test',
        version: '1.0.0',
        install: (context: PluginContext) => {
          receivedContext = context;
        },
      };

      await pluginSystem.use(plugin);

      expect(receivedContext).not.toBeNull();
      expect(receivedContext?.registerCardType).toBeTypeOf('function');
      expect(receivedContext?.registerCommand).toBeTypeOf('function');
      expect(receivedContext?.on).toBeTypeOf('function');
    });

    it('应该处理安装错误', async () => {
      const failingPlugin: Plugin = {
        id: 'failing-plugin',
        name: 'Failing Plugin',
        version: '1.0.0',
        install: () => {
          throw new Error('Installation failed');
        },
      };

      await expect(pluginSystem.use(failingPlugin)).rejects.toThrow(
        'Installation failed'
      );

      expect(pluginSystem.getPluginStatus('failing-plugin')).toBe(
        PluginStatus.Error
      );
    });
  });

  describe('unuse', () => {
    it('应该卸载插件', async () => {
      await pluginSystem.use(testPlugin);
      await pluginSystem.unuse('test-plugin');

      expect(testPlugin.uninstall).toHaveBeenCalled();
      expect(pluginSystem.hasPlugin('test-plugin')).toBe(false);
    });

    it('应该处理不存在的插件', async () => {
      // 不应该抛出错误
      await pluginSystem.unuse('nonexistent');
      expect(true).toBe(true);
    });
  });

  describe('enable and disable', () => {
    it('应该启用插件', async () => {
      await pluginSystem.use(testPlugin);
      await pluginSystem.disable('test-plugin');

      expect(pluginSystem.getPluginStatus('test-plugin')).toBe(
        PluginStatus.Disabled
      );

      await pluginSystem.enable('test-plugin');

      expect(pluginSystem.getPluginStatus('test-plugin')).toBe(
        PluginStatus.Enabled
      );
    });

    it('应该抛出错误（插件不存在）', async () => {
      await expect(pluginSystem.enable('nonexistent')).rejects.toThrow();
    });
  });

  describe('listPlugins', () => {
    it('应该列出所有插件', async () => {
      await pluginSystem.use(testPlugin);

      const plugins = pluginSystem.listPlugins();

      expect(plugins).toHaveLength(1);
      expect(plugins[0]?.id).toBe('test-plugin');
      expect(plugins[0]?.name).toBe('Test Plugin');
    });
  });
});
