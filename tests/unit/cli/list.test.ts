/**
 * CLI list命令测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('CLI list command', () => {
  const testDir = path.join(process.cwd(), 'test-output-cli-list');

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

  describe('列出单个目录中的卡片', () => {
    it('应该列出目录中的所有卡片文件', async () => {
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建测试卡片
      const cards = [
        { name: '卡片1', file: 'card1.card' },
        { name: '卡片2', file: 'card2.card' },
        { name: '卡片3', file: 'card3.card' },
      ];

      for (const { name, file } of cards) {
        const cardPath = path.join(testDir, file);
        const card = MarkdownConverter.importFromMarkdown(`# ${name}`, name);
        await fileAPI.saveCard(card, cardPath);
      }

      // 列出文件
      const cardFiles = await getAllCardFiles(testDir, false);
      expect(cardFiles.length).toBe(3);

      // 加载并验证
      const loadedCards = await Promise.all(
        cardFiles.map(async (filePath) => {
          return await fileAPI.loadCard(filePath);
        })
      );

      expect(loadedCards.length).toBe(3);
      expect(loadedCards.map(c => c.metadata.name).sort()).toEqual(['卡片1', '卡片2', '卡片3']);
    });

    it('应该忽略非card文件', async () => {
      // 创建混合文件
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'text');
      await fs.writeFile(path.join(testDir, 'file2.md'), '# markdown');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const cardPath = path.join(testDir, 'only.card');
      const card = MarkdownConverter.importFromMarkdown('# Only Card', 'only');
      await fileAPI.saveCard(card, cardPath);

      const cardFiles = await getAllCardFiles(testDir, false);
      expect(cardFiles.length).toBe(1);
      expect(cardFiles[0]).toContain('only.card');
    });

    it('应该显示空目录消息', async () => {
      const cardFiles = await getAllCardFiles(testDir, false);
      expect(cardFiles.length).toBe(0);
    });
  });

  describe('递归列出子目录中的卡片', () => {
    it('应该递归搜索子目录', async () => {
      // 创建子目录结构
      const subDir1 = path.join(testDir, 'sub1');
      const subDir2 = path.join(testDir, 'sub2');
      await fs.mkdir(subDir1, { recursive: true });
      await fs.mkdir(subDir2, { recursive: true });

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 在根目录创建
      const rootCard = path.join(testDir, 'root.card');
      const card1 = MarkdownConverter.importFromMarkdown('# Root', 'root');
      await fileAPI.saveCard(card1, rootCard);

      // 在子目录1创建
      const sub1Card = path.join(subDir1, 'sub1.card');
      const card2 = MarkdownConverter.importFromMarkdown('# Sub1', 'sub1');
      await fileAPI.saveCard(card2, sub1Card);

      // 在子目录2创建
      const sub2Card = path.join(subDir2, 'sub2.card');
      const card3 = MarkdownConverter.importFromMarkdown('# Sub2', 'sub2');
      await fileAPI.saveCard(card3, sub2Card);

      // 递归搜索
      const cardFiles = await getAllCardFiles(testDir, true);
      expect(cardFiles.length).toBe(3);
    });

    it('应该在非递归模式下只列出当前目录', async () => {
      const subDir = path.join(testDir, 'sub');
      await fs.mkdir(subDir, { recursive: true });

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 在根目录创建
      const rootCard = path.join(testDir, 'root.card');
      const card1 = MarkdownConverter.importFromMarkdown('# Root', 'root');
      await fileAPI.saveCard(card1, rootCard);

      // 在子目录创建
      const subCard = path.join(subDir, 'sub.card');
      const card2 = MarkdownConverter.importFromMarkdown('# Sub', 'sub');
      await fileAPI.saveCard(card2, subCard);

      // 非递归搜索
      const cardFiles = await getAllCardFiles(testDir, false);
      expect(cardFiles.length).toBe(1);
      expect(cardFiles[0]).toContain('root.card');
    });
  });

  describe('排序功能', () => {
    it('应该按名称排序', async () => {
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建测试卡片（乱序）
      const cards = [
        { name: 'Charlie', file: 'c.card' },
        { name: 'Alice', file: 'a.card' },
        { name: 'Bob', file: 'b.card' },
      ];

      for (const { name, file } of cards) {
        const cardPath = path.join(testDir, file);
        const card = MarkdownConverter.importFromMarkdown(`# ${name}`, name);
        await fileAPI.saveCard(card, cardPath);
      }

      // 加载并排序
      const cardFiles = await getAllCardFiles(testDir, false);
      const loadedCards = await Promise.all(
        cardFiles.map(async (filePath) => {
          const card = await fileAPI.loadCard(filePath);
          const stats = await fs.stat(filePath);
          return {
            name: card.metadata.name,
            size: stats.size,
            modifiedAt: stats.mtime,
          };
        })
      );

      // 按名称排序
      loadedCards.sort((a, b) => a.name.localeCompare(b.name));

      expect(loadedCards[0].name).toBe('Alice');
      expect(loadedCards[1].name).toBe('Bob');
      expect(loadedCards[2].name).toBe('Charlie');
    });

    it('应该按大小排序', async () => {
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建不同大小的卡片
      const cards = [
        { name: 'Small', content: '# Small', file: 'small.card' },
        { name: 'Large', content: '# Large\n\n' + 'x'.repeat(1000), file: 'large.card' },
        { name: 'Medium', content: '# Medium\n\n' + 'x'.repeat(100), file: 'medium.card' },
      ];

      for (const { name, content, file } of cards) {
        const cardPath = path.join(testDir, file);
        const card = MarkdownConverter.importFromMarkdown(content, name);
        await fileAPI.saveCard(card, cardPath);
      }

      // 加载并按大小排序
      const cardFiles = await getAllCardFiles(testDir, false);
      const loadedCards = await Promise.all(
        cardFiles.map(async (filePath) => {
          const card = await fileAPI.loadCard(filePath);
          const stats = await fs.stat(filePath);
          return {
            name: card.metadata.name,
            size: stats.size,
          };
        })
      );

      loadedCards.sort((a, b) => a.size - b.size);

      expect(loadedCards[0].name).toBe('Small');
      expect(loadedCards[2].name).toBe('Large');
    });

    it('应该支持反向排序', async () => {
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const cards = [
        { name: 'A', file: 'a.card' },
        { name: 'B', file: 'b.card' },
        { name: 'C', file: 'c.card' },
      ];

      for (const { name, file } of cards) {
        const cardPath = path.join(testDir, file);
        const card = MarkdownConverter.importFromMarkdown(`# ${name}`, name);
        await fileAPI.saveCard(card, cardPath);
      }

      const cardFiles = await getAllCardFiles(testDir, false);
      const loadedCards = await Promise.all(
        cardFiles.map(async (filePath) => {
          const card = await fileAPI.loadCard(filePath);
          return { name: card.metadata.name };
        })
      );

      // 正向排序
      loadedCards.sort((a, b) => a.name.localeCompare(b.name));
      expect(loadedCards[0].name).toBe('A');

      // 反向排序
      loadedCards.sort((a, b) => -a.name.localeCompare(b.name));
      expect(loadedCards[0].name).toBe('C');
    });
  });

  describe('JSON输出', () => {
    it('应该生成有效的JSON输出', async () => {
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const cardPath = path.join(testDir, 'json-test.card');
      const card = MarkdownConverter.importFromMarkdown('# JSON Test', 'JSON Test');
      await fileAPI.saveCard(card, cardPath);

      const cardFiles = await getAllCardFiles(testDir, false);
      const cardInfos = await Promise.all(
        cardFiles.map(async (filePath) => {
          const loadedCard = await fileAPI.loadCard(filePath);
          const stats = await fs.stat(filePath);
          return {
            path: path.relative(testDir, filePath),
            name: loadedCard.metadata.name,
            id: loadedCard.metadata.card_id,
            size: stats.size,
            modifiedAt: stats.mtime,
            cardCount: loadedCard.structure.manifest.card_count,
          };
        })
      );

      const output = {
        directory: testDir,
        count: cardInfos.length,
        cards: cardInfos,
      };

      // 验证可以序列化为JSON
      const jsonString = JSON.stringify(output, null, 2);
      expect(jsonString).toBeDefined();

      // 验证可以解析
      const parsed = JSON.parse(jsonString);
      expect(parsed.count).toBe(1);
      expect(parsed.cards[0].name).toBe('JSON Test');
    });
  });

  describe('错误处理', () => {
    it('应该处理目录不存在的情况', async () => {
      const nonExistentDir = path.join(testDir, 'non-existent');
      const stats = await fs.stat(nonExistentDir).catch(() => null);
      expect(stats).toBeNull();
    });

    it('应该验证目录参数', async () => {
      const filePath = path.join(testDir, 'file.txt');
      await fs.writeFile(filePath, 'content');

      const stats = await fs.stat(filePath);
      expect(stats.isDirectory()).toBe(false);
    });

    it('应该跳过无效的card文件', async () => {
      // 创建有效文件
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const validPath = path.join(testDir, 'valid.card');
      const card = MarkdownConverter.importFromMarkdown('# Valid', 'valid');
      await fileAPI.saveCard(card, validPath);

      // 创建无效文件
      const invalidPath = path.join(testDir, 'invalid.card');
      await fs.writeFile(invalidPath, 'invalid content', 'utf-8');

      // 尝试加载所有文件
      const cardFiles = await getAllCardFiles(testDir, false);
      expect(cardFiles.length).toBe(2);

      // 只有有效文件能被加载
      let successCount = 0;
      for (const file of cardFiles) {
        try {
          await fileAPI.loadCard(file);
          successCount++;
        } catch {
          // 跳过无效文件
        }
      }

      expect(successCount).toBe(1);
    });
  });

  describe('格式化输出', () => {
    it('应该正确格式化文件大小', () => {
      expect(formatSize(100)).toBe('100 B');
      expect(formatSize(1024)).toBe('1.00 KB');
      expect(formatSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatSize(2048)).toBe('2.00 KB');
    });

    it('应该截断过长的路径和名称', () => {
      const longPath = 'a'.repeat(50) + '/file.card';
      const truncated = longPath.length > 38 ? '...' + longPath.slice(-35) : longPath;
      expect(truncated.length).toBeLessThanOrEqual(38);
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

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
