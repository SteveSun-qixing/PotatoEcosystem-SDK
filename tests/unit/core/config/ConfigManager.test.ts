/**
 * ConfigManager 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigManager } from '../../../../src/core/config/ConfigManager';
import { Logger } from '../../../../src/core/logger';
import { ConfigScope } from '../../../../src/types/config';

describe('ConfigManager', () => {
  let manager: ConfigManager;

  beforeEach(() => {
    // 不使用storage以避免异步保存问题
    manager = new ConfigManager();
  });

  describe('配置获取', () => {
    it('应该能够获取配置项', async () => {
      await manager.set('test.key', 'test-value', ConfigScope.Module);

      const value = manager.get('test.key');

      expect(value).toBe('test-value');
    });

    it('应该返回默认值当配置不存在', () => {
      const value = manager.get('non.existent.key', 'default');

      expect(value).toBe('default');
    });

    it('应该支持嵌套键路径', async () => {
      await manager.set('app.theme.color', 'blue', ConfigScope.Module);
      await manager.set('app.theme.font', 'Arial', ConfigScope.Module);

      expect(manager.get('app.theme.color')).toBe('blue');
      expect(manager.get('app.theme.font')).toBe('Arial');
    });
  });

  describe('配置设置', () => {
    it('应该能够设置配置项', async () => {
      await manager.set('test.key', 'value', ConfigScope.Module);

      expect(manager.get('test.key')).toBe('value');
    });

    it('应该能够覆盖已有配置', async () => {
      await manager.set('test.key', 'old-value', ConfigScope.Module);
      await manager.set('test.key', 'new-value', ConfigScope.Module);

      expect(manager.get('test.key')).toBe('new-value');
    });

    it('应该支持不同类型的值', async () => {
      await manager.set('string', 'text', ConfigScope.Module);
      await manager.set('number', 42, ConfigScope.Module);
      await manager.set('boolean', true, ConfigScope.Module);
      await manager.set('object', { key: 'value' }, ConfigScope.Module);
      await manager.set('array', [1, 2, 3], ConfigScope.Module);

      expect(manager.get('string')).toBe('text');
      expect(manager.get('number')).toBe(42);
      expect(manager.get('boolean')).toBe(true);
      expect(manager.get('object')).toEqual({ key: 'value' });
      expect(manager.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('运行时配置', () => {
    it('应该支持运行时配置覆盖', async () => {
      await manager.set('test.key', 'user-value', ConfigScope.Module);
      manager.setRuntime('test.key', 'runtime-value');

      // 运行时配置优先级最高
      expect(manager.get('test.key')).toBe('runtime-value');
    });
  });

  describe('配置检查', () => {
    it('应该能够检查配置是否存在', async () => {
      await manager.set('existing.key', 'value', ConfigScope.Module);

      expect(manager.has('existing.key')).toBe(true);
      expect(manager.has('non.existing.key')).toBe(false);
    });
  });

  describe('配置删除', () => {
    it('应该能够删除配置项', async () => {
      await manager.set('test.key', 'value', ConfigScope.Module);

      expect(manager.has('test.key')).toBe(true);

      await manager.delete('test.key', ConfigScope.Module);

      expect(manager.has('test.key')).toBe(false);
    });
  });
});
