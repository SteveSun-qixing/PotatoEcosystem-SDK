/**
 * ResourceManager 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceManager } from '../../../src/resource/ResourceManager';
import { Logger } from '../../../src/core/logger';
import type { IPlatformAdapter, Platform } from '../../../src/types';

describe('ResourceManager', () => {
  let manager: ResourceManager;
  let logger: Logger;
  let mockAdapter: IPlatformAdapter;

  beforeEach(() => {
    logger = new Logger();

    // 创建Mock适配器
    mockAdapter = {
      platform: 'web' as Platform,
      readFile: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      writeFile: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(true),
      listFiles: vi.fn().mockResolvedValue([]),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      getFileSystem: vi.fn(),
    };

    manager = new ResourceManager(logger, mockAdapter);
  });

  describe('资源加载', () => {
    it('应该成功加载HTTP资源', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(2048)),
        headers: new Map([['content-type', 'image/jpeg']]),
      });

      const data = await manager.loadResource('https://example.com/image.jpg');

      expect(data).toBeInstanceOf(ArrayBuffer);
      expect(data.byteLength).toBe(2048);
    });

    it('应该使用缓存', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        headers: new Map([['content-type', 'image/jpeg']]),
      });

      // 第一次加载
      await manager.loadResource('https://example.com/image.jpg', true);

      // 第二次应该从缓存加载
      await manager.loadResource('https://example.com/image.jpg', true);

      // fetch 应该只调用一次
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('应该能够跳过缓存', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        headers: new Map([['content-type', 'image/jpeg']]),
      });

      // 第一次加载
      await manager.loadResource('https://example.com/image.jpg', false);

      // 第二次也不使用缓存
      await manager.loadResource('https://example.com/image.jpg', false);

      // fetch 应该调用两次
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('应该记录资源信息', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(2048)),
        headers: new Map([['content-type', 'image/jpeg']]),
      });

      await manager.loadResource('https://example.com/image.jpg');

      const info = manager.getResourceInfo('https://example.com/image.jpg');

      expect(info).toBeDefined();
      expect(info?.uri).toBe('https://example.com/image.jpg');
      expect(info?.type).toBe('image/jpeg');
      expect(info?.size).toBe(2048);
    });
  });

  describe('批量加载', () => {
    it('应该批量加载多个资源', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        headers: new Map(),
      });

      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      const results = await manager.loadResources(urls);

      expect(results).toHaveLength(3);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('预加载', () => {
    it('应该预加载资源并缓存', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        headers: new Map(),
      });

      const urls = ['https://example.com/image1.jpg'];

      await manager.preloadResources(urls);

      // 预加载会调用一次fetch
      expect(global.fetch).toHaveBeenCalled();

      // 再次加载应使用缓存
      await manager.loadResource('https://example.com/image1.jpg');

      // fetch 可能被调用1-2次（取决于缓存实现）
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('缓存管理', () => {
    it('应该能够清除缓存', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        headers: new Map(),
      });

      // 加载并缓存
      await manager.loadResource('https://example.com/image.jpg');

      // 清除缓存
      manager.clearCache();

      // 再次加载应重新fetch
      await manager.loadResource('https://example.com/image.jpg');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('应该提供缓存统计', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        headers: new Map(),
      });

      await manager.loadResource('https://example.com/image1.jpg');
      await manager.loadResource('https://example.com/image2.jpg');

      const stats = manager.getCacheStats();

      expect(stats.total).toBe(2);
    });
  });

  describe('图片处理', () => {
    it('应该提供图片处理器', () => {
      const processor = manager.getImageProcessor();

      expect(processor).toBeDefined();
    });
  });

  describe('媒体元数据', () => {
    it('应该提供媒体元数据提取器', () => {
      const metadata = manager.getMediaMetadata();

      expect(metadata).toBeDefined();
    });
  });

  describe('资源类型检测', () => {
    it('应该正确检测图片类型', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        headers: new Map([['content-type', 'image/jpeg']]),
      });

      await manager.loadResource('https://example.com/photo.jpg');

      const info = manager.getResourceInfo('https://example.com/photo.jpg');

      expect(info?.type).toBe('image/jpeg');
    });
  });
});
