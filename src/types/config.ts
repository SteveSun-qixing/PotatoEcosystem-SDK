/**
 * 配置相关类型定义
 *
 * SDKOptions, CacheOptions, I18nOptions, SupportedLanguage
 * 这些类型在index.ts中定义，请从'../types'导入
 */

/**
 * 配置作用域
 */
export enum ConfigScope {
  System = 'system',
  User = 'user',
  Module = 'module',
}

/**
 * 配置项
 */
export interface ConfigItem {
  key: string;
  value: unknown;
  scope: ConfigScope;
}
