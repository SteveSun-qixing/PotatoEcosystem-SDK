/**
 * 资源管理器
 * @module resource/manager
 */

import { CoreConnector, ResourceError, ErrorCodes } from '../core';
import { Logger } from '../logger';
import { EventBus } from '../event';
import {
  ResourceType,
  ResourceInfo,
  CacheEntry,
  ResourceLoadOptions,
  ResourceManagerOptions,
  ResourceUploadOptions,
  PreloadOptions,
} from './types';

/**
 * 默认选项
 */
const DEFAULT_OPTIONS: Required<ResourceManagerOptions> = {
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  maxCacheCount: 500,
  cacheTTL: 30 * 60 * 1000, // 30 分钟
  autoCleanup: true,
};

/**
 * MIME 类型映射
 */
const MIME_TYPE_MAP: Record<string, ResourceType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'font/woff': 'font',
  'font/woff2': 'font',
  'application/pdf': 'document',
};

/**
 * 资源管理器
 *
 * @example
 * ```ts
 * const resourceManager = new ResourceManager(connector, logger, eventBus);
 *
 * // 加载资源
 * const blob = await resourceManager.load('/path/to/image.png');
 *
 * // 获取对象 URL
 * const url = resourceManager.getObjectUrl('/path/to/image.png');
 * ```
 */
export class ResourceManager {
  private _connector: CoreConnector;
  private _cache = new Map<string, CacheEntry>();
  private _currentCacheSize = 0;
  private _logger: Logger;
  private _eventBus: EventBus;
  private _options: Required<ResourceManagerOptions>;
  private _cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 创建资源管理器
   * @param connector - Core 连接器
   * @param logger - 日志实例
   * @param eventBus - 事件总线
   * @param options - 配置选项
   */
  constructor(
    connector: CoreConnector,
    logger: Logger,
    eventBus: EventBus,
    options?: ResourceManagerOptions
  ) {
    this._connector = connector;
    this._logger = logger.createChild('ResourceManager');
    this._eventBus = eventBus;
    this._options = { ...DEFAULT_OPTIONS, ...options };

    // 启动自动清理
    if (this._options.autoCleanup) {
      this._startCleanupTimer();
    }
  }

  /**
   * 加载资源
   * @param path - 资源路径
   * @param options - 加载选项
   */
  async load(path: string, options?: ResourceLoadOptions): Promise<Blob> {
    const opts = { cache: true, priority: 'normal', timeout: 30000, ...options };

    // 检查缓存
    if (opts.cache && this._cache.has(path)) {
      const entry = this._cache.get(path)!;
      entry.lastAccess = Date.now();
      entry.refCount++;
      this._logger.debug('Resource loaded from cache', { path });
      return entry.data instanceof Blob ? entry.data : new Blob([entry.data]);
    }

    this._logger.debug('Loading resource', { path });

    // 通过 Core 加载
    const response = await this._connector.request<{ data: ArrayBuffer; info: ResourceInfo }>({
      service: 'resource',
      method: 'load',
      payload: { path },
      timeout: opts.timeout,
    });

    if (!response.success || !response.data) {
      throw new ResourceError(
        ErrorCodes.RES_NOT_FOUND,
        `Resource not found: ${path}`,
        { path }
      );
    }

    const blob = new Blob([response.data.data], { type: response.data.info.mimeType });

    // 添加到缓存
    if (opts.cache) {
      await this._addToCache(path, response.data.info, blob);
    }

    this._logger.debug('Resource loaded', { path, size: blob.size });
    return blob;
  }

  /**
   * 获取资源信息
   * @param path - 资源路径
   */
  async getInfo(path: string): Promise<ResourceInfo> {
    // 检查缓存
    if (this._cache.has(path)) {
      return this._cache.get(path)!.info;
    }

    const response = await this._connector.request<ResourceInfo>({
      service: 'resource',
      method: 'info',
      payload: { path },
    });

    if (!response.success || !response.data) {
      throw new ResourceError(
        ErrorCodes.RES_NOT_FOUND,
        `Resource not found: ${path}`,
        { path }
      );
    }

    return response.data;
  }

  /**
   * 获取对象 URL
   * @param path - 资源路径
   */
  getObjectUrl(path: string): string | undefined {
    const entry = this._cache.get(path);
    if (!entry) {
      return undefined;
    }

    // 创建对象 URL（如果还没有）
    if (!entry.objectUrl) {
      const blob = entry.data instanceof Blob ? entry.data : new Blob([entry.data]);
      entry.objectUrl = URL.createObjectURL(blob);
    }

    entry.lastAccess = Date.now();
    entry.refCount++;
    return entry.objectUrl;
  }

  /**
   * 创建对象 URL
   * @param path - 资源路径
   */
  async createObjectUrl(path: string): Promise<string> {
    // 先加载资源
    await this.load(path, { cache: true });

    const url = this.getObjectUrl(path);
    if (!url) {
      throw new ResourceError(
        ErrorCodes.RES_NOT_FOUND,
        `Failed to create object URL: ${path}`
      );
    }

    return url;
  }

  /**
   * 释放对象 URL
   * @param path - 资源路径
   */
  releaseObjectUrl(path: string): void {
    const entry = this._cache.get(path);
    if (!entry) {
      return;
    }

    entry.refCount--;

    if (entry.refCount <= 0 && entry.objectUrl) {
      URL.revokeObjectURL(entry.objectUrl);
      entry.objectUrl = undefined;
    }
  }

  /**
   * 上传资源
   * @param file - 文件
   * @param options - 上传选项
   */
  async upload(file: File, options: ResourceUploadOptions): Promise<ResourceInfo> {
    this._logger.debug('Uploading resource', { name: file.name, path: options.path });

    const arrayBuffer = await file.arrayBuffer();

    const response = await this._connector.request<ResourceInfo>({
      service: 'resource',
      method: 'upload',
      payload: {
        path: options.path,
        data: arrayBuffer,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        overwrite: options.overwrite ?? false,
      },
    });

    if (!response.success || !response.data) {
      throw new ResourceError(
        ErrorCodes.RES_NOT_FOUND,
        `Failed to upload resource`,
        { path: options.path }
      );
    }

    this._logger.info('Resource uploaded', { path: options.path });
    await this._eventBus.emit('resource:uploaded', { path: options.path, info: response.data });

    return response.data;
  }

  /**
   * 删除资源
   * @param path - 资源路径
   */
  async delete(path: string): Promise<void> {
    // 从缓存中移除
    this._removeFromCache(path);

    const response = await this._connector.request({
      service: 'resource',
      method: 'delete',
      payload: { path },
    });

    if (!response.success) {
      throw new ResourceError(
        ErrorCodes.RES_NOT_FOUND,
        `Failed to delete resource: ${path}`
      );
    }

    this._logger.info('Resource deleted', { path });
    await this._eventBus.emit('resource:deleted', { path });
  }

  /**
   * 预加载资源
   * @param paths - 资源路径列表
   * @param options - 预加载选项
   */
  async preload(paths: string[], options?: PreloadOptions): Promise<void> {
    const opts: Required<PreloadOptions> = { priority: 'normal', concurrency: 3, ...options };

    this._logger.debug('Preloading resources', { count: paths.length });

    // 分批并发加载
    for (let i = 0; i < paths.length; i += opts.concurrency) {
      const batch = paths.slice(i, i + opts.concurrency);
      await Promise.all(
        batch.map((path) =>
          this.load(path, { cache: true, priority: opts.priority }).catch((error) => {
            this._logger.warn('Preload failed', { path, error: String(error) });
          })
        )
      );
    }

    this._logger.debug('Preload complete');
  }

  /**
   * 检查资源是否已缓存
   * @param path - 资源路径
   */
  isCached(path: string): boolean {
    return this._cache.has(path);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    // 释放所有对象 URL
    for (const entry of this._cache.values()) {
      if (entry.objectUrl) {
        URL.revokeObjectURL(entry.objectUrl);
      }
    }

    this._cache.clear();
    this._currentCacheSize = 0;
    this._logger.debug('Resource cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { count: number; size: number; maxSize: number } {
    return {
      count: this._cache.size,
      size: this._currentCacheSize,
      maxSize: this._options.maxCacheSize,
    };
  }

  /**
   * 销毁资源管理器
   */
  destroy(): void {
    this._stopCleanupTimer();
    this.clearCache();
  }

  /**
   * 获取资源类型
   * @param mimeType - MIME 类型
   */
  getResourceType(mimeType: string): ResourceType {
    return MIME_TYPE_MAP[mimeType] || 'other';
  }

  // ========== 私有方法 ==========

  /**
   * 添加到缓存
   */
  private async _addToCache(path: string, info: ResourceInfo, data: Blob): Promise<void> {
    // 检查是否需要清理
    while (
      this._currentCacheSize + info.size > this._options.maxCacheSize ||
      this._cache.size >= this._options.maxCacheCount
    ) {
      this._evictOldest();
    }

    const entry: CacheEntry = {
      info,
      data,
      state: 'loaded',
      lastAccess: Date.now(),
      refCount: 1,
    };

    this._cache.set(path, entry);
    this._currentCacheSize += info.size;
  }

  /**
   * 从缓存中移除
   */
  private _removeFromCache(path: string): void {
    const entry = this._cache.get(path);
    if (!entry) {
      return;
    }

    if (entry.objectUrl) {
      URL.revokeObjectURL(entry.objectUrl);
    }

    this._currentCacheSize -= entry.info.size;
    this._cache.delete(path);
  }

  /**
   * 驱逐最旧的缓存
   */
  private _evictOldest(): void {
    let oldestPath: string | null = null;
    let oldestTime = Date.now();

    for (const [path, entry] of this._cache) {
      if (entry.refCount <= 0 && entry.lastAccess < oldestTime) {
        oldestPath = path;
        oldestTime = entry.lastAccess;
      }
    }

    if (oldestPath) {
      this._removeFromCache(oldestPath);
      this._logger.debug('Cache evicted', { path: oldestPath });
    }
  }

  /**
   * 启动清理定时器
   */
  private _startCleanupTimer(): void {
    this._cleanupTimer = setInterval(() => {
      this._cleanupExpired();
    }, 60000); // 每分钟检查一次
  }

  /**
   * 停止清理定时器
   */
  private _stopCleanupTimer(): void {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }

  /**
   * 清理过期缓存
   */
  private _cleanupExpired(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [path, entry] of this._cache) {
      if (entry.refCount <= 0 && now - entry.lastAccess > this._options.cacheTTL) {
        expired.push(path);
      }
    }

    for (const path of expired) {
      this._removeFromCache(path);
    }

    if (expired.length > 0) {
      this._logger.debug('Expired cache cleaned', { count: expired.length });
    }
  }
}
