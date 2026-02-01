/**
 * ConfigManager 单元测试
 * @module tests/unit/config/manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../../../src/config/manager';

describe('ConfigManager', () => {
  let config: ConfigManager;

  beforeEach(() => {
    config = new ConfigManager();
  });

  afterEach(() => {
    config.reset();
  });

  describe('配置读写', () => {
    it('应该能够设置和获取配置值', () => {
      config.set('test.key', 'value');
      expect(config.get('test.key')).toBe('value');
    });

    it('应该支持不同类型的值', () => {
      config.set('string', 'hello');
      config.set('number', 42);
      config.set('boolean', true);
      config.set('array', [1, 2, 3]);
      config.set('object', { a: 1 });

      expect(config.get('string')).toBe('hello');
      expect(config.get('number')).toBe(42);
      expect(config.get('boolean')).toBe(true);
      expect(config.get('array')).toEqual([1, 2, 3]);
      expect(config.get('object')).toEqual({ a: 1 });
    });

    it('应该能够检查配置是否存在', () => {
      config.set('exists', 'value');
      
      expect(config.has('exists')).toBe(true);
      expect(config.has('not.exists')).toBe(false);
    });

    it('应该能够删除配置', () => {
      config.set('to.delete', 'value');
      expect(config.has('to.delete')).toBe(true);
      
      config.delete('to.delete');
      expect(config.has('to.delete')).toBe(false);
    });

    it('应该能够批量设置配置', () => {
      config.setMany({
        'batch.key1': 'value1',
        'batch.key2': 'value2',
        'batch.key3': 'value3',
      });

      expect(config.get('batch.key1')).toBe('value1');
      expect(config.get('batch.key2')).toBe('value2');
      expect(config.get('batch.key3')).toBe('value3');
    });

    it('应该能够获取所有配置', () => {
      const all = config.getAll();
      
      expect(typeof all).toBe('object');
      expect(all['sdk.version']).toBe('1.0.0');
    });

    it('size 属性应返回配置项数量', () => {
      const initialSize = config.size;
      config.set('new.key', 'value');
      
      expect(config.size).toBe(initialSize + 1);
    });
  });

  describe('默认值处理', () => {
    it('对于不存在的键应返回默认值', () => {
      expect(config.get('non.existent', 'fallback')).toBe('fallback');
    });

    it('对于存在的键应忽略默认值', () => {
      config.set('existing', 'actual');
      expect(config.get('existing', 'fallback')).toBe('actual');
    });

    it('应该有 SDK 内置默认值', () => {
      expect(config.get('sdk.version')).toBe('1.0.0');
      expect(config.get('sdk.debug')).toBe(false);
      expect(config.get('timeout.default')).toBe(30000);
      expect(config.get('cache.enabled')).toBe(true);
    });

    it('构造函数应接受自定义默认值', () => {
      const customConfig = new ConfigManager({
        defaults: {
          'custom.key': 'custom-value',
          'sdk.debug': true, // 覆盖内置默认值
        },
      });

      expect(customConfig.get('custom.key')).toBe('custom-value');
      expect(customConfig.get('sdk.debug')).toBe(true);
    });

    it('reset 应恢复到初始默认值', () => {
      config.set('sdk.debug', true);
      config.set('new.key', 'value');
      
      config.reset();
      
      expect(config.get('sdk.debug')).toBe(false);
      expect(config.has('new.key')).toBe(false);
    });

    it('reset 应保留构造函数中的自定义默认值', () => {
      const customConfig = new ConfigManager({
        defaults: {
          'custom.key': 'custom-value',
        },
      });
      
      customConfig.set('custom.key', 'modified');
      customConfig.reset();
      
      expect(customConfig.get('custom.key')).toBe('custom-value');
    });
  });

  describe('变更监听', () => {
    it('应该能够监听特定键的变更', () => {
      const handler = vi.fn();
      config.onChange('test.key', handler);
      
      config.set('test.key', 'new-value');
      
      expect(handler).toHaveBeenCalledWith('test.key', 'new-value', undefined);
    });

    it('变更处理器应接收旧值', () => {
      const handler = vi.fn();
      config.set('test.key', 'old-value');
      config.onChange('test.key', handler);
      
      config.set('test.key', 'new-value');
      
      expect(handler).toHaveBeenCalledWith('test.key', 'new-value', 'old-value');
    });

    it('应该支持通配符监听所有变更', () => {
      const handler = vi.fn();
      config.onChange('*', handler);
      
      config.set('any.key1', 'value1');
      config.set('any.key2', 'value2');
      
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('应该支持前缀通配符监听', () => {
      const handler = vi.fn();
      config.onChange('cache.*', handler);
      
      config.set('cache.enabled', false);
      config.set('cache.maxSize', 200);
      config.set('other.key', 'value'); // 不应触发
      
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('删除配置时应触发变更事件', () => {
      const handler = vi.fn();
      config.set('to.delete', 'value');
      config.onChange('to.delete', handler);
      
      config.delete('to.delete');
      
      expect(handler).toHaveBeenCalledWith('to.delete', undefined, 'value');
    });

    it('应该能够取消监听', () => {
      const handler = vi.fn();
      config.onChange('test.key', handler);
      
      config.set('test.key', 'value1');
      expect(handler).toHaveBeenCalledTimes(1);
      
      config.offChange('test.key', handler);
      config.set('test.key', 'value2');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('不传 handler 时应取消该键的所有监听', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      config.onChange('test.key', handler1);
      config.onChange('test.key', handler2);
      
      config.offChange('test.key');
      config.set('test.key', 'value');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('处理器错误不应影响其他处理器', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorHandler = vi.fn(() => {
        throw new Error('handler error');
      });
      const normalHandler = vi.fn();
      
      config.onChange('test.key', errorHandler);
      config.onChange('test.key', normalHandler);
      
      config.set('test.key', 'value');
      
      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });
  });

  describe('前缀查询', () => {
    it('应该能够获取指定前缀的所有配置', () => {
      const cacheConfig = config.getByPrefix('cache.');
      
      expect(cacheConfig['cache.enabled']).toBe(true);
      expect(cacheConfig['cache.maxSize']).toBe(100);
      expect(cacheConfig['cache.ttl']).toBe(3600000);
    });

    it('应该只返回匹配前缀的配置', () => {
      const sdkConfig = config.getByPrefix('sdk.');
      
      expect('sdk.version' in sdkConfig).toBe(true);
      expect('sdk.debug' in sdkConfig).toBe(true);
      expect('cache.enabled' in sdkConfig).toBe(false);
    });

    it('不匹配任何配置时应返回空对象', () => {
      const result = config.getByPrefix('nonexistent.');
      
      expect(result).toEqual({});
    });

    it('应该包含用户设置的配置', () => {
      config.set('custom.key1', 'value1');
      config.set('custom.key2', 'value2');
      
      const customConfig = config.getByPrefix('custom.');
      
      expect(customConfig['custom.key1']).toBe('value1');
      expect(customConfig['custom.key2']).toBe('value2');
    });
  });

  describe('Schema 验证', () => {
    it('应该根据 schema 验证类型', () => {
      const validatedConfig = new ConfigManager({
        schema: {
          'validated.string': { type: 'string' },
          'validated.number': { type: 'number' },
        },
      });

      expect(() => {
        validatedConfig.set('validated.string', 123); // 应该失败
      }).toThrow();
    });

    it('应该支持自定义验证函数', () => {
      const validatedConfig = new ConfigManager({
        schema: {
          'validated.positive': {
            type: 'number',
            validate: (v) => typeof v === 'number' && v > 0,
          },
        },
      });

      expect(() => {
        validatedConfig.set('validated.positive', -1);
      }).toThrow();

      expect(() => {
        validatedConfig.set('validated.positive', 10);
      }).not.toThrow();
    });

    it('没有 schema 时应接受任何值', () => {
      expect(() => {
        config.set('any.key', 'string');
        config.set('any.key', 123);
        config.set('any.key', { nested: 'object' });
      }).not.toThrow();
    });

    it('schema 中未定义的键应接受任何值', () => {
      const validatedConfig = new ConfigManager({
        schema: {
          'defined.key': { type: 'string' },
        },
      });

      expect(() => {
        validatedConfig.set('undefined.key', 123);
      }).not.toThrow();
    });
  });

  describe('初始化', () => {
    it('initialize 应该是幂等的', async () => {
      await config.initialize();
      await config.initialize(); // 第二次调用不应有副作用
      
      expect(config.get('sdk.version')).toBe('1.0.0');
    });
  });
});
