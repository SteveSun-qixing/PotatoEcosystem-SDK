/**
 * 配置相关类型定义
 */

export type { SDKOptions, CacheOptions, I18nOptions } from './index';

export { SupportedLanguage } from './index';

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
