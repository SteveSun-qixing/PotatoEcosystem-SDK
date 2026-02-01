/**
 * 配置管理器
 * @module config/manager
 */

import { ConfigManagerOptions, ConfigChangeHandler } from './types';

/**
 * SDK 默认配置
 */
const SDK_DEFAULTS: Record<string, unknown> = {
  // SDK 配置
  'sdk.version': '1.0.0',
  'sdk.debug': false,

  // 超时配置
  'timeout.default': 30000,
  'timeout.file': 60000,
  'timeout.render': 10000,
  'timeout.connect': 5000,

  // 缓存配置
  'cache.enabled': true,
  'cache.maxSize': 100,
  'cache.ttl': 3600000,

  // 国际化配置
  'i18n.defaultLocale': 'zh-CN',
  'i18n.fallbackLocale': 'en-US',

  // 日志配置
  'logger.level': 'info',
  'logger.enableConsole': true,
  'logger.maxHistory': 1000,

  // 渲染配置
  'render.lazyLoad': true,
  'render.animations': true,
  'render.defaultTheme': 'default',
};

/**
 * 配置管理器
 *
 * @example
 * ```ts
 * const config = new ConfigManager();
 * config.set('sdk.debug', true);
 * const debug = config.get('sdk.debug', false);
 * ```
 */
export class ConfigManager {
  private _config = new Map<string, unknown>();
  private _changeHandlers = new Map<string, Set<ConfigChangeHandler>>();
  private _options: ConfigManagerOptions;
  private _initialized = false;

  /**
   * 创建配置管理器
   * @param options - 配置选项
   */
  constructor(options: ConfigManagerOptions = {}) {
    this._options = options;

    // 初始化默认配置
    for (const [key, value] of Object.entries(SDK_DEFAULTS)) {
      this._config.set(key, value);
    }

    // 应用自定义默认值
    if (options.defaults) {
      for (const [key, value] of Object.entries(options.defaults)) {
        this._config.set(key, value);
      }
    }
  }

  /**
   * 初始化配置管理器（可选的异步初始化）
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    // 可以从远程加载配置（如果需要）
    this._initialized = true;
  }

  /**
   * 获取配置值
   * @param key - 配置键
   * @param defaultValue - 默认值
   */
  get<T = unknown>(key: string, defaultValue?: T): T {
    if (this._config.has(key)) {
      return this._config.get(key) as T;
    }
    return defaultValue as T;
  }

  /**
   * 设置配置值
   * @param key - 配置键
   * @param value - 配置值
   */
  set(key: string, value: unknown): void {
    // 验证配置值
    if (!this._validateValue(key, value)) {
      throw new Error(`Invalid config value for key: ${key}`);
    }

    const oldValue = this._config.get(key);
    this._config.set(key, value);

    // 触发变更事件
    this._notifyChange(key, value, oldValue);
  }

  /**
   * 批量设置配置
   * @param values - 配置键值对
   */
  setMany(values: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(values)) {
      this.set(key, value);
    }
  }

  /**
   * 检查配置项是否存在
   * @param key - 配置键
   */
  has(key: string): boolean {
    return this._config.has(key);
  }

  /**
   * 删除配置项
   * @param key - 配置键
   */
  delete(key: string): void {
    const oldValue = this._config.get(key);
    this._config.delete(key);

    this._notifyChange(key, undefined, oldValue);
  }

  /**
   * 获取所有配置
   */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this._config) {
      result[key] = value;
    }
    return result;
  }

  /**
   * 获取指定前缀的配置
   * @param prefix - 配置前缀
   */
  getByPrefix(prefix: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this._config) {
      if (key.startsWith(prefix)) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * 监听配置变更
   * @param key - 配置键（支持通配符 '*'）
   * @param handler - 变更处理器
   */
  onChange(key: string, handler: ConfigChangeHandler): void {
    if (!this._changeHandlers.has(key)) {
      this._changeHandlers.set(key, new Set());
    }
    this._changeHandlers.get(key)!.add(handler);
  }

  /**
   * 取消监听配置变更
   * @param key - 配置键
   * @param handler - 变更处理器
   */
  offChange(key: string, handler?: ConfigChangeHandler): void {
    if (!handler) {
      this._changeHandlers.delete(key);
    } else {
      this._changeHandlers.get(key)?.delete(handler);
    }
  }

  /**
   * 重置为默认配置
   */
  reset(): void {
    this._config.clear();
    for (const [key, value] of Object.entries(SDK_DEFAULTS)) {
      this._config.set(key, value);
    }
    if (this._options.defaults) {
      for (const [key, value] of Object.entries(this._options.defaults)) {
        this._config.set(key, value);
      }
    }
  }

  /**
   * 获取配置项数量
   */
  get size(): number {
    return this._config.size;
  }

  /**
   * 验证配置值
   */
  private _validateValue(key: string, value: unknown): boolean {
    if (!this._options.schema) {
      return true;
    }

    const schema = this._options.schema[key];
    if (!schema) {
      return true;
    }

    // 类型检查
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      return false;
    }

    // 自定义验证
    if (schema.validate && !schema.validate(value)) {
      return false;
    }

    return true;
  }

  /**
   * 通知配置变更
   */
  private _notifyChange(key: string, newValue: unknown, oldValue: unknown): void {
    // 精确匹配
    const handlers = this._changeHandlers.get(key);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(key, newValue, oldValue);
        } catch (error) {
          console.error('[ConfigManager] Change handler error:', error);
        }
      }
    }

    // 通配符监听
    const wildcardHandlers = this._changeHandlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(key, newValue, oldValue);
        } catch (error) {
          console.error('[ConfigManager] Wildcard handler error:', error);
        }
      }
    }

    // 前缀匹配
    const parts = key.split('.');
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join('.') + '.*';
      const prefixHandlers = this._changeHandlers.get(prefix);
      if (prefixHandlers) {
        for (const handler of prefixHandlers) {
          try {
            handler(key, newValue, oldValue);
          } catch (error) {
            console.error('[ConfigManager] Prefix handler error:', error);
          }
        }
      }
    }
  }
}
