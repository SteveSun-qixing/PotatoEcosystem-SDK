/**
 * 插件管理器
 * @module plugin/manager
 */

import { PluginError, ErrorCodes } from '../core';
import { Logger } from '../logger';
import { EventBus } from '../event';
import { ConfigManager } from '../config';
import { BridgeClient, BridgePluginInfo, BridgePluginSelfInfo } from '../bridge';
import {
  PluginState,
  PluginMetadata,
  PluginConfig,
  PluginContext,
  PluginInstance,
  PluginRegistration,
  PluginQueryOptions,
  CommandHandler,
  RendererDefinition,
  EventHandlerFn,
} from './types';

/**
 * 插件管理器
 *
 * @example
 * ```ts
 * const pluginManager = new PluginManager(logger, eventBus, config);
 *
 * // 注册插件
 * pluginManager.register({
 *   id: 'my-plugin',
 *   metadata: { id: 'my-plugin', name: 'My Plugin', version: '1.0.0' },
 *   activate: (ctx) => console.log('Plugin activated'),
 * });
 *
 * // 启用插件
 * await pluginManager.enable('my-plugin');
 * ```
 */
export class PluginManager {
  private _plugins = new Map<string, PluginInstance>();
  private _commands = new Map<string, { pluginId: string; handler: CommandHandler }>();
  private _renderers = new Map<string, { pluginId: string; renderer: RendererDefinition }>();
  private _logger: Logger;
  private _eventBus: EventBus;
  private _bridge?: BridgeClient;
  private _bridgeSubscriptions: Array<() => void> = [];

  /**
   * 创建插件管理器
   * @param logger - 日志实例
   * @param eventBus - 事件总线
   * @param config - 配置管理器
   */
  constructor(logger: Logger, eventBus: EventBus, _config: ConfigManager) {
    this._logger = logger.createChild('PluginManager');
    this._eventBus = eventBus;
  }

  /**
   * 绑定 Bridge 客户端
   * @param bridge - Bridge 客户端
   */
  bindBridge(bridge: BridgeClient): void {
    this._bridge = bridge;
    this._teardownBridgeSubscriptions();
    if (!bridge.isConnected) {
      return;
    }
    this._setupBridgeSubscriptions();
  }

  /**
   * 读取主机插件列表
   * @param filter - 过滤条件
   */
  async listInstalled(filter?: { type?: string; capability?: string }): Promise<PluginMetadata[]> {
    if (!this._bridge) {
      return this.list().map((plugin) => plugin.metadata);
    }

    const records = await this._bridge.invoke<BridgePluginInfo[]>(
      'plugin',
      'list',
      filter ? { filter } : {}
    );
    return records.map((item) => this._toPluginMetadata(item));
  }

  /**
   * 获取主机已安装插件详情
   * @param pluginId - 插件 ID
   */
  async getInstalled(pluginId: string): Promise<PluginMetadata | null> {
    if (!this._bridge) {
      return this.getMetadata(pluginId) ?? null;
    }

    const record = await this._bridge.invoke<BridgePluginInfo | null>('plugin', 'get', {
      pluginId,
    });

    if (!record) {
      return null;
    }

    return this._toPluginMetadata(record);
  }

  /**
   * 获取当前插件信息
   */
  async getSelf(): Promise<PluginMetadata | null> {
    if (!this._bridge) {
      return null;
    }

    const self = await this._bridge.invoke<BridgePluginSelfInfo>('plugin', 'getSelf', {});
    return {
      id: self.id,
      name: self.id,
      version: self.version,
      description: '',
      chipStandardsVersion: '1.0.0',
    };
  }

  /**
   * 注册插件
   * @param registration - 插件注册信息
   */
  register(registration: PluginRegistration): void {
    const { id, metadata, activate, deactivate, defaultConfig } = registration;

    if (this._plugins.has(id)) {
      throw new PluginError(ErrorCodes.PLUGIN_ALREADY_EXISTS, `Plugin ${id} already registered`);
    }

    const instance: PluginInstance = {
      metadata,
      state: 'installed',
      config: defaultConfig || {},
      activate,
      deactivate,
    };

    this._plugins.set(id, instance);
    this._logger.info('Plugin registered', { id, name: metadata.name });

    this._eventBus.emitSync('plugin:registered', { id, metadata });
  }

  /**
   * 取消注册插件
   * @param id - 插件 ID
   */
  async unregister(id: string): Promise<void> {
    const plugin = this._plugins.get(id);
    if (!plugin) {
      return;
    }

    // 先禁用
    if (plugin.state === 'enabled') {
      await this.disable(id);
    }

    // 清理命令和渲染器
    this._cleanupPluginResources(id);

    this._plugins.delete(id);
    this._logger.info('Plugin unregistered', { id });

    this._eventBus.emitSync('plugin:unregistered', { id });
  }

  /**
   * 启用插件
   * @param id - 插件 ID
   */
  async enable(id: string): Promise<void> {
    const plugin = this._plugins.get(id);
    if (!plugin) {
      throw new PluginError(ErrorCodes.PLUGIN_NOT_FOUND, `Plugin ${id} not found`);
    }

    if (plugin.state === 'enabled') {
      return;
    }

    // 检查依赖
    await this._checkDependencies(plugin.metadata);

    plugin.state = 'loading';

    try {
      // 创建上下文
      const context = this._createContext(id, plugin.config);

      // 调用激活函数
      if (plugin.activate) {
        await plugin.activate(context);
      }

      plugin.state = 'enabled';
      this._logger.info('Plugin enabled', { id });

      await this._eventBus.emit('plugin:enabled', { id });
    } catch (error) {
      plugin.state = 'error';
      plugin.error = String(error);
      this._logger.error('Failed to enable plugin', { id, error: String(error) });

      throw new PluginError(ErrorCodes.PLUGIN_LOAD_FAILED, `Failed to enable plugin ${id}`, {
        error: String(error),
      });
    }
  }

  /**
   * 禁用插件
   * @param id - 插件 ID
   */
  async disable(id: string): Promise<void> {
    const plugin = this._plugins.get(id);
    if (!plugin) {
      return;
    }

    if (plugin.state !== 'enabled') {
      return;
    }

    try {
      // 调用停用函数
      if (plugin.deactivate) {
        await plugin.deactivate();
      }

      // 清理资源
      this._cleanupPluginResources(id);

      plugin.state = 'disabled';
      this._logger.info('Plugin disabled', { id });

      await this._eventBus.emit('plugin:disabled', { id });
    } catch (error) {
      this._logger.error('Error disabling plugin', { id, error: String(error) });
    }
  }

  /**
   * 获取插件
   * @param id - 插件 ID
   */
  get(id: string): PluginInstance | undefined {
    return this._plugins.get(id);
  }

  /**
   * 获取插件元数据
   * @param id - 插件 ID
   */
  getMetadata(id: string): PluginMetadata | undefined {
    return this._plugins.get(id)?.metadata;
  }

  /**
   * 获取插件状态
   * @param id - 插件 ID
   */
  getState(id: string): PluginState | undefined {
    return this._plugins.get(id)?.state;
  }

  /**
   * 检查插件是否已启用
   * @param id - 插件 ID
   */
  isEnabled(id: string): boolean {
    return this._plugins.get(id)?.state === 'enabled';
  }

  /**
   * 获取所有插件
   * @param options - 查询选项
   */
  list(options?: PluginQueryOptions): PluginInstance[] {
    let plugins = Array.from(this._plugins.values());

    if (options?.state) {
      plugins = plugins.filter((p) => p.state === options.state);
    }

    if (options?.keyword) {
      const keyword = options.keyword.toLowerCase();
      plugins = plugins.filter(
        (p) =>
          p.metadata.name.toLowerCase().includes(keyword) ||
          p.metadata.description?.toLowerCase().includes(keyword) ||
          p.metadata.keywords?.some((k) => k.toLowerCase().includes(keyword))
      );
    }

    if (options?.author) {
      plugins = plugins.filter((p) => p.metadata.author === options.author);
    }

    return plugins;
  }

  /**
   * 获取已注册插件数量
   */
  get count(): number {
    return this._plugins.size;
  }

  /**
   * 获取已启用插件数量
   */
  get enabledCount(): number {
    return Array.from(this._plugins.values()).filter((p) => p.state === 'enabled').length;
  }

  /**
   * 更新插件配置
   * @param id - 插件 ID
   * @param config - 新配置
   */
  updateConfig(id: string, config: Partial<PluginConfig>): void {
    const plugin = this._plugins.get(id);
    if (!plugin) {
      throw new PluginError(ErrorCodes.PLUGIN_NOT_FOUND, `Plugin ${id} not found`);
    }

    plugin.config = { ...plugin.config, ...config };
    this._logger.debug('Plugin config updated', { id, config });

    this._eventBus.emitSync('plugin:config:updated', { id, config });
  }

  /**
   * 执行命令
   * @param name - 命令名称
   * @param args - 命令参数
   */
  async executeCommand(name: string, args?: unknown): Promise<unknown> {
    const command = this._commands.get(name);
    if (!command) {
      throw new PluginError(ErrorCodes.PLUGIN_NOT_FOUND, `Command ${name} not found`);
    }

    const plugin = this._plugins.get(command.pluginId);
    if (!plugin || plugin.state !== 'enabled') {
      throw new PluginError(ErrorCodes.PLUGIN_NOT_FOUND, `Plugin ${command.pluginId} not enabled`);
    }

    return command.handler(args);
  }

  /**
   * 获取渲染器
   * @param cardType - 卡片类型
   */
  getRenderer(cardType: string): RendererDefinition | undefined {
    for (const { pluginId, renderer } of this._renderers.values()) {
      if (renderer.cardTypes.includes(cardType)) {
        const plugin = this._plugins.get(pluginId);
        if (plugin?.state === 'enabled') {
          return renderer;
        }
      }
    }
    return undefined;
  }

  /**
   * 获取所有已注册的命令
   */
  getCommands(): string[] {
    return Array.from(this._commands.keys());
  }

  /**
   * 获取所有已注册的渲染器类型
   */
  getRendererTypes(): string[] {
    const types = new Set<string>();
    for (const { renderer } of this._renderers.values()) {
      for (const type of renderer.cardTypes) {
        types.add(type);
      }
    }
    return Array.from(types);
  }

  // ========== 私有方法 ==========

  /**
   * 创建插件上下文
   */
  private _createContext(pluginId: string, config: PluginConfig): PluginContext {
    return {
      pluginId,
      sdkVersion: '1.0.0',
      config,
      log: (message: string, data?: Record<string, unknown>) => {
        this._logger.info(`[${pluginId}] ${message}`, data);
      },
      registerCommand: (name: string, handler: CommandHandler) => {
        const fullName = `${pluginId}:${name}`;
        this._commands.set(fullName, { pluginId, handler });
        this._logger.debug('Command registered', { pluginId, command: fullName });
      },
      registerRenderer: (type: string, renderer: RendererDefinition) => {
        this._renderers.set(`${pluginId}:${type}`, { pluginId, renderer });
        this._logger.debug('Renderer registered', { pluginId, type });
      },
      emit: (event: string, data: unknown) => {
        this._eventBus.emitSync(`plugin:${pluginId}:${event}`, data);
      },
      on: (event: string, handler: EventHandlerFn) => {
        this._eventBus.on(`plugin:${pluginId}:${event}`, handler);
      },
    };
  }

  /**
   * 检查依赖
   */
  private async _checkDependencies(metadata: PluginMetadata): Promise<void> {
    if (!metadata.dependencies) {
      return;
    }

    for (const dep of metadata.dependencies) {
      const depPlugin = this._plugins.get(dep.id);

      if (!depPlugin) {
        if (!dep.optional) {
          throw new PluginError(
            ErrorCodes.PLUGIN_DEPENDENCY_MISSING,
            `Dependency ${dep.id} not found`
          );
        }
        continue;
      }

      // 启用依赖插件
      if (depPlugin.state !== 'enabled') {
        await this.enable(dep.id);
      }
    }
  }

  /**
   * 清理插件资源
   */
  private _cleanupPluginResources(pluginId: string): void {
    // 清理命令
    for (const [name, cmd] of this._commands) {
      if (cmd.pluginId === pluginId) {
        this._commands.delete(name);
      }
    }

    // 清理渲染器
    for (const [name, rnd] of this._renderers) {
      if (rnd.pluginId === pluginId) {
        this._renderers.delete(name);
      }
    }
  }

  private _setupBridgeSubscriptions(): void {
    if (!this._bridge) {
      return;
    }

    this._bridgeSubscriptions.push(
      this._bridge.on('plugin.installed', (payload) => {
        this._eventBus.emitSync('plugin:installed', payload);
      })
    );

    this._bridgeSubscriptions.push(
      this._bridge.on('plugin.uninstalled', (payload) => {
        this._eventBus.emitSync('plugin:uninstalled', payload);
      })
    );

    this._bridgeSubscriptions.push(
      this._bridge.on('plugin.updated', (payload) => {
        this._eventBus.emitSync('plugin:updated', payload);
      })
    );
  }

  private _teardownBridgeSubscriptions(): void {
    for (const unsubscribe of this._bridgeSubscriptions) {
      unsubscribe();
    }
    this._bridgeSubscriptions = [];
  }

  private _toPluginMetadata(plugin: BridgePluginInfo): PluginMetadata {
    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.publisher,
      chipStandardsVersion: '1.0.0',
    };
  }
}
