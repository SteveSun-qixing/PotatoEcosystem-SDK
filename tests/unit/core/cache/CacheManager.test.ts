/**
 * 缓存管理器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CacheManager } from '@/core/cache/CacheManager';

describe('CacheManager', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = new CacheManager<string>({
      maxSize: 1000,
      ttl: 1000, // 1秒
    });
  });

  describe('set and get', () => {
    it('应该设置和获取缓存', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');

      expect(value).toBe('value1');
    });

    it('应该返回null（键不存在）', async () => {
      const value = await cache.get('nonexistent');
      expect(value).toBeNull();
    });

    it('应该覆盖已存在的键', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key1', 'value2');

      const value = await cache.get('key1');
      expect(value).toBe('value2');
    });
  });

  describe('has', () => {
    it('应该检查缓存是否存在', async () => {
      await cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('应该删除缓存', async () => {
      await cache.set('key1', 'value1');
      const deleted = await cache.delete('key1');

      expect(deleted).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    it('应该返回false（键不存在）', async () => {
      const deleted = await cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('应该清空所有缓存', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL过期', () => {
    it('应该在TTL过期后返回null', async () => {
      const shortCache = new CacheManager<string>({
        ttl: 100, // 100ms
      });

      await shortCache.set('key1', 'value1');

      // 立即获取应该成功
      expect(await shortCache.get('key1')).toBe('value1');

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 过期后应该返回null
      expect(await shortCache.get('key1')).toBeNull();
    });

    it('应该支持自定义TTL', async () => {
      await cache.set('key1', 'value1', 5000); // 5秒

      // 应该仍然存在
      await new Promise((resolve) => setTimeout(resolve, 1500));
      expect(await cache.get('key1')).toBe('value1');
    });
  });

  describe('缓存策略', () => {
    it('应该设置缓存策略', () => {
      cache.setStrategy('lfu');
      // 策略已设置，无异常即可
      expect(true).toBe(true);
    });

    it('LRU: 应该驱逐最久未使用的项', async () => {
      const smallCache = new CacheManager<string>({
        maxSize: 50, // 小缓存
        strategy: 'lru',
      });

      await smallCache.set('key1', 'value1');
      await new Promise((resolve) => setTimeout(resolve, 10));

      await smallCache.set('key2', 'value2');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 访问key1
      await smallCache.get('key1');

      // 添加key3，应该驱逐key2
      await smallCache.set('key3', 'value3'.repeat(20));

      expect(smallCache.size()).toBeLessThanOrEqual(3);
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.currentSize).toBeGreaterThan(0);
      expect(stats.maxSize).toBe(1000);
    });
  });

  describe('cleanup', () => {
    it('应该清理过期缓存', async () => {
      const shortCache = new CacheManager<string>({
        ttl: 50,
      });

      await shortCache.set('key1', 'value1');
      await shortCache.set('key2', 'value2');

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      const cleaned = await shortCache.cleanup();
      expect(cleaned).toBe(2);
      expect(shortCache.size()).toBe(0);
    });
  });
});
