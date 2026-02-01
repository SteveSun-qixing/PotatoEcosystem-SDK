/**
 * 配置类型定义
 * @module config/types
 */

/**
 * 配置项 Schema
 */
export interface ConfigSchema {
  [key: string]: {
    /** 类型 */
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    /** 默认值 */
    default?: unknown;
    /** 是否必填 */
    required?: boolean;
    /** 自定义验证 */
    validate?: (value: unknown) => boolean;
    /** 描述 */
    description?: string;
  };
}

/**
 * 配置管理器选项
 */
export interface ConfigManagerOptions {
  /** 配置 Schema */
  schema?: ConfigSchema;
  /** 默认配置 */
  defaults?: Record<string, unknown>;
  /** 是否持久化 */
  persistent?: boolean;
}

/**
 * 配置变更处理器
 */
export type ConfigChangeHandler = (key: string, newValue: unknown, oldValue: unknown) => void;
