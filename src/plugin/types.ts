/**
 * 插件类型定义
 * @module plugin/types
 */

import { ProtocolVersion } from '../types/base';

/**
 * 插件状态
 */
export type PluginState = 'installed' | 'enabled' | 'disabled' | 'error' | 'loading';

/**
 * 插件元数据
 */
export interface PluginMetadata {
  /** 插件 ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 描述 */
  description?: string;
  /** 作者 */
  author?: string;
  /** 主页 */
  homepage?: string;
  /** 协议版本 */
  chipStandardsVersion: ProtocolVersion;
  /** 依赖插件 */
  dependencies?: PluginDependency[];
  /** 关键词 */
  keywords?: string[];
  /** 许可证 */
  license?: string;
}

/**
 * 插件依赖
 */
export interface PluginDependency {
  /** 插件 ID */
  id: string;
  /** 版本要求 */
  version: string;
  /** 是否可选 */
  optional?: boolean;
}

/**
 * 插件配置
 */
export interface PluginConfig {
  /** 配置项 */
  [key: string]: unknown;
}

/**
 * 插件上下文
 */
export interface PluginContext {
  /** 插件 ID */
  pluginId: string;
  /** SDK 版本 */
  sdkVersion: string;
  /** 配置 */
  config: PluginConfig;
  /** 日志函数 */
  log: (message: string, data?: Record<string, unknown>) => void;
  /** 注册命令 */
  registerCommand: (name: string, handler: CommandHandler) => void;
  /** 注册渲染器 */
  registerRenderer: (type: string, renderer: RendererDefinition) => void;
  /** 发送事件 */
  emit: (event: string, data: unknown) => void;
  /** 订阅事件 */
  on: (event: string, handler: EventHandlerFn) => void;
}

/**
 * 命令处理器
 */
export type CommandHandler = (args: unknown) => unknown | Promise<unknown>;

/**
 * 事件处理函数
 */
export type EventHandlerFn = (data: unknown) => void | Promise<void>;

/**
 * 渲染器定义
 */
export interface RendererDefinition {
  /** 渲染器名称 */
  name: string;
  /** 支持的卡片类型 */
  cardTypes: string[];
  /** 渲染函数 */
  render: (data: unknown, container: HTMLElement) => void | Promise<void>;
  /** 销毁函数 */
  destroy?: () => void;
}

/**
 * 插件实例
 */
export interface PluginInstance {
  /** 元数据 */
  metadata: PluginMetadata;
  /** 状态 */
  state: PluginState;
  /** 配置 */
  config: PluginConfig;
  /** 激活函数 */
  activate?: (context: PluginContext) => void | Promise<void>;
  /** 停用函数 */
  deactivate?: () => void | Promise<void>;
  /** 错误信息 */
  error?: string;
}

/**
 * 插件注册信息
 */
export interface PluginRegistration {
  /** 插件 ID */
  id: string;
  /** 元数据 */
  metadata: PluginMetadata;
  /** 激活函数 */
  activate?: (context: PluginContext) => void | Promise<void>;
  /** 停用函数 */
  deactivate?: () => void | Promise<void>;
  /** 默认配置 */
  defaultConfig?: PluginConfig;
}

/**
 * 插件查询选项
 */
export interface PluginQueryOptions {
  /** 状态过滤 */
  state?: PluginState;
  /** 关键词搜索 */
  keyword?: string;
  /** 作者过滤 */
  author?: string;
}
