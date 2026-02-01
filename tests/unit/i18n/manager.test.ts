/**
 * I18nManager 单元测试
 * @module tests/unit/i18n/manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { I18nManager } from '../../../src/i18n/manager';

describe('I18nManager', () => {
  let i18n: I18nManager;

  beforeEach(() => {
    i18n = new I18nManager();
  });

  afterEach(() => {
    // 重置为默认语言
    i18n.setLocale('zh-CN');
  });

  describe('翻译获取', () => {
    it('应该能够获取简单翻译', () => {
      const result = i18n.t('common.loading');
      expect(result).toBe('加载中...');
    });

    it('应该支持嵌套键获取', () => {
      const result = i18n.t('error.file_not_found');
      expect(result).toBe('文件未找到');
    });

    it('翻译不存在时应返回键名', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = i18n.t('nonexistent.key');
      
      expect(result).toBe('nonexistent.key');
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });

    it('部分路径不存在时应返回键名', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = i18n.t('error.nonexistent');
      
      expect(result).toBe('error.nonexistent');
      
      warnSpy.mockRestore();
    });

    it('应该能够获取所有内置中文翻译', () => {
      expect(i18n.t('error.file_not_found')).toBe('文件未找到');
      expect(i18n.t('error.connection_failed')).toBe('连接失败');
      expect(i18n.t('common.success')).toBe('成功');
      expect(i18n.t('common.cancel')).toBe('取消');
    });
  });

  describe('语言切换', () => {
    it('默认语言应为 zh-CN', () => {
      expect(i18n.locale).toBe('zh-CN');
    });

    it('应该能够切换语言', () => {
      i18n.setLocale('en-US');
      expect(i18n.locale).toBe('en-US');
    });

    it('切换语言后翻译应更新', () => {
      expect(i18n.t('common.loading')).toBe('加载中...');
      
      i18n.setLocale('en-US');
      expect(i18n.t('common.loading')).toBe('Loading...');
    });

    it('应该能够监听语言变更', () => {
      const handler = vi.fn();
      i18n.onLocaleChange(handler);
      
      i18n.setLocale('en-US');
      
      expect(handler).toHaveBeenCalledWith('en-US');
    });

    it('设置相同语言不应触发变更事件', () => {
      const handler = vi.fn();
      i18n.onLocaleChange(handler);
      
      i18n.setLocale('zh-CN'); // 已经是 zh-CN
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('应该能够取消监听语言变更', () => {
      const handler = vi.fn();
      i18n.onLocaleChange(handler);
      i18n.offLocaleChange(handler);
      
      i18n.setLocale('en-US');
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('变更处理器错误不应影响其他处理器', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorHandler = vi.fn(() => {
        throw new Error('handler error');
      });
      const normalHandler = vi.fn();
      
      i18n.onLocaleChange(errorHandler);
      i18n.onLocaleChange(normalHandler);
      
      i18n.setLocale('en-US');
      
      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });
  });

  describe('插值替换', () => {
    beforeEach(() => {
      // 添加带插值的翻译
      i18n.addTranslation('zh-CN', {
        greeting: '你好，{name}！',
        count: '共有 {count} 个项目',
        multi: '{user} 在 {time} 做了 {action}',
      });
      i18n.addTranslation('en-US', {
        greeting: 'Hello, {name}!',
        count: 'Total {count} items',
        multi: '{user} did {action} at {time}',
      });
    });

    it('应该支持单个参数插值', () => {
      const result = i18n.t('greeting', { name: '小明' });
      expect(result).toBe('你好，小明！');
    });

    it('应该支持数字参数插值', () => {
      const result = i18n.t('count', { count: 42 });
      expect(result).toBe('共有 42 个项目');
    });

    it('应该支持多个参数插值', () => {
      const result = i18n.t('multi', {
        user: '张三',
        time: '下午3点',
        action: '提交代码',
      });
      expect(result).toBe('张三 在 下午3点 做了 提交代码');
    });

    it('未提供的参数应保留原占位符', () => {
      const result = i18n.t('greeting', {});
      expect(result).toBe('你好，{name}！');
    });

    it('不传参数时应保留所有占位符', () => {
      const result = i18n.t('greeting');
      expect(result).toBe('你好，{name}！');
    });

    it('英文翻译也应支持插值', () => {
      i18n.setLocale('en-US');
      const result = i18n.t('greeting', { name: 'John' });
      expect(result).toBe('Hello, John!');
    });
  });

  describe('回退语言', () => {
    it('当前语言没有翻译时应使用回退语言', () => {
      // 添加只在英文中存在的翻译
      i18n.addTranslation('en-US', {
        unique: {
          english: 'Only in English',
        },
      });
      
      // 切换到中文，但中文没有这个翻译
      i18n.setLocale('zh-CN');
      
      const result = i18n.t('unique.english');
      expect(result).toBe('Only in English');
    });

    it('回退语言也没有时应返回键名', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = i18n.t('completely.nonexistent');
      
      expect(result).toBe('completely.nonexistent');
      
      warnSpy.mockRestore();
    });

    it('应该能够配置回退语言', () => {
      const customI18n = new I18nManager({
        defaultLocale: 'zh-CN',
        fallbackLocale: 'en-US',
      });
      
      // 添加只在英文中存在的翻译
      customI18n.addTranslation('en-US', {
        fallback: {
          test: 'Fallback value',
        },
      });
      
      const result = customI18n.t('fallback.test');
      expect(result).toBe('Fallback value');
    });

    it('当前语言有翻译时不应使用回退', () => {
      i18n.setLocale('zh-CN');
      const result = i18n.t('common.success');
      
      // 应该返回中文，不是英文回退
      expect(result).toBe('成功');
      expect(result).not.toBe('Success');
    });
  });

  describe('翻译管理', () => {
    it('应该能够添加新翻译', () => {
      i18n.addTranslation('zh-CN', {
        custom: {
          message: '自定义消息',
        },
      });
      
      expect(i18n.t('custom.message')).toBe('自定义消息');
    });

    it('添加翻译应与现有翻译合并', () => {
      i18n.addTranslation('zh-CN', {
        custom: {
          new: '新翻译',
        },
      });
      
      // 新翻译应该存在
      expect(i18n.t('custom.new')).toBe('新翻译');
      // 原有翻译应该保留
      expect(i18n.t('common.loading')).toBe('加载中...');
    });

    it('添加翻译可以覆盖现有值', () => {
      i18n.addTranslation('zh-CN', {
        common: {
          loading: '请稍候...',
        },
      });
      
      expect(i18n.t('common.loading')).toBe('请稍候...');
    });

    it('应该能够获取可用语言列表', () => {
      const locales = i18n.getAvailableLocales();
      
      expect(locales).toContain('zh-CN');
      expect(locales).toContain('en-US');
    });

    it('应该能够检查语言是否可用', () => {
      expect(i18n.hasLocale('zh-CN')).toBe(true);
      expect(i18n.hasLocale('en-US')).toBe(true);
      expect(i18n.hasLocale('fr-FR')).toBe(false);
    });

    it('添加新语言后应该可用', () => {
      expect(i18n.hasLocale('ja-JP')).toBe(false);
      
      i18n.addTranslation('ja-JP', {
        common: {
          loading: '読み込み中...',
        },
      });
      
      expect(i18n.hasLocale('ja-JP')).toBe(true);
    });
  });

  describe('复数形式', () => {
    // 注意：当前 _getTranslation 实现只返回 string 类型值，
    // 复数规则对象无法直接通过顶级 key 获取，需要使用嵌套路径
    // 这里测试 plural 方法的实际行为

    it('复数规则不存在时应使用普通翻译并插值 count', () => {
      // 当 key 对应的值不是对象时，会调用 t 方法
      const result = i18n.plural('common.loading', 1);
      expect(result).toBe('加载中...');
    });

    it('应该支持 count 参数的插值', () => {
      i18n.addTranslation('zh-CN', {
        counter: '共有 {count} 个',
      });
      
      const result = i18n.plural('counter', 5, { count: 5 });
      expect(result).toBe('共有 5 个');
    });

    it('应该支持额外参数与 count 一起插值', () => {
      i18n.addTranslation('zh-CN', {
        message: '{name} 有 {count} 条消息',
      });
      
      const result = i18n.plural('message', 3, { name: '张三', count: 3 });
      expect(result).toBe('张三 有 3 条消息');
    });

    it('key 不存在时应返回 key 本身', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = i18n.plural('nonexistent.key', 1);
      expect(result).toBe('nonexistent.key');
      
      warnSpy.mockRestore();
    });
  });

  describe('构造函数选项', () => {
    it('应该支持自定义默认语言', () => {
      const customI18n = new I18nManager({
        defaultLocale: 'en-US',
      });
      
      expect(customI18n.locale).toBe('en-US');
      expect(customI18n.t('common.loading')).toBe('Loading...');
    });

    it('应该支持初始翻译', () => {
      const customI18n = new I18nManager({
        translations: {
          'zh-CN': {
            custom: {
              key: '自定义值',
            },
          },
        },
      });
      
      expect(customI18n.t('custom.key')).toBe('自定义值');
    });

    it('初始翻译应与内置翻译合并', () => {
      const customI18n = new I18nManager({
        translations: {
          'zh-CN': {
            custom: {
              key: '自定义值',
            },
          },
        },
      });
      
      // 自定义翻译存在
      expect(customI18n.t('custom.key')).toBe('自定义值');
      // 内置翻译也存在
      expect(customI18n.t('common.loading')).toBe('加载中...');
    });
  });

  describe('边界情况', () => {
    it('空键应返回空键', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = i18n.t('');
      expect(result).toBe('');
      
      warnSpy.mockRestore();
    });

    it('深层嵌套键应正确解析', () => {
      i18n.addTranslation('zh-CN', {
        level1: {
          level2: {
            level3: {
              value: '深层值',
            },
          },
        },
      });
      
      const result = i18n.t('level1.level2.level3.value');
      expect(result).toBe('深层值');
    });

    it('路径中间遇到非对象值应返回键名', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // common.loading 是字符串，不是对象
      const result = i18n.t('common.loading.nested');
      expect(result).toBe('common.loading.nested');
      
      warnSpy.mockRestore();
    });

    it('翻译值为空字符串时应返回空字符串（不是键名）', () => {
      i18n.addTranslation('zh-CN', {
        empty: {
          value: '',
        },
      });
      
      // 空字符串是有效的翻译值
      const result = i18n.t('empty.value');
      expect(result).toBe('');
    });
  });
});
