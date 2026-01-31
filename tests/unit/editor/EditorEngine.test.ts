/**
 * 编辑引擎测试
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

describe('EditorEngine', () => {
  let engine: EditorEngine;
  let logger: Logger;
  let eventBus: EventBus;
  let card: Card;
  let container: HTMLElement;

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

    engine = new EditorEngine(logger, eventBus);
  });

  describe('createEditor', () => {
    it('应该创建编辑器实例', () => {
      const instanceId = engine.createEditor(container, card);

      expect(instanceId).toBeDefined();
      expect(engine.getEditor(instanceId)).toBeDefined();
      expect(engine.getEditorCount()).toBe(1);
    });

    it('应该返回唯一的实例ID', () => {
      const id1 = engine.createEditor(container, card);
      const id2 = engine.createEditor(container, card);

      expect(id1).not.toBe(id2);
    });
  });

  describe('getEditor', () => {
    it('应该获取编辑器实例', () => {
      const instanceId = engine.createEditor(container, card);
      const editor = engine.getEditor(instanceId);

      expect(editor).toBeDefined();
    });

    it('应该返回undefined如果实例不存在', () => {
      expect(engine.getEditor('nonexistent')).toBeUndefined();
    });
  });

  describe('destroyEditor', () => {
    it('应该销毁编辑器', () => {
      const instanceId = engine.createEditor(container, card);
      expect(engine.getEditorCount()).toBe(1);

      const result = engine.destroyEditor(instanceId);

      expect(result).toBe(true);
      expect(engine.getEditorCount()).toBe(0);
    });

    it('应该返回false如果实例不存在', () => {
      expect(engine.destroyEditor('nonexistent')).toBe(false);
    });
  });

  describe('destroyAllEditors', () => {
    it('应该销毁所有编辑器', () => {
      engine.createEditor(container, card);
      engine.createEditor(container, card);
      expect(engine.getEditorCount()).toBe(2);

      engine.destroyAllEditors();

      expect(engine.getEditorCount()).toBe(0);
    });
  });

  describe('getEditorIds', () => {
    it('应该返回所有编辑器ID', () => {
      const id1 = engine.createEditor(container, card);
      const id2 = engine.createEditor(container, card);

      const ids = engine.getEditorIds();
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
    });
  });

  describe('updateConfig', () => {
    it('应该更新配置', () => {
      engine.updateConfig({
        enableHistory: false,
        maxHistorySize: 50,
      });

      const config = engine.getConfig();
      expect(config.enableHistory).toBe(false);
      expect(config.maxHistorySize).toBe(50);
    });
  });

  describe('getStats', () => {
    it('应该返回统计信息', () => {
      engine.createEditor(container, card);
      const stats = engine.getStats();

      expect(stats.editorCount).toBe(1);
      expect(stats.instances).toHaveLength(1);
    });
  });
});
