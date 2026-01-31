/**
 * Chips SDK主类
 *
 * 统一的SDK入口，整合所有模块功能
 */

import type {
  SDKOptions,
  Card,
  Box,
  SupportedLanguage,
  Platform,
} from './types';
import { LogLevel } from './types';
import { SDK_VERSION } from './constants';
import { createPlatformAdapter, detectPlatform } from './platform';
import { I18nManager, setGlobalI18nManager } from './core/i18n';
import { EventBus, setGlobalEventBus } from './core/event';
import { Logger, setGlobalLogger } from './core/logger';
import { ConfigManager } from './core/config';
import { FileAPI } from './api/FileAPI';
// import { FileManager } from './api/FileManager'; // 未使用，暂时注释
import { RendererEngine } from './renderer/RendererEngine';
import { ThemeManager } from './theme/ThemeManager';
import type { LoadOptions, SaveOptions } from './api';
import type { RenderOptions } from './renderer';

/**
 * Chips SDK主类
 */
export class ChipsSDK {
  private platform: Platform;
  private i18nManager: I18nManager;
  private eventBus: EventBus;
  private logger: Logger;
  private configManager: ConfigManager;
  private fileAPI: FileAPI;
  // private _fileManager: FileManager; // 未使用，暂时注释
  private rendererEngine: RendererEngine;
  private themeManager: ThemeManager;
  private initialized: boolean;

  constructor(options: SDKOptions = {}) {
    // 检测或设置平台
    this.platform = options.platform ?? detectPlatform();

    // 初始化事件系统
    this.eventBus = new EventBus();
    setGlobalEventBus(this.eventBus);

    // 初始化日志系统
    this.logger = new Logger({
      level: options.logLevel,
      enableConsole: options.debug ?? false,
      eventBus: this.eventBus,
    });
    setGlobalLogger(this.logger);

    // 初始化多语言系统
    this.i18nManager = new I18nManager({
      defaultLanguage: options.i18n?.defaultLanguage,
      fallbackLanguage: options.i18n?.fallbackLanguage,
      eventEmitter: this.eventBus as any,
    });
    setGlobalI18nManager(this.i18nManager);

    // 初始化配置管理
    this.configManager = new ConfigManager();

    // 初始化平台适配器
    const adapter = options.adapter ?? createPlatformAdapter(this.platform);

    // 初始化文件API
    this.fileAPI = new FileAPI(adapter, this.logger);

    // 初始化文件管理器
    // this._fileManager = new FileManager(adapter, this.logger); // 未使用，暂时注释

    // 初始化渲染引擎
    this.rendererEngine = new RendererEngine(this.logger, this.eventBus);

    // 初始化主题管理器
    this.themeManager = new ThemeManager(this.logger, this.eventBus);

    this.initialized = true;

    this.logger.info('Chips SDK initialized', {
      version: SDK_VERSION,
      platform: this.platform,
    });

    // 触发ready事件
    this.eventBus.emit('ready');
  }

  // ==================== 文件操作 ====================

  /**
   * 加载卡片
   * @param path 文件路径或File/Blob对象
   * @param options 加载选项
   * @returns 卡片对象
   */
  async loadCard(
    path: string | File | Blob,
    options?: LoadOptions
  ): Promise<Card> {
    return this.fileAPI.loadCard(path, options);
  }

  /**
   * 批量加载卡片
   * @param paths 文件路径数组
   * @param options 加载选项
   * @returns 卡片对象数组
   */
  async loadCards(paths: string[], options?: LoadOptions): Promise<Card[]> {
    return this.fileAPI.loadCards(paths, options);
  }

  /**
   * 保存卡片
   * @param card 卡片对象
   * @param path 保存路径
   * @param options 保存选项
   */
  async saveCard(
    card: Card,
    path: string,
    options?: SaveOptions
  ): Promise<void> {
    return this.fileAPI.saveCard(card, path, options);
  }

  /**
   * 保存卡片为Blob
   * @param card 卡片对象
   * @returns Blob对象
   */
  async saveCardAsBlob(card: Card): Promise<Blob> {
    return this.fileAPI.saveCardAsBlob(card);
  }

  /**
   * 加载箱子
   * @param path 文件路径或File/Blob对象
   * @param options 加载选项
   * @returns 箱子对象
   */
  async loadBox(
    path: string | File | Blob,
    options?: LoadOptions
  ): Promise<Box> {
    return this.fileAPI.loadBox(path, options);
  }

  /**
   * 保存箱子
   * @param box 箱子对象
   * @param path 保存路径
   * @param options 保存选项
   */
  async saveBox(box: Box, path: string, options?: SaveOptions): Promise<void> {
    return this.fileAPI.saveBox(box, path, options);
  }

  // ==================== 渲染功能 ====================

  /**
   * 渲染卡片
   * @param card 卡片对象或文件路径
   * @param container 容器选择器或元素
   * @param options 渲染选项
   */
  async renderCard(
    card: Card | string,
    container: string | HTMLElement,
    options?: RenderOptions
  ): Promise<void> {
    // 加载卡片（如果是路径）
    const cardData =
      typeof card === 'string' ? await this.loadCard(card) : card;

    // 获取容器元素
    const containerElement =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!containerElement) {
      const containerStr =
        typeof container === 'string' ? container : '[HTMLElement]';
      throw new Error(`Container not found: ${containerStr}`);
    }

    // 渲染
    const renderOptions: RenderOptions = options ?? {};
    await this.rendererEngine.render(
      cardData,
      containerElement as HTMLElement,
      renderOptions
    );
  }

  // ==================== 主题功能 ====================

  /**
   * 设置主题
   * @param themeId 主题ID
   */
  setTheme(themeId: string): void {
    this.themeManager.apply(themeId);
  }

  /**
   * 获取当前主题
   * @returns 当前主题ID
   */
  getCurrentTheme(): string | null {
    return this.themeManager.getCurrentTheme();
  }

  /**
   * 列出所有主题
   * @returns 主题列表
   */
  listThemes() {
    return this.themeManager.listThemes();
  }

  // ==================== 多语言功能 ====================

  /**
   * 设置语言
   * @param language 语言代码
   */
  setLanguage(language: SupportedLanguage): void {
    this.i18nManager.setLanguage(language);
  }

  /**
   * 获取当前语言
   * @returns 语言代码
   */
  getLanguage(): SupportedLanguage {
    return this.i18nManager.getLanguage();
  }

  // ==================== 事件功能 ====================

  /**
   * 监听事件
   * @param event 事件名称
   * @param listener 监听器函数
   * @returns 订阅ID
   */
  on(event: string, listener: (...args: unknown[]) => void): string {
    return this.eventBus.on(event, listener);
  }

  /**
   * 取消事件监听
   * @param subscriptionId 订阅ID
   */
  off(subscriptionId: string): void {
    this.eventBus.off(subscriptionId);
  }

  // ==================== 配置功能 ====================

  /**
   * 获取配置
   * @param key 配置键
   * @param defaultValue 默认值
   * @returns 配置值
   */
  getConfig<T = unknown>(key: string, defaultValue?: T): T {
    return this.configManager.get(key, defaultValue);
  }

  /**
   * 设置配置
   * @param key 配置键
   * @param value 配置值
   */
  async setConfig(key: string, value: unknown): Promise<void> {
    await this.configManager.set(key, value);
  }

  // ==================== 平台信息 ====================

  /**
   * 获取SDK版本
   * @returns 版本号
   */
  getVersion(): string {
    return SDK_VERSION;
  }

  /**
   * 获取平台信息
   * @returns 平台类型
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * 检查是否已初始化
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ==================== 调试功能 ====================

  /**
   * 启用调试模式
   * @param enabled 是否启用
   */
  enableDebug(enabled: boolean): void {
    if (enabled) {
      this.logger.setLevel(LogLevel.Debug);
    } else {
      this.logger.setLevel(LogLevel.Info);
    }
  }

  /**
   * 获取调试信息
   * @returns 调试信息对象
   */
  getDebugInfo() {
    return {
      version: SDK_VERSION,
      platform: this.platform,
      initialized: this.initialized,
      eventListeners: this.eventBus.listenerCount(),
      cacheStats: this.fileAPI.getCacheStats(),
      currentTheme: this.themeManager.getCurrentTheme(),
      currentLanguage: this.i18nManager.getLanguage(),
      logStats: this.logger.getStats(),
    };
  }
}
