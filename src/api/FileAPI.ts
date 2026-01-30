/**
 * 文件操作API
 *
 * 提供卡片和箱子文件的高层操作接口
 */

import type { Card, Box } from '../types';
import { ParserEngine } from '../parser';
import type { IPlatformAdapter } from '../types';
import { FileNotFoundError } from '../core/error';
import { CacheManager } from '../core/cache';
import { Logger } from '../core/logger';
import { normalizePath } from '../utils/file';

/**
 * 加载选项
 */
export interface LoadOptions {
  cache?: boolean;
  validate?: boolean;
}

/**
 * 保存选项
 */
export interface SaveOptions {
  overwrite?: boolean;
  createDirectories?: boolean;
}

/**
 * 文件API类
 */
export class FileAPI {
  private adapter: IPlatformAdapter;
  private cache: CacheManager<Card | Box>;
  private logger: Logger;

  constructor(adapter: IPlatformAdapter, logger: Logger) {
    this.adapter = adapter;
    this.cache = new CacheManager();
    this.logger = logger;
  }

  /**
   * 加载卡片文件
   * @param path 文件路径或URL
   * @param options 加载选项
   * @returns 卡片对象
   */
  async loadCard(
    path: string | File | Blob,
    options: LoadOptions = {}
  ): Promise<Card> {
    this.logger.debug('Loading card', { path });

    try {
      // 处理不同类型的输入
      let data: ArrayBuffer;
      let cacheKey: string | null = null;

      if (typeof path === 'string') {
        cacheKey = normalizePath(path);

        // 检查缓存
        if (options.cache !== false) {
          const cached = this.cache.get(cacheKey);
          if (cached && 'metadata' in cached) {
            this.logger.debug('Card loaded from cache', { path });
            return cached as Card;
          }
        }

        // 读取文件
        data = await this.adapter.readFile(path);
      } else if (path instanceof File) {
        data = await path.arrayBuffer();
      } else {
        data = await path.arrayBuffer();
      }

      // 解析卡片
      const card = await ParserEngine.parseCard(data);

      // 缓存结果
      if (cacheKey && options.cache !== false) {
        this.cache.set(cacheKey, card);
      }

      this.logger.info('Card loaded successfully', {
        cardId: card.metadata.card_id,
        path: typeof path === 'string' ? path : 'blob',
      });

      return card;
    } catch (error) {
      this.logger.error('Failed to load card', error as Error, { path });
      throw error;
    }
  }

  /**
   * 批量加载卡片
   * @param paths 文件路径数组
   * @param options 加载选项
   * @returns 卡片对象数组
   */
  async loadCards(paths: string[], options: LoadOptions = {}): Promise<Card[]> {
    const promises = paths.map((path) => this.loadCard(path, options));
    return Promise.all(promises);
  }

  /**
   * 加载箱子文件
   * @param path 文件路径或URL
   * @param options 加载选项
   * @returns 箱子对象
   */
  async loadBox(
    path: string | File | Blob,
    options: LoadOptions = {}
  ): Promise<Box> {
    this.logger.debug('Loading box', { path });

    try {
      // 处理不同类型的输入
      let data: ArrayBuffer;
      let cacheKey: string | null = null;

      if (typeof path === 'string') {
        cacheKey = normalizePath(path);

        // 检查缓存
        if (options.cache !== false) {
          const cached = this.cache.get(cacheKey);
          if (cached && 'type' in cached) {
            this.logger.debug('Box loaded from cache', { path });
            return cached;
          }
        }

        // 读取文件
        data = await this.adapter.readFile(path);
      } else if (path instanceof File) {
        data = await path.arrayBuffer();
      } else {
        data = await path.arrayBuffer();
      }

      // 解析箱子
      const box = await ParserEngine.parseBox(data);

      // 缓存结果
      if (cacheKey && options.cache !== false) {
        this.cache.set(cacheKey, box);
      }

      this.logger.info('Box loaded successfully', {
        boxId: box.metadata.box_id,
        path: typeof path === 'string' ? path : 'blob',
      });

      return box;
    } catch (error) {
      this.logger.error('Failed to load box', error as Error, { path });
      throw error;
    }
  }

  /**
   * 保存卡片文件
   * @param card 卡片对象
   * @param path 保存路径
   * @param options 保存选项
   */
  async saveCard(
    card: Card,
    path: string,
    options: SaveOptions = {}
  ): Promise<void> {
    this.logger.debug('Saving card', { path, cardId: card.metadata.card_id });

    try {
      // 检查文件是否存在
      if (!options.overwrite) {
        const exists = await this.adapter.exists(path);
        if (exists) {
          throw new Error(`File already exists: ${path}`);
        }
      }

      // 序列化卡片
      const data = await ParserEngine.serializeCard(card);

      // 写入文件
      await this.adapter.writeFile(path, data);

      // 更新缓存
      this.cache.set(normalizePath(path), card);

      this.logger.info('Card saved successfully', {
        cardId: card.metadata.card_id,
        path,
      });
    } catch (error) {
      this.logger.error('Failed to save card', error as Error, { path });
      throw error;
    }
  }

  /**
   * 保存箱子文件
   * @param box 箱子对象
   * @param path 保存路径
   * @param options 保存选项
   */
  async saveBox(
    box: Box,
    path: string,
    options: SaveOptions = {}
  ): Promise<void> {
    this.logger.debug('Saving box', { path, boxId: box.metadata.box_id });

    try {
      // 检查文件是否存在
      if (!options.overwrite) {
        const exists = await this.adapter.exists(path);
        if (exists) {
          throw new Error(`File already exists: ${path}`);
        }
      }

      // 序列化箱子
      const data = await ParserEngine.serializeBox(box);

      // 写入文件
      await this.adapter.writeFile(path, data);

      // 更新缓存
      this.cache.set(normalizePath(path), box);

      this.logger.info('Box saved successfully', {
        boxId: box.metadata.box_id,
        path,
      });
    } catch (error) {
      this.logger.error('Failed to save box', error as Error, { path });
      throw error;
    }
  }

  /**
   * 保存卡片为Blob
   * @param card 卡片对象
   * @returns Blob对象
   */
  async saveCardAsBlob(card: Card): Promise<Blob> {
    const data = await ParserEngine.serializeCard(card);
    return new Blob([data], { type: 'application/x-card' });
  }

  /**
   * 保存箱子为Blob
   * @param box 箱子对象
   * @returns Blob对象
   */
  async saveBoxAsBlob(box: Box): Promise<Blob> {
    const data = await ParserEngine.serializeBox(box);
    return new Blob([data], { type: 'application/x-box' });
  }

  /**
   * 检查文件是否存在
   * @param path 文件路径
   * @returns 是否存在
   */
  async exists(path: string): Promise<boolean> {
    return this.adapter.exists(path);
  }

  /**
   * 删除文件
   * @param path 文件路径
   */
  async deleteFile(path: string): Promise<void> {
    const exists = await this.adapter.exists(path);
    if (!exists) {
      throw new FileNotFoundError(path);
    }

    await this.adapter.deleteFile(path);

    // 清除缓存
    this.cache.delete(normalizePath(path));

    this.logger.info('File deleted', { path });
  }

  /**
   * 列出目录中的文件
   * @param dirPath 目录路径
   * @returns 文件路径数组
   */
  async listFiles(dirPath: string): Promise<string[]> {
    return this.adapter.listFiles(dirPath);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('File cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}
