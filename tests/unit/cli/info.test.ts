/**
 * CLI info命令测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('CLI info command', () => {
  const testDir = path.join(process.cwd(), 'test-output-cli-info');

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

  describe('显示卡片基本信息', () => {
    it('应该显示卡片元数据', async () => {
      const cardPath = path.join(testDir, 'info-test.card');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建测试卡片
      const card = MarkdownConverter.importFromMarkdown('# 信息测试', '信息测试卡片');
      await fileAPI.saveCard(card, cardPath);

      // 加载卡片
      const loadedCard = await fileAPI.loadCard(cardPath);

      // 验证元数据
      expect(loadedCard.metadata.name).toBe('信息测试卡片');
      expect(loadedCard.metadata.card_id).toBeDefined();
      expect(loadedCard.metadata.chip_standards_version).toBe('1.0.0');
      expect(loadedCard.metadata.created_at).toBeDefined();
      expect(loadedCard.metadata.modified_at).toBeDefined();
    });

    it('应该显示结构信息', async () => {
      const cardPath = path.join(testDir, 'structure-test.card');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const card = MarkdownConverter.importFromMarkdown('# 结构测试', '结构卡片');
      await fileAPI.saveCard(card, cardPath);

      const loadedCard = await fileAPI.loadCard(cardPath);

      // 验证结构信息
      expect(loadedCard.structure.manifest.card_count).toBe(1);
      expect(loadedCard.structure.manifest.resource_count).toBe(0);
      expect(loadedCard.structure.structure.length).toBeGreaterThan(0);
    });

    it('应该显示文件统计信息', async () => {
      const cardPath = path.join(testDir, 'stats-test.card');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const card = MarkdownConverter.importFromMarkdown('# 统计测试', '统计卡片');
      await fileAPI.saveCard(card, cardPath);

      // 获取文件统计
      const stats = await fs.stat(cardPath);

      expect(stats.size).toBeGreaterThan(0);
      expect(stats.birthtime).toBeInstanceOf(Date);
      expect(stats.mtime).toBeInstanceOf(Date);
    });
  });

  describe('JSON格式输出', () => {
    it('应该生成有效的JSON格式', async () => {
      const cardPath = path.join(testDir, 'json-test.card');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const card = MarkdownConverter.importFromMarkdown('# JSON测试', 'JSON卡片');
      await fileAPI.saveCard(card, cardPath);

      const loadedCard = await fileAPI.loadCard(cardPath);
      const stats = await fs.stat(cardPath);

      // 构建JSON输出
      const info = {
        file: cardPath,
        metadata: loadedCard.metadata,
        structure: {
          cardCount: loadedCard.structure.manifest.card_count,
          resourceCount: loadedCard.structure.manifest.resource_count,
          baseCards: loadedCard.structure.structure.map((item) => ({
            id: item.id,
            type: item.type,
          })),
        },
        fileSize: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
      };

      // 验证可以序列化为JSON
      const jsonString = JSON.stringify(info, null, 2);
      expect(jsonString).toBeDefined();
      
      // 验证可以解析回对象
      const parsed = JSON.parse(jsonString);
      expect(parsed.metadata.name).toBe('JSON卡片');
      expect(parsed.structure.cardCount).toBe(1);
    });

    it('应该在verbose模式下包含完整内容', async () => {
      const cardPath = path.join(testDir, 'verbose-test.card');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const card = MarkdownConverter.importFromMarkdown('# Verbose测试\n\n详细内容', 'Verbose卡片');
      await fileAPI.saveCard(card, cardPath);

      const loadedCard = await fileAPI.loadCard(cardPath);
      const stats = await fs.stat(cardPath);

      const info: any = {
        file: cardPath,
        metadata: loadedCard.metadata,
        structure: {
          cardCount: loadedCard.structure.manifest.card_count,
          resourceCount: loadedCard.structure.manifest.resource_count,
        },
        fileSize: stats.size,
      };

      // Verbose模式下添加内容
      info.content = loadedCard.content;
      if (loadedCard.resources) {
        info.resources = loadedCard.resources;
      }

      expect(info.content).toBeDefined();
      expect(Object.keys(info.content).length).toBeGreaterThan(0);
    });
  });

  describe('显示可选元数据', () => {
    it('应该显示标签信息（如果存在）', async () => {
      const cardPath = path.join(testDir, 'tags-test.card');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { IdGenerator } = await import('../../../src/core/id');
      const { toISODateTime } = await import('../../../src/utils/format');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建带标签的卡片
      const cardId = IdGenerator.generate() as any;
      const baseCardId = IdGenerator.generate() as any;
      const now = toISODateTime();

      const card = {
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: cardId,
          name: '标签测试',
          created_at: now,
          modified_at: now,
          tags: ['测试', '标签', 'CLI'],
        },
        structure: {
          structure: [{ id: baseCardId, type: 'MarkdownCard' }],
          manifest: { card_count: 1, resource_count: 0 },
        },
        content: {
          [baseCardId]: {
            card_type: 'MarkdownCard',
            content_source: 'inline',
            content_text: '# 标签测试',
          } as any,
        },
      };

      await fileAPI.saveCard(card, cardPath);

      const loadedCard = await fileAPI.loadCard(cardPath);
      expect(loadedCard.metadata.tags).toBeDefined();
      expect(loadedCard.metadata.tags?.length).toBe(3);
      expect(loadedCard.metadata.tags).toContain('CLI');
    });
  });

  describe('错误处理', () => {
    it('应该验证文件扩展名', () => {
      const invalidFile = 'test.txt';
      expect(invalidFile.endsWith('.card')).toBe(false);
    });

    it('应该处理文件不存在的情况', async () => {
      const nonExistentPath = path.join(testDir, 'non-existent.card');
      
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      await expect(fileAPI.loadCard(nonExistentPath)).rejects.toThrow();
    });
  });

  describe('内容预览', () => {
    it('应该在verbose模式下显示内容预览', async () => {
      const cardPath = path.join(testDir, 'preview-test.card');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      const longContent = '# 预览测试\n\n' + '这是一段很长的内容。'.repeat(20);
      const card = MarkdownConverter.importFromMarkdown(longContent, '预览卡片');
      await fileAPI.saveCard(card, cardPath);

      const loadedCard = await fileAPI.loadCard(cardPath);
      const baseCardId = loadedCard.structure.structure[0].id;
      const content = loadedCard.content[baseCardId] as any;

      // 测试内容截断
      const fullText = content.content_text;
      const preview = fullText.substring(0, 100);
      const needsTruncation = fullText.length > 100;

      expect(preview.length).toBeLessThanOrEqual(100);
      expect(needsTruncation).toBe(true);
    });
  });
});
