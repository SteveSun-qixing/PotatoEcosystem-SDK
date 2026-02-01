import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResourceManager } from '../../../src/resource/manager';
import { Logger } from '../../../src/logger';
import { EventBus } from '../../../src/event';
import { ResourceError } from '../../../src/core/errors';
import { MockCoreConnector } from '../../helpers';
import { ResourceInfo } from '../../../src/resource/types';

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

// 创建测试用资源信息
function createResourceInfo(overrides?: Partial<ResourceInfo>): ResourceInfo {
  return {
    id: 'resource-1',
    name: 'test-image.png',
    path: '/resources/test-image.png',
    type: 'image',
    mimeType: 'image/png',
    size: 1024,
    checksum: 'abc123',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    ...overrides,
  };
}

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;
  let mockConnector: MockCoreConnector;
  let mockLogger: Logger;
  let mockEventBus: EventBus;

  // Mock URL 相关方法
  const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });

    mockConnector = new MockCoreConnector();
    mockLogger = createMockLogger();
    mockEventBus = createMockEventBus();
    resourceManager = new ResourceManager(mockConnector as any, mockLogger, mockEventBus, {
      autoCleanup: false, // 禁用自动清理以便测试
    });
  });

  afterEach(() => {
    resourceManager.destroy();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('应该创建实例', () => {
      expect(resourceManager).toBeInstanceOf(ResourceManager);
    });

    it('应该使用默认选项', () => {
      const stats = resourceManager.getCacheStats();
      expect(stats.maxSize).toBe(100 * 1024 * 1024); // 100MB
    });

    it('应该使用自定义选项', () => {
      const customManager = new ResourceManager(mockConnector as any, mockLogger, mockEventBus, {
        maxCacheSize: 50 * 1024 * 1024,
        autoCleanup: false,
      });

      const stats = customManager.getCacheStats();
      expect(stats.maxSize).toBe(50 * 1024 * 1024);

      customManager.destroy();
    });
  });

  describe('load', () => {
    it('应该成功加载资源', async () => {
      const resourceInfo = createResourceInfo();
      const resourceData = new ArrayBuffer(1024);

      mockConnector.mockResponse('resource', 'load', {
        data: resourceData,
        info: resourceInfo,
      });

      const blob = await resourceManager.load('/resources/test-image.png');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(1024);
    });

    it('应该将资源添加到缓存', async () => {
      const resourceInfo = createResourceInfo({ size: 2048 });
      const resourceData = new ArrayBuffer(2048);

      mockConnector.mockResponse('resource', 'load', {
        data: resourceData,
        info: resourceInfo,
      });

      await resourceManager.load('/resources/test.png');

      expect(resourceManager.isCached('/resources/test.png')).toBe(true);
    });

    it('应该从缓存返回资源', async () => {
      const resourceInfo = createResourceInfo();
      const resourceData = new ArrayBuffer(1024);

      mockConnector.mockResponse('resource', 'load', {
        data: resourceData,
        info: resourceInfo,
      });

      await resourceManager.load('/resources/cached.png');
      await resourceManager.load('/resources/cached.png');

      // 应该只请求一次
      const requests = mockConnector.getRequests();
      expect(requests.filter((r) => r.method === 'load')).toHaveLength(1);
    });

    it('应该在禁用缓存时不缓存', async () => {
      const resourceInfo = createResourceInfo();
      const resourceData = new ArrayBuffer(1024);

      mockConnector.mockResponse('resource', 'load', {
        data: resourceData,
        info: resourceInfo,
      });

      await resourceManager.load('/resources/no-cache.png', { cache: false });

      expect(resourceManager.isCached('/resources/no-cache.png')).toBe(false);
    });

    it('应该抛出错误当资源不存在', async () => {
      mockConnector.mockError('resource', 'load', 'NOT_FOUND', 'Resource not found');

      await expect(resourceManager.load('/resources/missing.png')).rejects.toThrow(ResourceError);
    });

    it('应该使用自定义超时', async () => {
      const resourceInfo = createResourceInfo();
      const resourceData = new ArrayBuffer(1024);

      mockConnector.mockResponse('resource', 'load', {
        data: resourceData,
        info: resourceInfo,
      });

      await resourceManager.load('/resources/timeout-test.png', { timeout: 5000 });

      const lastRequest = mockConnector.getLastRequest();
      expect(lastRequest?.timeout).toBe(5000);
    });
  });

  describe('getInfo', () => {
    it('应该从缓存返回资源信息', async () => {
      const resourceInfo = createResourceInfo();
      const resourceData = new ArrayBuffer(1024);

      mockConnector.mockResponse('resource', 'load', {
        data: resourceData,
        info: resourceInfo,
      });

      await resourceManager.load('/resources/info-test.png');

      const info = await resourceManager.getInfo('/resources/info-test.png');

      expect(info).toEqual(resourceInfo);
    });

    it('应该从服务器获取资源信息', async () => {
      const resourceInfo = createResourceInfo({ path: '/resources/server-info.png' });

      mockConnector.mockResponse('resource', 'info', resourceInfo);

      const info = await resourceManager.getInfo('/resources/server-info.png');

      expect(info).toEqual(resourceInfo);
    });

    it('应该抛出错误当资源不存在', async () => {
      mockConnector.mockError('resource', 'info', 'NOT_FOUND', 'Resource not found');

      await expect(resourceManager.getInfo('/resources/missing.png')).rejects.toThrow(
        ResourceError
      );
    });
  });

  describe('对象 URL 管理', () => {
    beforeEach(async () => {
      const resourceInfo = createResourceInfo();
      const resourceData = new ArrayBuffer(1024);

      mockConnector.mockResponse('resource', 'load', {
        data: resourceData,
        info: resourceInfo,
      });

      await resourceManager.load('/resources/url-test.png');
    });

    it('应该获取对象 URL', () => {
      const url = resourceManager.getObjectUrl('/resources/url-test.png');

      expect(url).toBe('blob:mock-url');
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it('应该返回 undefined 当资源未缓存', () => {
      const url = resourceManager.getObjectUrl('/resources/not-cached.png');

      expect(url).toBeUndefined();
    });

    it('应该复用已创建的对象 URL', () => {
      resourceManager.getObjectUrl('/resources/url-test.png');
      resourceManager.getObjectUrl('/resources/url-test.png');

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it('应该创建新的对象 URL', async () => {
      const url = await resourceManager.createObjectUrl('/resources/url-test.png');

      expect(url).toBe('blob:mock-url');
    });

    it('应该在创建对象 URL 时自动加载资源', async () => {
      const resourceInfo = createResourceInfo({ path: '/resources/auto-load.png' });
      const resourceData = new ArrayBuffer(512);

      mockConnector.mockResponse('resource', 'load', {
        data: resourceData,
        info: resourceInfo,
      });

      const url = await resourceManager.createObjectUrl('/resources/auto-load.png');

      expect(url).toBe('blob:mock-url');
      expect(resourceManager.isCached('/resources/auto-load.png')).toBe(true);
    });

    it('应该释放对象 URL', () => {
      resourceManager.getObjectUrl('/resources/url-test.png');
      resourceManager.releaseObjectUrl('/resources/url-test.png');

      // 引用计数减少，但还没有到 0（加载时 +1，getObjectUrl +1，release -1）
      // 再次 release 才会真正释放
      resourceManager.releaseObjectUrl('/resources/url-test.png');

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('应该静默处理未缓存资源的释放', () => {
      resourceManager.releaseObjectUrl('/resources/not-cached.png');

      expect(mockRevokeObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('upload', () => {
    it('应该成功上传资源', async () => {
      const resourceInfo = createResourceInfo({ path: '/uploads/new-file.png' });
      mockConnector.mockResponse('resource', 'upload', resourceInfo);

      const file = new File([new ArrayBuffer(1024)], 'new-file.png', { type: 'image/png' });

      const result = await resourceManager.upload(file, { path: '/uploads/new-file.png' });

      expect(result).toEqual(resourceInfo);
    });

    it('应该触发 resource:uploaded 事件', async () => {
      const resourceInfo = createResourceInfo({ path: '/uploads/event-test.png' });
      mockConnector.mockResponse('resource', 'upload', resourceInfo);

      const file = new File([new ArrayBuffer(512)], 'event-test.png', { type: 'image/png' });

      await resourceManager.upload(file, { path: '/uploads/event-test.png' });

      expect(mockEventBus.emit).toHaveBeenCalledWith('resource:uploaded', {
        path: '/uploads/event-test.png',
        info: resourceInfo,
      });
    });

    it('应该抛出错误当上传失败', async () => {
      mockConnector.mockError('resource', 'upload', 'UPLOAD_FAILED', 'Upload failed');

      const file = new File([new ArrayBuffer(1024)], 'fail.png', { type: 'image/png' });

      await expect(resourceManager.upload(file, { path: '/uploads/fail.png' })).rejects.toThrow(
        ResourceError
      );
    });
  });

  describe('delete', () => {
    it('应该成功删除资源', async () => {
      const resourceInfo = createResourceInfo();
      const resourceData = new ArrayBuffer(1024);

      mockConnector.mockResponse('resource', 'load', {
        data: resourceData,
        info: resourceInfo,
      });
      mockConnector.mockResponse('resource', 'delete', {});

      await resourceManager.load('/resources/to-delete.png');
      expect(resourceManager.isCached('/resources/to-delete.png')).toBe(true);

      await resourceManager.delete('/resources/to-delete.png');

      expect(resourceManager.isCached('/resources/to-delete.png')).toBe(false);
    });

    it('应该触发 resource:deleted 事件', async () => {
      mockConnector.mockResponse('resource', 'delete', {});

      await resourceManager.delete('/resources/deleted.png');

      expect(mockEventBus.emit).toHaveBeenCalledWith('resource:deleted', {
        path: '/resources/deleted.png',
      });
    });

    it('应该释放对象 URL', async () => {
      const resourceInfo = createResourceInfo();
      const resourceData = new ArrayBuffer(1024);

      mockConnector.mockResponse('resource', 'load', {
        data: resourceData,
        info: resourceInfo,
      });
      mockConnector.mockResponse('resource', 'delete', {});

      await resourceManager.load('/resources/with-url.png');
      resourceManager.getObjectUrl('/resources/with-url.png');

      await resourceManager.delete('/resources/with-url.png');

      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('应该抛出错误当删除失败', async () => {
      mockConnector.mockError('resource', 'delete', 'DELETE_FAILED', 'Delete failed');

      await expect(resourceManager.delete('/resources/fail-delete.png')).rejects.toThrow(
        ResourceError
      );
    });
  });

  describe('缓存驱逐', () => {
    it('应该在超过最大数量时驱逐最旧的缓存', async () => {
      const smallCacheManager = new ResourceManager(
        mockConnector as any,
        mockLogger,
        mockEventBus,
        {
          maxCacheCount: 3,
          maxCacheSize: 1024 * 1024 * 1024, // 足够大
          autoCleanup: false,
        }
      );

      // 加载 4 个资源
      for (let i = 0; i < 4; i++) {
        const resourceInfo = createResourceInfo({
          id: `resource-${i}`,
          path: `/resources/file-${i}.png`,
          size: 100,
        });
        const resourceData = new ArrayBuffer(100);

        mockConnector.mockResponse('resource', 'load', {
          data: resourceData,
          info: resourceInfo,
        });

        await smallCacheManager.load(`/resources/file-${i}.png`);

        // 释放引用以允许驱逐
        smallCacheManager.releaseObjectUrl(`/resources/file-${i}.png`);
      }

      const stats = smallCacheManager.getCacheStats();
      expect(stats.count).toBeLessThanOrEqual(3);

      smallCacheManager.destroy();
    });

    it('应该在超过最大大小时驱逐缓存', async () => {
      const smallSizeManager = new ResourceManager(
        mockConnector as any,
        mockLogger,
        mockEventBus,
        {
          maxCacheSize: 500, // 500 bytes
          maxCacheCount: 100,
          autoCleanup: false,
        }
      );

      // 加载多个资源，每个 200 bytes
      for (let i = 0; i < 5; i++) {
        const resourceInfo = createResourceInfo({
          id: `resource-${i}`,
          path: `/resources/large-${i}.png`,
          size: 200,
        });
        const resourceData = new ArrayBuffer(200);

        mockConnector.mockResponse('resource', 'load', {
          data: resourceData,
          info: resourceInfo,
        });

        await smallSizeManager.load(`/resources/large-${i}.png`);

        // 释放引用
        smallSizeManager.releaseObjectUrl(`/resources/large-${i}.png`);
      }

      const stats = smallSizeManager.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(500);

      smallSizeManager.destroy();
    });

    it('应该保留有引用的缓存', async () => {
      const smallCacheManager = new ResourceManager(
        mockConnector as any,
        mockLogger,
        mockEventBus,
        {
          maxCacheCount: 2,
          autoCleanup: false,
        }
      );

      // 加载第一个资源（保持引用）
      const resourceInfo1 = createResourceInfo({
        id: 'resource-ref',
        path: '/resources/referenced.png',
        size: 100,
      });
      mockConnector.mockResponse('resource', 'load', {
        data: new ArrayBuffer(100),
        info: resourceInfo1,
      });
      await smallCacheManager.load('/resources/referenced.png');
      // 不释放引用

      // 加载更多资源
      for (let i = 0; i < 3; i++) {
        const resourceInfo = createResourceInfo({
          id: `resource-${i}`,
          path: `/resources/file-${i}.png`,
          size: 100,
        });
        mockConnector.mockResponse('resource', 'load', {
          data: new ArrayBuffer(100),
          info: resourceInfo,
        });
        await smallCacheManager.load(`/resources/file-${i}.png`);
        smallCacheManager.releaseObjectUrl(`/resources/file-${i}.png`);
      }

      // 有引用的资源应该仍然存在
      expect(smallCacheManager.isCached('/resources/referenced.png')).toBe(true);

      smallCacheManager.destroy();
    });
  });

  describe('preload', () => {
    it('应该预加载多个资源', async () => {
      const paths = ['/resources/pre1.png', '/resources/pre2.png', '/resources/pre3.png'];

      for (const path of paths) {
        const resourceInfo = createResourceInfo({ path });
        mockConnector.mockResponse('resource', 'load', {
          data: new ArrayBuffer(100),
          info: resourceInfo,
        });
      }

      await resourceManager.preload(paths);

      for (const path of paths) {
        expect(resourceManager.isCached(path)).toBe(true);
      }
    });

    it('应该使用并发控制', async () => {
      const paths = ['/resources/c1.png', '/resources/c2.png', '/resources/c3.png'];

      for (const path of paths) {
        const resourceInfo = createResourceInfo({ path });
        mockConnector.mockResponse('resource', 'load', {
          data: new ArrayBuffer(100),
          info: resourceInfo,
        });
      }

      await resourceManager.preload(paths, { concurrency: 2 });

      for (const path of paths) {
        expect(resourceManager.isCached(path)).toBe(true);
      }
    });

    it('应该优雅处理加载失败', async () => {
      const paths = ['/resources/success.png', '/resources/fail.png'];

      const successInfo = createResourceInfo({ path: '/resources/success.png' });
      mockConnector.mockResponse('resource', 'load', {
        data: new ArrayBuffer(100),
        info: successInfo,
      });

      // 第二个调用会失败（因为 mock 只设置了 success）

      await resourceManager.preload(paths);

      expect(resourceManager.isCached('/resources/success.png')).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('应该清除所有缓存', async () => {
      const resourceInfo = createResourceInfo();
      mockConnector.mockResponse('resource', 'load', {
        data: new ArrayBuffer(1024),
        info: resourceInfo,
      });

      await resourceManager.load('/resources/clear-test.png');
      expect(resourceManager.isCached('/resources/clear-test.png')).toBe(true);

      resourceManager.clearCache();

      expect(resourceManager.isCached('/resources/clear-test.png')).toBe(false);
      const stats = resourceManager.getCacheStats();
      expect(stats.count).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('应该释放所有对象 URL', async () => {
      const resourceInfo = createResourceInfo();
      mockConnector.mockResponse('resource', 'load', {
        data: new ArrayBuffer(1024),
        info: resourceInfo,
      });

      await resourceManager.load('/resources/url-clear.png');
      resourceManager.getObjectUrl('/resources/url-clear.png');

      resourceManager.clearCache();

      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('应该返回正确的统计信息', async () => {
      const resourceInfo = createResourceInfo({ size: 512 });
      mockConnector.mockResponse('resource', 'load', {
        data: new ArrayBuffer(512),
        info: resourceInfo,
      });

      await resourceManager.load('/resources/stats-test.png');

      const stats = resourceManager.getCacheStats();

      expect(stats.count).toBe(1);
      expect(stats.size).toBe(512);
      expect(stats.maxSize).toBe(100 * 1024 * 1024);
    });
  });

  describe('isCached', () => {
    it('应该返回 true 当资源已缓存', async () => {
      const resourceInfo = createResourceInfo();
      mockConnector.mockResponse('resource', 'load', {
        data: new ArrayBuffer(1024),
        info: resourceInfo,
      });

      await resourceManager.load('/resources/cached.png');

      expect(resourceManager.isCached('/resources/cached.png')).toBe(true);
    });

    it('应该返回 false 当资源未缓存', () => {
      expect(resourceManager.isCached('/resources/not-cached.png')).toBe(false);
    });
  });

  describe('getResourceType', () => {
    it('应该识别图片类型', () => {
      expect(resourceManager.getResourceType('image/jpeg')).toBe('image');
      expect(resourceManager.getResourceType('image/png')).toBe('image');
      expect(resourceManager.getResourceType('image/gif')).toBe('image');
      expect(resourceManager.getResourceType('image/webp')).toBe('image');
      expect(resourceManager.getResourceType('image/svg+xml')).toBe('image');
    });

    it('应该识别视频类型', () => {
      expect(resourceManager.getResourceType('video/mp4')).toBe('video');
      expect(resourceManager.getResourceType('video/webm')).toBe('video');
    });

    it('应该识别音频类型', () => {
      expect(resourceManager.getResourceType('audio/mpeg')).toBe('audio');
      expect(resourceManager.getResourceType('audio/wav')).toBe('audio');
      expect(resourceManager.getResourceType('audio/ogg')).toBe('audio');
    });

    it('应该识别字体类型', () => {
      expect(resourceManager.getResourceType('font/woff')).toBe('font');
      expect(resourceManager.getResourceType('font/woff2')).toBe('font');
    });

    it('应该识别文档类型', () => {
      expect(resourceManager.getResourceType('application/pdf')).toBe('document');
    });

    it('应该返回 other 当类型未知', () => {
      expect(resourceManager.getResourceType('application/unknown')).toBe('other');
      expect(resourceManager.getResourceType('text/plain')).toBe('other');
    });
  });

  describe('destroy', () => {
    it('应该清理所有资源', async () => {
      const resourceInfo = createResourceInfo();
      mockConnector.mockResponse('resource', 'load', {
        data: new ArrayBuffer(1024),
        info: resourceInfo,
      });

      await resourceManager.load('/resources/destroy-test.png');
      resourceManager.getObjectUrl('/resources/destroy-test.png');

      resourceManager.destroy();

      expect(resourceManager.isCached('/resources/destroy-test.png')).toBe(false);
    });
  });
});
