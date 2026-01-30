/**
 * 主题管理器
 *
 * 管理主题的加载、应用和切换
 */

import type { EventBus } from '../core/event';
import { Logger } from '../core/logger';

/**
 * 主题定义
 */
export interface Theme {
  id: string;
  name: string;
  colors: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
    [key: string]: string | undefined;
  };
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    [key: string]: string | undefined;
  };
  spacing?: {
    sm?: string;
    md?: string;
    lg?: string;
    [key: string]: string | undefined;
  };
}

/**
 * 主题管理器类
 */
export class ThemeManager {
  private themes: Map<string, Theme>;
  private currentTheme: string | null;
  private logger: Logger;
  private eventBus?: EventBus;

  constructor(logger: Logger, eventBus?: EventBus) {
    this.themes = new Map();
    this.currentTheme = null;
    this.logger = logger;
    this.eventBus = eventBus;

    // 注册默认主题
    this.registerDefaultThemes();
  }

  /**
   * 注册默认主题
   */
  private registerDefaultThemes(): void {
    // 浅色主题
    this.register({
      id: 'light',
      name: 'Light Theme',
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
      },
      typography: {
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '16px',
      },
      spacing: {
        sm: '8px',
        md: '16px',
        lg: '24px',
      },
    });

    // 深色主题
    this.register({
      id: 'dark',
      name: 'Dark Theme',
      colors: {
        primary: '#90caf9',
        secondary: '#ce93d8',
        background: '#121212',
        text: '#ffffff',
      },
      typography: {
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '16px',
      },
      spacing: {
        sm: '8px',
        md: '16px',
        lg: '24px',
      },
    });
  }

  /**
   * 注册主题
   * @param theme 主题定义
   */
  register(theme: Theme): void {
    this.themes.set(theme.id, theme);
    this.logger.debug('Theme registered', { themeId: theme.id });
  }

  /**
   * 获取主题
   * @param themeId 主题ID
   * @returns 主题定义
   */
  get(themeId: string): Theme | undefined {
    return this.themes.get(themeId);
  }

  /**
   * 应用主题
   * @param themeId 主题ID
   */
  apply(themeId: string): void {
    const theme = this.themes.get(themeId);

    if (!theme) {
      this.logger.warn('Theme not found', { themeId });
      return;
    }

    this.currentTheme = themeId;

    // 应用CSS变量到根元素
    this.applyCSSVariables(theme);

    this.logger.info('Theme applied', { themeId });
    this.eventBus?.emit('theme:change', theme);
  }

  /**
   * 获取当前主题
   * @returns 当前主题ID
   */
  getCurrentTheme(): string | null {
    return this.currentTheme;
  }

  /**
   * 列出所有主题
   * @returns 主题定义数组
   */
  listThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  /**
   * 应用CSS变量
   * @param theme 主题定义
   */
  private applyCSSVariables(theme: Theme): void {
    if (typeof document === 'undefined') {
      return; // Node环境不支持
    }

    const root = document.documentElement;

    // 应用颜色变量
    if (theme.colors) {
      for (const [key, value] of Object.entries(theme.colors)) {
        if (value) {
          root.style.setProperty(`--color-${key}`, value);
        }
      }
    }

    // 应用字体变量
    if (theme.typography) {
      for (const [key, value] of Object.entries(theme.typography)) {
        if (value) {
          root.style.setProperty(`--typography-${key}`, value);
        }
      }
    }

    // 应用间距变量
    if (theme.spacing) {
      for (const [key, value] of Object.entries(theme.spacing)) {
        if (value) {
          root.style.setProperty(`--spacing-${key}`, value);
        }
      }
    }
  }

  /**
   * 从URL加载主题
   * @param url 主题URL
   */
  async loadThemeFromURL(url: string): Promise<void> {
    this.logger.debug('Loading theme from URL', { url });

    try {
      const response = await fetch(url);
      const theme = (await response.json()) as Theme;

      this.register(theme);

      this.logger.info('Theme loaded from URL', { themeId: theme.id, url });
    } catch (error) {
      this.logger.error('Failed to load theme from URL', error as Error, {
        url,
      });
      throw error;
    }
  }

  /**
   * 导出主题为JSON
   * @param themeId 主题ID
   * @returns JSON字符串
   */
  exportTheme(themeId: string): string | null {
    const theme = this.themes.get(themeId);

    if (!theme) {
      return null;
    }

    return JSON.stringify(theme, null, 2);
  }
}
