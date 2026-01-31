/**
 * PluginLifecycleManager 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PluginLifecycleManager,
  LifecycleState,
} from '../../../src/plugin/PluginLifecycleManager';
import { Logger } from '../../../src/core/logger';
import { EventBus } from '../../../src/core/event';
import type { Plugin, PluginManifest } from '../../../src/types';

describe('PluginLifecycleManager', () => {
  let manager: PluginLifecycleManager;
  let logger: Logger;
  let eventBus: EventBus;

  beforeEach(() => {
    logger = new Logger();
    eventBus = new EventBus();
    manager = new PluginLifecycleManager(logger, eventBus);
  });

  // 创建测试插件
  const createTestPlugin = (id: string, withLifecycle = true): Plugin => ({
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    type: 'base_card',
    install: vi.fn(),
    uninstall: vi.fn(),
    ...(withLifecycle
      ? {
          initialize: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          destroy: vi.fn(),
        }
      : {}),
  });

  const createTestManifest = (id: string): PluginManifest => ({
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    type: 'base_card',
    main: 'index.js',
  });

  describe('加载插件', () => {
    it('应该成功加载插件', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      await manager.load(plugin, manifest);

      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Loaded
      );
    });

    it('应该触发生命周期事件', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      const lifecycleHandler = vi.fn();
      eventBus.on('plugin:lifecycle', lifecycleHandler);

      await manager.load(plugin, manifest);

      expect(lifecycleHandler).toHaveBeenCalled();
    });
  });

  describe('初始化插件', () => {
    it('应该成功初始化已加载的插件', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      await manager.load(plugin, manifest);
      await manager.initialize('test:plugin-a');

      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Initialized
      );
      expect(plugin.initialize).toHaveBeenCalled();
    });

    it('应该传递core实例给initialize方法', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');
      const mockCore = { version: '1.0.0' };

      await manager.load(plugin, manifest);
      await manager.initialize('test:plugin-a', mockCore);

      expect(plugin.initialize).toHaveBeenCalledWith(mockCore);
    });

    it('应该拒绝初始化未加载的插件', async () => {
      await expect(manager.initialize('test:unknown')).rejects.toThrow(
        'Plugin not found'
      );
    });

    it('应该在初始化失败时进入错误状态', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      plugin.initialize = vi.fn().mockRejectedValue(new Error('Init failed'));

      await manager.load(plugin, manifest);

      await expect(manager.initialize('test:plugin-a')).rejects.toThrow(
        'Init failed'
      );
      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Error
      );
    });
  });

  describe('启动插件', () => {
    it('应该成功启动已初始化的插件', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      await manager.load(plugin, manifest);
      await manager.initialize('test:plugin-a');
      await manager.start('test:plugin-a');

      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Active
      );
      expect(plugin.start).toHaveBeenCalled();
    });

    it('应该拒绝启动未初始化的插件', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      await manager.load(plugin, manifest);

      await expect(manager.start('test:plugin-a')).rejects.toThrow(
        'Cannot start plugin'
      );
    });
  });

  describe('停止插件', () => {
    it('应该成功停止活跃的插件', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      await manager.load(plugin, manifest);
      await manager.initialize('test:plugin-a');
      await manager.start('test:plugin-a');
      await manager.stop('test:plugin-a');

      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Stopped
      );
      expect(plugin.stop).toHaveBeenCalled();
    });

    it('应该拒绝停止非活跃的插件', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      await manager.load(plugin, manifest);

      await expect(manager.stop('test:plugin-a')).rejects.toThrow(
        'Cannot stop plugin'
      );
    });
  });

  describe('销毁插件', () => {
    it('应该成功销毁插件', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      await manager.load(plugin, manifest);
      await manager.initialize('test:plugin-a');
      await manager.start('test:plugin-a');
      await manager.stop('test:plugin-a');
      await manager.destroy('test:plugin-a');

      expect(manager.getLifecycleState('test:plugin-a')).toBeUndefined();
      expect(plugin.destroy).toHaveBeenCalled();
      expect(plugin.uninstall).toHaveBeenCalled();
    });

    it('应该能够销毁错误状态的插件', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');
      plugin.initialize = vi.fn().mockRejectedValue(new Error('Init failed'));

      await manager.load(plugin, manifest);

      try {
        await manager.initialize('test:plugin-a');
      } catch (e) {
        // 忽略错误
      }

      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Error
      );

      await manager.destroy('test:plugin-a');

      expect(manager.getLifecycleState('test:plugin-a')).toBeUndefined();
    });
  });

  describe('状态查询', () => {
    it('应该返回正确的生命周期状态', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      expect(manager.getLifecycleState('test:plugin-a')).toBeUndefined();

      await manager.load(plugin, manifest);
      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Loaded
      );

      await manager.initialize('test:plugin-a');
      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Initialized
      );

      await manager.start('test:plugin-a');
      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Active
      );

      expect(manager.isActive('test:plugin-a')).toBe(true);
    });

    it('应该返回所有插件状态', async () => {
      const plugin1 = createTestPlugin('test:plugin-a');
      const plugin2 = createTestPlugin('test:plugin-b');
      const manifest1 = createTestManifest('test:plugin-a');
      const manifest2 = createTestManifest('test:plugin-b');

      await manager.load(plugin1, manifest1);
      await manager.load(plugin2, manifest2);

      const states = manager.getAllStates();

      expect(states.size).toBe(2);
      expect(states.get('test:plugin-a')).toBe(LifecycleState.Loaded);
      expect(states.get('test:plugin-b')).toBe(LifecycleState.Loaded);
    });
  });

  describe('错误处理', () => {
    it('应该记录插件错误', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');
      const error = new Error('Test error');

      plugin.initialize = vi.fn().mockRejectedValue(error);

      await manager.load(plugin, manifest);

      await expect(manager.initialize('test:plugin-a')).rejects.toThrow(
        'Test error'
      );

      expect(manager.hasError('test:plugin-a')).toBe(true);
      expect(manager.getError('test:plugin-a')).toBe(error);
    });

    it('应该能够清除插件错误', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      plugin.initialize = vi.fn().mockRejectedValue(new Error('Init failed'));

      await manager.load(plugin, manifest);

      try {
        await manager.initialize('test:plugin-a');
      } catch (e) {
        // 忽略错误
      }

      expect(manager.hasError('test:plugin-a')).toBe(true);

      manager.clearError('test:plugin-a');

      expect(manager.hasError('test:plugin-a')).toBe(false);
      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Stopped
      );
    });
  });

  describe('完整生命周期', () => {
    it('应该完成完整的生命周期流程', async () => {
      const plugin = createTestPlugin('test:plugin-a');
      const manifest = createTestManifest('test:plugin-a');

      // Load
      await manager.load(plugin, manifest);
      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Loaded
      );

      // Initialize
      await manager.initialize('test:plugin-a');
      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Initialized
      );
      expect(plugin.initialize).toHaveBeenCalled();

      // Start
      await manager.start('test:plugin-a');
      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Active
      );
      expect(plugin.start).toHaveBeenCalled();

      // Stop
      await manager.stop('test:plugin-a');
      expect(manager.getLifecycleState('test:plugin-a')).toBe(
        LifecycleState.Stopped
      );
      expect(plugin.stop).toHaveBeenCalled();

      // Destroy
      await manager.destroy('test:plugin-a');
      expect(manager.getLifecycleState('test:plugin-a')).toBeUndefined();
      expect(plugin.destroy).toHaveBeenCalled();
      expect(plugin.uninstall).toHaveBeenCalled();
    });
  });
});
