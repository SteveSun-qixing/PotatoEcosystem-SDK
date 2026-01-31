/**
 * 编辑器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorEngine } from '@/editor/EditorEngine';
import { Logger } from '@/core/logger';
import { EventBus } from '@/core/event';
import { IdGenerator } from '@/core/id';
import type { Card } from '@/types';

// 模拟DOM环境
const createMockElement = () => {
  return {
    focus: vi.fn(),
    blur: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn(),
    className: '',
    dataset: {},
  } as unknown as HTMLElement;
};

describe('Editor', () => {
  let editor: ReturnType<EditorEngine['getEditor']>;
  let editorEngine: EditorEngine;
  let container: HTMLElement;
  let card: Card;
  let logger: Logger;
  let eventBus: EventBus;

  beforeEach(() => {
    logger = new Logger({ enableConsole: false });
    eventBus = new EventBus();
    container = createMockElement();

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

    editorEngine = new EditorEngine(logger, eventBus);
    const editorId = editorEngine.createEditor(container, card);
    editor = editorEngine.getEditor(editorId)!;
  });

  describe('构造函数', () => {
    it('应该创建编辑器实例', () => {
      expect(editor).toBeDefined();
      expect(editor.getDocument()).toBeDefined();
      expect(editor.getSelection()).toBeDefined();
      expect(editor.getHistory()).toBeDefined();
      expect(editor.getKeyboard()).toBeDefined();
    });
  });

  describe('insertText', () => {
    it('应该插入文本', () => {
      editor.insertText('新文本');
      expect(editor.getDocument().getContent()).toContain('新文本');
      expect(editor.isModified()).toBe(true);
    });

    it('应该在只读模式下不插入', () => {
      editor.setReadOnly(true);
      const originalContent = editor.getDocument().getContent();
      editor.insertText('新文本');
      expect(editor.getDocument().getContent()).toBe(originalContent);
    });

    it('应该替换选中文本', () => {
      editor.getSelection().setRange(0, 2);
      editor.insertText('替换');
      const content = editor.getDocument().getContent();
      expect(content.substring(0, 2)).toBe('替换');
    });
  });

  describe('deleteText', () => {
    it('应该删除选中文本', () => {
      editor.getSelection().setRange(0, 2);
      editor.deleteText();
      expect(editor.getDocument().getContent().length).toBeLessThan(
        card.content[Object.keys(card.content)[0]].content_text?.length || 0
      );
    });

    it('应该在只读模式下不删除', () => {
      editor.setReadOnly(true);
      const originalContent = editor.getDocument().getContent();
      editor.getSelection().setRange(0, 2);
      editor.deleteText();
      expect(editor.getDocument().getContent()).toBe(originalContent);
    });
  });

  describe('undo/redo', () => {
    it('应该撤销操作', () => {
      editor.insertText('test');
      expect(editor.canUndo()).toBe(true);

      editor.undo();
      expect(editor.canUndo()).toBe(false);
      expect(editor.canRedo()).toBe(true);
    });

    it('应该重做操作', () => {
      editor.insertText('test');
      editor.undo();
      editor.redo();

      expect(editor.canUndo()).toBe(true);
      expect(editor.canRedo()).toBe(false);
    });

    it('应该在只读模式下不撤销/重做', () => {
      editor.insertText('test');
      editor.setReadOnly(true);

      expect(editor.undo()).toBe(false);
      expect(editor.redo()).toBe(false);
    });
  });

  describe('isModified', () => {
    it('应该正确反映修改状态', () => {
      expect(editor.isModified()).toBe(false);
      editor.insertText('test');
      expect(editor.isModified()).toBe(true);
      editor.save();
      expect(editor.isModified()).toBe(false);
    });
  });

  describe('setReadOnly', () => {
    it('应该设置只读模式', () => {
      editor.setReadOnly(true);
      expect(editor.isReadOnly()).toBe(true);
    });
  });

  describe('focus/blur', () => {
    it('应该聚焦和失焦', () => {
      editor.focus();
      expect(container.focus).toHaveBeenCalled();

      editor.blur();
      expect(container.blur).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('应该销毁编辑器', () => {
      editor.destroy();
      // 销毁后不应该抛出错误
      expect(() => editor.destroy()).not.toThrow();
    });
  });
});
