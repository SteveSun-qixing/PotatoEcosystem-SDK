/**
 * 插件相关类型定义
 *
 * Plugin, PluginContext, PluginType
 * 这些类型在index.ts中定义，请从'../types'导入
 */

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
