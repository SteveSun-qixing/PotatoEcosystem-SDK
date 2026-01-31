/**
 * RendererFactory 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RendererFactory } from '../../../src/renderer/RendererFactory';
import { Logger } from '../../../src/core/logger';

describe('RendererFactory', () => {
  let factory: RendererFactory;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    factory = new RendererFactory(logger);
  });

  describe('获取渲染器', () => {
    it('应该能够获取富文本渲染器', () => {
      const renderer = factory.getRenderer('RichTextCard');

      expect(renderer).toBeDefined();
      expect(typeof renderer.render).toBe('function');
    });

    it('应该能够获取Markdown渲染器', () => {
      const renderer = factory.getRenderer('MarkdownCard');

      expect(renderer).toBeDefined();
      expect(typeof renderer.render).toBe('function');
    });

    it('应该能够获取图片渲染器', () => {
      const renderer = factory.getRenderer('ImageCard');

      expect(renderer).toBeDefined();
      expect(typeof renderer.render).toBe('function');
    });

    it('应该能够获取视频渲染器', () => {
      const renderer = factory.getRenderer('VideoCard');

      expect(renderer).toBeDefined();
      expect(typeof renderer.render).toBe('function');
    });

    it('应该缓存渲染器实例', () => {
      const renderer1 = factory.getRenderer('RichTextCard');
      const renderer2 = factory.getRenderer('RichTextCard');

      expect(renderer1).toBe(renderer2);
    });

    it('应该抛出错误当渲染器类型不支持', () => {
      expect(() => factory.getRenderer('UnsupportedCard')).toThrow();
    });
  });

  describe('注册自定义渲染器', () => {
    it('应该能够注册自定义渲染器', () => {
      const customRenderer = {
        type: 'CustomCard',
        render: async () => ({ element: document.createElement('div') }),
      };

      factory.registerRenderer('CustomCard', customRenderer as any);

      const renderer = factory.getRenderer('CustomCard');

      expect(renderer).toBe(customRenderer);
    });

    it('应该能够覆盖已有渲染器', () => {
      const customRenderer = {
        type: 'RichTextCard',
        render: async () => ({ element: document.createElement('span') }),
      };

      factory.registerRenderer('RichTextCard', customRenderer as any);

      const renderer = factory.getRenderer('RichTextCard');

      expect(renderer).toBe(customRenderer);
    });
  });

  describe('支持的渲染器类型', () => {
    it('应该返回所有支持的类型', () => {
      const types = factory.getSupportedTypes();

      expect(types).toContain('RichTextCard');
      expect(types).toContain('MarkdownCard');
      expect(types).toContain('ImageCard');
      expect(types).toContain('VideoCard');
    });
  });

  describe('检查渲染器支持', () => {
    it('应该正确检测支持的类型', () => {
      expect(factory.supportsType('RichTextCard')).toBe(true);
      expect(factory.supportsType('ImageCard')).toBe(true);
      expect(factory.supportsType('UnsupportedCard')).toBe(false);
    });
  });
});
