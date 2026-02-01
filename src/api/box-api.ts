/**
 * 箱子 API
 * @module api/box-api
 */

import { CoreConnector, FileError, ErrorCodes } from '../core';
import { Logger } from '../logger';
import { ConfigManager } from '../config';
import { EventBus } from '../event';
import { Box, BoxMetadata, BoxStructure, BoxContent, BoxCardInfo, QueryBoxOptions } from '../types/box';
import { ChipsId, Tag, Timestamp, LocationType } from '../types/base';
import { FileAPI } from './file-api';
import { LoadOptions, SaveOptions } from './file-types';
import { generateId } from '../utils/id';

/**
 * 箱子创建选项
 */
export interface CreateBoxOptions {
  /** 箱子名称 */
  name: string;
  /** 布局类型 */
  layout?: string;
  /** 标签 */
  tags?: Tag[];
  /** 描述 */
  description?: string;
}

/**
 * 箱子查询选项
 */
export interface BoxQueryOptions extends QueryBoxOptions {
  /** 修改时间范围 */
  modifiedAfter?: Timestamp;
  modifiedBefore?: Timestamp;
  /** 排序方式 */
  sortBy?: 'name' | 'created' | 'modified' | 'cardCount';
  /** 排序顺序 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 卡片位置信息
 */
export interface CardPosition {
  /** 卡片路径 */
  cardPath: string;
  /** 位置类型 */
  location?: LocationType;
  /** 显示顺序 */
  position?: number;
}

/**
 * 箱子 API
 *
 * @example
 * ```ts
 * const boxApi = new BoxAPI(connector, fileApi, logger, config, eventBus);
 *
 * // 创建箱子
 * const box = await boxApi.create({ name: 'My Box', layout: 'grid' });
 *
 * // 添加卡片
 * await boxApi.addCard(box.id, '/path/to/card.card');
 * ```
 */
export class BoxAPI {
  private _connector: CoreConnector;
  private _fileApi: FileAPI;
  private _logger: Logger;
  private _eventBus: EventBus;
  private _boxMap = new Map<ChipsId, string>(); // ID -> path 映射

  /**
   * 创建箱子 API
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
    this._logger = logger.createChild('BoxAPI');
    this._eventBus = eventBus;
  }

  /**
   * 创建新箱子
   * @param options - 创建选项
   */
  async create(options: CreateBoxOptions): Promise<Box> {
    this._logger.debug('Creating box', { name: options.name });

    const now = new Date().toISOString();
    const id = generateId();

    const metadata: BoxMetadata = {
      chip_standards_version: '1.0.0',
      box_id: id,
      name: options.name,
      created_at: now,
      modified_at: now,
      layout: options.layout || 'grid',
      tags: options.tags || [],
      description: options.description || '',
      author: '',
    };

    const structure: BoxStructure = {
      cards: [],
    };

    const content: BoxContent = {
      active_layout: metadata.layout,
      layout_configs: {},
    };

    const box: Box = {
      id,
      metadata,
      structure,
      content,
    };

    await this._eventBus.emit('box:created', { box });

    this._logger.info('Box created', { id, name: options.name });
    return box;
  }

  /**
   * 获取箱子
   * @param idOrPath - 箱子 ID 或文件路径
   * @param options - 加载选项
   */
  async get(idOrPath: string, options?: LoadOptions): Promise<Box> {
    const isPath = idOrPath.includes('/') || idOrPath.includes('\\');

    if (isPath) {
      return this._fileApi.loadBox(idOrPath, options);
    }

    const path = this._boxMap.get(idOrPath);
    if (path) {
      return this._fileApi.loadBox(path, options);
    }

    const response = await this._connector.request<{ path: string }>({
      service: 'box',
      method: 'findById',
      payload: { id: idOrPath },
    });

    if (!response.success || !response.data) {
      throw new FileError(ErrorCodes.FILE_NOT_FOUND, 'Box not found', { id: idOrPath });
    }

    this._boxMap.set(idOrPath, response.data.path);
    return this._fileApi.loadBox(response.data.path, options);
  }

  /**
   * 保存箱子
   * @param path - 文件路径
   * @param box - 箱子对象
   * @param options - 保存选项
   */
  async save(path: string, box: Box, options?: SaveOptions): Promise<void> {
    box.metadata.modified_at = new Date().toISOString();

    await this._fileApi.saveBox(path, box, options);
    this._boxMap.set(box.id, path);

    await this._eventBus.emit('box:saved', { id: box.id, path });
  }

  /**
   * 更新箱子
   * @param idOrPath - 箱子 ID 或路径
   * @param updates - 更新内容
   */
  async update(
    idOrPath: string,
    updates: Partial<Pick<BoxMetadata, 'name' | 'layout' | 'tags' | 'description'>>
  ): Promise<Box> {
    const box = await this.get(idOrPath);

    if (updates.name !== undefined) {
      box.metadata.name = updates.name;
    }

    if (updates.layout !== undefined) {
      box.metadata.layout = updates.layout;
      box.content.active_layout = updates.layout;
    }

    if (updates.tags !== undefined) {
      box.metadata.tags = updates.tags;
    }

    if (updates.description !== undefined) {
      box.metadata.description = updates.description;
    }

    box.metadata.modified_at = new Date().toISOString();

    await this._eventBus.emit('box:updated', { id: box.id, updates });

    return box;
  }

  /**
   * 删除箱子
   * @param idOrPath - 箱子 ID 或路径
   */
  async delete(idOrPath: string): Promise<void> {
    const isPath = idOrPath.includes('/') || idOrPath.includes('\\');
    let path: string;
    let id: ChipsId;

    if (isPath) {
      path = idOrPath;
      const box = await this._fileApi.loadBox(path);
      id = box.id;
    } else {
      id = idOrPath;
      path = this._boxMap.get(id) || '';
      if (!path) {
        const response = await this._connector.request<{ path: string }>({
          service: 'box',
          method: 'findById',
          payload: { id },
        });
        if (!response.success || !response.data) {
          throw new FileError(ErrorCodes.FILE_NOT_FOUND, 'Box not found', { id });
        }
        path = response.data.path;
      }
    }

    await this._fileApi.delete(path);
    this._boxMap.delete(id);

    await this._eventBus.emit('box:deleted', { id, path });

    this._logger.info('Box deleted', { id, path });
  }

  /**
   * 查询箱子
   * @param options - 查询选项
   */
  async query(options?: BoxQueryOptions): Promise<Box[]> {
    const response = await this._connector.request<{ boxes: { id: string; path: string }[] }>({
      service: 'box',
      method: 'query',
      payload: options ? { ...options } : {},
    });

    if (!response.success || !response.data) {
      return [];
    }

    const boxes: Box[] = [];
    for (const item of response.data.boxes) {
      try {
        const box = await this._fileApi.loadBox(item.path, { cache: true });
        boxes.push(box);
        this._boxMap.set(item.id, item.path);
      } catch (error) {
        this._logger.warn('Failed to load box', { path: item.path, error });
      }
    }

    return boxes;
  }

  /**
   * 添加卡片到箱子
   * @param idOrPath - 箱子 ID 或路径
   * @param cardPath - 卡片路径
   * @param position - 位置信息
   */
  async addCard(
    idOrPath: string,
    cardPath: string,
    position?: Omit<CardPosition, 'cardPath'>
  ): Promise<Box> {
    const box = await this.get(idOrPath);

    // 检查是否已存在
    const exists = box.structure.cards.some((c) => c.path === cardPath);
    if (exists) {
      this._logger.warn('Card already in box', { boxId: box.id, cardPath });
      return box;
    }

    // 提取文件名
    const filename = cardPath.split('/').pop() || cardPath;
    const cardId = generateId();

    // 添加卡片
    const cardInfo: BoxCardInfo = {
      id: cardId,
      location: position?.location || 'internal',
      path: cardPath,
      filename,
    };

    box.structure.cards.push(cardInfo);
    box.metadata.modified_at = new Date().toISOString();

    await this._eventBus.emit('box:card:added', {
      boxId: box.id,
      cardPath,
      position,
    });

    return box;
  }

  /**
   * 从箱子移除卡片
   * @param idOrPath - 箱子 ID 或路径
   * @param cardPath - 卡片路径
   */
  async removeCard(idOrPath: string, cardPath: string): Promise<Box> {
    const box = await this.get(idOrPath);

    const index = box.structure.cards.findIndex((c) => c.path === cardPath);
    if (index === -1) {
      this._logger.warn('Card not in box', { boxId: box.id, cardPath });
      return box;
    }

    box.structure.cards.splice(index, 1);
    box.metadata.modified_at = new Date().toISOString();

    await this._eventBus.emit('box:card:removed', {
      boxId: box.id,
      cardPath,
    });

    return box;
  }

  /**
   * 重新排序卡片
   * @param idOrPath - 箱子 ID 或路径
   * @param cardPaths - 卡片路径数组（新顺序）
   */
  async reorderCards(idOrPath: string, cardPaths: string[]): Promise<Box> {
    const box = await this.get(idOrPath);

    // 验证路径
    const currentPaths = new Set(box.structure.cards.map((c) => c.path));

    for (const path of cardPaths) {
      if (!currentPaths.has(path)) {
        throw new Error(`Card not in box: ${path}`);
      }
    }

    // 重新排序
    const cardMap = new Map(box.structure.cards.map((c) => [c.path, c]));
    box.structure.cards = cardPaths
      .map((path) => cardMap.get(path))
      .filter((c): c is BoxCardInfo => c !== undefined);

    box.metadata.modified_at = new Date().toISOString();

    await this._eventBus.emit('box:cards:reordered', {
      boxId: box.id,
      cardPaths,
    });

    return box;
  }

  /**
   * 获取箱子中的卡片数量
   * @param idOrPath - 箱子 ID 或路径
   */
  async getCardCount(idOrPath: string): Promise<number> {
    const box = await this.get(idOrPath);
    return box.structure.cards.length;
  }

  /**
   * 设置布局
   * @param idOrPath - 箱子 ID 或路径
   * @param layout - 布局类型
   */
  async setLayout(idOrPath: string, layout: string): Promise<Box> {
    return this.update(idOrPath, { layout });
  }

  /**
   * 获取布局配置
   * @param idOrPath - 箱子 ID 或路径
   */
  async getLayoutConfig(idOrPath: string): Promise<Record<string, unknown>> {
    const box = await this.get(idOrPath);
    const config = box.content.layout_configs[box.content.active_layout];
    return (config as Record<string, unknown>) || {};
  }

  /**
   * 设置布局配置
   * @param idOrPath - 箱子 ID 或路径
   * @param config - 配置
   */
  async setLayoutConfig(idOrPath: string, config: Record<string, unknown>): Promise<Box> {
    const box = await this.get(idOrPath);
    box.content.layout_configs[box.content.active_layout] = config;
    box.metadata.modified_at = new Date().toISOString();

    await this._eventBus.emit('box:layout:configured', {
      boxId: box.id,
      layout: box.content.active_layout,
      config,
    });

    return box;
  }

  /**
   * 复制箱子
   * @param idOrPath - 源箱子 ID 或路径
   * @param destPath - 目标路径
   * @param includeCards - 是否复制卡片引用
   */
  async copy(idOrPath: string, destPath: string, includeCards = true): Promise<Box> {
    const sourceBox = await this.get(idOrPath);

    const newId = generateId();
    const now = new Date().toISOString();

    const newBox: Box = {
      id: newId,
      metadata: {
        ...sourceBox.metadata,
        box_id: newId,
        created_at: now,
        modified_at: now,
      },
      structure: includeCards
        ? { cards: [...sourceBox.structure.cards] }
        : { cards: [] },
      content: { ...sourceBox.content },
    };

    await this._fileApi.saveBox(destPath, newBox, { overwrite: false });
    this._boxMap.set(newBox.id, destPath);

    await this._eventBus.emit('box:copied', {
      sourceId: sourceBox.id,
      newId: newBox.id,
    });

    return newBox;
  }

  /**
   * 验证箱子
   * @param box - 箱子对象
   */
  validate(box: Box): boolean {
    return this._fileApi.validateBox(box).valid;
  }

  /**
   * 获取所有缓存的箱子 ID
   */
  getCachedIds(): ChipsId[] {
    return Array.from(this._boxMap.keys());
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this._boxMap.clear();
    this._fileApi.clearCache();
  }
}
