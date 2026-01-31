/**
 * 编辑器文档测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorDocument, DocumentChangeType } from '@/editor/EditorDocument';
import { Logger } from '@/core/logger';
import { EventBus } from '@/core/event';
import { IdGenerator } from '@/core/id';
import type { Card } from '@/types';

describe('EditorDocument', () => {
  let document: EditorDocument;
  let card: Card;
  let logger: Logger;
  let eventBus: EventBus;

  beforeEach(() => {
    logger = new Logger({ enableConsole: false });
    eventBus = new EventBus();

    const cardId = IdGenerator.generate();
    const baseCardId = IdGenerator.generate();

    card = {
      metadata: {
        chip_standards_version: '1.0.0',
        card_id: cardId as any,
        name: '测试卡片',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      },
      structure: {
        structure: [
          {
            id: baseCardId as any,
            type: 'RichTextCard',
          },
        ],
        manifest: {
          card_count: 1,
          resource_count: 0,
        },
      },
      content: {
        [baseCardId]: {
          card_type: 'RichTextCard',
          content_source: 'inline',
          content_text: '初始内容',
        },
      },
    };

    document = new EditorDocument(card, logger, eventBus);
  });

  describe('构造函数', () => {
    it('应该从卡片中提取内容', () => {
      expect(document.getContent()).toBe('初始内容');
    });

    it('应该初始化版本为0', () => {
      expect(document.getVersion()).toBe(0);
    });

    it('应该标记为未修改', () => {
      expect(document.isModified()).toBe(false);
    });
  });

  describe('insert', () => {
    it('应该在指定位置插入文本', () => {
      document.insert(0, '前缀');
      expect(document.getContent()).toBe('前缀初始内容');
      expect(document.getVersion()).toBe(1);
      expect(document.isModified()).toBe(true);
    });

    it('应该在中间插入文本', () => {
      document.insert(2, '中间');
      expect(document.getContent()).toBe('初始中间内容');
    });

    it('应该在末尾插入文本', () => {
      document.insert(document.getLength(), '后缀');
      expect(document.getContent()).toBe('初始内容后缀');
    });

    it('应该抛出错误如果位置无效', () => {
      expect(() => document.insert(-1, 'text')).toThrow();
      expect(() => document.insert(1000, 'text')).toThrow();
    });
  });

  describe('delete', () => {
    it('应该删除指定范围的文本', () => {
      document.delete(0, 2);
      expect(document.getContent()).toBe('内容');
      expect(document.getVersion()).toBe(1);
      expect(document.isModified()).toBe(true);
    });

    it('应该抛出错误如果范围无效', () => {
      expect(() => document.delete(-1, 1)).toThrow();
      expect(() => document.delete(0, 1000)).toThrow();
    });
  });

  describe('replace', () => {
    it('应该替换指定范围的文本', () => {
      document.replace(0, 2, '新');
      expect(document.getContent()).toBe('新内容');
      expect(document.getVersion()).toBe(1);
    });

    it('应该抛出错误如果范围无效', () => {
      expect(() => document.replace(-1, 1, 'text')).toThrow();
      expect(() => document.replace(0, 1000, 'text')).toThrow();
    });
  });

  describe('setContent', () => {
    it('应该更新整个内容', () => {
      document.setContent('新内容');
      expect(document.getContent()).toBe('新内容');
      expect(document.getVersion()).toBe(1);
      expect(document.isModified()).toBe(true);
    });
  });

  describe('getText', () => {
    it('应该获取指定范围的文本', () => {
      expect(document.getText(0, 2)).toBe('初始');
    });

    it('应该抛出错误如果范围无效', () => {
      expect(() => document.getText(-1, 1)).toThrow();
      expect(() => document.getText(0, 1000)).toThrow();
      expect(() => document.getText(2, 1)).toThrow();
    });
  });

  describe('markAsSaved', () => {
    it('应该标记为已保存', () => {
      document.insert(0, 'test');
      expect(document.isModified()).toBe(true);

      document.markAsSaved();
      expect(document.isModified()).toBe(false);
    });
  });

  describe('reset', () => {
    it('应该重置文档到初始状态', () => {
      document.insert(0, 'test');
      document.replace(0, 4, 'new');

      document.reset();

      expect(document.getContent()).toBe('初始内容');
      expect(document.getVersion()).toBe(0);
      expect(document.isModified()).toBe(false);
    });
  });

  describe('事件', () => {
    it('应该在插入时触发事件', () => {
      const listener = vi.fn();
      eventBus.on('document:change', listener);

      document.insert(0, 'test');

      expect(listener).toHaveBeenCalled();
    });

    it('应该在保存时触发事件', () => {
      const listener = vi.fn();
      eventBus.on('document:saved', listener);

      document.insert(0, 'test');
      document.markAsSaved();

      expect(listener).toHaveBeenCalled();
    });
  });
});
