/**
 * I18nManager 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { I18nManager } from '../../../../src/core/i18n/I18nManager';
import { SupportedLanguage } from '../../../../src/types';

describe('I18nManager', () => {
  let manager: I18nManager;

  beforeEach(() => {
    manager = new I18nManager();
  });

  describe('语言切换', () => {
    it('应该能够切换语言', () => {
      manager.setLanguage(SupportedLanguage.EnUS);

      expect(manager.getCurrentLanguage()).toBe(SupportedLanguage.EnUS);
    });

    it('应该使用默认语言', () => {
      expect(manager.getCurrentLanguage()).toBe(SupportedLanguage.ZhCN);
    });

    it('应该支持所有定义的语言', () => {
      const languages = [
        SupportedLanguage.ZhCN,
        SupportedLanguage.ZhTW,
        SupportedLanguage.EnUS,
        SupportedLanguage.JaJP,
        SupportedLanguage.KoKR,
      ];

      languages.forEach((lang) => {
        manager.setLanguage(lang);
        expect(manager.getCurrentLanguage()).toBe(lang);
      });
    });
  });

  describe('文本翻译', () => {
    it('应该能够翻译词汇编码', () => {
      // 注册测试词汇
      manager.registerVocabulary({
        'i18n.test.001': {
          'zh-CN': '确定',
          'en-US': 'OK',
        },
      });

      manager.setLanguage(SupportedLanguage.ZhCN);
      expect(manager.t('i18n.test.001')).toBe('确定');

      manager.setLanguage(SupportedLanguage.EnUS);
      expect(manager.t('i18n.test.001')).toBe('OK');
    });

    it('应该支持变量插值', () => {
      manager.registerVocabulary({
        'i18n.test.002': {
          'zh-CN': '共 {count} 个文件',
          'en-US': '{count} files',
        },
      });

      manager.setLanguage(SupportedLanguage.ZhCN);
      expect(manager.t('i18n.test.002', { count: 5 })).toBe('共 5 个文件');

      manager.setLanguage(SupportedLanguage.EnUS);
      expect(manager.t('i18n.test.002', { count: 5 })).toBe('5 files');
    });

    it('应该返回编码本身当翻译不存在', () => {
      const result = manager.t('i18n.non.existent');

      expect(result).toBe('i18n.non.existent');
    });

    it('应该回退到fallback语言', () => {
      manager.registerVocabulary({
        'i18n.test.003': {
          'zh-CN': '测试',
          'en-US': 'Test',
          // 日语没有翻译
        },
      });

      manager.setLanguage(SupportedLanguage.JaJP);
      // 应该回退到英文
      const result = manager.t('i18n.test.003');

      expect(result).toBeTruthy();
    });
  });

  describe('词汇表管理', () => {
    it('应该能够注册词汇表', () => {
      const vocabulary = {
        'i18n.test.001': {
          'zh-CN': '确定',
          'en-US': 'OK',
        },
        'i18n.test.002': {
          'zh-CN': '取消',
          'en-US': 'Cancel',
        },
      };

      manager.registerVocabulary(vocabulary);

      expect(manager.t('i18n.test.001')).toBe('确定');
      expect(manager.t('i18n.test.002')).toBe('取消');
    });

    it('应该能够合并词汇表', () => {
      manager.registerVocabulary({
        'i18n.test.001': {
          'zh-CN': '旧值',
        },
      });

      manager.registerVocabulary({
        'i18n.test.001': {
          'en-US': 'New Value',
        },
      });

      manager.setLanguage(SupportedLanguage.ZhCN);
      expect(manager.t('i18n.test.001')).toBe('旧值');

      manager.setLanguage(SupportedLanguage.EnUS);
      expect(manager.t('i18n.test.001')).toBe('New Value');
    });
  });

  describe('语言列表', () => {
    it('应该返回支持的语言列表', () => {
      const languages = manager.getSupportedLanguages();

      expect(languages).toContain(SupportedLanguage.ZhCN);
      expect(languages).toContain(SupportedLanguage.EnUS);
      expect(languages).toContain(SupportedLanguage.JaJP);
    });
  });
});
