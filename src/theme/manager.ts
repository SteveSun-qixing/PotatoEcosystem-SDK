/**
 * 主题管理器
 * @module theme/manager
 */

import { Logger } from '../logger';
import { EventBus } from '../event';
import {
  Theme,
  ThemeMetadata,
  ThemeManagerOptions,
  CSSVariables,
} from './types';

/**
 * 默认亮色主题
 */
const DEFAULT_LIGHT_THEME: Theme = {
  metadata: {
    id: 'default-light',
    name: 'Default Light',
    type: 'light',
    version: '1.0.0',
    description: 'Default light theme for Chips SDK',
  },
  colors: {
    primary: '#3b82f6',
    secondary: '#6366f1',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#22c55e',
    info: '#3b82f6',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  radius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'ui-monospace, monospace',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      xxl: '1.5rem',
    },
    lineHeight: {
      tight: '1.25',
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
};

/**
 * 默认暗色主题
 */
const DEFAULT_DARK_THEME: Theme = {
  metadata: {
    id: 'default-dark',
    name: 'Default Dark',
    type: 'dark',
    version: '1.0.0',
    description: 'Default dark theme for Chips SDK',
    extends: 'default-light',
  },
  colors: {
    primary: '#60a5fa',
    secondary: '#818cf8',
    accent: '#fbbf24',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    error: '#f87171',
    warning: '#fbbf24',
    success: '#4ade80',
    info: '#60a5fa',
  },
  spacing: DEFAULT_LIGHT_THEME.spacing,
  radius: DEFAULT_LIGHT_THEME.radius,
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.3)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.3)',
  },
  typography: DEFAULT_LIGHT_THEME.typography,
  animation: DEFAULT_LIGHT_THEME.animation,
};

/**
 * 主题管理器
 *
 * @example
 * ```ts
 * const themeManager = new ThemeManager(logger, eventBus);
 *
 * // 设置主题
 * themeManager.setTheme('default-dark');
 *
 * // 获取 CSS 变量
 * const vars = themeManager.getCSSVariables();
 * ```
 */
export class ThemeManager {
  private _themes = new Map<string, Theme>();
  private _currentThemeId: string;
  private _logger: Logger;
  private _eventBus: EventBus;

  /**
   * 创建主题管理器
   * @param logger - 日志实例
   * @param eventBus - 事件总线
   * @param options - 配置选项
   */
  constructor(logger: Logger, eventBus: EventBus, options?: ThemeManagerOptions) {
    this._logger = logger.createChild('ThemeManager');
    this._eventBus = eventBus;

    // 注册默认主题
    this._themes.set('default-light', DEFAULT_LIGHT_THEME);
    this._themes.set('default-dark', DEFAULT_DARK_THEME);

    // 注册自定义主题
    if (options?.themes) {
      for (const theme of options.themes) {
        this.register(theme);
      }
    }

    // 设置默认主题
    this._currentThemeId = options?.defaultTheme || 'default-light';
  }

  /**
   * 注册主题
   * @param theme - 主题定义
   */
  register(theme: Theme): void {
    // 如果有继承，合并主题
    if (theme.metadata.extends) {
      const parentTheme = this._themes.get(theme.metadata.extends);
      if (parentTheme) {
        theme = this._mergeThemes(parentTheme, theme);
      }
    }

    this._themes.set(theme.metadata.id, theme);
    this._logger.info('Theme registered', { id: theme.metadata.id });

    this._eventBus.emitSync('theme:registered', { id: theme.metadata.id });
  }

  /**
   * 取消注册主题
   * @param id - 主题 ID
   */
  unregister(id: string): void {
    if (id === 'default-light' || id === 'default-dark') {
      this._logger.warn('Cannot unregister default themes');
      return;
    }

    this._themes.delete(id);
    this._logger.info('Theme unregistered', { id });
  }

  /**
   * 设置当前主题
   * @param id - 主题 ID
   */
  setTheme(id: string): void {
    if (!this._themes.has(id)) {
      this._logger.warn('Theme not found', { id });
      return;
    }

    const previousTheme = this._currentThemeId;
    this._currentThemeId = id;

    this._logger.info('Theme changed', { from: previousTheme, to: id });

    this._eventBus.emitSync('theme:changed', {
      previousTheme,
      currentTheme: id,
    });
  }

  /**
   * 获取当前主题
   */
  getTheme(): Theme {
    return this._themes.get(this._currentThemeId) || DEFAULT_LIGHT_THEME;
  }

  /**
   * 获取当前主题 ID
   */
  get currentThemeId(): string {
    return this._currentThemeId;
  }

  /**
   * 获取指定主题
   * @param id - 主题 ID
   */
  getThemeById(id: string): Theme | undefined {
    return this._themes.get(id);
  }

  /**
   * 获取所有主题
   */
  listThemes(): ThemeMetadata[] {
    return Array.from(this._themes.values()).map((t) => t.metadata);
  }

  /**
   * 检查主题是否存在
   * @param id - 主题 ID
   */
  hasTheme(id: string): boolean {
    return this._themes.has(id);
  }

  /**
   * 获取主题数量
   */
  get count(): number {
    return this._themes.size;
  }

  /**
   * 获取 CSS 变量
   */
  getCSSVariables(): CSSVariables {
    const theme = this.getTheme();
    const vars: CSSVariables = {};

    // 颜色
    for (const [key, value] of Object.entries(theme.colors)) {
      vars[`--chips-color-${this._toKebabCase(key)}`] = value;
    }

    // 间距
    for (const [key, value] of Object.entries(theme.spacing)) {
      vars[`--chips-spacing-${key}`] = value;
    }

    // 圆角
    for (const [key, value] of Object.entries(theme.radius)) {
      vars[`--chips-radius-${key}`] = value;
    }

    // 阴影
    for (const [key, value] of Object.entries(theme.shadow)) {
      vars[`--chips-shadow-${key}`] = value;
    }

    // 排版
    vars['--chips-font-family'] = theme.typography.fontFamily;
    vars['--chips-font-family-mono'] = theme.typography.fontFamilyMono;
    for (const [key, value] of Object.entries(theme.typography.fontSize)) {
      vars[`--chips-font-size-${key}`] = value;
    }
    for (const [key, value] of Object.entries(theme.typography.lineHeight)) {
      vars[`--chips-line-height-${key}`] = value;
    }
    for (const [key, value] of Object.entries(theme.typography.fontWeight)) {
      vars[`--chips-font-weight-${key}`] = value;
    }

    // 动画
    for (const [key, value] of Object.entries(theme.animation.duration)) {
      vars[`--chips-duration-${key}`] = value;
    }
    for (const [key, value] of Object.entries(theme.animation.easing)) {
      vars[`--chips-easing-${key}`] = value;
    }

    // 自定义变量
    if (theme.customVariables) {
      Object.assign(vars, theme.customVariables);
    }

    return vars;
  }

  /**
   * 应用主题到 DOM
   * @param root - 根元素
   */
  applyToDOM(root: HTMLElement = document.documentElement): void {
    const vars = this.getCSSVariables();

    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    // 设置主题类型属性
    const theme = this.getTheme();
    root.setAttribute('data-theme', theme.metadata.type);

    this._logger.debug('Theme applied to DOM');
  }

  /**
   * 检测系统主题偏好
   */
  detectSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  /**
   * 自动应用系统主题
   */
  applySystemTheme(): void {
    const preference = this.detectSystemTheme();
    const themeId = preference === 'dark' ? 'default-dark' : 'default-light';
    this.setTheme(themeId);
  }

  // ========== 私有方法 ==========

  /**
   * 合并主题
   */
  private _mergeThemes(parent: Theme, child: Theme): Theme {
    return {
      metadata: child.metadata,
      colors: { ...parent.colors, ...child.colors },
      spacing: { ...parent.spacing, ...child.spacing },
      radius: { ...parent.radius, ...child.radius },
      shadow: { ...parent.shadow, ...child.shadow },
      typography: {
        ...parent.typography,
        ...child.typography,
        fontSize: { ...parent.typography.fontSize, ...child.typography.fontSize },
        lineHeight: { ...parent.typography.lineHeight, ...child.typography.lineHeight },
        fontWeight: { ...parent.typography.fontWeight, ...child.typography.fontWeight },
      },
      animation: {
        ...parent.animation,
        ...child.animation,
        duration: { ...parent.animation.duration, ...child.animation.duration },
        easing: { ...parent.animation.easing, ...child.animation.easing },
      },
      customVariables: { ...parent.customVariables, ...child.customVariables },
    };
  }

  /**
   * 转换为 kebab-case
   */
  private _toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
