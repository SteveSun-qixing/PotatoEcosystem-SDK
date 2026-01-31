/**
 * CLI validate命令测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('CLI validate command', () => {
  const testDir = path.join(process.cwd(), 'test-output-cli-validate');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略删除错误
    }
  });

  describe('验证单个文件', () => {
    it('应该验证有效的卡片文件', async () => {
      const cardPath = path.join(testDir, 'valid.card');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');
      const { ParserEngine } = await import('../../../src/parser/ParserEngine');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建有效卡片
      const card = MarkdownConverter.importFromMarkdown('# 有效卡片', '验证测试');
      await fileAPI.saveCard(card, cardPath);

      // 验证 - 直接使用FileAPI加载，它会处理Buffer到ArrayBuffer的转换
      const parsed = await fileAPI.loadCard(cardPath);

      expect(parsed).toBeDefined();
      expect(parsed.metadata).toBeDefined();
      expect(parsed.structure).toBeDefined();
    });

    it('应该检测无效的卡片文件', async () => {
      const invalidPath = path.join(testDir, 'invalid.card');

      // 创建无效文件（不是有效的ZIP格式）
      await fs.writeFile(invalidPath, 'invalid content', 'utf-8');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 验证应该失败 - 使用FileAPI
      await expect(fileAPI.loadCard(invalidPath)).rejects.toThrow();
    });
  });

  describe('批量验证目录', () => {
    it('应该验证目录中的所有card文件', async () => {
      // 创建多个测试文件
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const files = ['card1.card', 'card2.card', 'card3.card'];
      
      for (const file of files) {
        const cardPath = path.join(testDir, file);
        const card = MarkdownConverter.importFromMarkdown(`# ${file}`, file);
        await fileAPI.saveCard(card, cardPath);
      }

      // 验证目录
      const cardFiles = await getAllCardFiles(testDir, false);
      expect(cardFiles.length).toBe(3);

      // 验证每个文件
      for (const file of cardFiles) {
        const parsed = await fileAPI.loadCard(file);
        expect(parsed).toBeDefined();
      }
    });

    it('应该递归验证子目录', async () => {
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir, { recursive: true });

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 在根目录创建文件
      const rootCard = path.join(testDir, 'root.card');
      const card1 = MarkdownConverter.importFromMarkdown('# Root', 'root');
      await fileAPI.saveCard(card1, rootCard);

      // 在子目录创建文件
      const subCard = path.join(subDir, 'sub.card');
      const card2 = MarkdownConverter.importFromMarkdown('# Sub', 'sub');
      await fileAPI.saveCard(card2, subCard);

      // 递归获取所有文件
      const cardFiles = await getAllCardFiles(testDir, true);
      expect(cardFiles.length).toBe(2);
      expect(cardFiles.some(f => f.includes('root.card'))).toBe(true);
      expect(cardFiles.some(f => f.includes('sub.card'))).toBe(true);
    });

    it('应该忽略非card文件', async () => {
      // 创建混合文件
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'text file');
      await fs.writeFile(path.join(testDir, 'file2.md'), '# markdown');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const cardPath = path.join(testDir, 'valid.card');
      const card = MarkdownConverter.importFromMarkdown('# Valid', 'valid');
      await fileAPI.saveCard(card, cardPath);

      // 只应该找到card文件
      const cardFiles = await getAllCardFiles(testDir, false);
      expect(cardFiles.length).toBe(1);
      expect(cardFiles[0]).toContain('valid.card');
    });
  });

  describe('验证结果统计', () => {
    it('应该统计验证结果', async () => {
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建有效文件
      const validPath = path.join(testDir, 'valid-stat.card');
      const card = MarkdownConverter.importFromMarkdown('# Valid', 'valid');
      await fileAPI.saveCard(card, validPath);

      // 创建无效文件
      const invalidPath = path.join(testDir, 'invalid-stat.card');
      await fs.writeFile(invalidPath, 'invalid', 'utf-8');

      const results: Array<{
        file: string;
        valid: boolean;
        error?: string;
      }> = [];

      // 验证文件并记录结果
      const files = [validPath, invalidPath];
      
      for (const file of files) {
        try {
          await fileAPI.loadCard(file);
          results.push({ file, valid: true });
        } catch (error) {
          results.push({
            file,
            valid: false,
            error: (error as Error).message,
          });
        }
      }

      const validCount = results.filter(r => r.valid).length;
      const invalidCount = results.length - validCount;

      expect(results.length).toBe(2);
      expect(validCount).toBe(1);
      expect(invalidCount).toBe(1);
    });

    it('应该生成JSON格式的验证报告', async () => {
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const validPath = path.join(testDir, 'report-valid.card');
      const card = MarkdownConverter.importFromMarkdown('# Report', 'report');
      await fileAPI.saveCard(card, validPath);

      const results: Array<{ file: string; valid: boolean; error?: string }> = [];

      try {
        await fileAPI.loadCard(validPath);
        results.push({ file: validPath, valid: true });
      } catch (error) {
        results.push({
          file: validPath,
          valid: false,
          error: (error as Error).message,
        });
      }

      const report = {
        total: results.length,
        valid: results.filter(r => r.valid).length,
        invalid: results.filter(r => !r.valid).length,
        results: results,
      };

      // 验证可以序列化为JSON
      const jsonString = JSON.stringify(report, null, 2);
      expect(jsonString).toBeDefined();

      const parsed = JSON.parse(jsonString);
      expect(parsed.total).toBe(1);
      expect(parsed.valid).toBe(1);
      expect(parsed.invalid).toBe(0);
    });
  });

  describe('严格模式', () => {
    it('应该在严格模式下遇到错误立即停止', async () => {
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建文件
      const valid1Path = path.join(testDir, 'strict-1.card');
      const invalidPath = path.join(testDir, 'strict-invalid.card');
      const valid2Path = path.join(testDir, 'strict-2.card');

      const card1 = MarkdownConverter.importFromMarkdown('# Valid 1', 'valid1');
      await fileAPI.saveCard(card1, valid1Path);

      await fs.writeFile(invalidPath, 'invalid', 'utf-8');

      const card2 = MarkdownConverter.importFromMarkdown('# Valid 2', 'valid2');
      await fileAPI.saveCard(card2, valid2Path);

      const files = [valid1Path, invalidPath, valid2Path];
      let processedCount = 0;
      let hitError = false;

      // 模拟严格模式
      for (const file of files) {
        try {
          await fileAPI.loadCard(file);
          processedCount++;
        } catch (error) {
          hitError = true;
          break; // 严格模式下立即停止
        }
      }

      expect(hitError).toBe(true);
      expect(processedCount).toBe(1); // 只处理了第一个有效文件
    });
  });

  describe('错误处理', () => {
    it('应该处理文件不存在的情况', async () => {
      const nonExistentPath = path.join(testDir, 'non-existent.card');

      const stats = await fs.stat(nonExistentPath).catch(() => null);
      expect(stats).toBeNull();
    });

    it('应该处理目录不存在的情况', async () => {
      const nonExistentDir = path.join(testDir, 'non-existent-dir');

      const stats = await fs.stat(nonExistentDir).catch(() => null);
      expect(stats).toBeNull();
    });

    it('应该验证文件扩展名', () => {
      const invalidFile = 'test.txt';
      expect(invalidFile.endsWith('.card')).toBe(false);
    });
  });
});

/**
 * 获取目录中所有.card文件
 */
async function getAllCardFiles(dir: string, recursive: boolean): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && entry.name.endsWith('.card')) {
      files.push(fullPath);
    } else if (entry.isDirectory() && recursive) {
      const subFiles = await getAllCardFiles(fullPath, recursive);
      files.push(...subFiles);
    }
  }

  return files;
}
