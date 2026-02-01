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
    it('应该创建实例', () => {
      expect(engine).toBeInstanceOf(RendererEngine);
    });

    it('应该注册默认渲染器', () => {
      const cardTypes = engine.getRegisteredCardTypes();
      const layouts = engine.getRegisteredLayouts();

      expect(cardTypes).toContain('basic');
      expect(cardTypes).toContain('text');
      expect(cardTypes).toContain('image');
      expect(cardTypes).toContain('link');
      expect(layouts).toContain('grid');
      expect(layouts).toContain('masonry');
      expect(layouts).toContain('list');
      expect(layouts).toContain('compact');
    });

    it('应该使用自定义选项', () => {
      const customEngine = new RendererEngine(mockLogger, mockEventBus, mockThemeManager, {
        enableCache: false,
        cacheSize: 100,
        timeout: 5000,
      });

      expect(customEngine).toBeInstanceOf(RendererEngine);
    });
  });

  describe('registerCardRenderer', () => {
    it('应该成功注册卡片渲染器', () => {
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

    it('应该覆盖已存在的类型', () => {
      const renderer1: CardRenderer = {
        name: 'renderer1',
        supportedTypes: ['custom-type'],
        render: vi.fn().mockResolvedValue({ success: true, html: '<div>1</div>' }),
      };
      const renderer2: CardRenderer = {
        name: 'renderer2',
        supportedTypes: ['custom-type'],
        render: vi.fn().mockResolvedValue({ success: true, html: '<div>2</div>' }),
      };

      engine.registerCardRenderer(renderer1);
      engine.registerCardRenderer(renderer2);

      // 只有 renderer2 应该生效，但类型仍然存在
      expect(engine.getRegisteredCardTypes()).toContain('custom-type');
    });
  });

  describe('registerBoxRenderer', () => {
    it('应该成功注册箱子渲染器', () => {
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

    it('应该成功渲染卡片', async () => {
      const result = await engine.renderCard(testCard, mockContainer);

      expect(result.success).toBe(true);
      expect(result.html).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('应该触发 render:start 事件', async () => {
      await engine.renderCard(testCard, mockContainer);

      expect(mockEventBus.emit).toHaveBeenCalledWith('render:start', {
        type: 'card',
        targetId: testCard.id,
      });
    });

    it('应该触发 render:complete 事件', async () => {
      await engine.renderCard(testCard, mockContainer);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'render:complete',
        expect.objectContaining({
          type: 'card',
          targetId: testCard.id,
        })
      );
    });

    it('应该将 HTML 应用到容器', async () => {
      await engine.renderCard(testCard, mockContainer);

      expect(mockContainer.innerHTML).toContain('chips-card');
    });

    it('应该使用自定义渲染器', async () => {
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

    it('应该回退到基础渲染器当类型不存在', async () => {
      const unknownCard = createTestCard({
        metadata: {
          ...testCard.metadata,
          type: 'unknown-type',
        },
      });

      const result = await engine.renderCard(unknownCard, mockContainer);

      expect(result.success).toBe(true);
    });

    it('应该处理渲染错误', async () => {
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

    it('应该触发 render:error 事件当渲染失败', async () => {
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

    it('应该处理渲染超时', async () => {
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
            { id: 'card-1', path: '/cards/card-1.card', filename: 'card-1.card' },
            { id: 'card-2', path: '/cards/card-2.card', filename: 'card-2.card' },
          ],
        },
      });
    });

    it('应该成功渲染箱子', async () => {
      const result = await engine.renderBox(testBox, mockContainer);

      expect(result.success).toBe(true);
      expect(result.html).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('应该触发 render:start 事件', async () => {
      await engine.renderBox(testBox, mockContainer);

      expect(mockEventBus.emit).toHaveBeenCalledWith('render:start', {
        type: 'box',
        targetId: testBox.id,
      });
    });

    it('应该触发 render:complete 事件', async () => {
      await engine.renderBox(testBox, mockContainer);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'render:complete',
        expect.objectContaining({
          type: 'box',
          targetId: testBox.id,
        })
      );
    });

    it('应该渲染网格布局', async () => {
      const result = await engine.renderBox(testBox, mockContainer);

      expect(result.success).toBe(true);
      expect(mockContainer.innerHTML).toContain('grid');
    });

    it('应该渲染列表布局', async () => {
      const listBox = createTestBox({
        metadata: {
          ...testBox.metadata,
          layout: 'list',
        },
        structure: testBox.structure,
      });

      const result = await engine.renderBox(listBox, mockContainer);

      expect(result.success).toBe(true);
    });

    it('应该使用自定义箱子渲染器', async () => {
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

    it('应该回退到网格布局当布局不存在', async () => {
      const unknownBox = createTestBox({
        metadata: {
          ...testBox.metadata,
          layout: 'unknown-layout',
        },
      });

      const result = await engine.renderBox(unknownBox, mockContainer);

      expect(result.success).toBe(true);
    });

    it('应该渲染空箱子', async () => {
      const emptyBox = createTestBox({
        structure: { cards: [] },
      });

      const result = await engine.renderBox(emptyBox, mockContainer);

      expect(result.success).toBe(true);
      expect(mockContainer.innerHTML).toContain('暂无卡片');
    });
  });

  describe('渲染缓存', () => {
    let mockContainer: HTMLElement;
    let testCard: Card;

    beforeEach(() => {
      mockContainer = createMockContainer();
      testCard = createTestCard({
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'test-card-id',
          name: 'Test Card',
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          type: 'basic',
        },
      });
    });

    it('应该缓存渲染结果', async () => {
      await engine.renderCard(testCard, mockContainer);

      expect(engine.cacheSize).toBe(1);
    });

    it('应该从缓存返回结果', async () => {
      await engine.renderCard(testCard, mockContainer);
      const container2 = createMockContainer();

      const result = await engine.renderCard(testCard, container2);

      expect(result.success).toBe(true);
    });

    it('应该在 partial 模式下不使用缓存', async () => {
      const customRender = vi.fn().mockResolvedValue({
        success: true,
        html: '<div>Rendered</div>',
      });
      const customRenderer: CardRenderer = {
        name: 'track-render',
        supportedTypes: ['track-type'],
        render: customRender,
      };
      engine.registerCardRenderer(customRenderer);

      const card = createTestCard({
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'track-card',
          name: 'Track Card',
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          type: 'track-type',
        },
      });

      await engine.renderCard(card, mockContainer, { mode: 'partial' });
      await engine.renderCard(card, mockContainer, { mode: 'partial' });

      expect(customRender).toHaveBeenCalledTimes(2);
    });

    it('应该清除缓存', async () => {
      await engine.renderCard(testCard, mockContainer);
      expect(engine.cacheSize).toBe(1);

      engine.clearCache();

      expect(engine.cacheSize).toBe(0);
    });

    it('应该限制缓存大小', async () => {
      const smallCacheEngine = new RendererEngine(mockLogger, mockEventBus, mockThemeManager, {
        cacheSize: 2,
      });

      for (let i = 0; i < 5; i++) {
        const card = createTestCard({
          id: `card-${i}`,
          metadata: {
            chip_standards_version: '1.0.0',
            card_id: `card-${i}`,
            name: `Card ${i}`,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
            type: 'basic',
          },
        });
        await smallCacheEngine.renderCard(card, createMockContainer());
      }

      expect(smallCacheEngine.cacheSize).toBeLessThanOrEqual(2);
    });

    it('应该禁用缓存', async () => {
      const noCacheEngine = new RendererEngine(mockLogger, mockEventBus, mockThemeManager, {
        enableCache: false,
      });

      await noCacheEngine.renderCard(testCard, mockContainer);

      expect(noCacheEngine.cacheSize).toBe(0);
    });
  });

  describe('renderCover', () => {
    it('应该渲染卡片封面', async () => {
      const mockContainer = createMockContainer();
      const testCard = createTestCard();

      const result = await engine.renderCover(testCard, mockContainer);

      expect(result.success).toBe(true);
    });
  });

  describe('renderPreview', () => {
    it('应该渲染卡片预览', async () => {
      const mockContainer = createMockContainer();
      const testCard = createTestCard();

      const result = await engine.renderPreview(testCard, mockContainer);

      expect(result.success).toBe(true);
    });

    it('应该渲染箱子预览', async () => {
      const mockContainer = createMockContainer();
      const testBox = createTestBox();

      const result = await engine.renderPreview(testBox, mockContainer);

      expect(result.success).toBe(true);
    });
  });

  describe('getRegisteredCardTypes', () => {
    it('应该返回所有注册的卡片类型', () => {
      const types = engine.getRegisteredCardTypes();

      expect(types).toBeInstanceOf(Array);
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe('getRegisteredLayouts', () => {
    it('应该返回所有注册的布局类型', () => {
      const layouts = engine.getRegisteredLayouts();

      expect(layouts).toBeInstanceOf(Array);
      expect(layouts.length).toBeGreaterThan(0);
    });
  });

  describe('渲染选项', () => {
    let mockContainer: HTMLElement;
    let testCard: Card;

    beforeEach(() => {
      mockContainer = createMockContainer();
      testCard = createTestCard({
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'options-test-card',
          name: 'Options Test Card',
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          type: 'basic',
        },
      });
    });

    it('应该使用默认选项', async () => {
      const result = await engine.renderCard(testCard, mockContainer);

      expect(result.success).toBe(true);
    });

    it('应该使用自定义超时', async () => {
      const result = await engine.renderCard(testCard, mockContainer, {
        timeout: 5000,
      });

      expect(result.success).toBe(true);
    });

    it('应该传递主题变量到渲染上下文', async () => {
      let capturedContext: unknown;
      const inspectorRenderer: CardRenderer = {
        name: 'inspector',
        supportedTypes: ['inspector-type'],
        render: vi.fn().mockImplementation((context) => {
          capturedContext = context;
          return { success: true, html: '<div>Inspected</div>' };
        }),
      };
      engine.registerCardRenderer(inspectorRenderer);

      const card = createTestCard({
        metadata: {
          ...testCard.metadata,
          type: 'inspector-type',
        },
      });

      await engine.renderCard(card, mockContainer);

      expect(capturedContext).toBeDefined();
      expect((capturedContext as { themeVars: Record<string, string> }).themeVars).toBeDefined();
    });
  });

  describe('CSS 应用', () => {
    it('应该渲染包含 CSS 的结果', async () => {
      const cssRenderer: CardRenderer = {
        name: 'css-renderer',
        supportedTypes: ['css-type'],
        render: vi.fn().mockResolvedValue({
          success: true,
          html: '<div>Content</div>',
          css: '.test { color: red; }',
        }),
      };
      engine.registerCardRenderer(cssRenderer);

      const card = createTestCard({
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'css-test',
          name: 'CSS Test',
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          type: 'css-type',
        },
      });

      // 创建一个更完整的 mock container
      const styleElements: { textContent: string }[] = [];
      const mockContainer = {
        innerHTML: '',
        appendChild: vi.fn((el: { textContent: string }) => {
          styleElements.push(el);
        }),
        style: {},
      } as unknown as HTMLElement;

      // Mock document.createElement for style element
      vi.stubGlobal('document', {
        createElement: vi.fn().mockReturnValue({ textContent: '' }),
      });

      await engine.renderCard(card, mockContainer);

      expect(mockContainer.appendChild).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });
});
