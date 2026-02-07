/**
 * CardRenderManager tests
 *
 * These tests verify the CardRenderManager's logic using minimal DOM mocks.
 * Since the test environment is Node.js, we mock document/DOM APIs as needed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CardRenderManager } from '../../../src/renderer/card-render-manager';
import type { ParsedCardData, RendererCodeMap, RendererCode } from '../../../src/renderer/types';

/**
 * Create test card data
 */
function createTestCardData(overrides?: Partial<ParsedCardData>): ParsedCardData {
  return {
    metadata: {
      id: 'test123456',
      name: 'Test Card',
      version: '1.0.0',
      createdAt: '2026-01-01T00:00:00Z',
      modifiedAt: '2026-01-01T00:00:00Z',
      chipsStandardsVersion: '1.0.0',
    },
    structure: {
      baseCardIds: ['bc001', 'bc002'],
    },
    baseCards: [
      {
        id: 'bc001',
        type: 'RichTextCard',
        config: { content_text: '<p>Hello World</p>' },
      },
      {
        id: 'bc002',
        type: 'ImageCard',
        config: { images: [] },
      },
    ],
    ...overrides,
  };
}

/**
 * Create simple renderer code
 */
function createSimpleRenderer(): RendererCode {
  return {
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 16px; }
    .content { color: #333; }
  </style>
</head>
<body>
  <div class="content" id="content"></div>
  <script>
    (function() {
      var config = window.CHIPS_CARD_CONFIG || {};
      document.getElementById('content').textContent = JSON.stringify(config);
    })();
  </script>
</body>
</html>`,
    css: '',
  };
}

/**
 * Create test renderer code map
 */
function createTestRendererMap(): RendererCodeMap {
  const map: RendererCodeMap = new Map();
  map.set('RichTextCard', createSimpleRenderer());
  map.set('ImageCard', createSimpleRenderer());
  return map;
}

/**
 * Add iframe-specific mock to a mockDoc
 */
function addIframeMock(
  mockDoc: { createElement: (tagName: string) => unknown },
  onWrite?: (html: string) => void
) {
  const origCreate = mockDoc.createElement;
  mockDoc.createElement = (tagName: string) => {
    const el = origCreate(tagName);
    if (tagName === 'iframe') {
      (el as Record<string, unknown>).sandbox = { add: vi.fn() };
      (el as Record<string, unknown>).contentDocument = {
        open: vi.fn(),
        write: vi.fn().mockImplementation((html: string) => {
          if (onWrite) onWrite(html);
        }),
        close: vi.fn(),
      };
      (el as Record<string, unknown>).addEventListener = vi.fn();
    }
    return el;
  };
}

/**
 * Minimal DOM mock helper
 */
function createMockDOM() {
  const elements: Record<string, MockElement> = {};
  let idCounter = 0;

  interface MockElement {
    _id: string;
    tagName: string;
    className: string;
    textContent: string;
    innerHTML: string;
    style: Record<string, string>;
    children: MockElement[];
    attributes: Record<string, string>;
    _shadowRoot: MockElement | null;
    _parent: MockElement | null;
    appendChild: (child: MockElement) => void;
    remove: () => void;
    setAttribute: (key: string, value: string) => void;
    getAttribute: (key: string) => string | null;
    querySelectorAll: (selector: string) => MockElement[];
    querySelector: (selector: string) => MockElement | null;
    attachShadow: (opts: { mode: string }) => MockElement;
  }

  function createElement(tagName: string): MockElement {
    const el: MockElement = {
      _id: `mock-${idCounter++}`,
      tagName: tagName.toUpperCase(),
      className: '',
      textContent: '',
      innerHTML: '',
      style: {} as Record<string, string>,
      children: [],
      attributes: {},
      _shadowRoot: null,
      _parent: null,
      appendChild(child: MockElement) {
        this.children.push(child);
        child._parent = this;
      },
      remove() {
        if (this._parent) {
          this._parent.children = this._parent.children.filter((c) => c !== this);
          this._parent = null;
        }
      },
      setAttribute(key: string, value: string) {
        this.attributes[key] = value;
      },
      getAttribute(key: string) {
        return this.attributes[key] ?? null;
      },
      querySelectorAll(selector: string) {
        const results: MockElement[] = [];
        const search = (node: MockElement) => {
          if (matchesSelector(node, selector)) {
            results.push(node);
          }
          for (const child of node.children) {
            search(child);
          }
        };
        for (const child of this.children) {
          search(child);
        }
        return results;
      },
      querySelector(selector: string) {
        const all = this.querySelectorAll(selector);
        return all.length > 0 ? all[0] : null;
      },
      attachShadow(_opts: { mode: string }) {
        const shadow = createElement('shadow-root');
        this._shadowRoot = shadow;
        return shadow;
      },
    };
    elements[el._id] = el;
    return el;
  }

  function matchesSelector(el: MockElement, selector: string): boolean {
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return el.className.includes(className);
    }
    if (selector.startsWith('[')) {
      const attrMatch = selector.match(/\[([^=]+)(?:="([^"]*)")?\]/);
      if (attrMatch) {
        const key = attrMatch[1];
        const value = attrMatch[2];
        if (value !== undefined) {
          return el.attributes[key] === value;
        }
        return el.attributes[key] !== undefined;
      }
    }
    return el.tagName === selector.toUpperCase();
  }

  // Stub the global document
  const mockDoc = {
    createElement,
    body: createElement('body'),
    createTextNode: (text: string) => ({ textContent: text }),
    createDocumentFragment: () => createElement('fragment'),
  };

  return { createElement, mockDoc, elements };
}

describe('CardRenderManager', () => {
  let originalDocument: typeof globalThis.document;

  beforeEach(() => {
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    // Restore
    if (originalDocument) {
      (globalThis as unknown as Record<string, unknown>).document = originalDocument;
    }
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const manager = new CardRenderManager();
      expect(manager).toBeInstanceOf(CardRenderManager);
    });

    it('should create instance with custom options', () => {
      const manager = new CardRenderManager({
        isolationMode: 'iframe',
        animations: true,
        cardGap: 16,
        containerPadding: 24,
      });
      expect(manager).toBeInstanceOf(CardRenderManager);
    });
  });

  describe('render', () => {
    it('should render card data successfully (default iframe mode)', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager();
      const cardData = createTestCardData();
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      const result = manager.render(cardData, renderers, container);

      expect(result.success).toBe(true);
      expect(result.mountedCards).toBeDefined();
      expect(result.mountedCards!.length).toBe(2);
      expect(result.destroy).toBeDefined();
    });

    it('should create mounted cards with correct ids and types', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager();
      const cardData = createTestCardData();
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      const result = manager.render(cardData, renderers, container);

      expect(result.mountedCards![0].id).toBe('bc001');
      expect(result.mountedCards![0].type).toBe('RichTextCard');
      expect(result.mountedCards![1].id).toBe('bc002');
      expect(result.mountedCards![1].type).toBe('ImageCard');
    });

    it('should handle empty card', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager();
      const cardData = createTestCardData({
        baseCards: [],
        structure: { baseCardIds: [] },
      });
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      const result = manager.render(cardData, renderers, container);

      expect(result.success).toBe(true);
      expect(result.mountedCards).toHaveLength(0);
    });

    it('should warn when renderer is missing', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager();
      const cardData = createTestCardData({
        baseCards: [{ id: 'bc001', type: 'UnknownCard', config: {} }],
        structure: { baseCardIds: ['bc001'] },
      });
      const renderers = new Map<string, RendererCode>();
      const container = createElement('div') as unknown as HTMLElement;

      const result = manager.render(cardData, renderers, container);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.warnings![0]).toContain('UnknownCard');
    });

    it('should set data-chips-renderer attribute', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager();
      const cardData = createTestCardData();
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      manager.render(cardData, renderers, container);

      expect((container as unknown as { attributes: Record<string, string> }).attributes['data-chips-renderer']).toBe('true');
    });
  });

  describe('destroy', () => {
    it('should clean up when destroy is called', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager();
      const cardData = createTestCardData();
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      const result = manager.render(cardData, renderers, container);

      expect(result.mountedCards!.length).toBe(2);

      result.destroy!();

      expect(container.innerHTML).toBe('');
    });
  });

  describe('iframe mode (default)', () => {
    it('should use iframe as default isolation mode', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager(); // no options = iframe default
      const cardData = createTestCardData({
        baseCards: [{ id: 'bc001', type: 'RichTextCard', config: { content_text: 'Hello' } }],
        structure: { baseCardIds: ['bc001'] },
      });
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      const result = manager.render(cardData, renderers, container);

      expect(result.success).toBe(true);
      expect(result.mountedCards![0].iframe).toBeDefined();
      expect(result.mountedCards![0].shadowRoot).toBeUndefined();
    });

    it('should create iframes in iframe mode', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager({ isolationMode: 'iframe' });
      const cardData = createTestCardData({
        baseCards: [{ id: 'bc001', type: 'RichTextCard', config: { content_text: 'Hello' } }],
        structure: { baseCardIds: ['bc001'] },
      });
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      const result = manager.render(cardData, renderers, container);

      expect(result.success).toBe(true);
      expect(result.mountedCards![0].iframe).toBeDefined();
    });

    it('should set data-chips-isolation attribute to iframe', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager({ isolationMode: 'iframe' });
      const cardData = createTestCardData();
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      manager.render(cardData, renderers, container);

      expect((container as unknown as { attributes: Record<string, string> }).attributes['data-chips-isolation']).toBe('iframe');
    });

    it('should inject CHIPS_CARD_CONFIG into iframe srcdoc', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager({ isolationMode: 'iframe' });
      const cardData = createTestCardData({
        baseCards: [{ id: 'bc001', type: 'RichTextCard', config: { content_text: '<p>Test</p>' } }],
        structure: { baseCardIds: ['bc001'] },
      });
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      const result = manager.render(cardData, renderers, container);

      // iframe uses srcdoc instead of document.write
      const mountedIframe = result.mountedCards?.[0]?.iframe;
      expect(mountedIframe).toBeDefined();
      if (mountedIframe) {
        const srcdoc = (mountedIframe as unknown as { srcdoc: string }).srcdoc;
        expect(srcdoc).toContain('CHIPS_CARD_CONFIG');
        expect(srcdoc).toContain('chips-card-resize');
        expect(srcdoc).toContain('data-chips-card-id');
      }
    });

    it('should clean up iframe map on destroy', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager({ isolationMode: 'iframe' });
      const cardData = createTestCardData({
        baseCards: [{ id: 'bc001', type: 'RichTextCard', config: {} }],
        structure: { baseCardIds: ['bc001'] },
      });
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      const result = manager.render(cardData, renderers, container);
      result.destroy!();

      expect(container.innerHTML).toBe('');
    });
  });

  describe('shadow-dom mode', () => {
    it('should create shadow roots in shadow-dom mode', () => {
      const { mockDoc, createElement } = createMockDOM();
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager({ isolationMode: 'shadow-dom' });
      const cardData = createTestCardData({
        baseCards: [{ id: 'bc001', type: 'RichTextCard', config: { content_text: 'Hello' } }],
        structure: { baseCardIds: ['bc001'] },
      });
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      const result = manager.render(cardData, renderers, container);

      expect(result.success).toBe(true);
      expect(result.mountedCards![0].shadowRoot).toBeDefined();
      expect(result.mountedCards![0].iframe).toBeUndefined();
    });

    it('should set data-chips-isolation attribute to shadow-dom', () => {
      const { mockDoc, createElement } = createMockDOM();
      vi.stubGlobal('document', mockDoc);

      const manager = new CardRenderManager({ isolationMode: 'shadow-dom' });
      const cardData = createTestCardData();
      const renderers = createTestRendererMap();
      const container = createElement('div') as unknown as HTMLElement;

      manager.render(cardData, renderers, container);

      expect((container as unknown as { attributes: Record<string, string> }).attributes['data-chips-isolation']).toBe('shadow-dom');
    });
  });

  describe('dual mode consistency', () => {
    it('both modes should produce same number of mounted cards', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const cardData = createTestCardData();
      const renderers = createTestRendererMap();

      const iframeManager = new CardRenderManager({ isolationMode: 'iframe' });
      const shadowManager = new CardRenderManager({ isolationMode: 'shadow-dom' });

      const container1 = createElement('div') as unknown as HTMLElement;
      const container2 = createElement('div') as unknown as HTMLElement;

      const result1 = iframeManager.render(cardData, renderers, container1);
      const result2 = shadowManager.render(cardData, renderers, container2);

      expect(result1.mountedCards!.length).toBe(result2.mountedCards!.length);
      expect(result1.mountedCards!.length).toBe(2);
    });

    it('both modes should set same card ids and types', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const cardData = createTestCardData();
      const renderers = createTestRendererMap();

      const iframeManager = new CardRenderManager({ isolationMode: 'iframe' });
      const shadowManager = new CardRenderManager({ isolationMode: 'shadow-dom' });

      const c1 = createElement('div') as unknown as HTMLElement;
      const c2 = createElement('div') as unknown as HTMLElement;

      const r1 = iframeManager.render(cardData, renderers, c1);
      const r2 = shadowManager.render(cardData, renderers, c2);

      for (let i = 0; i < r1.mountedCards!.length; i++) {
        expect(r1.mountedCards![i].id).toBe(r2.mountedCards![i].id);
        expect(r1.mountedCards![i].type).toBe(r2.mountedCards![i].type);
      }
    });

    it('both modes should provide working destroy', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const cardData = createTestCardData();
      const renderers = createTestRendererMap();

      const c1 = createElement('div') as unknown as HTMLElement;
      const c2 = createElement('div') as unknown as HTMLElement;

      const r1 = new CardRenderManager({ isolationMode: 'iframe' }).render(cardData, renderers, c1);
      const r2 = new CardRenderManager({ isolationMode: 'shadow-dom' }).render(cardData, renderers, c2);

      expect(r1.destroy).toBeDefined();
      expect(r2.destroy).toBeDefined();

      r1.destroy!();
      r2.destroy!();

      expect(c1.innerHTML).toBe('');
      expect(c2.innerHTML).toBe('');
    });

    it('both modes should handle empty cards identically', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const cardData = createTestCardData({
        baseCards: [],
        structure: { baseCardIds: [] },
      });
      const renderers = createTestRendererMap();

      const c1 = createElement('div') as unknown as HTMLElement;
      const c2 = createElement('div') as unknown as HTMLElement;

      const r1 = new CardRenderManager({ isolationMode: 'iframe' }).render(cardData, renderers, c1);
      const r2 = new CardRenderManager({ isolationMode: 'shadow-dom' }).render(cardData, renderers, c2);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r1.mountedCards).toHaveLength(0);
      expect(r2.mountedCards).toHaveLength(0);
    });

    it('both modes should report same warnings for missing renderers', () => {
      const { mockDoc, createElement } = createMockDOM();
      addIframeMock(mockDoc);
      vi.stubGlobal('document', mockDoc);

      const cardData = createTestCardData({
        baseCards: [{ id: 'bc001', type: 'UnknownCard', config: {} }],
        structure: { baseCardIds: ['bc001'] },
      });
      const renderers = new Map<string, RendererCode>();

      const c1 = createElement('div') as unknown as HTMLElement;
      const c2 = createElement('div') as unknown as HTMLElement;

      const r1 = new CardRenderManager({ isolationMode: 'iframe' }).render(cardData, renderers, c1);
      const r2 = new CardRenderManager({ isolationMode: 'shadow-dom' }).render(cardData, renderers, c2);

      expect(r1.warnings).toBeDefined();
      expect(r2.warnings).toBeDefined();
      expect(r1.warnings![0]).toContain('UnknownCard');
      expect(r2.warnings![0]).toContain('UnknownCard');
    });
  });
});
