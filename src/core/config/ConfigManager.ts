/**
 * 配置管理器
 *
 * 实现层级配置系统：默认配置 → 系统配置 → 用户配置 → 运行时配置
 */

import { ConfigScope, type ConfigItem } from '../../types/config';
import { getNestedValue, setNestedValue } from '../../utils/object';
import { deepMerge } from '../../utils/format';

/**
 * 配置存储接口
 */
export interface ConfigStorage {
  load(scope: ConfigScope): Promise<Record<string, unknown>>;
  save(scope: ConfigScope, config: Record<string, unknown>): Promise<void>;
}

/**
 * 配置管理器类
 */
export class ConfigManager {
  private configs: Map<ConfigScope, Record<string, unknown>>;
  private storage?: ConfigStorage;
  private runtimeConfig: Record<string, unknown>;

  constructor(storage?: ConfigStorage) {
    this.configs = new Map();
    this.storage = storage;
    this.runtimeConfig = {};

    // 初始化各层级配置
    this.configs.set(ConfigScope.System, {});
    this.configs.set(ConfigScope.User, {});
    this.configs.set(ConfigScope.Module, {});
  }

  /**
   * 加载配置
   */
  async load(): Promise<void> {
    if (!this.storage) {
      return;
    }

    try {
      const systemConfig = await this.storage.load(ConfigScope.System);
      this.configs.set(ConfigScope.System, systemConfig);

      const userConfig = await this.storage.load(ConfigScope.User);
      this.configs.set(ConfigScope.User, userConfig);

      const moduleConfig = await this.storage.load(ConfigScope.Module);
      this.configs.set(ConfigScope.Module, moduleConfig);
    } catch (error) {
      console.warn('Failed to load config:', error);
    }
  }

  /**
   * 获取配置值
   * @param key 配置键（支持点分隔的嵌套路径）
   * @param defaultValue 默认值
   * @returns 配置值
   */
  get<V = unknown>(key: string, defaultValue?: V): V {
    // 按优先级依次查找：运行时 > 模块 > 用户 > 系统 > 默认值
    const scopes = [
      this.runtimeConfig,
      this.configs.get(ConfigScope.Module)!,
      this.configs.get(ConfigScope.User)!,
      this.configs.get(ConfigScope.System)!,
    ];

    for (const config of scopes) {
      const value = getNestedValue<V>(config, key);
      if (value !== undefined) {
        return value;
      }
    }

    return defaultValue as V;
  }

  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   * @param scope 配置作用域
   */
  async set(
    key: string,
    value: unknown,
    scope: ConfigScope = ConfigScope.User
  ): Promise<void> {
    if (scope === ConfigScope.System && !this.storage) {
      throw new Error('Cannot set system config without storage');
    }

    const config = this.configs.get(scope)!;
    setNestedValue(config, key, value);

    // 如果有存储，保存配置
    if (this.storage && scope !== ConfigScope.Module) {
      await this.storage.save(scope, config);
    }
  }

  /**
   * 设置运行时配置（临时覆盖）
   * @param key 配置键
   * @param value 配置值
   */
  setRuntime(key: string, value: unknown): void {
    setNestedValue(this.runtimeConfig, key, value);
  }

  /**
   * 删除配置
   * @param key 配置键
   * @param scope 配置作用域
   */
  async delete(
    key: string,
    scope: ConfigScope = ConfigScope.User
  ): Promise<void> {
    const config = this.configs.get(scope)!;
    const keys = key.split('.');
    const lastKey = keys.pop();

    if (!lastKey) return;

    let current = config;
    for (const k of keys) {
      if (current[k] && typeof current[k] === 'object') {
        current = current[k] as Record<string, unknown>;
      } else {
        return; // 路径不存在
      }
    }

    delete current[lastKey];

    // 保存更改
    if (this.storage && scope !== ConfigScope.Module) {
      await this.storage.save(scope, config);
    }
  }

  /**
   * 获取整个配置对象（合并所有层级）
   */
  getAll(): Record<string, unknown> {
    return deepMerge(
      {},
      this.configs.get(ConfigScope.System)!,
      this.configs.get(ConfigScope.User)!,
      this.configs.get(ConfigScope.Module)!,
      this.runtimeConfig
    );
  }

  /**
   * 列出配置项
   * @param prefix 配置键前缀
   * @param scope 配置作用域（可选）
   */
  list(prefix?: string, scope?: ConfigScope): ConfigItem[] {
    const result: ConfigItem[] = [];

    const scopes = scope
      ? [scope]
      : [ConfigScope.System, ConfigScope.User, ConfigScope.Module];

    for (const s of scopes) {
      const config = this.configs.get(s)!;
      this.collectConfigItems(config, '', prefix, s, result);
    }

    return result;
  }

  /**
   * 收集配置项（递归）
   */
  private collectConfigItems(
    obj: Record<string, unknown>,
    currentPath: string,
    prefix: string | undefined,
    scope: ConfigScope,
    result: ConfigItem[]
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      if (!prefix || fullPath.startsWith(prefix)) {
        if (typeof value !== 'object' || value === null) {
          result.push({
            key: fullPath,
            value,
            scope,
          });
        } else {
          this.collectConfigItems(
            value as Record<string, unknown>,
            fullPath,
            prefix,
            scope,
            result
          );
        }
      }
    }
  }

  /**
   * 重置配置到默认值
   * @param scope 要重置的作用域
   */
  async reset(scope: ConfigScope = ConfigScope.User): Promise<void> {
    this.configs.set(scope, {});

    if (this.storage) {
      await this.storage.save(scope, {});
    }
  }
}

/**
 * 全局配置管理器实例
 */
let globalConfigManager: ConfigManager | null = null;

/**
 * 获取全局配置管理器
 */
export function getGlobalConfigManager(): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager();
  }
  return globalConfigManager;
}

/**
 * 设置全局配置管理器
 */
export function setGlobalConfigManager(manager: ConfigManager): void {
  globalConfigManager = manager;
}
