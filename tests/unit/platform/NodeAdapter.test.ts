/**
 * NodeAdapter 测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NodeAdapter } from '../../../src/platform/node/NodeAdapter';
import { Platform } from '../../../src/types';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

describe('NodeAdapter', () => {
  let adapter: NodeAdapter;
  let testDir: string;
  let testPath: string;
  const testData = new TextEncoder().encode('Hello, World!').buffer;

  beforeEach(async () => {
    adapter = new NodeAdapter();
    
    // 创建临时测试目录
    testDir = path.join(os.tmpdir(), `chips-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    testPath = path.join(testDir, 'test-file.txt');
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // 忽略错误
    }
  });

  describe('基础属性', () => {
    it('应该返回正确的平台类型', () => {
      expect(adapter.platform).toBe(Platform.Node);
    });

    it('应该提供文件系统接口', () => {
      const fileSystem = adapter.getFileSystem();
      expect(fileSystem).toBeDefined();
      expect(typeof fileSystem.readFile).toBe('function');
      expect(typeof fileSystem.writeFile).toBe('function');
      expect(typeof fileSystem.exists).toBe('function');
      expect(typeof fileSystem.stat).toBe('function');
      expect(typeof fileSystem.mkdir).toBe('function');
      expect(typeof fileSystem.readdir).toBe('function');
      expect(typeof fileSystem.unlink).toBe('function');
      expect(typeof fileSystem.rmdir).toBe('function');
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
      const nonexistentPath = path.join(testDir, 'nonexistent.txt');
      await expect(adapter.readFile(nonexistentPath)).rejects.toThrow();
    });

    it('写入文件时应该自动创建父目录', async () => {
      const nestedPath = path.join(testDir, 'nested', 'dir', 'file.txt');
      
      await adapter.writeFile(nestedPath, testData);
      
      expect(await adapter.exists(nestedPath)).toBe(true);
      const result = await adapter.readFile(nestedPath);
      expect(result.byteLength).toBe(testData.byteLength);
    });
  });

  describe('目录操作', () => {
    it('应该能够列出目录中的文件', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');
      const subdir = path.join(testDir, 'subdir');

      // 创建文件和子目录
      await adapter.writeFile(file1, testData);
      await adapter.writeFile(file2, testData);
      await fs.mkdir(subdir);

      const files = await adapter.listFiles(testDir);

      expect(files).toHaveLength(2);
      expect(files).toContain(file1);
      expect(files).toContain(file2);
      expect(files).not.toContain(subdir); // 不应包含目录
    });

    it('应该能够列出空目录', async () => {
      const emptyDir = path.join(testDir, 'empty');
      await fs.mkdir(emptyDir);

      const files = await adapter.listFiles(emptyDir);
      expect(files).toHaveLength(0);
    });

    it('列出不存在的目录应该抛出错误', async () => {
      const nonexistentDir = path.join(testDir, 'nonexistent');
      await expect(adapter.listFiles(nonexistentDir)).rejects.toThrow();
    });
  });

  describe('文件系统接口', () => {
    it('应该能够获取文件状态', async () => {
      await adapter.writeFile(testPath, testData);
      
      const fileSystem = adapter.getFileSystem();
      const stats = await fileSystem.stat(testPath);

      expect(stats).toBeDefined();
      expect(stats.size).toBe(testData.byteLength);
      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
      expect(stats.createdAt).toBeInstanceOf(Date);
      expect(stats.modifiedAt).toBeInstanceOf(Date);
    });

    it('应该能够创建目录', async () => {
      const fileSystem = adapter.getFileSystem();
      const newDir = path.join(testDir, 'newdir');

      await fileSystem.mkdir(newDir);
      
      const stats = await fileSystem.stat(newDir);
      expect(stats.isDirectory).toBe(true);
    });

    it('应该能够递归创建目录', async () => {
      const fileSystem = adapter.getFileSystem();
      const nestedDir = path.join(testDir, 'a', 'b', 'c');

      await fileSystem.mkdir(nestedDir, { recursive: true });
      
      const stats = await fileSystem.stat(nestedDir);
      expect(stats.isDirectory).toBe(true);
    });

    it('应该能够读取目录内容', async () => {
      const fileSystem = adapter.getFileSystem();
      
      // 创建文件
      await adapter.writeFile(path.join(testDir, 'file1.txt'), testData);
      await adapter.writeFile(path.join(testDir, 'file2.txt'), testData);

      const entries = await fileSystem.readdir(testDir);
      
      expect(entries).toContain('file1.txt');
      expect(entries).toContain('file2.txt');
    });

    it('应该能够删除空目录', async () => {
      const fileSystem = adapter.getFileSystem();
      const emptyDir = path.join(testDir, 'empty');

      await fileSystem.mkdir(emptyDir);
      expect(await fileSystem.exists(emptyDir)).toBe(true);

      await fileSystem.rmdir(emptyDir);
      expect(await fileSystem.exists(emptyDir)).toBe(false);
    });

    it('应该能够递归删除目录', async () => {
      const fileSystem = adapter.getFileSystem();
      const nestedDir = path.join(testDir, 'parent', 'child');

      await fileSystem.mkdir(nestedDir, { recursive: true });
      await fileSystem.writeFile(
        path.join(nestedDir, 'file.txt'),
        testData
      );

      await fileSystem.rmdir(path.join(testDir, 'parent'), { recursive: true });
      expect(await fileSystem.exists(path.join(testDir, 'parent'))).toBe(false);
    });
  });

  describe('二进制数据处理', () => {
    it('应该能够正确处理二进制数据', async () => {
      // 创建二进制数据
      const binaryData = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);
      const arrayBuffer = binaryData.buffer;

      await adapter.writeFile(testPath, arrayBuffer);
      const result = await adapter.readFile(testPath);

      const resultArray = new Uint8Array(result);
      expect(resultArray).toEqual(binaryData);
    });

    it('应该能够处理大文件', async () => {
      // 创建1MB的数据
      const largeData = new Uint8Array(1024 * 1024);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }

      await adapter.writeFile(testPath, largeData.buffer);
      const result = await adapter.readFile(testPath);

      expect(result.byteLength).toBe(largeData.byteLength);
      
      const resultArray = new Uint8Array(result);
      expect(resultArray).toEqual(largeData);
    });
  });

  describe('错误处理', () => {
    it('删除不存在的文件应该抛出错误', async () => {
      const nonexistentPath = path.join(testDir, 'nonexistent.txt');
      await expect(adapter.deleteFile(nonexistentPath)).rejects.toThrow();
    });

    it('读取目录作为文件应该抛出错误', async () => {
      await expect(adapter.readFile(testDir)).rejects.toThrow();
    });
  });
});
