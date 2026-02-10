/**
 * 多语言管理器
 * @module i18n/manager
 */

import { Locale, Translation, I18nManagerOptions, PluralRules, LocaleChangeHandler } from './types';
import type { Logger } from '../logger';
import type { EventBus } from '../event';

/**
 * 默认选项
 */
const DEFAULT_OPTIONS: Required<I18nManagerOptions> = {
  defaultLocale: 'zh-CN',
  fallbackLocale: 'en-US',
  translations: {},
};

/**
 * 内置中文翻译
 */
const ZH_CN_TRANSLATIONS: Translation = {
  error: {
    file_not_found: '文件未找到',
    file_invalid: '文件格式无效',
    connection_failed: '连接失败',
    connection_timeout: '连接超时',
    request_timeout: '请求超时',
    validation_failed: '验证失败',
    plugin_not_found: '插件未找到',
    theme_not_found: '主题未找到',
    render_failed: '渲染失败',
  },
  common: {
    loading: '加载中...',
    success: '成功',
    failed: '失败',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    copy: '复制',
  },
};

/**
 * 内置英文翻译
 */
const EN_US_TRANSLATIONS: Translation = {
  error: {
    file_not_found: 'File not found',
    file_invalid: 'Invalid file format',
    connection_failed: 'Connection failed',
    connection_timeout: 'Connection timeout',
    request_timeout: 'Request timeout',
    validation_failed: 'Validation failed',
    plugin_not_found: 'Plugin not found',
    theme_not_found: 'Theme not found',
    render_failed: 'Render failed',
  },
  common: {
    loading: 'Loading...',
    success: 'Success',
    failed: 'Failed',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    copy: 'Copy',
  },
};

/**
 * 多语言管理器
 *
 * @example
 * ```ts
 * const i18n = new I18nManager({ defaultLocale: 'zh-CN' });
 * const message = i18n.t('error.file_not_found');
 * // => "文件未找到"
 * ```
 */
export class I18nManager {
  private _options: Required<I18nManagerOptions>;
  private _currentLocale: Locale;
  private _translations = new Map<Locale, Translation>();
  private _changeHandlers = new Set<LocaleChangeHandler>();
  private _logger?: Logger;
  private _eventBus?: EventBus;

  /**
   * 创建多语言管理器
   * @param options - 配置选项
   * @param logger - 日志实例（可选，用于调试日志）
   * @param eventBus - 事件总线（可选，用于发布语言变更事件）
   */
  constructor(options?: I18nManagerOptions, logger?: Logger, eventBus?: EventBus) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._currentLocale = this._options.defaultLocale;
    this._logger = logger?.createChild('I18nManager');
    this._eventBus = eventBus;

    // 添加内置翻译
    this._translations.set('zh-CN', ZH_CN_TRANSLATIONS);
    this._translations.set('en-US', EN_US_TRANSLATIONS);

    // 添加自定义翻译
    for (const [locale, translation] of Object.entries(this._options.translations)) {
      this.addTranslation(locale, translation);
    }
  }

  /**
   * 绑定日志和事件总线（在 SDK 初始化后调用）
   * @param logger - 日志实例
   * @param eventBus - 事件总线
   */
  bind(logger: Logger, eventBus: EventBus): void {
    this._logger = logger.createChild('I18nManager');
    this._eventBus = eventBus;
  }

  /**
   * 获取当前语言
   */
  get locale(): Locale {
    return this._currentLocale;
  }

  /**
   * 设置当前语言
   * @param locale - 语言代码
   */
  setLocale(locale: Locale): void {
    if (locale !== this._currentLocale) {
      this._currentLocale = locale;
      this._notifyChange(locale);
    }
  }

  /**
   * 获取翻译文本
   * @param key - 翻译键（支持点分隔）
   * @param params - 插值参数
   */
  t(key: string, params?: Record<string, string | number>): string {
    // 尝试当前语言
    let translation = this._getTranslation(key, this._currentLocale);

    // 使用回退语言
    if (translation === undefined) {
      translation = this._getTranslation(key, this._options.fallbackLocale);
    }

    // 都没有则返回 key
    if (translation === undefined) {
      console.warn(`[I18n] Translation not found: ${key}`);
      return key;
    }

    return this._interpolate(translation, params);
  }

  /**
   * 复数形式翻译
   * @param key - 翻译键
   * @param count - 数量
   * @param params - 额外参数
   */
  plural(key: string, count: number, params?: Record<string, string | number>): string {
    const rules = this._getTranslationRaw(key, this._currentLocale);

    // 如果不是复数规则对象，回退到普通翻译
    if (!rules || typeof rules !== 'object') {
      return this.t(key, { ...params, count });
    }

    const pluralRules = rules as unknown as PluralRules;
    let template: string;
    if (count === 0 && pluralRules.zero) {
      template = pluralRules.zero;
    } else if (count === 1 && pluralRules.one) {
      template = pluralRules.one;
    } else if (count === 2 && pluralRules.two) {
      template = pluralRules.two;
    } else if (pluralRules.other) {
      template = pluralRules.other;
    } else {
      return this.t(key, { ...params, count });
    }

    return this._interpolate(template, { ...params, count });
  }

  /**
   * 添加翻译
   * @param locale - 语言代码
   * @param translation - 翻译字典
   */
  addTranslation(locale: Locale, translation: Translation): void {
    const existing = this._translations.get(locale) || {};
    this._translations.set(locale, this._mergeTranslations(existing, translation));
  }

  /**
   * 获取可用语言列表
   */
  getAvailableLocales(): Locale[] {
    return Array.from(this._translations.keys());
  }

  /**
   * 检查语言是否可用
   * @param locale - 语言代码
   */
  hasLocale(locale: Locale): boolean {
    return this._translations.has(locale);
  }

  /**
   * 监听语言变更
   * @param handler - 变更处理器
   */
  onLocaleChange(handler: LocaleChangeHandler): void {
    this._changeHandlers.add(handler);
  }

  /**
   * 取消监听
   * @param handler - 变更处理器
   */
  offLocaleChange(handler: LocaleChangeHandler): void {
    this._changeHandlers.delete(handler);
  }

  /**
   * 获取翻译值（仅返回字符串）
   */
  private _getTranslation(key: string, locale: Locale): string | undefined {
    const raw = this._getTranslationRaw(key, locale);
    return typeof raw === 'string' ? raw : undefined;
  }

  /**
   * 获取翻译原始值（包括对象类型，用于复数规则等）
   */
  private _getTranslationRaw(key: string, locale: Locale): Translation | string | undefined {
    const translation = this._translations.get(locale);
    if (!translation) return undefined;

    const parts = key.split('.');
    let current: Translation | string = translation;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) {
        return undefined;
      }
      current = current[part] as Translation | string;
    }

    return current;
  }

  /**
   * 插值替换
   */
  private _interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) return template;

    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * 合并翻译
   */
  private _mergeTranslations(target: Translation, source: Translation): Translation {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this._mergeTranslations(
          (result[key] as Translation) || {},
          value as Translation
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 通知语言变更
   */
  private _notifyChange(locale: Locale): void {
    this._logger?.info('Locale changed', { locale });

    // 通过 EventBus 发布语言变更事件（与 ThemeManager 的 theme:changed 事件对称）
    if (this._eventBus) {
      this._eventBus.emitSync('i18n:localeChanged', {
        locale,
      });
    }

    // 通知本地注册的 handler
    for (const handler of this._changeHandlers) {
      try {
        handler(locale);
      } catch (error) {
        console.error('[I18n] Locale change handler error:', error);
      }
    }
  }
}
