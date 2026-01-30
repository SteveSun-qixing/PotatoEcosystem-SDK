/**
 * 插件相关类型定义
 */

export type { Plugin, PluginContext } from './index';
export { PluginType } from './index';

/**
 * 插件元数据
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  type?: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  permissions?: string[];
}

/**
 * 插件状态
 */
export enum PluginStatus {
  Installed = 'installed',
  Enabled = 'enabled',
  Disabled = 'disabled',
  Loading = 'loading',
  Error = 'error',
}
