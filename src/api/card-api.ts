/**
 * 卡片 API
 * @module api/card-api
 */

import { CoreConnector, FileError, ErrorCodes } from '../core';
import { Logger } from '../logger';
import { ConfigManager } from '../config';
import { EventBus } from '../event';
import { Card, CardMetadata, CardStructure, QueryCardOptions, UpdateCardOptions as CardUpdateOptions } from '../types/card';
import { ChipsId, Tag } from '../types/base';
import { FileAPI } from './file-api';
import { LoadOptions, SaveOptions } from './file-types';
import { generateId } from '../utils/id';

/**
 * 卡片创建选项
 */
export interface CreateCardOptions {
  /** 卡片名称 */
  name: string;
  /** 卡片类型 */
  type?: string;
  /** 标签 */
  tags?: Tag[];
  /** 主题 ID */
  theme?: string;
  /** 描述 */
  description?: string;
}

/**
 * 卡片查询选项
 */
export interface CardQueryOptions extends QueryCardOptions {
  /** 排序方式 */
  sortBy?: 'name' | 'created' | 'modified';
  /** 排序顺序 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 卡片更新选项
 */
export interface UpdateCardOptions extends CardUpdateOptions {
  /** 合并标签 */
  mergeTags?: boolean;
}

/**
 * 卡片 API
 *
 * @example
 * ```ts
 * const cardApi = new CardAPI(connector, fileApi, logger, config, eventBus);
 *
 * // 创建卡片
 * const card = await cardApi.create({ name: 'My Card' });
 *
 * // 获取卡片
 * const loaded = await cardApi.get(card.id);
 *
 * // 更新卡片
 * await cardApi.update(card.id, { name: 'Updated Name' });
 * ```
 */
export class CardAPI {
  private _connector: CoreConnector;
  private _fileApi: FileAPI;
  private _logger: Logger;
  private _eventBus: EventBus;
  private _cardMap = new Map<ChipsId, string>(); // ID -> path 映射

  /**
   * 创建卡片 API
   * @param connector - Core 连接器
   * @param fileApi - 文件 API
   * @param logger - 日志实例
   * @param config - 配置管理器
   * @param eventBus - 事件总线
   */
  constructor(
    connector: CoreConnector,
    fileApi: FileAPI,
    logger: Logger,
    _config: ConfigManager,
    eventBus: EventBus
  ) {
    this._connector = connector;
    this._fileApi = fileApi;
    this._logger = logger.createChild('CardAPI');
    this._eventBus = eventBus;
  }

  /**
   * 创建新卡片
   * @param options - 创建选项
   */
  async create(options: CreateCardOptions): Promise<Card> {
    this._logger.debug('Creating card', { name: options.name });

    const now = new Date().toISOString();
    const id = generateId();

    const metadata: CardMetadata = {
      chip_standards_version: '1.0.0',
      card_id: id,
      name: options.name,
      created_at: now,
      modified_at: now,
      theme: options.theme,
      tags: options.tags || [],
      description: options.description || '',
      author: '',
      type: options.type || 'basic',
    };

    const structure: CardStructure = {
      structure: [],
      manifest: {
        card_count: 0,
        resource_count: 0,
        resources: [],
      },
    };

    const card: Card = {
      id,
      metadata,
      structure,
      resources: new Map(),
    };

    // 发出创建事件
    await this._eventBus.emit('card:created', { card });

    this._logger.info('Card created', { id, name: options.name });
    return card;
  }

  /**
   * 获取卡片（按 ID 或路径）
   * @param idOrPath - 卡片 ID 或文件路径
   * @param options - 加载选项
   */
  async get(idOrPath: string, options?: LoadOptions): Promise<Card> {
    // 判断是 ID 还是路径
    const isPath = idOrPath.includes('/') || idOrPath.includes('\\');

    if (isPath) {
      return this._fileApi.loadCard(idOrPath, options);
    }

    // 通过 ID 查找路径
    const path = this._cardMap.get(idOrPath);
    if (path) {
      return this._fileApi.loadCard(path, options);
    }

    // 通过 Core 查找
    const response = await this._connector.request<{ path: string }>({
      service: 'card',
      method: 'findById',
      payload: { id: idOrPath },
    });

    if (!response.success || !response.data) {
      throw new FileError(ErrorCodes.FILE_NOT_FOUND, 'Card not found', { id: idOrPath });
    }

    this._cardMap.set(idOrPath, response.data.path);
    return this._fileApi.loadCard(response.data.path, options);
  }

  /**
   * 保存卡片
   * @param path - 文件路径
   * @param card - 卡片对象
   * @param options - 保存选项
   */
  async save(path: string, card: Card, options?: SaveOptions): Promise<void> {
    // 更新修改时间
    card.metadata.modified_at = new Date().toISOString();

    await this._fileApi.saveCard(path, card, options);

    // 更新映射
    this._cardMap.set(card.id, path);

    // 发出保存事件
    await this._eventBus.emit('card:saved', { id: card.id, path });
  }

  /**
   * 更新卡片
   * @param idOrPath - 卡片 ID 或路径
   * @param updates - 更新内容
   */
  async update(idOrPath: string, updates: UpdateCardOptions): Promise<Card> {
    const card = await this.get(idOrPath);

    // 应用更新
    if (updates.name !== undefined) {
      card.metadata.name = updates.name;
    }

    if (updates.theme !== undefined) {
      card.metadata.theme = updates.theme;
    }

    if (updates.description !== undefined) {
      card.metadata.description = updates.description;
    }

    if (updates.tags !== undefined) {
      if (updates.mergeTags && card.metadata.tags) {
        const existingTags = new Set(card.metadata.tags);
        for (const tag of updates.tags) {
          existingTags.add(tag);
        }
        card.metadata.tags = Array.from(existingTags);
      } else {
        card.metadata.tags = updates.tags;
      }
    }

    card.metadata.modified_at = new Date().toISOString();

    // 发出更新事件
    await this._eventBus.emit('card:updated', { id: card.id, updates });

    return card;
  }

  /**
   * 删除卡片
   * @param idOrPath - 卡片 ID 或路径
   */
  async delete(idOrPath: string): Promise<void> {
    const isPath = idOrPath.includes('/') || idOrPath.includes('\\');
    let path: string;
    let id: ChipsId;

    if (isPath) {
      path = idOrPath;
      const card = await this._fileApi.loadCard(path);
      id = card.id;
    } else {
      id = idOrPath;
      path = this._cardMap.get(id) || '';
      if (!path) {
        const response = await this._connector.request<{ path: string }>({
          service: 'card',
          method: 'findById',
          payload: { id },
        });
        if (!response.success || !response.data) {
          throw new FileError(ErrorCodes.FILE_NOT_FOUND, 'Card not found', { id });
        }
        path = response.data.path;
      }
    }

    await this._fileApi.delete(path);
    this._cardMap.delete(id);

    // 发出删除事件
    await this._eventBus.emit('card:deleted', { id, path });

    this._logger.info('Card deleted', { id, path });
  }

  /**
   * 查询卡片
   * @param options - 查询选项
   */
  async query(options?: CardQueryOptions): Promise<Card[]> {
    const response = await this._connector.request<{ cards: { id: string; path: string }[] }>({
      service: 'card',
      method: 'query',
      payload: options ? { ...options } : {},
    });

    if (!response.success || !response.data) {
      return [];
    }

    const cards: Card[] = [];
    for (const item of response.data.cards) {
      try {
        const card = await this._fileApi.loadCard(item.path, { cache: true });
        cards.push(card);
        this._cardMap.set(item.id, item.path);
      } catch (error) {
        this._logger.warn('Failed to load card', { path: item.path, error });
      }
    }

    return cards;
  }

  /**
   * 复制卡片
   * @param idOrPath - 源卡片 ID 或路径
   * @param destPath - 目标路径
   */
  async copy(idOrPath: string, destPath: string): Promise<Card> {
    const sourceCard = await this.get(idOrPath);

    // 创建新卡片（新 ID）
    const newId = generateId();
    const now = new Date().toISOString();

    const newCard: Card = {
      id: newId,
      metadata: {
        ...sourceCard.metadata,
        card_id: newId,
        created_at: now,
        modified_at: now,
      },
      structure: { ...sourceCard.structure },
      resources: new Map(sourceCard.resources),
    };

    await this._fileApi.saveCard(destPath, newCard, { overwrite: false });
    this._cardMap.set(newCard.id, destPath);

    await this._eventBus.emit('card:copied', {
      sourceId: sourceCard.id,
      newId: newCard.id,
    });

    return newCard;
  }

  /**
   * 添加标签
   * @param idOrPath - 卡片 ID 或路径
   * @param tags - 要添加的标签
   */
  async addTags(idOrPath: string, tags: Tag[]): Promise<Card> {
    return this.update(idOrPath, { tags, mergeTags: true });
  }

  /**
   * 移除标签
   * @param idOrPath - 卡片 ID 或路径
   * @param tags - 要移除的标签
   */
  async removeTags(idOrPath: string, tags: Tag[]): Promise<Card> {
    const card = await this.get(idOrPath);
    const tagsToRemove = new Set(tags);
    const currentTags = card.metadata.tags || [];
    card.metadata.tags = currentTags.filter((t) => !tagsToRemove.has(t));
    card.metadata.modified_at = new Date().toISOString();

    await this._eventBus.emit('card:updated', { id: card.id, updates: { tags: card.metadata.tags } });
    return card;
  }

  /**
   * 验证卡片
   * @param card - 卡片对象
   */
  validate(card: Card): boolean {
    return this._fileApi.validateCard(card).valid;
  }

  /**
   * 获取所有缓存的卡片 ID
   */
  getCachedIds(): ChipsId[] {
    return Array.from(this._cardMap.keys());
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this._cardMap.clear();
    this._fileApi.clearCache();
  }

  /**
   * 导出卡片为指定格式
   * 
   * 统一的导出接口，支持 4 种格式：
   * - 'card': 导出为 .card 文件（通过 CardPacker）
   * - 'html': 导出为 HTML 网页（通过 CardtoHTMLPlugin）
   * - 'pdf': 导出为 PDF 文档（通过 CardtoPDFPlugin）
   * - 'image': 导出为图片（通过 CardtoImagePlugin）
   * 
   * @param cardId - 卡片 ID
   * @param format - 导出格式
   * @param options - 导出选项
   * @returns 转换结果
   * 
   * @example
   * ```typescript
   * // 导出为 .card 文件
   * const result = await cardApi.export('abc123', 'card', {
   *   outputPath: '/exports/my-card.card'
   * });
   * 
   * // 导出为 HTML
   * const htmlResult = await cardApi.export('abc123', 'html', {
   *   outputPath: '/exports/my-card-html',
   *   includeAssets: true
   * });
   * ```
   */
  async export(
    cardId: ChipsId,
    format: 'card' | 'html' | 'pdf' | 'image',
    options: {
      outputPath: string;
      [key: string]: any;
    }
  ): Promise<any> {
    this._logger.info('Exporting card', { cardId, format, outputPath: options.outputPath });

    try {
      // 导入 ConversionAPI（避免循环依赖）
      const { ConversionAPI } = await import('./conversion-api');
      const conversionApi = new ConversionAPI(
        this._connector,
        this._logger,
        this._config as any
      );

      // 根据格式路由到相应的转换方法
      switch (format) {
        case 'card':
          return await conversionApi.exportAsCard(cardId, {
            outputPath: options.outputPath,
            compress: options.compress,
            includeResources: options.includeResources,
            onProgress: options.onProgress,
          });

        case 'html':
          return await conversionApi.convertToHTML(
            {
              type: 'path',
              path: await this._getCardPath(cardId),
              fileType: 'card',
            },
            {
              outputPath: options.outputPath,
              includeAssets: options.includeAssets,
              themeId: options.themeId,
              assetStrategy: options.assetStrategy,
              onProgress: options.onProgress,
            }
          );

        case 'pdf':
          return await conversionApi.convertToPDF(
            {
              type: 'path',
              path: await this._getCardPath(cardId),
              fileType: 'card',
            },
            {
              outputPath: options.outputPath,
              pageFormat: options.pageFormat,
              orientation: options.orientation,
              margin: options.margin,
              themeId: options.themeId,
              onProgress: options.onProgress,
            }
          );

        case 'image':
          return await conversionApi.convertToImage(
            {
              type: 'path',
              path: await this._getCardPath(cardId),
              fileType: 'card',
            },
            {
              outputPath: options.outputPath,
              format: options.format,
              quality: options.quality,
              scale: options.scale,
              width: options.width,
              height: options.height,
              transparent: options.transparent,
              themeId: options.themeId,
              onProgress: options.onProgress,
            }
          );

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this._logger.error('Export failed', { cardId, format, error });
      throw error;
    }
  }

  /**
   * 获取卡片文件路径
   * @private
   */
  private async _getCardPath(cardId: ChipsId): Promise<string> {
    const cachedPath = this._cardMap.get(cardId);
    if (cachedPath) {
      return cachedPath;
    }

    // 通过 FileAPI 查找卡片路径
    const card = await this.get(cardId);
    const cardPath = this._cardMap.get(card.id);
    if (!cardPath) {
      throw new Error(`Card path not found for ID: ${cardId}`);
    }

    return cardPath;
  }
}
