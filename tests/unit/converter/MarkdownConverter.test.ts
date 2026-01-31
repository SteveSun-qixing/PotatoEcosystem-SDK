/**
 * Markdown转换器测试
 */

import { describe, it, expect } from 'vitest';
import { MarkdownConverter } from '@/converter/MarkdownConverter';
import { IdGenerator } from '@/core/id';

describe('MarkdownConverter', () => {
  describe('importFromMarkdown', () => {
    it('应该从Markdown导入为卡片', () => {
      const markdown = '# 标题\n\n这是一段文本';
      const card = MarkdownConverter.importFromMarkdown(markdown, '测试卡片');

      expect(card.metadata.name).toBe('测试卡片');
      expect(card.structure.structure).toHaveLength(1);
      expect(card.structure.structure[0]?.type).toBe('MarkdownCard');

      const baseCardId = card.structure.structure[0]?.id!;
      const config = card.content[baseCardId];

      expect(config).toBeDefined();
      expect(config?.card_type).toBe('MarkdownCard');
    });
  });

  describe('exportToMarkdown', () => {
    it('应该导出卡片为Markdown', () => {
      const cardId = IdGenerator.generate();
      const baseCardId = IdGenerator.generate();

      const card = {
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: cardId,
          name: '测试卡片',
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
        },
        structure: {
          structure: [{ id: baseCardId, type: 'MarkdownCard' }],
          manifest: { card_count: 1, resource_count: 0 },
        },
        content: {
          [baseCardId]: {
            card_type: 'MarkdownCard',
            content_source: 'inline',
            content_text: '# 标题\n\n内容',
          },
        },
      };

      const markdown = MarkdownConverter.exportToMarkdown(card);

      expect(markdown).toContain('# 测试卡片');
      expect(markdown).toContain('# 标题');
    });

    it('应该处理图片卡片', () => {
      const cardId = IdGenerator.generate();
      const baseCardId = IdGenerator.generate();

      const card = {
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: cardId,
          name: '图片卡片',
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
        },
        structure: {
          structure: [{ id: baseCardId, type: 'ImageCard' }],
          manifest: { card_count: 1, resource_count: 1 },
        },
        content: {
          [baseCardId]: {
            card_type: 'ImageCard',
            image_file: 'image.jpg',
            title: '测试图片',
          },
        },
      };

      const markdown = MarkdownConverter.exportToMarkdown(card);

      expect(markdown).toContain('![测试图片](image.jpg)');
    });
  });
});
