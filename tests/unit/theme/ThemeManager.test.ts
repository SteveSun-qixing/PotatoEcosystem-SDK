/**
 * 主题管理器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeManager, type Theme } from '@/theme/ThemeManager';
import { Logger } from '@/core/logger';

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    const logger = new Logger({ enableConsole: false });
    themeManager = new ThemeManager(logger);
  });

  describe('默认主题', () => {
    it('应该注册默认主题', () => {
      const themes = themeManager.listThemes();
      expect(themes.length).toBeGreaterThanOrEqual(2);

      const lightTheme = themeManager.get('light');
      expect(lightTheme).toBeDefined();
      expect(lightTheme?.name).toBe('Light Theme');

      const darkTheme = themeManager.get('dark');
      expect(darkTheme).toBeDefined();
      expect(darkTheme?.name).toBe('Dark Theme');
    });
  });

  describe('register', () => {
    it('应该注册自定义主题', () => {
      const customTheme: Theme = {
        id: 'custom',
        name: 'Custom Theme',
        colors: {
          primary: '#ff0000',
          background: '#000000',
        },
      };

      themeManager.register(customTheme);

      const theme = themeManager.get('custom');
      expect(theme).toEqual(customTheme);
    });
  });

  describe('apply', () => {
    it('应该应用主题', () => {
      themeManager.apply('light');
      expect(themeManager.getCurrentTheme()).toBe('light');
    });

    it('应该处理不存在的主题', () => {
      // 不应该抛出错误
      themeManager.apply('nonexistent');
      expect(themeManager.getCurrentTheme()).toBe(null);
    });
  });

  describe('listThemes', () => {
    it('应该列出所有主题', () => {
      const themes = themeManager.listThemes();
      expect(themes.length).toBeGreaterThanOrEqual(2);
      expect(themes.some((t) => t.id === 'light')).toBe(true);
      expect(themes.some((t) => t.id === 'dark')).toBe(true);
    });
  });

  describe('exportTheme', () => {
    it('应该导出主题为JSON', () => {
      const json = themeManager.exportTheme('light');
      expect(json).not.toBeNull();

      const parsed = JSON.parse(json!);
      expect(parsed.id).toBe('light');
      expect(parsed.colors).toBeDefined();
    });

    it('应该在主题不存在时返回null', () => {
      const json = themeManager.exportTheme('nonexistent');
      expect(json).toBeNull();
    });
  });
});
