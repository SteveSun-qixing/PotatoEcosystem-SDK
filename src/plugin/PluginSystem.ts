/**
 * 插件系统
 *
 * 管理插件的注册、加载和生命周期
 */

import type { Plugin, PluginContext, PluginManifest } from '../types';
import { Logger } from '../core/logger';
import type { EventBus } from '../core/event';
import { PluginStatus } from '../types/plugin';
import { PluginManifestLoader } from './PluginManifestLoader';
import { DependencyResolver } from './DependencyResolver';
import { PluginLoader } from './PluginLoader';
import { PluginLifecycleManager } from './PluginLifecycleManager';

/**
 * 将 unknown 错误转换为 Error
 */
function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * 插件信息
 */
interface PluginInfo {
  plugin: Plugin;
  manifest?: PluginManifest;
  status: PluginStatus;
  loadedAt?: Date;
}

/**
 * 插件系统配置
 */
export interface PluginSystemConfig {
  /** 是否自动解析依赖 */
  autoResolveDependencies?: boolean;
  /** 是否在沙箱中运行插件 */
  sandbox?: boolean;
  /** 是否启用严格模式 */
  strict?: boolean;
}

/**
 * 插件系统类
 */
export class PluginSystem {
  private plugins: Map<string, PluginInfo>;
  private manifests: Map<string, PluginManifest>;
  private logger: Logger;
  private eventBus?: EventBus;
  private config: Required<PluginSystemConfig>;

  // 新增的管理器
  private manifestLoader: PluginManifestLoader;
  private dependencyResolver: DependencyResolver;
  private pluginLoader: PluginLoader;
  private lifecycleManager: PluginLifecycleManager;

  constructor(
    logger: Logger,
    eventBus?: EventBus,
    config: PluginSystemConfig = {}
  ) {
    this.plugins = new Map();
    this.manifests = new Map();
    this.logger = logger;
    this.eventBus = eventBus;

    this.config = {
      autoResolveDependencies: config.autoResolveDependencies ?? true,
      sandbox: config.sandbox ?? false,
      strict: config.strict ?? false,
    };

    // 初始化管理器
    this.manifestLoader = new PluginManifestLoader(logger);
    this.dependencyResolver = new DependencyResolver(logger);
    this.pluginLoader = new PluginLoader(logger);
    this.lifecycleManager = new PluginLifecycleManager(logger, eventBus);
  }

  /**
   * 使用插件（注册并安装）
   * @param plugin 插件或插件数组
   */
  async use(plugin: Plugin | Plugin[]): Promise<void> {
    const plugins = Array.isArray(plugin) ? plugin : [plugin];

    for (const p of plugins) {
      await this.installPlugin(p);
    }
  }

  /**
   * 安装插件
   * @param plugin 插件
   */
  private async installPlugin(plugin: Plugin): Promise<void> {
    this.logger.debug('Installing plugin', { pluginId: plugin.id });

    // 检查是否已安装
    if (this.plugins.has(plugin.id)) {
      this.logger.warn('Plugin already installed', { pluginId: plugin.id });
      return;
    }

    // 创建插件上下文
    const context = this.createPluginContext(plugin.id);

    // 调用插件安装方法
    try {
      await plugin.install(context);

      // 记录插件信息
      this.plugins.set(plugin.id, {
        plugin,
        status: PluginStatus.Enabled,
        loadedAt: new Date(),
      });

      this.logger.info('Plugin installed', { pluginId: plugin.id });
      this.eventBus?.emit('plugin:install', plugin);
    } catch (error) {
      const err = toError(error);
      this.logger.error('Failed to install plugin', err, {
        pluginId: plugin.id,
      });

      this.plugins.set(plugin.id, {
        plugin,
        status: PluginStatus.Error,
      });

      throw err;
    }
  }

  /**
   * 卸载插件
   * @param pluginId 插件ID
   */
  async unuse(pluginId: string): Promise<void> {
    this.logger.debug('Uninstalling plugin', { pluginId });

    const pluginInfo = this.plugins.get(pluginId);

    if (!pluginInfo) {
      this.logger.warn('Plugin not found', { pluginId });
      return;
    }

    try {
      // 调用插件卸载方法
      if (pluginInfo.plugin.uninstall) {
        await pluginInfo.plugin.uninstall();
      }

      // 删除插件
      this.plugins.delete(pluginId);

      this.logger.info('Plugin uninstalled', { pluginId });
      this.eventBus?.emit('plugin:uninstall', pluginInfo.plugin);
    } catch (error) {
      const err = toError(error);
      this.logger.error('Failed to uninstall plugin', err, {
        pluginId,
      });
      throw err;
    }
  }

  /**
   * 启用插件
   * @param pluginId 插件ID
   */
  async enable(pluginId: string): Promise<void> {
    const pluginInfo = this.plugins.get(pluginId);

    if (!pluginInfo) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (pluginInfo.status === PluginStatus.Enabled) {
      return;
    }

    // 重新安装插件
    const context = this.createPluginContext(pluginId);
    await pluginInfo.plugin.install(context);

    pluginInfo.status = PluginStatus.Enabled;

    this.logger.info('Plugin enabled', { pluginId });
    this.eventBus?.emit('plugin:enable', pluginInfo.plugin);
  }

  /**
   * 禁用插件
   * @param pluginId 插件ID
   */
  async disable(pluginId: string): Promise<void> {
    const pluginInfo = this.plugins.get(pluginId);

    if (!pluginInfo) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (pluginInfo.status === PluginStatus.Disabled) {
      return;
    }

    // 卸载插件
    if (pluginInfo.plugin.uninstall) {
      await pluginInfo.plugin.uninstall();
    }

    pluginInfo.status = PluginStatus.Disabled;

    this.logger.info('Plugin disabled', { pluginId });
    this.eventBus?.emit('plugin:disable', pluginInfo.plugin);
  }

  /**
   * 获取插件信息
   * @param pluginId 插件ID
   * @returns 插件信息
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId)?.plugin;
  }

  /**
   * 获取插件状态
   * @param pluginId 插件ID
   * @returns 插件状态
   */
  getPluginStatus(pluginId: string): PluginStatus | undefined {
    return this.plugins.get(pluginId)?.status;
  }

  /**
   * 列出所有插件
   * @returns 插件信息数组
   */
  listPlugins(): Array<{ id: string; name: string; status: PluginStatus }> {
    const result: Array<{ id: string; name: string; status: PluginStatus }> =
      [];

    for (const [id, info] of this.plugins) {
      result.push({
        id,
        name: info.plugin.name,
        status: info.status,
      });
    }

    return result;
  }

  /**
   * 检查插件是否已安装
   * @param pluginId 插件ID
   * @returns 是否已安装
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * 创建插件上下文
   * @param pluginId 插件ID
   * @returns 插件上下文
   */
  private createPluginContext(pluginId: string): PluginContext {
    return {
      registerCardType: (type: string, _renderer: unknown) => {
        this.logger.debug('Card type registered by plugin', {
          pluginId,
          cardType: type,
        });
        // TODO: 实际的卡片类型注册
      },
      registerCommand: (
        name: string,
        _handler: (...args: unknown[]) => unknown
      ) => {
        this.logger.debug('Command registered by plugin', {
          pluginId,
          commandName: name,
        });
        // TODO: 实际的命令注册
      },
      on: (event: string, handler: (...args: unknown[]) => void) => {
        if (this.eventBus) {
          this.eventBus.on(event, handler);
        }
      },
    };
  }

  // ========== 新增方法：清单管理 ==========

  /**
   * 加载清单文件
   * @param yamlContent YAML内容
   * @returns 插件清单
   */
  loadManifestFromYaml(yamlContent: string): PluginManifest {
    const manifest = this.manifestLoader.loadFromYaml(yamlContent, {
      strict: this.config.strict,
      fillDefaults: true,
    });
    this.manifests.set(manifest.id, manifest);
    return manifest;
  }

  /**
   * 从JSON加载清单
   * @param jsonContent JSON内容
   * @returns 插件清单
   */
  loadManifestFromJson(jsonContent: string): PluginManifest {
    const manifest = this.manifestLoader.loadFromJson(jsonContent, {
      strict: this.config.strict,
      fillDefaults: true,
    });
    this.manifests.set(manifest.id, manifest);
    return manifest;
  }

  /**
   * 验证清单
   * @param manifest 插件清单
   * @returns 验证结果
   */
  validateManifest(manifest: PluginManifest) {
    return this.manifestLoader.validateManifest(manifest, this.config.strict);
  }

  // ========== 新增方法：依赖管理 ==========

  /**
   * 解析所有插件的依赖关系
   * @returns 依赖解析结果
   */
  resolveDependencies() {
    return this.dependencyResolver.resolve(this.manifests);
  }

  /**
   * 检查插件依赖是否满足
   * @param pluginId 插件ID
   * @returns 是否满足依赖
   */
  checkDependencies(pluginId: string): boolean {
    const manifest = this.manifests.get(pluginId);

    if (!manifest || !manifest.dependencies?.plugins) {
      return true;
    }

    return this.dependencyResolver.checkDependencies(
      manifest.dependencies.plugins,
      this.manifests
    );
  }

  // ========== 新增方法：插件加载 ==========

  /**
   * 从路径加载插件
   * @param pluginPath 插件路径
   * @returns 插件实例
   */
  async loadFromPath(pluginPath: string): Promise<Plugin> {
    const pluginPackage = await this.pluginLoader.loadFromPath(pluginPath, {
      validateManifest: true,
      checkDependencies: this.config.autoResolveDependencies,
      sandbox: this.config.sandbox,
    });

    // 保存清单
    this.manifests.set(pluginPackage.manifest.id, pluginPackage.manifest);

    // 加载到生命周期管理器
    await this.lifecycleManager.load(
      pluginPackage.plugin,
      pluginPackage.manifest
    );

    // 使用插件
    await this.use(pluginPackage.plugin);

    return pluginPackage.plugin;
  }

  /**
   * 从清单加载插件
   * @param manifest 插件清单
   * @param basePath 基础路径
   * @returns 插件实例
   */
  async loadFromManifest(
    manifest: PluginManifest,
    basePath: string
  ): Promise<Plugin> {
    const pluginPackage = await this.pluginLoader.loadFromManifest(
      manifest,
      basePath,
      {
        validateManifest: true,
        checkDependencies: this.config.autoResolveDependencies,
        sandbox: this.config.sandbox,
      }
    );

    // 保存清单
    this.manifests.set(manifest.id, manifest);

    // 加载到生命周期管理器
    await this.lifecycleManager.load(pluginPackage.plugin, manifest);

    // 使用插件
    await this.use(pluginPackage.plugin);

    return pluginPackage.plugin;
  }

  // ========== 新增方法：生命周期管理 ==========

  /**
   * 初始化插件
   * @param pluginId 插件ID
   * @param core 薯片内核实例
   */
  async initializePlugin(pluginId: string, core?: unknown): Promise<void> {
    await this.lifecycleManager.initialize(pluginId, core);
  }

  /**
   * 启动插件
   * @param pluginId 插件ID
   */
  async startPlugin(pluginId: string): Promise<void> {
    await this.lifecycleManager.start(pluginId);
  }

  /**
   * 停止插件
   * @param pluginId 插件ID
   */
  async stopPlugin(pluginId: string): Promise<void> {
    await this.lifecycleManager.stop(pluginId);
  }

  /**
   * 销毁插件
   * @param pluginId 插件ID
   */
  async destroyPlugin(pluginId: string): Promise<void> {
    await this.lifecycleManager.destroy(pluginId);

    // 从系统中移除
    this.plugins.delete(pluginId);
    this.manifests.delete(pluginId);
  }

  /**
   * 获取插件生命周期状态
   * @param pluginId 插件ID
   * @returns 生命周期状态
   */
  getLifecycleState(pluginId: string) {
    return this.lifecycleManager.getLifecycleState(pluginId);
  }

  /**
   * 检查插件是否活跃
   * @param pluginId 插件ID
   * @returns 是否活跃
   */
  isPluginActive(pluginId: string): boolean {
    return this.lifecycleManager.isActive(pluginId);
  }

  // ========== 新增方法：插件查询 ==========

  /**
   * 获取插件清单
   * @param pluginId 插件ID
   * @returns 插件清单
   */
  getManifest(pluginId: string): PluginManifest | undefined {
    return this.manifests.get(pluginId);
  }

  /**
   * 获取所有已加载的插件清单
   * @returns 清单映射
   */
  getAllManifests(): Map<string, PluginManifest> {
    return new Map(this.manifests);
  }

  /**
   * 获取插件数量
   * @returns 插件数量
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * 清除所有插件
   */
  async clearAll(): Promise<void> {
    const pluginIds = Array.from(this.plugins.keys());

    for (const pluginId of pluginIds) {
      try {
        await this.destroyPlugin(pluginId);
      } catch (error) {
        const err = toError(error);
        this.logger.error(`Failed to destroy plugin ${pluginId}`, err);
      }
    }

    this.plugins.clear();
    this.manifests.clear();

    this.logger.info('All plugins cleared');
  }
}
