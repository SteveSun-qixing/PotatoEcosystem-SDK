/**
 * 资源管理器
 *
 * 统一的资源管理接口
 */

import { ResourceLoader } from './ResourceLoader';
import { ImageProcessor } from './ImageProcessor';
import { MediaMetadataExtractor } from './MediaMetadata';
import { CacheManager } from '../core/cache';
import { Logger } from '../core/logger';

/**
 * 资源信息
 */
export interface ResourceInfo {
  uri: string;
  type: string;
  size: number;
  cached: boolean;
  metadata?: unknown;
}

/**
 * 资源管理器类
 */
export class ResourceManager {
  private loader: ResourceLoader;
  private imageProcessor: ImageProcessor;
  private mediaMetadata: MediaMetadataExtractor;
  private cache: CacheManager<ArrayBuffer>;
  private logger: Logger;
  private resourceInfo: Map<string, ResourceInfo>;

  constructor(logger: Logger, adapter?: import('../types').IPlatformAdapter) {
    this.loader = new ResourceLoader(logger, adapter);
    this.imageProcessor = new ImageProcessor(logger);
    this.mediaMetadata = new MediaMetadataExtractor(logger);
    this.cache = new CacheManager<ArrayBuffer>();
    this.logger = logger;
    this.resourceInfo = new Map();
  }

  /**
   * 设置平台适配器
   * @param adapter 平台适配器
   */
  setAdapter(adapter: import('../types').IPlatformAdapter): void {
    this.loader.setAdapter(adapter);
  }

  /**
   * 加载资源
   * @param uri 资源URI
   * @param useCache 是否使用缓存
   * @returns 资源数据
   */
  async loadResource(uri: string, useCache = true): Promise<ArrayBuffer> {
    this.logger.debug('Loading resource', { uri });

    // 检查缓存
    if (useCache) {
      const cached = this.cache.get(uri);
      if (cached) {
        this.logger.debug('Resource loaded from cache', { uri });
        return cached;
      }
    }

    // 加载资源
    const result = await this.loader.load(uri);

    // 缓存
    if (useCache) {
      this.cache.set(uri, result.data);
    }

    // 记录资源信息
    this.resourceInfo.set(uri, {
      uri,
      type: result.contentType ?? this.detectResourceType(uri),
      size: result.size,
      cached: result.cached,
    });

    this.logger.info('Resource loaded', { uri, size: result.size });

    return result.data;
  }

  /**
   * 批量加载资源
   * @param uris 资源URI数组
   * @returns 资源数据数组
   */
  async loadResources(uris: string[]): Promise<ArrayBuffer[]> {
    const results = await this.loader.loadBatch(uris);
    return results.map((r) => r.data);
  }

  /**
   * 预加载资源
   * @param uris 资源URI数组
   */
  async preloadResources(uris: string[]): Promise<void> {
    await this.loader.preloadBatch(uris);
  }

  /**
   * 获取图片处理器
   * @returns 图片处理器
   */
  getImageProcessor(): ImageProcessor {
    return this.imageProcessor;
  }

  /**
   * 获取媒体元数据提取器
   * @returns 媒体元数据提取器
   */
  getMediaMetadata(): MediaMetadataExtractor {
    return this.mediaMetadata;
  }

  /**
   * 获取资源信息
   * @param uri 资源URI
   * @returns 资源信息
   */
  getResourceInfo(uri: string): ResourceInfo | undefined {
    return this.resourceInfo.get(uri);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Resource cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * 检测资源类型
   * @param uri 资源URI
   * @returns 资源类型
   */
  private detectResourceType(uri: string): string {
    const ext = uri.split('.').pop()?.toLowerCase();

    const typeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
    };

    return ext
      ? (typeMap[ext] ?? 'application/octet-stream')
      : 'application/octet-stream';
  }
}
