import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  getExtension,
  getFileName,
  getBaseName,
  getDirPath,
  joinPath,
  isSafePath,
  isCardFile,
  isBoxFile,
  isChipsFile,
  getRelativePath,
  resolvePath,
} from '../../../src/utils/path';

describe('路径工具', () => {
  describe('normalizePath', () => {
    it('应该将反斜杠转换为正斜杠', () => {
      expect(normalizePath('a\\b\\c')).toBe('a/b/c');
    });

    it('应该去除多余的斜杠', () => {
      expect(normalizePath('a//b///c')).toBe('a/b/c');
    });

    it('应该处理混合情况', () => {
      expect(normalizePath('a\\\\b//c')).toBe('a/b/c');
    });
  });

  describe('getExtension', () => {
    it('应该返回小写扩展名', () => {
      expect(getExtension('file.Card')).toBe('card');
      expect(getExtension('file.BOX')).toBe('box');
    });

    it('应该处理无扩展名的情况', () => {
      expect(getExtension('noext')).toBe('');
      expect(getExtension('path/to/noext')).toBe('');
    });

    it('应该处理多个点的情况', () => {
      expect(getExtension('file.test.card')).toBe('card');
    });
  });

  describe('getFileName', () => {
    it('应该返回文件名', () => {
      expect(getFileName('/path/to/file.card')).toBe('file.card');
      expect(getFileName('file.card')).toBe('file.card');
    });

    it('应该处理 Windows 路径', () => {
      expect(getFileName('C:\\path\\to\\file.card')).toBe('file.card');
    });
  });

  describe('getBaseName', () => {
    it('应该返回不含扩展名的文件名', () => {
      expect(getBaseName('/path/to/file.card')).toBe('file');
      expect(getBaseName('file.card')).toBe('file');
    });

    it('应该处理无扩展名的文件', () => {
      expect(getBaseName('noext')).toBe('noext');
    });
  });

  describe('getDirPath', () => {
    it('应该返回目录路径', () => {
      expect(getDirPath('/path/to/file.card')).toBe('/path/to');
    });

    it('应该处理无目录的情况', () => {
      expect(getDirPath('file.card')).toBe('');
    });
  });

  describe('joinPath', () => {
    it('应该连接路径', () => {
      expect(joinPath('path', 'to', 'file.card')).toBe('path/to/file.card');
    });

    it('应该忽略空值', () => {
      expect(joinPath('path', '', 'file.card')).toBe('path/file.card');
    });

    it('应该规范化结果', () => {
      expect(joinPath('path/', '/to/', '/file.card')).toBe('path/to/file.card');
    });
  });

  describe('isSafePath', () => {
    it('应该接受安全路径', () => {
      expect(isSafePath('normal/path')).toBe(true);
      expect(isSafePath('file.card')).toBe(true);
    });

    it('应该拒绝路径遍历', () => {
      expect(isSafePath('../parent')).toBe(false);
      expect(isSafePath('path/../other')).toBe(false);
    });

    it('应该拒绝绝对路径', () => {
      expect(isSafePath('/absolute/path')).toBe(false);
    });

    it('应该拒绝协议前缀', () => {
      expect(isSafePath('file://path')).toBe(false);
      expect(isSafePath('http://example.com')).toBe(false);
    });
  });

  describe('isCardFile / isBoxFile / isChipsFile', () => {
    it('应该正确识别卡片文件', () => {
      expect(isCardFile('test.card')).toBe(true);
      expect(isCardFile('test.CARD')).toBe(true);
      expect(isCardFile('test.box')).toBe(false);
    });

    it('应该正确识别箱子文件', () => {
      expect(isBoxFile('test.box')).toBe(true);
      expect(isBoxFile('test.BOX')).toBe(true);
      expect(isBoxFile('test.card')).toBe(false);
    });

    it('应该正确识别薯片文件', () => {
      expect(isChipsFile('test.card')).toBe(true);
      expect(isChipsFile('test.box')).toBe(true);
      expect(isChipsFile('test.txt')).toBe(false);
    });
  });

  describe('getRelativePath', () => {
    it('应该计算相对路径', () => {
      expect(getRelativePath('a/b/c', 'a/b/d')).toBe('../d');
      expect(getRelativePath('a/b', 'a/b/c/d')).toBe('c/d');
    });

    it('应该处理相同路径', () => {
      expect(getRelativePath('a/b', 'a/b')).toBe('.');
    });
  });

  describe('resolvePath', () => {
    it('应该解析路径变量', () => {
      expect(resolvePath('{base}/file.card', { base: '/root' })).toBe('/root/file.card');
    });

    it('应该保留未定义的变量', () => {
      expect(resolvePath('{unknown}/file.card', {})).toBe('{unknown}/file.card');
    });
  });
});
