/**
 * 插件生命周期管理器
 *
 * 管理插件的生命周期状态转换
 */

import { Logger } from '../core/logger';
import type { EventBus } from '../core/event';
import type { Plugin, PluginManifest } from '../types';

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
 * 生命周期状态
 */
export enum LifecycleState {
  /** 未加载 */
  Unloaded = 'unloaded',
  /** 已加载 */
  Loaded = 'loaded',
  /** 初始化中 */
  Initializing = 'initializing',
  /** 已初始化 */
  Initialized = 'initialized',
  /** 启动中 */
  Starting = 'starting',
  /** 已启动（活跃） */
  Active = 'active',
  /** 停止中 */
  Stopping = 'stopping',
  /** 已停止 */
  Stopped = 'stopped',
  /** 销毁中 */
  Destroying = 'destroying',
  /** 已销毁 */
  Destroyed = 'destroyed',
  /** 错误状态 */
  Error = 'error',
}

/**
 * 生命周期条目
 */
export interface LifecycleEntry {
  plugin: Plugin;
  manifest: PluginManifest;
  state: LifecycleState;
  error?: Error;
  loadedAt?: number;
  initializedAt?: number;
  startedAt?: number;
  stoppedAt?: number;
}

/**
 * 生命周期事件数据
 */
export interface LifecycleEventData {
  pluginId: string;
  from: LifecycleState;
  to: LifecycleState;
  timestamp: number;
  error?: Error;
}

/**
 * 插件生命周期管理器类
 */
export class PluginLifecycleManager {
  private logger: Logger;
  private eventBus?: EventBus;
  private lifecycles: Map<string, LifecycleEntry>;

  constructor(logger: Logger, eventBus?: EventBus) {
    this.logger = logger;
    this.eventBus = eventBus;
    this.lifecycles = new Map();
  }

  /**
   * 加载插件
   * @param plugin 插件实例
   * @param manifest 插件清单
   */
  async load(plugin: Plugin, manifest: PluginManifest): Promise<void> {
    const entry: LifecycleEntry = {
      plugin,
      manifest,
      state: LifecycleState.Unloaded,
      loadedAt: Date.now(),
    };

    this.lifecycles.set(plugin.id, entry);

    await this.transition(
      plugin.id,
      LifecycleState.Unloaded,
      LifecycleState.Loaded
    );

    this.logger.info(`Plugin loaded: ${plugin.id}`);
  }

  /**
   * 初始化插件
   * @param pluginId 插件ID
   * @param core 薯片内核实例（可选）
   */
  async initialize(pluginId: string, core?: unknown): Promise<void> {
    const entry = this.lifecycles.get(pluginId);

    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (entry.state !== LifecycleState.Loaded) {
      throw new Error(
        `Cannot initialize plugin ${pluginId} in state ${entry.state}`
      );
    }

    await this.transition(
      pluginId,
      LifecycleState.Loaded,
      LifecycleState.Initializing
    );

    try {
      // 调用插件的 initialize 方法（如果存在）
      if (
        'initialize' in entry.plugin &&
        typeof entry.plugin.initialize === 'function'
      ) {
        await entry.plugin.initialize(core);
      }

      entry.initializedAt = Date.now();

      await this.transition(
        pluginId,
        LifecycleState.Initializing,
        LifecycleState.Initialized
      );

      this.logger.info(`Plugin initialized: ${pluginId}`);
    } catch (error) {
      const err = toError(error);
      this.logger.error(`Plugin initialization failed: ${pluginId}`, err);
      await this.transitionToError(pluginId, err);
      throw err;
    }
  }

  /**
   * 启动插件
   * @param pluginId 插件ID
   */
  async start(pluginId: string): Promise<void> {
    const entry = this.lifecycles.get(pluginId);

    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (entry.state !== LifecycleState.Initialized) {
      throw new Error(
        `Cannot start plugin ${pluginId} in state ${entry.state}`
      );
    }

    await this.transition(
      pluginId,
      LifecycleState.Initialized,
      LifecycleState.Starting
    );

    try {
      // 调用插件的 start 方法（如果存在）
      if ('start' in entry.plugin && typeof entry.plugin.start === 'function') {
        await entry.plugin.start();
      }

      entry.startedAt = Date.now();

      await this.transition(
        pluginId,
        LifecycleState.Starting,
        LifecycleState.Active
      );

      this.logger.info(`Plugin started: ${pluginId}`);
    } catch (error) {
      const err = toError(error);
      this.logger.error(`Plugin start failed: ${pluginId}`, err);
      await this.transitionToError(pluginId, err);
      throw err;
    }
  }

  /**
   * 停止插件
   * @param pluginId 插件ID
   */
  async stop(pluginId: string): Promise<void> {
    const entry = this.lifecycles.get(pluginId);

    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (entry.state !== LifecycleState.Active) {
      throw new Error(`Cannot stop plugin ${pluginId} in state ${entry.state}`);
    }

    await this.transition(
      pluginId,
      LifecycleState.Active,
      LifecycleState.Stopping
    );

    try {
      // 调用插件的 stop 方法（如果存在）
      if ('stop' in entry.plugin && typeof entry.plugin.stop === 'function') {
        await entry.plugin.stop();
      }

      entry.stoppedAt = Date.now();

      await this.transition(
        pluginId,
        LifecycleState.Stopping,
        LifecycleState.Stopped
      );

      this.logger.info(`Plugin stopped: ${pluginId}`);
    } catch (error) {
      const err = toError(error);
      this.logger.error(`Plugin stop failed: ${pluginId}`, err);
      await this.transitionToError(pluginId, err);
      throw err;
    }
  }

  /**
   * 销毁插件
   * @param pluginId 插件ID
   */
  async destroy(pluginId: string): Promise<void> {
    const entry = this.lifecycles.get(pluginId);

    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const validStates = [
      LifecycleState.Loaded,
      LifecycleState.Initialized,
      LifecycleState.Stopped,
      LifecycleState.Error,
    ];

    if (!validStates.includes(entry.state)) {
      throw new Error(
        `Cannot destroy plugin ${pluginId} in state ${entry.state}`
      );
    }

    await this.transition(pluginId, entry.state, LifecycleState.Destroying);

    try {
      // 调用插件的 destroy 方法（如果存在）
      if (
        'destroy' in entry.plugin &&
        typeof entry.plugin.destroy === 'function'
      ) {
        await entry.plugin.destroy();
      }

      // 调用插件的 uninstall 方法（如果存在）
      if (entry.plugin.uninstall) {
        await entry.plugin.uninstall();
      }

      await this.transition(
        pluginId,
        LifecycleState.Destroying,
        LifecycleState.Destroyed
      );

      this.lifecycles.delete(pluginId);

      this.logger.info(`Plugin destroyed: ${pluginId}`);
    } catch (error) {
      const err = toError(error);
      this.logger.error(`Plugin destruction failed: ${pluginId}`, err);
      await this.transitionToError(pluginId, err);
      throw err;
    }
  }

  /**
   * 状态转换
   * @param pluginId 插件ID
   * @param from 源状态
   * @param to 目标状态
   */
  async transition(
    pluginId: string,
    from: LifecycleState,
    to: LifecycleState
  ): Promise<void> {
    const entry = this.lifecycles.get(pluginId);

    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (entry.state !== from) {
      throw new Error(
        `Invalid state transition: expected ${from}, got ${entry.state}`
      );
    }

    this.logger.debug(`Plugin ${pluginId} state: ${from} → ${to}`);

    entry.state = to;

    // 发送生命周期事件
    this.eventBus?.emit('plugin:lifecycle', {
      pluginId,
      from,
      to,
      timestamp: Date.now(),
    } as LifecycleEventData);
  }

  /**
   * 转换到错误状态
   * @param pluginId 插件ID
   * @param error 错误对象
   */
  private async transitionToError(
    pluginId: string,
    error: Error
  ): Promise<void> {
    const entry = this.lifecycles.get(pluginId);

    if (!entry) {
      return;
    }

    const from = entry.state;
    entry.state = LifecycleState.Error;
    entry.error = error;

    this.logger.error(`Plugin ${pluginId} entered error state`, error);

    this.eventBus?.emit('plugin:lifecycle', {
      pluginId,
      from,
      to: LifecycleState.Error,
      timestamp: Date.now(),
      error,
    } as LifecycleEventData);
  }

  /**
   * 获取插件状态
   * @param pluginId 插件ID
   * @returns 生命周期状态
   */
  getLifecycleState(pluginId: string): LifecycleState | undefined {
    return this.lifecycles.get(pluginId)?.state;
  }

  /**
   * 获取插件条目
   * @param pluginId 插件ID
   * @returns 生命周期条目
   */
  getLifecycleEntry(pluginId: string): LifecycleEntry | undefined {
    const entry = this.lifecycles.get(pluginId);
    return entry ? { ...entry } : undefined;
  }

  /**
   * 获取所有插件的状态
   * @returns 插件状态映射
   */
  getAllStates(): Map<string, LifecycleState> {
    const states = new Map<string, LifecycleState>();

    for (const [id, entry] of this.lifecycles) {
      states.set(id, entry.state);
    }

    return states;
  }

  /**
   * 检查插件是否处于活跃状态
   * @param pluginId 插件ID
   * @returns 是否活跃
   */
  isActive(pluginId: string): boolean {
    return this.lifecycles.get(pluginId)?.state === LifecycleState.Active;
  }

  /**
   * 检查插件是否处于错误状态
   * @param pluginId 插件ID
   * @returns 是否错误
   */
  hasError(pluginId: string): boolean {
    return this.lifecycles.get(pluginId)?.state === LifecycleState.Error;
  }

  /**
   * 获取插件错误
   * @param pluginId 插件ID
   * @returns 错误对象
   */
  getError(pluginId: string): Error | undefined {
    return this.lifecycles.get(pluginId)?.error;
  }

  /**
   * 清除插件错误（尝试恢复）
   * @param pluginId 插件ID
   */
  clearError(pluginId: string): void {
    const entry = this.lifecycles.get(pluginId);

    if (entry && entry.state === LifecycleState.Error) {
      entry.error = undefined;
      entry.state = LifecycleState.Stopped;
      this.logger.info(`Plugin error cleared: ${pluginId}`);
    }
  }
}
