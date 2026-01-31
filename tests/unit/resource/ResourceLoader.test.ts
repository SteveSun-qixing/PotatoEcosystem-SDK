/**
 * 资源加载器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceLoader } from '@/resource/ResourceLoader';
import { Logger } from '@/core/logger';
import { createPlatformAdapter } from '@/platform';
import { NetworkError, ResourceError } from '@/core/error';

describe('ResourceLoader', () => {
  let loader: ResourceLoader;
  let adapter: ReturnType<typeof createPlatformAdapter>;
  let logger: Logger;

  beforeEach(() => {
    adapter = createPlatformAdapter();
    logger = new Logger({ enableConsole: false });
    loader = new ResourceLoader(logger, adapter);
  });

  describe('detectProtocol', () => {
    it('应该检测HTTP协议', () => {
      expect(loader.detectProtocol('http://example.com/image.jpg')).toBe('http');
    });

    it('应该检测HTTPS协议', () => {
      expect(loader.detectProtocol('https://example.com/image.jpg')).toBe('https');
    });

    it('应该检测file协议', () => {
      expect(loader.detectProtocol('file:///path/to/file.jpg')).toBe('file');
    });

    it('应该检测data协议', () => {
      expect(loader.detectProtocol('data:image/png;base64,xxx')).toBe('data');
    });

    it('应该检测blob协议', () => {
      expect(loader.detectProtocol('blob:http://example.com/xxx')).toBe('blob');
    });

    it('应该默认视为file协议', () => {
      expect(loader.detectProtocol('/path/to/file.jpg')).toBe('file');
    });
  });

  describe('normalizeURL', () => {
    it('应该移除file://前缀', () => {
      expect(loader.normalizeURL('file:///path/to/file.jpg')).toBe('/path/to/file.jpg');
    });

    it('应该保留HTTP URL', () => {
      const url = 'http://example.com/image.jpg';
      expect(loader.normalizeURL(url)).toBe(url);
    });

    it('应该保留HTTPS URL', () => {
      const url = 'https://example.com/image.jpg';
      expect(loader.normalizeURL(url)).toBe(url);
    });
  });

  describe('loadDataURL', () => {
    it('应该加载base64编码的data URL', async () => {
      // 增加超时时间
      const base64 = btoa('test data');
      const dataURL = `data:image/png;base64,${base64}`;

      const result = await loader.load(dataURL);

      expect(result.data).toBeInstanceOf(ArrayBuffer);
      expect(result.size).toBeGreaterThan(0);
      expect(result.contentType).toBe('image/png');
    });

    it('应该加载URL编码的data URL', async () => {
      const text = 'test data';
      const encoded = encodeURIComponent(text);
      const dataURL = `data:text/plain,${encoded}`;

      const result = await loader.load(dataURL);

      expect(result.data).toBeInstanceOf(ArrayBuffer);
      expect(result.size).toBeGreaterThan(0);
    });

    it('应该在无效data URL时抛出错误', async () => {
      await expect(loader.load('data:invalid')).rejects.toThrow();
    }, 10000);
  });

  describe('loadFile', () => {
    it('应该加载文件资源', async () => {
      // 创建测试文件
      const testData = new TextEncoder().encode('test file content');
      const testPath = '/test/file.txt';

      // Mock adapter.readFile
      vi.spyOn(adapter, 'readFile').mockResolvedValue(testData.buffer);

      const result = await loader.load(testPath);

      expect(result.data).toBeInstanceOf(ArrayBuffer);
      expect(result.size).toBe(testData.length);
      expect(result.url).toBe(testPath);
    });

    it('应该在文件不存在时抛出错误', async () => {
      vi.spyOn(adapter, 'readFile').mockRejectedValue(new Error('File not found'));

      await expect(loader.load('/nonexistent/file.txt')).rejects.toThrow();
    }, 10000);
  });

  describe('loadHTTP', () => {
    it('应该加载HTTP资源', async () => {
      const testData = new TextEncoder().encode('test content');
      const mockResponse = new Response(testData.buffer, {
        headers: { 'content-type': 'text/plain' },
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await loader.load('http://example.com/test.txt');

      expect(result.data).toBeInstanceOf(ArrayBuffer);
      expect(result.contentType).toBe('text/plain');
      expect(result.size).toBe(testData.length);
    });

    it('应该在HTTP错误时抛出错误', async () => {
      const mockResponse = new Response(null, { status: 404 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(loader.load('http://example.com/notfound.txt')).rejects.toThrow();
    }, 10000);

    it('应该在超时时抛出错误', async () => {
      const shortLoader = new ResourceLoader(adapter, logger, { defaultTimeout: 100 });
      global.fetch = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );

      // 超时会抛出ResourceError（包装了NetworkError）
      await expect(shortLoader.load('http://example.com/slow.txt')).rejects.toThrow();
    }, 10000);
  });

  describe('loadBatch', () => {
    it('应该批量加载资源', async () => {
      const testData = new TextEncoder().encode('test');
      // 为每个URL创建新的Response，因为Response body只能读取一次
      global.fetch = vi.fn().mockImplementation(() => {
        return Promise.resolve(new Response(testData.buffer));
      });

      const urls = [
        'http://example.com/file1.txt',
        'http://example.com/file2.txt',
      ];

      const results = await loader.loadBatch(urls);

      expect(results).toHaveLength(2);
      expect(results[0].url).toBe(urls[0]);
      expect(results[1].url).toBe(urls[1]);
    }, 10000);
  });

  describe('preload', () => {
    it('应该预加载资源', async () => {
      const testData = new TextEncoder().encode('test');
      const mockResponse = new Response(testData.buffer);
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await loader.preload('http://example.com/preload.txt');

      expect(global.fetch).toHaveBeenCalled();
    });

    it('应该在预加载失败时不抛出错误', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(loader.preload('http://example.com/fail.txt')).resolves.not.toThrow();
    }, 10000);
  });
});
