/**
 * WebAdapter 测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebAdapter } from '../../../src/platform/web/WebAdapter';
import { Platform } from '../../../src/types';

// 检查是否在浏览器环境中
const isBrowser = typeof indexedDB !== 'undefined';

describe.skipIf(!isBrowser)('WebAdapter', () => {
  let adapter: WebAdapter;
  const testPath = 'test-file.txt';
  const testData = new TextEncoder().encode('Hello, World!').buffer;

  beforeEach(() => {
    adapter = new WebAdapter();
  });

  afterEach(async () => {
    // 清理测试文件
    try {
      await adapter.deleteFile(testPath);
    } catch {
      // 忽略错误
    }
  });

  describe('基础属性', () => {
    it('应该返回正确的平台类型', () => {
      expect(adapter.platform).toBe(Platform.Web);
    });

    it('应该提供文件系统接口', () => {
      const fs = adapter.getFileSystem();
      expect(fs).toBeDefined();
      expect(typeof fs.readFile).toBe('function');
      expect(typeof fs.writeFile).toBe('function');
      expect(typeof fs.exists).toBe('function');
    });
  });

  describe('文件操作', () => {
    it('应该能够写入和读取文件', async () => {
      await adapter.writeFile(testPath, testData);
      const result = await adapter.readFile(testPath);

      expect(result.byteLength).toBe(testData.byteLength);
      
      // 验证内容相同
      const resultArray = new Uint8Array(result);
      const testArray = new Uint8Array(testData);
      expect(resultArray).toEqual(testArray);
    });

    it('应该能够检查文件是否存在', async () => {
      // 文件不存在
      let exists = await adapter.exists(testPath);
      expect(exists).toBe(false);

      // 写入文件后存在
      await adapter.writeFile(testPath, testData);
      exists = await adapter.exists(testPath);
      expect(exists).toBe(true);
    });

    it('应该能够删除文件', async () => {
      // 创建文件
      await adapter.writeFile(testPath, testData);
      expect(await adapter.exists(testPath)).toBe(true);

      // 删除文件
      await adapter.deleteFile(testPath);
      expect(await adapter.exists(testPath)).toBe(false);
    });

    it('读取不存在的文件应该抛出错误', async () => {
      await expect(adapter.readFile('nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('文件列表', () => {
    it('应该能够列出文件', async () => {
      const testPath1 = 'dir/file1.txt';
      const testPath2 = 'dir/file2.txt';

      await adapter.writeFile(testPath1, testData);
      await adapter.writeFile(testPath2, testData);

      const files = await adapter.listFiles('dir/');
      
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThanOrEqual(2);

      // 清理
      await adapter.deleteFile(testPath1);
      await adapter.deleteFile(testPath2);
    });
  });

  describe('文件系统接口', () => {
    it('应该能够获取文件状态', async () => {
      await adapter.writeFile(testPath, testData);
      
      const fs = adapter.getFileSystem();
      const stats = await fs.stat(testPath);

      expect(stats).toBeDefined();
      expect(stats.size).toBe(testData.byteLength);
      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
      expect(stats.createdAt).toBeInstanceOf(Date);
      expect(stats.modifiedAt).toBeInstanceOf(Date);
    });

    it('mkdir应该成功执行（即使是空操作）', async () => {
      const fs = adapter.getFileSystem();
      await expect(fs.mkdir('some/path')).resolves.not.toThrow();
    });

    it('rmdir应该成功执行（即使是空操作）', async () => {
      const fs = adapter.getFileSystem();
      await expect(fs.rmdir('some/path')).resolves.not.toThrow();
    });
  });

  describe('更新文件', () => {
    it('应该能够更新已存在的文件', async () => {
      // 写入初始数据
      await adapter.writeFile(testPath, testData);
      
      // 更新数据
      const newData = new TextEncoder().encode('Updated content').buffer;
      await adapter.writeFile(testPath, newData);

      // 读取并验证
      const result = await adapter.readFile(testPath);
      const resultArray = new Uint8Array(result);
      const newArray = new Uint8Array(newData);
      
      expect(resultArray).toEqual(newArray);
    });

    it('更新文件应该保持创建时间不变', async () => {
      const fs = adapter.getFileSystem();
      
      // 创建文件
      await adapter.writeFile(testPath, testData);
      const stats1 = await fs.stat(testPath);

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10));

      // 更新文件
      const newData = new TextEncoder().encode('Updated').buffer;
      await adapter.writeFile(testPath, newData);
      const stats2 = await fs.stat(testPath);

      // 创建时间应该相同
      expect(stats2.createdAt.getTime()).toBe(stats1.createdAt.getTime());
      
      // 修改时间应该不同
      expect(stats2.modifiedAt.getTime()).toBeGreaterThanOrEqual(stats1.modifiedAt.getTime());
    });
  });
});
