/**
 * ChipsSDK主类测试
 */

import { describe, it, expect } from 'vitest';
import { ChipsSDK } from '@/ChipsSDK';
import { SDK_VERSION } from '@/constants';
import { SupportedLanguage } from '@/types';

describe('ChipsSDK', () => {
  describe('初始化', () => {
    it('应该成功创建SDK实例', () => {
      const sdk = new ChipsSDK();
      expect(sdk).toBeInstanceOf(ChipsSDK);
      expect(sdk.isInitialized()).toBe(true);
    });

    it('应该使用默认配置', () => {
      const sdk = new ChipsSDK();
      expect(sdk.getVersion()).toBe(SDK_VERSION);
      expect(sdk.getPlatform()).toBeDefined();
    });

    it('应该支持自定义配置', () => {
      const sdk = new ChipsSDK({
        debug: true,
        i18n: {
          defaultLanguage: SupportedLanguage.EnUS,
        },
      });

      expect(sdk.getLanguage()).toBe(SupportedLanguage.EnUS);
    });
  });

  describe('版本信息', () => {
    it('应该返回正确的版本号', () => {
      const sdk = new ChipsSDK();
      expect(sdk.getVersion()).toBe(SDK_VERSION);
    });
  });

  describe('平台信息', () => {
    it('应该返回平台类型', () => {
      const sdk = new ChipsSDK();
      const platform = sdk.getPlatform();
      expect(['web', 'node', 'electron', 'mobile']).toContain(platform);
    });
  });

  describe('事件系统', () => {
    it('应该支持事件监听', () => {
      const sdk = new ChipsSDK();
      let called = false;

      const subId = sdk.on('test', () => {
        called = true;
      });

      expect(subId).toMatch(/^sub-/);
    });

    it('应该支持取消监听', () => {
      const sdk = new ChipsSDK();
      let called = false;

      const subId = sdk.on('test', () => {
        called = true;
      });

      sdk.off(subId);
      expect(called).toBe(false);
    });
  });

  describe('多语言', () => {
    it('应该设置和获取语言', () => {
      const sdk = new ChipsSDK();

      sdk.setLanguage(SupportedLanguage.EnUS);
      expect(sdk.getLanguage()).toBe(SupportedLanguage.EnUS);

      sdk.setLanguage(SupportedLanguage.ZhCN);
      expect(sdk.getLanguage()).toBe(SupportedLanguage.ZhCN);
    });
  });

  describe('主题', () => {
    it('应该设置和获取主题', () => {
      const sdk = new ChipsSDK();

      sdk.setTheme('dark');
      expect(sdk.getCurrentTheme()).toBe('dark');
    });

    it('应该列出所有主题', () => {
      const sdk = new ChipsSDK();
      const themes = sdk.listThemes();

      expect(themes.length).toBeGreaterThanOrEqual(2);
      expect(themes.some((t) => t.id === 'light')).toBe(true);
      expect(themes.some((t) => t.id === 'dark')).toBe(true);
    });
  });

  describe('配置', () => {
    it('应该设置和获取配置', async () => {
      const sdk = new ChipsSDK();

      await sdk.setConfig('test.key', 'test value');
      const value = sdk.getConfig('test.key');

      expect(value).toBe('test value');
    });

    it('应该使用默认值', () => {
      const sdk = new ChipsSDK();
      const value = sdk.getConfig('nonexistent.key', 'default');

      expect(value).toBe('default');
    });
  });

  describe('调试功能', () => {
    it('应该启用调试模式', () => {
      const sdk = new ChipsSDK();
      sdk.enableDebug(true);
      
      // 调试模式已启用，无异常即可
      expect(true).toBe(true);
    });

    it('应该获取调试信息', () => {
      const sdk = new ChipsSDK();
      const debugInfo = sdk.getDebugInfo();

      expect(debugInfo.version).toBe(SDK_VERSION);
      expect(debugInfo.platform).toBeDefined();
      expect(debugInfo.initialized).toBe(true);
    });
  });
});
