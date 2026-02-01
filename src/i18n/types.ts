/**
 * 多语言类型定义
 * @module i18n/types
 */

/**
 * 语言代码
 */
export type Locale = string;

/**
 * 翻译字典
 */
export interface Translation {
  [key: string]: string | Translation;
}

/**
 * 多语言管理器选项
 */
export interface I18nManagerOptions {
  /** 默认语言 */
  defaultLocale?: Locale;
  /** 回退语言 */
  fallbackLocale?: Locale;
  /** 初始翻译 */
  translations?: Record<Locale, Translation>;
}

/**
 * 复数规则
 */
export interface PluralRules {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * 语言变更处理器
 */
export type LocaleChangeHandler = (locale: Locale) => void;
