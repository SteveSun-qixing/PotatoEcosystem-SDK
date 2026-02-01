import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeManager } from '../../../src/theme/manager';
import { Logger } from '../../../src/logger';
import { EventBus } from '../../../src/event';
import { Theme, ThemeMetadata } from '../../../src/theme/types';

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

// 创建测试用主题
function createTestTheme(overrides?: Partial<Theme>): Theme {
  return {
    metadata: {
      id: 'test-theme',
      name: 'Test Theme',
      type: 'light',
      version: '1.0.0',
      description: 'A test theme',
    },
    colors: {
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff',
      background: '#ffffff',
      surface: '#f0f0f0',
      text: '#000000',
      textSecondary: '#666666',
      border: '#cccccc',
      error: '#ff0000',
      warning: '#ffff00',
      success: '#00ff00',
      info: '#0000ff',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '48px',
    },
    radius: {
      none: '0',
      sm: '2px',
      md: '4px',
      lg: '8px',
      full: '9999px',
    },
    shadow: {
      none: 'none',
      sm: '0 1px 2px rgba(0,0,0,0.1)',
      md: '0 4px 6px rgba(0,0,0,0.1)',
      lg: '0 10px 15px rgba(0,0,0,0.1)',
      xl: '0 20px 25px rgba(0,0,0,0.1)',
    },
    typography: {
      fontFamily: 'Arial, sans-serif',
      fontFamilyMono: 'Courier, monospace',
      fontSize: {
        xs: '10px',
        sm: '12px',
        base: '14px',
        lg: '16px',
        xl: '20px',
        xxl: '24px',
      },
      lineHeight: {
        tight: '1.2',
        normal: '1.5',
        relaxed: '1.8',
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
    animation: {
      duration: {
        fast: '100ms',
        normal: '200ms',
        slow: '300ms',
      },
      easing: {
        default: 'ease',
        in: 'ease-in',
        out: 'ease-out',
        inOut: 'ease-in-out',
      },
    },
    ...overrides,
  };
}

describe('ThemeManager', () => {
  let themeManager: ThemeManager;
  let mockLogger: Logger;
  let mockEventBus: EventBus;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockEventBus = createMockEventBus();
    themeManager = new ThemeManager(mockLogger, mockEventBus);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该创建实例并注册默认主题', () => {
      expect(themeManager).toBeInstanceOf(ThemeManager);
      expect(themeManager.hasTheme('default-light')).toBe(true);
      expect(themeManager.hasTheme('default-dark')).toBe(true);
    });

    it('应该使用默认亮色主题', () => {
      expect(themeManager.currentThemeId).toBe('default-light');
    });

    it('应该支持自定义默认主题', () => {
      const customManager = new ThemeManager(mockLogger, mockEventBus, {
        defaultTheme: 'default-dark',
      });

      expect(customManager.currentThemeId).toBe('default-dark');
    });

    it('应该在构造时注册自定义主题', () => {
      const customTheme = createTestTheme({
        metadata: { id: 'custom', name: 'Custom', type: 'light', version: '1.0.0' },
      });

      const customManager = new ThemeManager(mockLogger, mockEventBus, {
        themes: [customTheme],
      });

      expect(customManager.hasTheme('custom')).toBe(true);
    });

    it('应该统计默认主题数量', () => {
      expect(themeManager.count).toBe(2);
    });
  });

  describe('register', () => {
    it('应该成功注册新主题', () => {
      const theme = createTestTheme();

      themeManager.register(theme);

      expect(themeManager.hasTheme('test-theme')).toBe(true);
      expect(themeManager.count).toBe(3);
    });

    it('应该触发 theme:registered 事件', () => {
      const theme = createTestTheme();

      themeManager.register(theme);

      expect(mockEventBus.emitSync).toHaveBeenCalledWith('theme:registered', {
        id: 'test-theme',
      });
    });

    it('应该覆盖已存在的主题', () => {
      const theme1 = createTestTheme({
        colors: { ...createTestTheme().colors, primary: '#111111' },
      });
      const theme2 = createTestTheme({
        colors: { ...createTestTheme().colors, primary: '#222222' },
      });

      themeManager.register(theme1);
      themeManager.register(theme2);

      const registered = themeManager.getThemeById('test-theme');
      expect(registered?.colors.primary).toBe('#222222');
    });
  });

  describe('主题继承', () => {
    it('应该从父主题继承属性', () => {
      // 创建只覆盖部分属性的子主题
      const parentTheme = themeManager.getThemeById('default-light')!;

      const childTheme: Theme = {
        metadata: {
          id: 'child-theme',
          name: 'Child Theme',
          type: 'light',
          version: '1.0.0',
          extends: 'default-light',
        },
        colors: {
          ...parentTheme.colors,
          primary: '#custom-primary',
        },
        spacing: parentTheme.spacing,
        radius: parentTheme.radius,
        shadow: parentTheme.shadow,
        typography: parentTheme.typography, // 继承父主题的排版
        animation: parentTheme.animation,
      };

      themeManager.register(childTheme);

      const registered = themeManager.getThemeById('child-theme');
      expect(registered?.colors.primary).toBe('#custom-primary');
      // 继承父主题的其他属性
      expect(registered?.typography.fontFamily).toBe('system-ui, -apple-system, sans-serif');
    });

    it('应该正确合并嵌套的 typography 属性', () => {
      const childTheme: Theme = {
        metadata: {
          id: 'child-theme',
          name: 'Child Theme',
          type: 'light',
          version: '1.0.0',
          extends: 'default-light',
        },
        colors: createTestTheme().colors,
        spacing: createTestTheme().spacing,
        radius: createTestTheme().radius,
        shadow: createTestTheme().shadow,
        typography: {
          fontFamily: 'Custom Font',
          fontFamilyMono: 'Custom Mono',
          fontSize: {
            xs: '0.5rem',
            sm: '0.75rem',
            base: '1rem',
            lg: '1.25rem',
            xl: '1.5rem',
            xxl: '2rem',
          },
          lineHeight: {
            tight: '1.1',
            normal: '1.5',
            relaxed: '1.75',
          },
          fontWeight: {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
          },
        },
        animation: createTestTheme().animation,
      };

      themeManager.register(childTheme);

      const registered = themeManager.getThemeById('child-theme');
      expect(registered?.typography.fontFamily).toBe('Custom Font');
      expect(registered?.typography.fontSize.xs).toBe('0.5rem');
    });

    it('应该合并 customVariables', () => {
      // 先注册一个带 customVariables 的父主题
      const parentTheme = createTestTheme({
        metadata: {
          id: 'parent-with-vars',
          name: 'Parent with Vars',
          type: 'light',
          version: '1.0.0',
        },
        customVariables: {
          '--custom-parent': 'parent-value',
          '--shared-var': 'parent-shared',
        },
      });
      themeManager.register(parentTheme);

      const childTheme: Theme = {
        ...createTestTheme(),
        metadata: {
          id: 'child-with-vars',
          name: 'Child with Vars',
          type: 'light',
          version: '1.0.0',
          extends: 'parent-with-vars',
        },
        customVariables: {
          '--custom-child': 'child-value',
          '--shared-var': 'child-shared',
        },
      };

      themeManager.register(childTheme);

      const registered = themeManager.getThemeById('child-with-vars');
      expect(registered?.customVariables?.['--custom-parent']).toBe('parent-value');
      expect(registered?.customVariables?.['--custom-child']).toBe('child-value');
      expect(registered?.customVariables?.['--shared-var']).toBe('child-shared');
    });

    it('应该在父主题不存在时直接使用子主题', () => {
      const childTheme: Theme = {
        ...createTestTheme(),
        metadata: {
          id: 'orphan-theme',
          name: 'Orphan Theme',
          type: 'light',
          version: '1.0.0',
          extends: 'non-existent-parent',
        },
      };

      themeManager.register(childTheme);

      const registered = themeManager.getThemeById('orphan-theme');
      expect(registered).toBeDefined();
      expect(registered?.colors.primary).toBe('#ff0000');
    });
  });

  describe('unregister', () => {
    it('应该成功取消注册主题', () => {
      const theme = createTestTheme();
      themeManager.register(theme);

      themeManager.unregister('test-theme');

      expect(themeManager.hasTheme('test-theme')).toBe(false);
    });

    it('不应该取消注册默认主题', () => {
      themeManager.unregister('default-light');
      themeManager.unregister('default-dark');

      expect(themeManager.hasTheme('default-light')).toBe(true);
      expect(themeManager.hasTheme('default-dark')).toBe(true);
    });

    it('应该记录警告当尝试取消注册默认主题', () => {
      themeManager.unregister('default-light');

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0]
        .value;
      expect(childLogger.warn).toHaveBeenCalled();
    });
  });

  describe('setTheme', () => {
    it('应该成功切换主题', () => {
      themeManager.setTheme('default-dark');

      expect(themeManager.currentThemeId).toBe('default-dark');
    });

    it('应该触发 theme:changed 事件', () => {
      themeManager.setTheme('default-dark');

      expect(mockEventBus.emitSync).toHaveBeenCalledWith('theme:changed', {
        previousTheme: 'default-light',
        currentTheme: 'default-dark',
      });
    });

    it('应该记录警告当主题不存在', () => {
      themeManager.setTheme('non-existent');

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0]
        .value;
      expect(childLogger.warn).toHaveBeenCalled();
      expect(themeManager.currentThemeId).toBe('default-light');
    });

    it('应该切换到自定义注册的主题', () => {
      const theme = createTestTheme();
      themeManager.register(theme);

      themeManager.setTheme('test-theme');

      expect(themeManager.currentThemeId).toBe('test-theme');
    });
  });

  describe('getTheme', () => {
    it('应该返回当前主题', () => {
      const theme = themeManager.getTheme();

      expect(theme).toBeDefined();
      expect(theme.metadata.id).toBe('default-light');
    });

    it('应该返回切换后的主题', () => {
      themeManager.setTheme('default-dark');

      const theme = themeManager.getTheme();

      expect(theme.metadata.id).toBe('default-dark');
    });

    it('应该返回默认主题当当前主题被删除', () => {
      const theme = createTestTheme();
      themeManager.register(theme);
      themeManager.setTheme('test-theme');
      themeManager.unregister('test-theme');

      // 主题被删除后，getTheme 应返回 DEFAULT_LIGHT_THEME
      const currentTheme = themeManager.getTheme();
      expect(currentTheme.metadata.id).toBe('default-light');
    });
  });

  describe('getThemeById', () => {
    it('应该返回指定的主题', () => {
      const theme = themeManager.getThemeById('default-dark');

      expect(theme).toBeDefined();
      expect(theme?.metadata.type).toBe('dark');
    });

    it('应该返回 undefined 当主题不存在', () => {
      const theme = themeManager.getThemeById('non-existent');

      expect(theme).toBeUndefined();
    });
  });

  describe('listThemes', () => {
    it('应该返回所有主题的元数据', () => {
      const themes = themeManager.listThemes();

      expect(themes).toHaveLength(2);
      expect(themes.map((t) => t.id)).toContain('default-light');
      expect(themes.map((t) => t.id)).toContain('default-dark');
    });

    it('应该包含新注册的主题', () => {
      themeManager.register(createTestTheme());

      const themes = themeManager.listThemes();

      expect(themes).toHaveLength(3);
      expect(themes.map((t) => t.id)).toContain('test-theme');
    });
  });

  describe('getCSSVariables', () => {
    it('应该生成颜色 CSS 变量', () => {
      const vars = themeManager.getCSSVariables();

      expect(vars['--chips-color-primary']).toBe('#3b82f6');
      expect(vars['--chips-color-background']).toBe('#ffffff');
      expect(vars['--chips-color-text']).toBe('#1e293b');
    });

    it('应该生成间距 CSS 变量', () => {
      const vars = themeManager.getCSSVariables();

      expect(vars['--chips-spacing-xs']).toBe('0.25rem');
      expect(vars['--chips-spacing-md']).toBe('1rem');
      expect(vars['--chips-spacing-xl']).toBe('2rem');
    });

    it('应该生成圆角 CSS 变量', () => {
      const vars = themeManager.getCSSVariables();

      expect(vars['--chips-radius-none']).toBe('0');
      expect(vars['--chips-radius-md']).toBe('0.5rem');
      expect(vars['--chips-radius-full']).toBe('9999px');
    });

    it('应该生成阴影 CSS 变量', () => {
      const vars = themeManager.getCSSVariables();

      expect(vars['--chips-shadow-none']).toBe('none');
      expect(vars['--chips-shadow-md']).toBeDefined();
    });

    it('应该生成排版 CSS 变量', () => {
      const vars = themeManager.getCSSVariables();

      expect(vars['--chips-font-family']).toBe('system-ui, -apple-system, sans-serif');
      expect(vars['--chips-font-family-mono']).toBe('ui-monospace, monospace');
      expect(vars['--chips-font-size-base']).toBe('1rem');
      expect(vars['--chips-line-height-normal']).toBe('1.5');
      expect(vars['--chips-font-weight-bold']).toBe('700');
    });

    it('应该生成动画 CSS 变量', () => {
      const vars = themeManager.getCSSVariables();

      expect(vars['--chips-duration-fast']).toBe('100ms');
      expect(vars['--chips-duration-normal']).toBe('200ms');
      expect(vars['--chips-easing-default']).toBe('ease');
      // inOut 转换为 kebab-case 是 in-out
      expect(vars['--chips-easing-inOut']).toBe('ease-in-out');
    });

    it('应该包含自定义变量', () => {
      const theme = createTestTheme({
        metadata: {
          id: 'custom-vars-theme',
          name: 'Custom Vars Theme',
          type: 'light',
          version: '1.0.0',
        },
        customVariables: {
          '--my-custom-var': 'custom-value',
          '--another-var': '100px',
        },
      });
      themeManager.register(theme);
      themeManager.setTheme('custom-vars-theme');

      const vars = themeManager.getCSSVariables();

      expect(vars['--my-custom-var']).toBe('custom-value');
      expect(vars['--another-var']).toBe('100px');
    });

    it('应该正确转换 camelCase 为 kebab-case', () => {
      const vars = themeManager.getCSSVariables();

      // textSecondary -> text-secondary
      expect(vars['--chips-color-text-secondary']).toBeDefined();
    });

    it('应该为暗色主题生成不同的变量', () => {
      themeManager.setTheme('default-dark');

      const vars = themeManager.getCSSVariables();

      expect(vars['--chips-color-background']).toBe('#0f172a');
      expect(vars['--chips-color-text']).toBe('#f1f5f9');
    });
  });

  describe('applyToDOM', () => {
    it('应该将 CSS 变量应用到元素', () => {
      const mockElement = {
        style: {
          setProperty: vi.fn(),
        },
        setAttribute: vi.fn(),
      } as unknown as HTMLElement;

      themeManager.applyToDOM(mockElement);

      expect(mockElement.style.setProperty).toHaveBeenCalled();
      expect(mockElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('应该设置正确的 data-theme 属性', () => {
      const mockElement = {
        style: {
          setProperty: vi.fn(),
        },
        setAttribute: vi.fn(),
      } as unknown as HTMLElement;

      themeManager.setTheme('default-dark');
      themeManager.applyToDOM(mockElement);

      expect(mockElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });
  });

  describe('detectSystemTheme', () => {
    it('应该检测系统偏好为暗色', () => {
      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockReturnValue({ matches: true }),
      });

      const result = themeManager.detectSystemTheme();

      expect(result).toBe('dark');

      vi.unstubAllGlobals();
    });

    it('应该检测系统偏好为亮色', () => {
      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      });

      const result = themeManager.detectSystemTheme();

      expect(result).toBe('light');

      vi.unstubAllGlobals();
    });

    it('应该在无法检测时返回 light', () => {
      vi.stubGlobal('window', undefined);

      const result = themeManager.detectSystemTheme();

      expect(result).toBe('light');

      vi.unstubAllGlobals();
    });
  });

  describe('applySystemTheme', () => {
    it('应该应用暗色系统主题', () => {
      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockReturnValue({ matches: true }),
      });

      themeManager.applySystemTheme();

      expect(themeManager.currentThemeId).toBe('default-dark');

      vi.unstubAllGlobals();
    });

    it('应该应用亮色系统主题', () => {
      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      });

      themeManager.setTheme('default-dark');
      themeManager.applySystemTheme();

      expect(themeManager.currentThemeId).toBe('default-light');

      vi.unstubAllGlobals();
    });
  });

  describe('hasTheme', () => {
    it('应该返回 true 当主题存在', () => {
      expect(themeManager.hasTheme('default-light')).toBe(true);
      expect(themeManager.hasTheme('default-dark')).toBe(true);
    });

    it('应该返回 false 当主题不存在', () => {
      expect(themeManager.hasTheme('non-existent')).toBe(false);
    });
  });

  describe('count', () => {
    it('应该返回正确的主题数量', () => {
      expect(themeManager.count).toBe(2);

      themeManager.register(createTestTheme());
      expect(themeManager.count).toBe(3);

      themeManager.unregister('test-theme');
      expect(themeManager.count).toBe(2);
    });
  });
});
