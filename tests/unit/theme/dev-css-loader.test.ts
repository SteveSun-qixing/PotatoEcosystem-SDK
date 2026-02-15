// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DevCssLoader } from '../../../src/theme/dev-css-loader';
import { CssInjector } from '../../../src/theme/css-injector';
import { Logger } from '../../../src/logger';

function createMockLogger(): Logger {
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

describe('DevCssLoader', () => {
  let loader: DevCssLoader;
  let injector: CssInjector;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    injector = new CssInjector(mockLogger);
    loader = new DevCssLoader(mockLogger, injector);
  });

  afterEach(() => {
    injector.removeAll();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('应该创建实例且初始未加载', () => {
      expect(loader).toBeInstanceOf(DevCssLoader);
      expect(loader.loaded).toBe(false);
    });

    it('应该支持自定义配置', () => {
      const customLoader = new DevCssLoader(mockLogger, injector, {
        themeBasePath: 'custom/path',
        componentFiles: ['button', 'input'],
      });
      expect(customLoader).toBeInstanceOf(DevCssLoader);
      expect(customLoader.loaded).toBe(false);
    });
  });

  describe('loadFromText', () => {
    it('应该从文本直接加载 CSS 层', () => {
      loader.loadFromText({
        tokens: ':root { --a: 1; }',
        components: '.btn { display: flex; }',
      });

      expect(loader.loaded).toBe(true);
      expect(injector.has('tokens')).toBe(true);
      expect(injector.has('components')).toBe(true);
    });

    it('应该支持加载单个层', () => {
      loader.loadFromText({ tokens: ':root { --x: 1; }' });

      expect(loader.loaded).toBe(true);
      expect(injector.count).toBe(1);
    });

    it('应该支持加载所有四个层', () => {
      loader.loadFromText({
        tokens: ':root {}',
        components: '.btn {}',
        animations: '@keyframes {}',
        icons: '.icon {}',
      });

      expect(injector.count).toBe(4);
      expect(injector.has('tokens')).toBe(true);
      expect(injector.has('components')).toBe(true);
      expect(injector.has('animations')).toBe(true);
      expect(injector.has('icons')).toBe(true);
    });
  });

  describe('loadFromPackage', () => {
    it('应该在已加载时跳过重复加载', async () => {
      loader.loadFromText({ tokens: ':root {}' });
      const result = await loader.loadFromPackage();

      expect(result).toBe(true);
    });

    it('应该在 fetch 失败时返回 false', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const result = await loader.loadFromPackage();

      expect(result).toBe(false);
      expect(loader.loaded).toBe(false);

      vi.unstubAllGlobals();
    });

    it('应该在 fetch 返回非 ok 响应时返回 false', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }));

      const result = await loader.loadFromPackage();

      expect(result).toBe(false);

      vi.unstubAllGlobals();
    });

    it('应该在成功获取 CSS 时注入并标记已加载', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(':root { --chips-color-primary: #3b82f6; }'),
      }));

      const result = await loader.loadFromPackage();

      expect(result).toBe(true);
      expect(loader.loaded).toBe(true);
      expect(injector.count).toBeGreaterThan(0);

      vi.unstubAllGlobals();
    });

    it('应该使用自定义组件文件列表', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('.test { color: red; }'),
      });
      vi.stubGlobal('fetch', fetchMock);

      const customLoader = new DevCssLoader(mockLogger, injector, {
        componentFiles: ['button'],
      });
      await customLoader.loadFromPackage();

      // 应该请求 tokens, 1 个组件, 2 个动画, 1 个图标 = 5 次 fetch
      expect(fetchMock).toHaveBeenCalledTimes(5);

      vi.unstubAllGlobals();
    });
  });

  describe('loaded', () => {
    it('应该在初始状态返回 false', () => {
      expect(loader.loaded).toBe(false);
    });

    it('应该在 loadFromText 后返回 true', () => {
      loader.loadFromText({ tokens: ':root {}' });
      expect(loader.loaded).toBe(true);
    });
  });
});
