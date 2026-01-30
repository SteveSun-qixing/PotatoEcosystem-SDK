/**
 * 插件系统
 *
 * 管理插件的注册、加载和生命周期
 */

import type { Plugin, PluginContext } from '../types';
import { Logger } from '../core/logger';
import type { EventBus } from '../core/event';
import { PluginStatus } from '../types/plugin';

/**
 * 插件信息
 */
interface PluginInfo {
  plugin: Plugin;
  status: PluginStatus;
  loadedAt?: Date;
}

/**
 * 插件系统类
 */
export class PluginSystem {
  private plugins: Map<string, PluginInfo>;
  private logger: Logger;
  private eventBus?: EventBus;

  constructor(logger: Logger, eventBus?: EventBus) {
    this.plugins = new Map();
    this.logger = logger;
    this.eventBus = eventBus;
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
      this.logger.error('Failed to install plugin', error as Error, {
        pluginId: plugin.id,
      });

      this.plugins.set(plugin.id, {
        plugin,
        status: PluginStatus.Error,
      });

      throw error;
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
      this.logger.error('Failed to uninstall plugin', error as Error, {
        pluginId,
      });
      throw error;
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
}
