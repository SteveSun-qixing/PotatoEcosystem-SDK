import { describe, it, expect } from 'vitest';
import { RendererFetcher } from '../../../src/renderer/renderer-fetcher';
import type { RendererCode } from '../../../src/renderer/types';

describe('RendererFetcher', () => {
  describe('constructor', () => {
    it('should create instance with default options', () => {
      const fetcher = new RendererFetcher();
      expect(fetcher).toBeInstanceOf(RendererFetcher);
    });

    it('should create instance with custom options', () => {
      const fetcher = new RendererFetcher({
        enableCache: false,
        cacheExpiry: 60000,
      });
      expect(fetcher).toBeInstanceOf(RendererFetcher);
    });
  });

  describe('getRegisteredTypes', () => {
    it('should return built-in types', () => {
      const fetcher = new RendererFetcher();
      const types = fetcher.getRegisteredTypes();

      expect(types).toContain('RichTextCard');
      expect(types).toContain('ImageCard');
      expect(types).toContain('VideoCard');
      expect(types).toContain('AudioCard');
      expect(types).toContain('CodeBlockCard');
      expect(types).toContain('MarkdownCard');
    });

    it('should include externally registered types', () => {
      const fetcher = new RendererFetcher();
      fetcher.registerRenderer('CustomCard', { html: '<div>Custom</div>', css: '' });

      const types = fetcher.getRegisteredTypes();
      expect(types).toContain('CustomCard');
      expect(types).toContain('RichTextCard'); // built-in still present
    });
  });

  describe('fetchRenderer', () => {
    it('should return built-in renderer for RichTextCard', async () => {
      const fetcher = new RendererFetcher();
      const code = await fetcher.fetchRenderer('RichTextCard');

      expect(code.html).toContain('rich-text-content');
      expect(code.html).toContain('CHIPS_CARD_CONFIG');
    });

    it('should return built-in renderer for ImageCard', async () => {
      const fetcher = new RendererFetcher();
      const code = await fetcher.fetchRenderer('ImageCard');

      expect(code.html).toContain('image-card');
      expect(code.html).toContain('CHIPS_CARD_CONFIG');
      expect(code.html).toContain('layout-grid');
      expect(code.html).toContain('layout-single');
    });

    it('should return built-in renderer for VideoCard', async () => {
      const fetcher = new RendererFetcher();
      const code = await fetcher.fetchRenderer('VideoCard');

      expect(code.html).toContain('video');
      expect(code.html).toContain('CHIPS_CARD_CONFIG');
    });

    it('should return built-in renderer for AudioCard', async () => {
      const fetcher = new RendererFetcher();
      const code = await fetcher.fetchRenderer('AudioCard');

      expect(code.html).toContain('audio');
      expect(code.html).toContain('CHIPS_CARD_CONFIG');
    });

    it('should return built-in renderer for CodeBlockCard', async () => {
      const fetcher = new RendererFetcher();
      const code = await fetcher.fetchRenderer('CodeBlockCard');

      expect(code.html).toContain('code');
      expect(code.html).toContain('CHIPS_CARD_CONFIG');
    });

    it('should return built-in renderer for MarkdownCard', async () => {
      const fetcher = new RendererFetcher();
      const code = await fetcher.fetchRenderer('MarkdownCard');

      expect(code.html).toContain('markdown-content');
      expect(code.html).toContain('CHIPS_CARD_CONFIG');
    });

    it('should return placeholder for unknown type', async () => {
      const fetcher = new RendererFetcher();
      const code = await fetcher.fetchRenderer('UnknownCard');

      expect(code.html).toContain('UnknownCard');
    });

    it('should prioritize external renderer over built-in', async () => {
      const fetcher = new RendererFetcher();
      const customCode: RendererCode = {
        html: '<html><body><div class="custom-rich-text">Custom RichText</div></body></html>',
        css: '',
      };

      fetcher.registerRenderer('RichTextCard', customCode);

      const code = await fetcher.fetchRenderer('RichTextCard');
      expect(code.html).toContain('custom-rich-text');
      expect(code.html).not.toContain('rich-text-content'); // not the built-in
    });
  });

  describe('fetchRenderers (batch)', () => {
    it('should return code for all requested types', async () => {
      const fetcher = new RendererFetcher();
      const codeMap = await fetcher.fetchRenderers(['RichTextCard', 'ImageCard', 'VideoCard']);

      expect(codeMap.size).toBe(3);
      expect(codeMap.has('RichTextCard')).toBe(true);
      expect(codeMap.has('ImageCard')).toBe(true);
      expect(codeMap.has('VideoCard')).toBe(true);
    });

    it('should deduplicate types', async () => {
      const fetcher = new RendererFetcher();
      const codeMap = await fetcher.fetchRenderers(['RichTextCard', 'RichTextCard', 'RichTextCard']);

      expect(codeMap.size).toBe(1);
    });

    it('should handle mixed known and unknown types', async () => {
      const fetcher = new RendererFetcher();
      const codeMap = await fetcher.fetchRenderers(['RichTextCard', 'UnknownCard']);

      expect(codeMap.size).toBe(2);
      expect(codeMap.get('RichTextCard')!.html).toContain('rich-text-content');
      expect(codeMap.get('UnknownCard')!.html).toContain('UnknownCard');
    });
  });

  describe('registerRenderer / unregisterRenderer', () => {
    it('should register external renderer', () => {
      const fetcher = new RendererFetcher();
      const customCode: RendererCode = {
        html: '<div>Custom</div>',
        css: '.custom { color: red; }',
      };

      fetcher.registerRenderer('CustomCard', customCode);

      expect(fetcher.getRegisteredTypes()).toContain('CustomCard');
    });

    it('should unregister external renderer', async () => {
      const fetcher = new RendererFetcher();
      const customCode: RendererCode = { html: '<div>Custom</div>', css: '' };

      fetcher.registerRenderer('CustomCard', customCode);
      expect(fetcher.getRegisteredTypes()).toContain('CustomCard');

      fetcher.unregisterRenderer('CustomCard');
      const code = await fetcher.fetchRenderer('CustomCard');
      // Should fall back to placeholder
      expect(code.html).toContain('CustomCard');
    });

    it('should clear cache when registering new renderer', async () => {
      const fetcher = new RendererFetcher({ enableCache: true });

      // First fetch - caches built-in
      await fetcher.fetchRenderer('RichTextCard');

      // Register custom - should clear cache
      fetcher.registerRenderer('RichTextCard', {
        html: '<div>Custom RichText</div>',
        css: '',
      });

      // Should return new custom version
      const code = await fetcher.fetchRenderer('RichTextCard');
      expect(code.html).toContain('Custom RichText');
    });
  });

  describe('cache', () => {
    it('should cache renderer code', async () => {
      const fetcher = new RendererFetcher({ enableCache: true });

      const code1 = await fetcher.fetchRenderer('RichTextCard');
      const code2 = await fetcher.fetchRenderer('RichTextCard');

      // Same reference from cache
      expect(code1).toBe(code2);
    });

    it('should not cache when disabled', async () => {
      const fetcher = new RendererFetcher({ enableCache: false });

      const code1 = await fetcher.fetchRenderer('RichTextCard');
      const code2 = await fetcher.fetchRenderer('RichTextCard');

      // Different instances (not cached)
      expect(code1).not.toBe(code2);
      // But same content
      expect(code1.html).toBe(code2.html);
    });

    it('should clear all cache', async () => {
      const fetcher = new RendererFetcher({ enableCache: true });

      await fetcher.fetchRenderer('RichTextCard');
      await fetcher.fetchRenderer('ImageCard');

      fetcher.clearCache();

      // After clear, should create new instances
      const code = await fetcher.fetchRenderer('RichTextCard');
      expect(code.html).toContain('rich-text-content');
    });

    it('should clear specific type cache', async () => {
      const fetcher = new RendererFetcher({ enableCache: true });

      const code1 = await fetcher.fetchRenderer('RichTextCard');
      fetcher.clearCache('RichTextCard');
      const code2 = await fetcher.fetchRenderer('RichTextCard');

      expect(code1).not.toBe(code2);
    });
  });

  describe('getPlaceholderRenderer', () => {
    it('should return placeholder with type name', () => {
      const fetcher = new RendererFetcher();
      const code = fetcher.getPlaceholderRenderer('MyCustomType');

      expect(code.html).toContain('MyCustomType');
      expect(code.css).toBe('');
    });
  });

  describe('built-in renderer HTML quality', () => {
    it('RichTextCard should have proper HTML structure', async () => {
      const fetcher = new RendererFetcher();
      const code = await fetcher.fetchRenderer('RichTextCard');

      expect(code.html).toContain('<!DOCTYPE html>');
      expect(code.html).toContain('<html');
      expect(code.html).toContain('</html>');
      expect(code.html).toContain('<body>');
      expect(code.html).toContain('</body>');
    });

    it('ImageCard should support all layout types', async () => {
      const fetcher = new RendererFetcher();
      const code = await fetcher.fetchRenderer('ImageCard');

      expect(code.html).toContain('layout-single');
      expect(code.html).toContain('layout-grid');
      expect(code.html).toContain('layout-long-scroll');
      expect(code.html).toContain('layout-horizontal-scroll');
    });

    it('All built-in renderers should use CHIPS_CARD_CONFIG', async () => {
      const fetcher = new RendererFetcher();
      const types = ['RichTextCard', 'ImageCard', 'VideoCard', 'AudioCard', 'CodeBlockCard', 'MarkdownCard'];

      for (const type of types) {
        const code = await fetcher.fetchRenderer(type);
        expect(code.html).toContain('CHIPS_CARD_CONFIG');
      }
    });
  });
});
