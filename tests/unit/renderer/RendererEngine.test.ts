/**
 * 渲染引擎测试
 * 
 * 注意：这些测试在Node环境运行，DOM操作会被模拟
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RendererEngine } from '@/renderer/RendererEngine';
import { Logger } from '@/core/logger';
import { IdGenerator } from '@/core/id';
import type { Card } from '@/types';

// 模拟DOM环境
global.document = {
  createElement: (tagName: string) => {
    return {
      tagName,
      className: '',
      dataset: {},
      innerHTML: '',
      appendChild: vi.fn(),
      remove: vi.fn(),
      addEventListener: vi.fn(),
      style: {},
    };
  },
} as unknown as Document;

describe('RendererEngine', () => {
  let engine: RendererEngine;
  let container: HTMLElement;
  let card: Card;

  beforeEach(() => {
    const logger = new Logger({ enableConsole: false });
    engine = new RendererEngine(logger);

    container = document.createElement('div') as unknown as HTMLElement;

    // 创建测试卡片
    const cardId = IdGenerator.generate();
    const baseCardId = IdGenerator.generate();

    card = {
      metadata: {
        chip_standards_version: '1.0.0',
        card_id: cardId,
        name: '测试卡片',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      },
      structure: {
        structure: [
          {
            id: baseCardId,
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
          content_text: '<p>测试内容</p>',
        },
      },
    };
  });

  describe('render', () => {
    it('应该渲染卡片', async () => {
      const result = await engine.render(card, container);

      expect(result).toBeDefined();
      expect(result.element).toBeDefined();
      expect(result.destroy).toBeTypeOf('function');
    });

    it('应该设置cardId数据属性', async () => {
      const result = await engine.render(card, container);

      expect(result.element.dataset['cardId']).toBe(card.metadata.card_id);
    });

    it('应该应用主题', async () => {
      const result = await engine.render(card, container, {
        theme: '薯片官方:默认主题',
      });

      expect(result.element.dataset['theme']).toBe('薯片官方:默认主题');
    });

    it('应该使用卡片的主题设置', async () => {
      card.metadata.theme = '自定义:主题';

      const result = await engine.render(card, container);

      expect(result.element.dataset['theme']).toBe('自定义:主题');
    });

    it('destroy应该移除元素', async () => {
      const result = await engine.render(card, container);
      const removeSpy = vi.spyOn(result.element, 'remove');

      result.destroy();

      expect(removeSpy).toHaveBeenCalled();
    });
  });
});
