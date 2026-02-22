/**
 * 主题管理器
 * @module theme/manager
 */

import { Logger } from '../logger';
import { EventBus } from '../event';
import { BridgeClient } from '../bridge';
import {
  Theme,
  ThemeMetadata,
  ThemeManagerOptions,
  CSSVariables,
  ThemeHierarchyChain,
  DEFAULT_THEME_ID,
  DEFAULT_DARK_THEME_ID,
  LEGACY_THEME_ID_MAP,
} from './types';
import { CssInjector } from './css-injector';
import { DevCssLoader } from './dev-css-loader';

/**
 * 默认亮色主题
 */
const DEFAULT_LIGHT_THEME: Theme = {
  metadata: {
    id: DEFAULT_THEME_ID,
    themeId: DEFAULT_THEME_ID,
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
    id: DEFAULT_DARK_THEME_ID,
    themeId: DEFAULT_DARK_THEME_ID,
    name: 'Default Dark',
    type: 'dark',
    version: '1.0.0',
    description: 'Default dark theme for Chips SDK',
    extends: DEFAULT_THEME_ID,
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
 * themeManager.setTheme('chips-official.dark-theme');
 *
 * // 获取 CSS 变量
 * const vars = themeManager.getCSSVariables();
 * ```
 */
export class ThemeManager {
  private _themes = new Map<string, Theme>();
  private _currentThemeId: string;
  private _bridgeVariables: CSSVariables = {};
  private _bridgeVariablesEnabled = false;
  private _logger: Logger;
  private _eventBus: EventBus;
  private _cssInjector: CssInjector;
  private _devCssLoader: DevCssLoader;
  private _autoApplyEnabled: boolean;
  private _themeChangeHandlerId: string | null = null;

  /**
   * 创建主题管理器
   * @param logger - 日志实例
   * @param eventBus - 事件总线
   * @param options - 配置选项
   */
  constructor(
    logger: Logger,
    eventBus: EventBus,
    options?: ThemeManagerOptions,
    bridge?: BridgeClient
  ) {
    this._logger = logger.createChild('ThemeManager');
    this._eventBus = eventBus;
    this._autoApplyEnabled = options?.autoApply !== false;

    // 创建 CSS 注入器和开发模式加载器
    this._cssInjector = new CssInjector(this._logger);
    this._devCssLoader = new DevCssLoader(this._logger, this._cssInjector, options?.devCssLoader);

    // 注册默认主题
    this._themes.set(DEFAULT_THEME_ID, DEFAULT_LIGHT_THEME);
    this._themes.set(DEFAULT_DARK_THEME_ID, DEFAULT_DARK_THEME);

    // 注册自定义主题
    if (options?.themes) {
      for (const theme of options.themes) {
        this.register(theme);
      }
    }

    // 设置默认主题
    this._currentThemeId = this._normalizeThemeId(options?.defaultTheme) ?? DEFAULT_THEME_ID;
    if (!this._themes.has(this._currentThemeId)) {
      this._currentThemeId = DEFAULT_THEME_ID;
    }
  }

  /**
   * 注册主题
   * @param theme - 主题定义
   */
  register(theme: Theme): void {
    const normalizedTheme = this._normalizeTheme(theme);
    const themeId = normalizedTheme.metadata.id;

    // 如果有继承，合并主题
    if (normalizedTheme.metadata.extends) {
      const parentTheme = this._themes.get(normalizedTheme.metadata.extends);
      if (parentTheme) {
        this._themes.set(themeId, this._mergeThemes(parentTheme, normalizedTheme));
      } else {
        this._themes.set(themeId, normalizedTheme);
      }
    } else {
      this._themes.set(themeId, normalizedTheme);
    }

    this._logger.info('Theme registered', { id: themeId });

    this._eventBus.emitSync('theme:registered', { id: themeId });
  }

  /**
   * 取消注册主题
   * @param id - 主题 ID
   */
  unregister(id: string): void {
    const themeId = this._normalizeThemeId(id) ?? id;
    if (themeId === DEFAULT_THEME_ID || themeId === DEFAULT_DARK_THEME_ID) {
      this._logger.warn('Cannot unregister default themes');
      return;
    }

    this._themes.delete(themeId);
    this._logger.info('Theme unregistered', { id: themeId });
  }

  /**
   * 设置当前主题
   * @param id - 主题 ID
   */
  setTheme(id: string): void {
    const themeId = this._normalizeThemeId(id) ?? id;
    if (!this._themes.has(themeId)) {
      this._logger.warn('Theme not found', { id });
      return;
    }

    const previousTheme = this._currentThemeId;
    this._currentThemeId = themeId;
    this._bridgeVariablesEnabled = false;
    this._bridgeVariables = {};

    this._logger.info('Theme changed', { from: previousTheme, to: themeId });

    // 自动应用 CSS 变量到 DOM
    if (this._autoApplyEnabled) {
      this._safeApplyToDOM();
    }

    this._eventBus.emitSync('theme:changed', {
      previousTheme,
      currentTheme: themeId,
    });
  }

  /**
   * 获取当前主题
   */
  getTheme(): Theme {
    return this._themes.get(this._currentThemeId) || this._themes.get(DEFAULT_THEME_ID) || DEFAULT_LIGHT_THEME;
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
    const themeId = this._normalizeThemeId(id) ?? id;
    return this._themes.get(themeId);
  }

  /**
   * 获取所有主题
   */
  listThemes(): ThemeMetadata[] {
    return Array.from(this._themes.values()).map((t) => ({
      ...t.metadata,
      id: t.metadata.id,
      themeId: t.metadata.themeId ?? t.metadata.id,
    }));
  }

  /**
   * 检查主题是否存在
   * @param id - 主题 ID
   */
  hasTheme(id: string): boolean {
    const themeId = this._normalizeThemeId(id) ?? id;
    return this._themes.has(themeId);
  }

  resolveThemeHierarchy(chain: ThemeHierarchyChain): string | null {
    const resolved = (
      chain.component ??
      chain.baseCard ??
      chain.compositeCard ??
      chain.card ??
      chain.box ??
      chain.app ??
      chain.global ??
      null
    );
    if (!resolved) {
      return null;
    }
    return this._normalizeThemeId(resolved) ?? resolved;
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
    if (this._bridgeVariablesEnabled && Object.keys(this._bridgeVariables).length > 0) {
      return { ...this._bridgeVariables };
    }

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
      vars[`--chips-duration-${this._toKebabCase(key)}`] = value;
    }
    for (const [key, value] of Object.entries(theme.animation.easing)) {
      vars[`--chips-easing-${this._toKebabCase(key)}`] = value;
    }

    // 自定义变量
    if (theme.customVariables) {
      Object.assign(vars, theme.customVariables);
    }

    return vars;
  }

  /**
   * 获取主题 CSS 文本（优先通过 Bridge）
   * @param componentType - 组件类型
   */
  async getThemeCSS(componentType?: string): Promise<string> {
    if (this._bridge) {
      const css = await this._bridge.invoke<string>('theme', 'getCSS', {
        componentType,
      });
      if (typeof css === 'string') {
        return css;
      }
    }

    const variables = this.getCSSVariables();
    return Object.entries(variables)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n');
  }

  /**
   * 从 Bridge 同步当前主题
   */
  async syncFromBridge(): Promise<void> {
    if (!this._bridge) {
      return;
    }

    const current = await this._bridge.invoke<Record<string, unknown>>('theme', 'getCurrent', {});
    const themeId = current.themeId;
    if (typeof themeId === 'string' && this._themes.has(themeId)) {
      this.setTheme(themeId);
    }
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
    root.setAttribute('data-theme', this._currentThemeId);
    root.setAttribute('data-theme-mode', theme.metadata.type);

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
    const themeId = preference === 'dark' ? DEFAULT_DARK_THEME_ID : DEFAULT_THEME_ID;
    this.setTheme(themeId);
  }

  /**
   * 初始化主题系统
   * 应用 CSS 变量到 DOM，加载主题 CSS，设置主题切换监听
   * @param bridgeInvoke - Bridge invoke 函数（可选，用于从 Host 加载 CSS）
   */
  async initializeTheme(bridgeInvoke?: BridgeInvokeFn): Promise<void> {
    // 1. 应用 CSS 变量到 DOM
    this._safeApplyToDOM();

    // 2. 尝试通过 Bridge 加载主题 CSS
    if (bridgeInvoke) {
      await this._syncCurrentThemeFromBridge(bridgeInvoke);
      const loaded = await this._loadCssViaBridge(bridgeInvoke);
      if (loaded) {
        this._safeApplyToDOM();
        this._logger.info('Theme CSS loaded via Bridge');
        return;
      }
    }

    // 3. Bridge 不可用，尝试开发模式回退
    const devLoaded = await this._devCssLoader.loadFromPackage();
    if (devLoaded) {
      this._logger.info('Theme CSS loaded via dev fallback');
      return;
    }

    this._logger.warn('No theme CSS loaded - components will be unstyled');
  }

  /**
   * 获取 CSS 注入器实例
   */
  get cssInjector(): CssInjector {
    return this._cssInjector;
  }

  /**
   * 获取开发模式 CSS 加载器实例
   */
  get devCssLoader(): DevCssLoader {
    return this._devCssLoader;
  }

  /**
   * 销毁主题管理器，清理资源
   */
  dispose(): void {
    this._cssInjector.removeAll();
    if (this._themeChangeHandlerId) {
      this._eventBus.off('theme:changed', this._themeChangeHandlerId);
      this._themeChangeHandlerId = null;
    }
  }

  // ========== 私有方法 ==========

  /**
   * 合并主题
   */
  private _mergeThemes(parent: Theme, child: Theme): Theme {
    const childThemeId = child.metadata.id;
    return {
      metadata: {
        ...child.metadata,
        id: childThemeId,
        themeId: childThemeId,
      },
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

  /**
   * 安全地应用主题到 DOM（检测 DOM 环境）
   */
  private _safeApplyToDOM(): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      this.applyToDOM(document.documentElement);
    }
  }

  /**
   * 通过 Bridge 加载主题 CSS
   */
  private async _loadCssViaBridge(invoke: BridgeInvokeFn): Promise<boolean> {
    try {
      const result = await invoke('theme', 'getAllCss', {}) as { css: Record<string, string> } | undefined;
      if (result?.css && typeof result.css === 'object') {
        const parsedTokens = typeof result.css.tokens === 'string' ? this._parseCssVariables(result.css.tokens) : {};
        this._bridgeVariables = parsedTokens;
        this._bridgeVariablesEnabled = Object.keys(parsedTokens).length > 0;
        this._cssInjector.injectAll(result.css);
        return true;
      }
      return false;
    } catch (error) {
      this._logger.debug('Bridge CSS loading failed', { error: String(error) });
      return false;
    }
  }

  private async _syncCurrentThemeFromBridge(invoke: BridgeInvokeFn): Promise<void> {
    try {
      const result = await invoke('theme', 'getCurrent', {}) as { themeId?: string; id?: string } | undefined;
      const rawThemeId =
        (typeof result?.themeId === 'string' && result.themeId) ||
        (typeof result?.id === 'string' && result.id) ||
        null;

      if (!rawThemeId) {
        return;
      }

      const themeId = this._normalizeThemeId(rawThemeId) ?? rawThemeId;
      if (!this._themes.has(themeId)) {
        this._themes.set(themeId, this._createRuntimeTheme(themeId));
      }

      this._currentThemeId = themeId;
    } catch (error) {
      this._logger.debug('Bridge current theme sync failed', { error: String(error) });
    }
  }

  private _createRuntimeTheme(themeId: string): Theme {
    const baseTheme = this._themes.get(DEFAULT_THEME_ID) || DEFAULT_LIGHT_THEME;
    const mode = themeId.toLowerCase().includes('dark') ? 'dark' : baseTheme.metadata.type;

    return {
      ...baseTheme,
      metadata: {
        ...baseTheme.metadata,
        id: themeId,
        themeId,
        name: themeId,
        type: mode,
        extends: undefined,
      },
    };
  }

  private _normalizeThemeId(themeId?: string): string | undefined {
    if (!themeId) {
      return undefined;
    }
    return LEGACY_THEME_ID_MAP[themeId] ?? themeId;
  }

  private _normalizeTheme(theme: Theme): Theme {
    const normalizedId = this._normalizeThemeId(theme.metadata.themeId ?? theme.metadata.id);
    if (!normalizedId) {
      throw new Error('theme metadata.id is required');
    }

    const normalizedExtends = this._normalizeThemeId(theme.metadata.extends);

    return {
      ...theme,
      metadata: {
        ...theme.metadata,
        id: normalizedId,
        themeId: normalizedId,
        extends: normalizedExtends,
      },
    };
  }

  private _parseCssVariables(content: string): CSSVariables {
    const variables: CSSVariables = {};
    const regex = /(--[a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;

    let match: RegExpExecArray | null = regex.exec(content);
    while (match) {
      variables[match[1]] = match[2].trim();
      match = regex.exec(content);
    }

    return variables;
  }
}

/**
 * Bridge invoke 函数类型
 */
export type BridgeInvokeFn = (
  namespace: string,
  action: string,
  params: Record<string, unknown>,
) => Promise<unknown>;
