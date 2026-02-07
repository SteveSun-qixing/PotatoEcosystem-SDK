import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RendererEngine } from '../../../src/renderer/engine';
import { Logger } from '../../../src/logger';
import { EventBus } from '../../../src/event';
import { ThemeManager } from '../../../src/theme';
import { Card } from '../../../src/types/card';
import { Box } from '../../../src/types/box';
import { CardRenderer, BoxRenderer, RenderResult } from '../../../src/renderer/types';
import { createTestCard, createTestBox } from '../../helpers';

// 创建 Mock 对象
function createMockLogger() {
  const mockChild = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createChild: vi.fn().mockReturnThis(),
  };
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createChild: vi.fn().mockReturnValue(mockChild),
  } as unknown as Logger;
}

function createMockEventBus() {
  return {
    on: vi.fn().mockReturnValue('sub-id'),
    off: vi.fn(),
    emit: vi.fn().mockResolvedValue(undefined),
    emitSync: vi.fn(),
  } as unknown as EventBus;
}

function createMockThemeManager() {
  return {
    getCSSVariables: vi.fn().mockReturnValue({
      '--chips-color-primary': '#3b82f6',
      '--chips-color-surface': '#f8fafc',
      '--chips-color-border': '#e2e8f0',
      '--chips-color-text': '#1e293b',
      '--chips-color-text-secondary': '#64748b',
      '--chips-color-background': '#ffffff',
      '--chips-spacing-sm': '0.5rem',
      '--chips-spacing-md': '1rem',
      '--chips-spacing-xl': '2rem',
      '--chips-radius-sm': '0.25rem',
      '--chips-radius-md': '0.5rem',
      '--chips-font-family': 'system-ui',
      '--chips-font-size-sm': '0.875rem',
      '--chips-font-size-lg': '1.125rem',
    }),
    getTheme: vi.fn().mockReturnValue({
      metadata: { id: 'default-light', type: 'light' },
    }),
    currentThemeId: 'default-light',
  } as unknown as ThemeManager;
}

function createMockContainer(): HTMLElement {
  return {
    innerHTML: '',
    appendChild: vi.fn(),
    style: {},
  } as unknown as HTMLElement;
}

describe('RendererEngine', () => {
  let engine: RendererEngine;
  let mockLogger: Logger;
  let mockEventBus: EventBus;
  let mockThemeManager: ThemeManager;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockEventBus = createMockEventBus();
    mockThemeManager = createMockThemeManager();
    engine = new RendererEngine(mockLogger, mockEventBus, mockThemeManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(engine).toBeInstanceOf(RendererEngine);
    });

    it('should register default box renderers', () => {
      const layouts = engine.getRegisteredLayouts();

      expect(layouts).toContain('grid');
      expect(layouts).toContain('masonry');
      expect(layouts).toContain('list');
      expect(layouts).toContain('compact');
    });

    it('should have built-in base card renderers', () => {
      const types = engine.getRegisteredBaseCardTypes();

      expect(types).toContain('RichTextCard');
      expect(types).toContain('ImageCard');
      expect(types).toContain('VideoCard');
      expect(types).toContain('AudioCard');
      expect(types).toContain('CodeBlockCard');
      expect(types).toContain('MarkdownCard');
    });

    it('should use custom options', () => {
      const customEngine = new RendererEngine(mockLogger, mockEventBus, mockThemeManager, {
        enableCache: false,
        cacheSize: 100,
        timeout: 5000,
      });

      expect(customEngine).toBeInstanceOf(RendererEngine);
    });
  });

  describe('registerCardRenderer', () => {
    it('should register card renderer', () => {
      const customRenderer: CardRenderer = {
        name: 'custom-renderer',
        supportedTypes: ['custom-type', 'another-type'],
        render: vi.fn().mockResolvedValue({ success: true, html: '<div>Custom</div>' }),
      };

      engine.registerCardRenderer(customRenderer);

      const types = engine.getRegisteredCardTypes();
      expect(types).toContain('custom-type');
      expect(types).toContain('another-type');
    });
  });

  describe('registerBaseCardRenderer', () => {
    it('should register base card renderer via fetcher', () => {
      engine.registerBaseCardRenderer('CustomCard', {
        html: '<html><body><div>Custom</div></body></html>',
        css: '',
      });

      const types = engine.getRegisteredBaseCardTypes();
      expect(types).toContain('CustomCard');
    });

    it('should unregister base card renderer', () => {
      engine.registerBaseCardRenderer('TempCard', {
        html: '<html><body><div>Temp</div></body></html>',
        css: '',
      });

      expect(engine.getRegisteredBaseCardTypes()).toContain('TempCard');

      engine.unregisterBaseCardRenderer('TempCard');
      // Still has built-in renderers but not TempCard (after clearing cache)
      const types = engine.getRegisteredBaseCardTypes();
      expect(types).not.toContain('TempCard');
    });
  });

  describe('registerBoxRenderer', () => {
    it('should register box renderer', () => {
      const customRenderer: BoxRenderer = {
        name: 'custom-box-renderer',
        supportedLayouts: ['custom-layout', 'flex-layout'],
        render: vi.fn().mockResolvedValue({ success: true, html: '<div>Box</div>' }),
      };

      engine.registerBoxRenderer(customRenderer);

      const layouts = engine.getRegisteredLayouts();
      expect(layouts).toContain('custom-layout');
      expect(layouts).toContain('flex-layout');
    });
  });

  describe('renderCard', () => {
    let mockContainer: HTMLElement;
    let testCard: Card;

    beforeEach(() => {
      mockContainer = createMockContainer();
      testCard = createTestCard({
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'test-card-id',
          name: 'Test Card',
          description: 'A test card description',
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          type: 'basic',
        },
      });
    });

    it('should render card successfully', async () => {
      const result = await engine.renderCard(testCard, mockContainer);

      expect(result.success).toBe(true);
      expect(result.duration).toBeDefined();
    });

    it('should emit render:start event', async () => {
      await engine.renderCard(testCard, mockContainer);

      expect(mockEventBus.emit).toHaveBeenCalledWith('render:start', {
        type: 'card',
        targetId: testCard.id,
      });
    });

    it('should emit render:complete event', async () => {
      await engine.renderCard(testCard, mockContainer);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'render:complete',
        expect.objectContaining({
          type: 'card',
          targetId: testCard.id,
        })
      );
    });

    it('should use custom renderer', async () => {
      const customRender = vi.fn().mockResolvedValue({
        success: true,
        html: '<div class="custom-render">Custom Content</div>',
      });
      const customRenderer: CardRenderer = {
        name: 'custom',
        supportedTypes: ['custom-type'],
        render: customRender,
      };
      engine.registerCardRenderer(customRenderer);

      const customCard = createTestCard({
        metadata: {
          ...testCard.metadata,
          type: 'custom-type',
        },
      });

      await engine.renderCard(customCard, mockContainer);

      expect(customRender).toHaveBeenCalled();
    });

    it('should handle render error', async () => {
      const failingRenderer: CardRenderer = {
        name: 'failing',
        supportedTypes: ['failing-type'],
        render: vi.fn().mockRejectedValue(new Error('Render failed')),
      };
      engine.registerCardRenderer(failingRenderer);

      const failingCard = createTestCard({
        metadata: {
          ...testCard.metadata,
          type: 'failing-type',
        },
      });

      const result = await engine.renderCard(failingCard, mockContainer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should emit render:error event on failure', async () => {
      const failingRenderer: CardRenderer = {
        name: 'failing',
        supportedTypes: ['failing-type'],
        render: vi.fn().mockRejectedValue(new Error('Render failed')),
      };
      engine.registerCardRenderer(failingRenderer);

      const failingCard = createTestCard({
        metadata: {
          ...testCard.metadata,
          type: 'failing-type',
        },
      });

      await engine.renderCard(failingCard, mockContainer);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'render:error',
        expect.objectContaining({
          type: 'card',
          targetId: failingCard.id,
        })
      );
    });

    it('should handle render timeout', async () => {
      const slowRenderer: CardRenderer = {
        name: 'slow',
        supportedTypes: ['slow-type'],
        render: vi
          .fn()
          .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000))),
      };
      engine.registerCardRenderer(slowRenderer);

      const slowCard = createTestCard({
        metadata: {
          ...testCard.metadata,
          type: 'slow-type',
        },
      });

      const result = await engine.renderCard(slowCard, mockContainer, { timeout: 50 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('renderBox', () => {
    let mockContainer: HTMLElement;
    let testBox: Box;

    beforeEach(() => {
      mockContainer = createMockContainer();
      testBox = createTestBox({
        metadata: {
          chip_standards_version: '1.0.0',
          box_id: 'test-box-id',
          name: 'Test Box',
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          layout: 'grid',
        },
        structure: {
          cards: [
            { id: 'card-1', path: '/cards/card-1.card', filename: 'card-1.card', location: 'internal' as never },
            { id: 'card-2', path: '/cards/card-2.card', filename: 'card-2.card', location: 'internal' as never },
          ],
        },
      });
    });

    it('should render box successfully', async () => {
      const result = await engine.renderBox(testBox, mockContainer);

      expect(result.success).toBe(true);
      expect(result.html).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should emit render:start event', async () => {
      await engine.renderBox(testBox, mockContainer);

      expect(mockEventBus.emit).toHaveBeenCalledWith('render:start', {
        type: 'box',
        targetId: testBox.id,
      });
    });

    it('should emit render:complete event', async () => {
      await engine.renderBox(testBox, mockContainer);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'render:complete',
        expect.objectContaining({
          type: 'box',
          targetId: testBox.id,
        })
      );
    });

    it('should use custom box renderer', async () => {
      const customRender = vi.fn().mockResolvedValue({
        success: true,
        html: '<div class="custom-box">Custom Box</div>',
      });
      const customRenderer: BoxRenderer = {
        name: 'custom-box',
        supportedLayouts: ['custom-layout'],
        render: customRender,
      };
      engine.registerBoxRenderer(customRenderer);

      const customBox = createTestBox({
        metadata: {
          ...testBox.metadata,
          layout: 'custom-layout',
        },
      });

      await engine.renderBox(customBox, mockContainer);

      expect(customRender).toHaveBeenCalled();
    });

    it('should fall back to grid layout for unknown layouts', async () => {
      const unknownBox = createTestBox({
        metadata: {
          ...testBox.metadata,
          layout: 'unknown-layout',
        },
      });

      const result = await engine.renderBox(unknownBox, mockContainer);

      expect(result.success).toBe(true);
    });
  });

  describe('cache', () => {
    it('should clear cache including fetcher cache', () => {
      engine.clearCache();
      expect(engine.cacheSize).toBe(0);
    });
  });

  describe('renderCover', () => {
    it('should render card cover', async () => {
      const mockContainer = createMockContainer();
      const testCard = createTestCard();

      const result = await engine.renderCover(testCard, mockContainer);

      expect(result.success).toBe(true);
    });
  });

  describe('pipeline accessors', () => {
    it('should expose parser', () => {
      expect(engine.parser).toBeDefined();
    });

    it('should expose fetcher', () => {
      expect(engine.fetcher).toBeDefined();
    });

    it('should expose renderManager', () => {
      expect(engine.renderManager).toBeDefined();
    });
  });

  describe('isolation mode', () => {
    it('should default to iframe isolation mode', () => {
      const defaultEngine = new RendererEngine(mockLogger, mockEventBus, mockThemeManager);
      expect(defaultEngine).toBeDefined();
      // Default is 'iframe' per design docs
    });

    it('should allow configuring shadow-dom mode', () => {
      const shadowEngine = new RendererEngine(mockLogger, mockEventBus, mockThemeManager, {
        defaultIsolationMode: 'shadow-dom',
      });
      expect(shadowEngine).toBeDefined();
    });

    it('should allow configuring iframe mode explicitly', () => {
      const iframeEngine = new RendererEngine(mockLogger, mockEventBus, mockThemeManager, {
        defaultIsolationMode: 'iframe',
      });
      expect(iframeEngine).toBeDefined();
    });
  });
});
