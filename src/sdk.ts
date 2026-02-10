/**
 * Chips SDK 主类
 * @module sdk
 */

import { CoreConnector, ChipsError, ErrorCodes, ConnectorOptions } from './core';
import { Logger, LoggerOptions } from './logger';
import { ConfigManager, ConfigManagerOptions } from './config';
import { EventBus, EventBusOptions } from './event';
import { I18nManager, I18nManagerOptions } from './i18n';
import { FileAPI } from './api/file-api';
import { CardAPI } from './api/card-api';
import { BoxAPI } from './api/box-api';
import { ConversionAPI } from './api/conversion-api';
import { PluginManager, PluginRegistration } from './plugin';
import { ThemeManager, ThemeManagerOptions, Theme } from './theme';
import { RendererEngine, RendererEngineOptions } from './renderer';
import { ResourceManager, ResourceManagerOptions } from './resource';

/**
 * SDK 状态
 */
export type SDKState = 'idle' | 'initializing' | 'ready' | 'error' | 'destroyed';

/**
 * SDK 配置选项
 */
export interface ChipsSDKOptions {
  /** Core 连接选项 */
  connector?: ConnectorOptions;
  /** 自定义 Core 连接器实例（用于本地桥接/测试） */
  connectorInstance?: CoreConnector;
  /** 日志选项 */
  logger?: LoggerOptions;
  /** 配置选项 */
  config?: ConfigManagerOptions;
  /** 事件总线选项 */
  eventBus?: EventBusOptions;
  /** 多语言选项 */
  i18n?: I18nManagerOptions;
  /** 主题选项 */
  theme?: ThemeManagerOptions;
  /** 渲染引擎选项 */
  renderer?: RendererEngineOptions;
  /** 资源管理选项 */
  resource?: ResourceManagerOptions;
  /** 自动连接 */
  autoConnect?: boolean;
  /** 调试模式 */
  debug?: boolean;
}

/**
 * SDK 版本信息
 */
export interface SDKVersion {
  /** SDK 版本 */
  sdk: string;
  /** 协议版本 */
  protocol: string;
  /** 构建时间 */
  buildTime: string;
}

/**
 * Chips SDK 主类
 *
 * @example
 * ```ts
 * // 创建 SDK 实例
 * const sdk = new ChipsSDK({
 *   connector: { url: 'ws://localhost:9527' },
 *   autoConnect: true,
 * });
 *
 * // 初始化
 * await sdk.initialize();
 *
 * // 使用 API
 * const card = await sdk.card.create({ name: 'My Card' });
 *
 * // 销毁
 * sdk.destroy();
 * ```
 */
export class ChipsSDK {
  // 版本信息
  static readonly VERSION: SDKVersion = {
    sdk: '1.0.0',
    protocol: '1.0.0',
    buildTime: new Date().toISOString(),
  };

  // 内部状态
  private _state: SDKState = 'idle';
  private _options: ChipsSDKOptions;

  // 核心组件
  private _connector: CoreConnector;
  private _logger: Logger;
  private _config: ConfigManager;
  private _eventBus: EventBus;
  private _i18n: I18nManager;

  // 功能模块
  private _fileApi!: FileAPI;
  private _cardApi!: CardAPI;
  private _boxApi!: BoxAPI;
  private _conversionApi!: ConversionAPI;
  private _pluginManager!: PluginManager;
  private _themeManager!: ThemeManager;
  private _rendererEngine!: RendererEngine;
  private _resourceManager!: ResourceManager;

  /**
   * 创建 SDK 实例
   * @param options - SDK 配置选项
   */
  constructor(options: ChipsSDKOptions = {}) {
    this._options = options;

    // 创建核心组件
    this._logger = new Logger('ChipsSDK', options.logger);
    this._config = new ConfigManager(options.config);
    this._eventBus = new EventBus(options.eventBus);
    this._i18n = new I18nManager(options.i18n);
    this._connector = options.connectorInstance ?? new CoreConnector(options.connector);

    // 设置调试模式
    if (options.debug) {
      this._logger.setLevel('debug');
      this._config.set('sdk.debug', true);
    }

    this._logger.info('SDK instance created', { version: ChipsSDK.VERSION.sdk });
  }

  /**
   * 初始化 SDK
   */
  async initialize(): Promise<void> {
    if (this._state === 'ready') {
      return;
    }

    if (this._state === 'initializing') {
      throw new ChipsError(ErrorCodes.SDK_INITIALIZING, 'SDK is already initializing');
    }

    if (this._state === 'destroyed') {
      throw new ChipsError(ErrorCodes.SDK_DESTROYED, 'SDK has been destroyed');
    }

    this._state = 'initializing';
    this._logger.info('Initializing SDK...');

    try {
      // 连接到 Core
      if (this._options.autoConnect !== false) {
        await this._connector.connect();
        this._logger.info('Connected to Core');
      }

      // 初始化配置
      await this._config.initialize();

      // 创建功能模块
      this._initializeModules();

      this._state = 'ready';
      this._logger.info('SDK initialized successfully');

      await this._eventBus.emit('sdk:ready', { version: ChipsSDK.VERSION });
    } catch (error) {
      this._state = 'error';
      this._logger.error('SDK initialization failed', { error: String(error) });

      await this._eventBus.emit('sdk:error', { error: String(error) });

      throw error;
    }
  }

  /**
   * 销毁 SDK
   */
  destroy(): void {
    if (this._state === 'destroyed') {
      return;
    }

    this._logger.info('Destroying SDK...');

    // 断开连接
    this._connector.disconnect();

    // 清理资源
    if (this._resourceManager) {
      this._resourceManager.destroy();
    }

    // 清除缓存
    if (this._fileApi) {
      this._fileApi.clearCache();
    }

    // 清除渲染缓存
    if (this._rendererEngine) {
      this._rendererEngine.clearCache();
    }

    this._state = 'destroyed';
    this._logger.info('SDK destroyed');

    this._eventBus.emitSync('sdk:destroyed', {});
  }

  /**
   * 连接到 Core
   */
  async connect(): Promise<void> {
    if (this._connector.isConnected) {
      return;
    }

    await this._connector.connect();
    this._logger.info('Connected to Core');

    await this._eventBus.emit('sdk:connected', {});
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this._connector.disconnect();
    this._logger.info('Disconnected from Core');

    this._eventBus.emitSync('sdk:disconnected', {});
  }

  // ========== 访问器 ==========

  /**
   * 获取 SDK 状态
   */
  get state(): SDKState {
    return this._state;
  }

  /**
   * 是否已就绪
   */
  get isReady(): boolean {
    return this._state === 'ready';
  }

  /**
   * 是否已连接
   */
  get isConnected(): boolean {
    return this._connector.isConnected;
  }

  /**
   * 获取 Core 连接器
   */
  get connector(): CoreConnector {
    return this._connector;
  }

  /**
   * 获取日志实例
   */
  get logger(): Logger {
    return this._logger;
  }

  /**
   * 获取配置管理器
   */
  get config(): ConfigManager {
    return this._config;
  }

  /**
   * 获取事件总线
   */
  get events(): EventBus {
    return this._eventBus;
  }

  /**
   * 获取多语言管理器
   */
  get i18n(): I18nManager {
    return this._i18n;
  }

  /**
   * 获取文件 API
   */
  get file(): FileAPI {
    this._ensureReady();
    return this._fileApi;
  }

  /**
   * 获取卡片 API
   */
  get card(): CardAPI {
    this._ensureReady();
    return this._cardApi;
  }

  /**
   * 获取箱子 API
   */
  get box(): BoxAPI {
    this._ensureReady();
    return this._boxApi;
  }

  /**
   * 获取转换 API
   */
  get conversion(): ConversionAPI {
    this._ensureReady();
    return this._conversionApi;
  }

  /**
   * 获取插件管理器
   */
  get plugins(): PluginManager {
    this._ensureReady();
    return this._pluginManager;
  }

  /**
   * 获取主题管理器
   */
  get themes(): ThemeManager {
    this._ensureReady();
    return this._themeManager;
  }

  /**
   * 获取渲染引擎
   */
  get renderer(): RendererEngine {
    this._ensureReady();
    return this._rendererEngine;
  }

  /**
   * 获取资源管理器
   */
  get resources(): ResourceManager {
    this._ensureReady();
    return this._resourceManager;
  }

  // ========== 便捷方法 ==========

  /**
   * 注册插件
   * @param registration - 插件注册信息
   */
  registerPlugin(registration: PluginRegistration): void {
    this._ensureReady();
    this._pluginManager.register(registration);
  }

  /**
   * 注册主题
   * @param theme - 主题定义
   */
  registerTheme(theme: Theme): void {
    this._ensureReady();
    this._themeManager.register(theme);
  }

  /**
   * 设置主题
   * @param themeId - 主题 ID
   */
  setTheme(themeId: string): void {
    this._ensureReady();
    this._themeManager.setTheme(themeId);
  }

  /**
   * 设置语言
   * @param locale - 语言代码
   */
  setLocale(locale: string): void {
    this._i18n.setLocale(locale);
  }

  /**
   * 翻译文本
   * @param key - 翻译键
   * @param params - 插值参数
   */
  t(key: string, params?: Record<string, string | number>): string {
    return this._i18n.t(key, params);
  }

  /**
   * 订阅事件
   * @param event - 事件类型
   * @param handler - 事件处理器
   */
  on<T = unknown>(event: string, handler: (data: T) => void): string {
    return this._eventBus.on(event, handler);
  }

  /**
   * 取消订阅
   * @param event - 事件类型
   * @param handlerId - 处理器 ID
   */
  off(event: string, handlerId?: string): void {
    this._eventBus.off(event, handlerId);
  }

  // ========== 私有方法 ==========

  /**
   * 初始化功能模块
   */
  private _initializeModules(): void {
    // 文件 API
    this._fileApi = new FileAPI(this._connector, this._logger, this._config);

    // 卡片 API
    this._cardApi = new CardAPI(
      this._connector,
      this._fileApi,
      this._logger,
      this._config,
      this._eventBus
    );

    // 箱子 API
    this._boxApi = new BoxAPI(
      this._connector,
      this._fileApi,
      this._logger,
      this._config,
      this._eventBus
    );

    // 转换 API
    this._conversionApi = new ConversionAPI(this._connector, this._logger, this._config);

    // 插件管理器
    this._pluginManager = new PluginManager(this._logger, this._eventBus, this._config);

    // 多语言管理器绑定 Logger 和 EventBus（I18nManager 在构造函数中已创建，此处补充绑定）
    this._i18n.bind(this._logger, this._eventBus);

    // 主题管理器
    this._themeManager = new ThemeManager(this._logger, this._eventBus, this._options.theme);

    // 渲染引擎
    this._rendererEngine = new RendererEngine(
      this._logger,
      this._eventBus,
      this._themeManager,
      this._options.renderer
    );

    // 资源管理器
    this._resourceManager = new ResourceManager(
      this._connector,
      this._logger,
      this._eventBus,
      this._options.resource
    );

    this._logger.debug('All modules initialized');
  }

  /**
   * 确保 SDK 已就绪
   */
  private _ensureReady(): void {
    if (this._state !== 'ready') {
      throw new ChipsError(ErrorCodes.SDK_NOT_INITIALIZED, 'SDK is not initialized');
    }
  }
}
