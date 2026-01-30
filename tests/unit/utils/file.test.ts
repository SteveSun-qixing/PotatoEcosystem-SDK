/**
 * 文件工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  getFileExtension,
  getBaseName,
  isRelativePath,
  isURL,
  resolveNameConflict,
  isPathSafe,
  formatFileSize,
} from '@/utils/file';

describe('file utils', () => {
  describe('normalizePath', () => {
    it('应该将反斜杠转换为正斜杠', () => {
      expect(normalizePath('folder\\file.txt')).toBe('folder/file.txt');
      expect(normalizePath('C:\\Users\\name\\file.txt')).toBe(
        'C:/Users/name/file.txt'
      );
    });

    it('应该保持正斜杠不变', () => {
      expect(normalizePath('folder/file.txt')).toBe('folder/file.txt');
    });
  });

  describe('getFileExtension', () => {
    it('应该获取文件扩展名', () => {
      expect(getFileExtension('file.txt')).toBe('.txt');
      expect(getFileExtension('image.jpg')).toBe('.jpg');
      expect(getFileExtension('archive.tar.gz')).toBe('.gz');
    });

    it('应该处理无扩展名的文件', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('Makefile')).toBe('');
    });
  });

  describe('getBaseName', () => {
    it('应该获取文件名（不含扩展名）', () => {
      expect(getBaseName('file.txt')).toBe('file');
      expect(getBaseName('image.jpg')).toBe('image');
    });

    it('应该处理路径中的文件名', () => {
      expect(getBaseName('folder/file.txt')).toBe('file');
      expect(getBaseName('C:\\folder\\file.txt')).toBe('file');
    });
  });

  describe('isRelativePath', () => {
    it('应该识别相对路径', () => {
      expect(isRelativePath('folder/file.txt')).toBe(true);
      expect(isRelativePath('file.txt')).toBe(true);
      expect(isRelativePath('./file.txt')).toBe(true);
    });

    it('应该识别绝对路径', () => {
      expect(isRelativePath('/usr/local/file.txt')).toBe(false);
      expect(isRelativePath('C:\\Users\\file.txt')).toBe(false);
    });

    it('应该识别URL', () => {
      expect(isRelativePath('https://example.com/file.txt')).toBe(false);
      expect(isRelativePath('http://localhost/file.txt')).toBe(false);
    });
  });

  describe('isURL', () => {
    it('应该识别HTTP(S) URL', () => {
      expect(isURL('https://example.com')).toBe(true);
      expect(isURL('http://example.com')).toBe(true);
    });

    it('应该识别其他协议的URL', () => {
      expect(isURL('ftp://example.com')).toBe(true);
      expect(isURL('webdav://server/path')).toBe(true);
    });

    it('应该拒绝非URL字符串', () => {
      expect(isURL('example.com')).toBe(false);
      expect(isURL('/path/to/file')).toBe(false);
      expect(isURL('file.txt')).toBe(false);
    });
  });

  describe('resolveNameConflict', () => {
    it('应该返回原名称（如果无冲突）', () => {
      const existing = new Set(['file1.txt', 'file2.txt']);
      expect(resolveNameConflict('file3.txt', existing)).toBe('file3.txt');
    });

    it('应该添加序号解决冲突', () => {
      const existing = new Set(['file.txt']);
      expect(resolveNameConflict('file.txt', existing)).toBe('file-2.txt');
    });

    it('应该递增序号直到无冲突', () => {
      const existing = new Set(['file.txt', 'file-2.txt', 'file-3.txt']);
      expect(resolveNameConflict('file.txt', existing)).toBe('file-4.txt');
    });

    it('应该保留文件扩展名', () => {
      const existing = new Set(['image.jpg']);
      expect(resolveNameConflict('image.jpg', existing)).toBe('image-2.jpg');
    });
  });

  describe('isPathSafe', () => {
    it('应该接受安全路径', () => {
      expect(isPathSafe('folder/file.txt', '/base')).toBe(true);
      expect(isPathSafe('file.txt', '/base')).toBe(true);
    });

    it('应该拒绝包含..的路径', () => {
      expect(isPathSafe('../file.txt', '/base')).toBe(false);
      expect(isPathSafe('folder/../file.txt', '/base')).toBe(false);
      expect(isPathSafe('..\\file.txt', '/base')).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('应该格式化文件大小', () => {
      expect(formatFileSize(0)).toBe('0.00 B');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('应该处理非整数结果', () => {
      expect(formatFileSize(1536)).toBe('1.50 KB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.50 MB');
    });
  });
});
