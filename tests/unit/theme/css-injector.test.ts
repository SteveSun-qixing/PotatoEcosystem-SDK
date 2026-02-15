// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('CssInjector', () => {
  let injector: CssInjector;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    injector = new CssInjector(mockLogger);
    // 清理 DOM
    document.head.querySelectorAll('style[data-chips-theme-layer]').forEach((el) => el.remove());
  });

  afterEach(() => {
    injector.removeAll();
    vi.clearAllMocks();
  });

  describe('inject', () => {
    it('应该创建 style 标签并注入 CSS', () => {
      const result = injector.inject('tokens', ':root { --chips-color-primary: #3b82f6; }');

      expect(result).toBe(true);
      const style = document.getElementById('chips-theme-tokens');
      expect(style).not.toBeNull();
      expect(style?.textContent).toContain('--chips-color-primary');
    });

    it('应该设置正确的 data 属性', () => {
      injector.inject('components', '.chips-button { display: flex; }');

      const style = document.getElementById('chips-theme-components');
      expect(style?.getAttribute('data-chips-theme-layer')).toBe('components');
    });

    it('应该在内容相同时跳过注入', () => {
      const css = '.test { color: red; }';
      injector.inject('test', css);
      const result = injector.inject('test', css);

      expect(result).toBe(false);
    });

    it('应该在内容变化时更新已有的 style 标签', () => {
      injector.inject('tokens', ':root { --a: 1; }');
      injector.inject('tokens', ':root { --a: 2; }');

      const style = document.getElementById('chips-theme-tokens');
      expect(style?.textContent).toContain('--a: 2');
      // 应该只有一个 style 标签
      expect(document.querySelectorAll('#chips-theme-tokens').length).toBe(1);
    });

    it('应该支持自定义 ID 前缀', () => {
      const customInjector = new CssInjector(mockLogger, { idPrefix: 'my-app' });
      customInjector.inject('tokens', ':root {}');

      const style = document.getElementById('my-app-tokens');
      expect(style).not.toBeNull();
      customInjector.removeAll();
    });
  });

  describe('injectAll', () => {
    it('应该批量注入多个 CSS 层', () => {
      const updated = injector.injectAll({
        tokens: ':root { --a: 1; }',
        components: '.btn { display: flex; }',
        animations: '@keyframes spin { to { transform: rotate(360deg); } }',
      });

      expect(updated).toBe(3);
      expect(injector.count).toBe(3);
    });

    it('应该返回实际更新的层数', () => {
      injector.inject('tokens', ':root { --a: 1; }');
      const updated = injector.injectAll({
        tokens: ':root { --a: 1; }', // 相同内容，不更新
        components: '.btn { display: flex; }', // 新内容
      });

      expect(updated).toBe(1);
    });
  });

  describe('remove', () => {
    it('应该移除指定的 style 标签', () => {
      injector.inject('tokens', ':root {}');
      const result = injector.remove('tokens');

      expect(result).toBe(true);
      expect(document.getElementById('chips-theme-tokens')).toBeNull();
      expect(injector.has('tokens')).toBe(false);
    });

    it('应该在 key 不存在时返回 false', () => {
      const result = injector.remove('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('removeAll', () => {
    it('应该移除所有注入的 style 标签', () => {
      injector.inject('tokens', ':root {}');
      injector.inject('components', '.btn {}');
      injector.inject('animations', '@keyframes {}');

      injector.removeAll();

      expect(injector.count).toBe(0);
      expect(document.querySelectorAll('style[data-chips-theme-layer]').length).toBe(0);
    });
  });

  describe('has', () => {
    it('应该正确检测已注入的 key', () => {
      injector.inject('tokens', ':root {}');

      expect(injector.has('tokens')).toBe(true);
      expect(injector.has('components')).toBe(false);
    });
  });

  describe('keys', () => {
    it('应该返回所有已注入的 key 列表', () => {
      injector.inject('tokens', ':root {}');
      injector.inject('components', '.btn {}');

      expect(injector.keys).toEqual(['tokens', 'components']);
    });
  });

  describe('count', () => {
    it('应该返回正确的注入数量', () => {
      expect(injector.count).toBe(0);

      injector.inject('tokens', ':root {}');
      expect(injector.count).toBe(1);

      injector.inject('components', '.btn {}');
      expect(injector.count).toBe(2);

      injector.remove('tokens');
      expect(injector.count).toBe(1);
    });
  });
});
