/**
 * ZIP处理器测试
 */

import { describe, it, expect } from 'vitest';
import { ZipHandler } from '@/parser/ZipHandler';
import { ParseError } from '@/core/error';

describe('ZipHandler', () => {
  describe('create and generate', () => {
    it('应该创建空ZIP', async () => {
      const zip = ZipHandler.create();
      const data = await ZipHandler.generate(zip);

      expect(data).toBeInstanceOf(ArrayBuffer);
      expect(data.byteLength).toBeGreaterThan(0);
    });

    it('应该生成零压缩率的ZIP', async () => {
      const zip = ZipHandler.create();
      const testData = 'A'.repeat(1000); // 重复数据，压缩率会很高

      ZipHandler.addFile(zip, 'test.txt', testData);

      const data = await ZipHandler.generate(zip);
      
      // 零压缩率的ZIP文件大小应该接近原始数据大小
      // 实际会略大（因为ZIP头信息）
      expect(data.byteLength).toBeGreaterThan(testData.length);
    });
  });

  describe('addFile and readFile', () => {
    it('应该添加和读取文件', async () => {
      const zip = ZipHandler.create();
      const content = 'Test file content';

      ZipHandler.addFile(zip, 'test.txt', content);

      const readContent = await ZipHandler.readTextFile(zip, 'test.txt');
      expect(readContent).toBe(content);
    });

    it('应该添加和读取二进制文件', async () => {
      const zip = ZipHandler.create();
      const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;

      ZipHandler.addFile(zip, 'test.bin', buffer);

      const readBuffer = await ZipHandler.readFile(zip, 'test.bin');
      expect(readBuffer).not.toBeNull();
      expect(new Uint8Array(readBuffer!)).toEqual(new Uint8Array(buffer));
    });

    it('应该在文件不存在时返回null', async () => {
      const zip = ZipHandler.create();
      const content = await ZipHandler.readFile(zip, 'nonexistent.txt');

      expect(content).toBeNull();
    });
  });

  describe('addFolder', () => {
    it('应该添加文件夹', () => {
      const zip = ZipHandler.create();
      ZipHandler.addFolder(zip, 'test-folder');

      expect(ZipHandler.folderExists(zip, 'test-folder')).toBe(true);
    });
  });

  describe('listFiles', () => {
    it('应该列出所有文件', () => {
      const zip = ZipHandler.create();

      ZipHandler.addFile(zip, 'file1.txt', 'content1');
      ZipHandler.addFile(zip, 'file2.txt', 'content2');
      ZipHandler.addFile(zip, 'folder/file3.txt', 'content3');

      const files = ZipHandler.listFiles(zip);

      expect(files).toHaveLength(3);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).toContain('folder/file3.txt');
    });

    it('应该按路径过滤文件', () => {
      const zip = ZipHandler.create();

      ZipHandler.addFile(zip, 'folder/file1.txt', 'content1');
      ZipHandler.addFile(zip, 'folder/file2.txt', 'content2');
      ZipHandler.addFile(zip, 'other/file3.txt', 'content3');

      const files = ZipHandler.listFiles(zip, 'folder/');

      expect(files).toHaveLength(2);
      expect(files).toContain('folder/file1.txt');
      expect(files).toContain('folder/file2.txt');
    });
  });

  describe('fileExists', () => {
    it('应该检查文件是否存在', () => {
      const zip = ZipHandler.create();
      ZipHandler.addFile(zip, 'test.txt', 'content');

      expect(ZipHandler.fileExists(zip, 'test.txt')).toBe(true);
      expect(ZipHandler.fileExists(zip, 'nonexistent.txt')).toBe(false);
    });
  });

  describe('removeFile', () => {
    it('应该删除文件', () => {
      const zip = ZipHandler.create();
      ZipHandler.addFile(zip, 'test.txt', 'content');

      expect(ZipHandler.fileExists(zip, 'test.txt')).toBe(true);

      ZipHandler.removeFile(zip, 'test.txt');

      expect(ZipHandler.fileExists(zip, 'test.txt')).toBe(false);
    });
  });

  describe('read', () => {
    it('应该读取有效的ZIP文件', async () => {
      const zip = ZipHandler.create();
      ZipHandler.addFile(zip, 'test.txt', 'content');

      const data = await ZipHandler.generate(zip);
      const readZip = await ZipHandler.read(data);

      const content = await ZipHandler.readTextFile(readZip, 'test.txt');
      expect(content).toBe('content');
    });

    it('应该在ZIP无效时抛出错误', async () => {
      const invalidData = new Uint8Array([1, 2, 3]).buffer;

      await expect(ZipHandler.read(invalidData)).rejects.toThrow(ParseError);
    });
  });
});
