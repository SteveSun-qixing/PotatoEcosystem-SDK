/**
 * 文件操作 API
 * @module api/file-api
 */

import { CoreConnector, FileError, ErrorCodes } from '../core';
import { Logger } from '../logger';
import { ConfigManager } from '../config';
import { Card, CardMetadata, CardStructure } from '../types/card';
import { Box, BoxMetadata, BoxStructure, BoxContent } from '../types/box';
import {
  FileInfo,
  LoadOptions,
  SaveOptions,
  ValidateOptions,
  FileValidationResult,
  RawFileData,
  ValidationIssue,
} from './file-types';
import { isCardFile, isBoxFile, isSafePath } from '../utils/path';
import { validateCardMetadata, validateBoxMetadata } from '../utils/validation';

/**
 * 默认加载选项
 */
const DEFAULT_LOAD_OPTIONS: Required<LoadOptions> = {
  cache: true,
  verify: true,
  loadResources: true,
  maxResourceCount: 1000,
};

/**
 * 默认保存选项
 */
const DEFAULT_SAVE_OPTIONS: Required<SaveOptions> = {
  overwrite: false,
  compress: false,
  verify: true,
  backup: true,
};

/**
 * 文件操作 API
 *
 * @example
 * ```ts
 * const fileApi = new FileAPI(connector, logger, config);
 *
 * // 加载卡片
 * const card = await fileApi.loadCard('/path/to/card.card');
 *
 * // 保存卡片
 * await fileApi.saveCard('/path/to/card.card', card, { overwrite: true });
 * ```
 */
export class FileAPI {
  private _connector: CoreConnector;
  private _logger: Logger;
  private _config: ConfigManager;
  private _cache = new Map<string, Card | Box>();
  private _cacheMaxSize: number;

  /**
   * 创建文件 API
   * @param connector - Core 连接器
   * @param logger - 日志实例
   * @param config - 配置管理器
   */
  constructor(connector: CoreConnector, logger: Logger, config: ConfigManager) {
    this._connector = connector;
    this._logger = logger.createChild('FileAPI');
    this._config = config;
    this._cacheMaxSize = config.get('cache.maxSize', 100);
  }

  /**
   * 加载卡片文件
   * @param path - 文件路径
   * @param options - 加载选项
   */
  async loadCard(path: string, options?: LoadOptions): Promise<Card> {
    const opts = { ...DEFAULT_LOAD_OPTIONS, ...options };

    this._logger.debug('Loading card', { path, options: opts });

    // 验证路径
    if (!isSafePath(path)) {
      throw new FileError(ErrorCodes.FILE_INVALID_PATH, 'Invalid file path', { path });
    }

    if (!isCardFile(path)) {
      throw new FileError(ErrorCodes.FILE_FORMAT_INVALID, 'Not a card file', { path });
    }

    // 检查缓存
    if (opts.cache && this._cache.has(path)) {
      this._logger.debug('Card loaded from cache', { path });
      return this._cache.get(path) as Card;
    }

    // 通过 Core 加载文件
    const response = await this._connector.request<RawFileData>({
      service: 'file',
      method: 'read',
      payload: {
        path,
        loadResources: opts.loadResources,
        maxResourceCount: opts.maxResourceCount,
      },
      timeout: this._config.get('timeout.file', 60000),
    });

    if (!response.success || !response.data) {
      throw new FileError(
        ErrorCodes.FILE_READ_FAILED,
        response.error || 'Failed to load card',
        { path }
      );
    }

    // 解析卡片数据
    const card = await this._parseCard(response.data, path);

    // 验证
    if (opts.verify) {
      const validation = this.validateCard(card);
      if (!validation.valid) {
        throw new FileError(ErrorCodes.FILE_CORRUPTED, 'Card validation failed', {
          path,
          errors: validation.errors,
        });
      }
    }

    // 缓存
    if (opts.cache) {
      this._addToCache(path, card);
    }

    this._logger.info('Card loaded successfully', { path, id: card.id });
    return card;
  }

  /**
   * 保存卡片文件
   * @param path - 文件路径
   * @param card - 卡片对象
   * @param options - 保存选项
   */
  async saveCard(path: string, card: Card, options?: SaveOptions): Promise<void> {
    const opts = { ...DEFAULT_SAVE_OPTIONS, ...options };

    this._logger.debug('Saving card', { path, id: card.id, options: opts });

    // 验证路径
    if (!isSafePath(path)) {
      throw new FileError(ErrorCodes.FILE_INVALID_PATH, 'Invalid file path', { path });
    }

    // 检查文件是否存在
    if (!opts.overwrite) {
      const exists = await this._checkFileExists(path);
      if (exists) {
        throw new FileError(ErrorCodes.FILE_ALREADY_EXISTS, 'File already exists', { path });
      }
    }

    // 序列化卡片数据
    const rawData = this._serializeCard(card);

    // 通过 Core 保存文件
    const response = await this._connector.request({
      service: 'file',
      method: 'write',
      payload: {
        path,
        data: rawData,
        backup: opts.backup,
        compress: opts.compress,
      },
      timeout: this._config.get('timeout.file', 60000),
    });

    if (!response.success) {
      throw new FileError(
        ErrorCodes.FILE_WRITE_FAILED,
        response.error || 'Failed to save card',
        { path }
      );
    }

    // 更新缓存
    this._addToCache(path, card);

    this._logger.info('Card saved successfully', { path, id: card.id });
  }

  /**
   * 加载箱子文件
   * @param path - 文件路径
   * @param options - 加载选项
   */
  async loadBox(path: string, options?: LoadOptions): Promise<Box> {
    const opts = { ...DEFAULT_LOAD_OPTIONS, ...options };

    this._logger.debug('Loading box', { path, options: opts });

    // 验证路径
    if (!isSafePath(path)) {
      throw new FileError(ErrorCodes.FILE_INVALID_PATH, 'Invalid file path', { path });
    }

    if (!isBoxFile(path)) {
      throw new FileError(ErrorCodes.FILE_FORMAT_INVALID, 'Not a box file', { path });
    }

    // 检查缓存
    if (opts.cache && this._cache.has(path)) {
      this._logger.debug('Box loaded from cache', { path });
      return this._cache.get(path) as Box;
    }

    // 通过 Core 加载文件
    const response = await this._connector.request<RawFileData>({
      service: 'file',
      method: 'read',
      payload: { path },
      timeout: this._config.get('timeout.file', 60000),
    });

    if (!response.success || !response.data) {
      throw new FileError(
        ErrorCodes.FILE_READ_FAILED,
        response.error || 'Failed to load box',
        { path }
      );
    }

    // 解析箱子数据
    const box = await this._parseBox(response.data, path);

    // 验证
    if (opts.verify) {
      const validation = this.validateBox(box);
      if (!validation.valid) {
        throw new FileError(ErrorCodes.FILE_CORRUPTED, 'Box validation failed', {
          path,
          errors: validation.errors,
        });
      }
    }

    // 缓存
    if (opts.cache) {
      this._addToCache(path, box);
    }

    this._logger.info('Box loaded successfully', { path, id: box.id });
    return box;
  }

  /**
   * 保存箱子文件
   * @param path - 文件路径
   * @param box - 箱子对象
   * @param options - 保存选项
   */
  async saveBox(path: string, box: Box, options?: SaveOptions): Promise<void> {
    const opts = { ...DEFAULT_SAVE_OPTIONS, ...options };

    this._logger.debug('Saving box', { path, id: box.id, options: opts });

    // 验证路径
    if (!isSafePath(path)) {
      throw new FileError(ErrorCodes.FILE_INVALID_PATH, 'Invalid file path', { path });
    }

    // 检查文件是否存在
    if (!opts.overwrite) {
      const exists = await this._checkFileExists(path);
      if (exists) {
        throw new FileError(ErrorCodes.FILE_ALREADY_EXISTS, 'File already exists', { path });
      }
    }

    // 序列化箱子数据
    const rawData = this._serializeBox(box);

    // 通过 Core 保存文件
    const response = await this._connector.request({
      service: 'file',
      method: 'write',
      payload: {
        path,
        data: rawData,
        backup: opts.backup,
        compress: opts.compress,
      },
      timeout: this._config.get('timeout.file', 60000),
    });

    if (!response.success) {
      throw new FileError(
        ErrorCodes.FILE_WRITE_FAILED,
        response.error || 'Failed to save box',
        { path }
      );
    }

    // 更新缓存
    this._addToCache(path, box);

    this._logger.info('Box saved successfully', { path, id: box.id });
  }

  /**
   * 验证卡片
   * @param card - 卡片对象
   */
  validateCard(card: Card): FileValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // 验证元数据
    if (!validateCardMetadata(card.metadata)) {
      errors.push({
        code: 'VAL-CARD-001',
        message: 'Invalid card metadata',
        path: 'metadata',
        severity: 'error',
      });
    }

    // 验证 ID 一致性
    if (card.id !== card.metadata.card_id) {
      errors.push({
        code: 'VAL-CARD-002',
        message: 'Card ID mismatch',
        path: 'id',
        severity: 'error',
      });
    }

    // 验证名称
    if (!card.metadata.name || card.metadata.name.trim() === '') {
      errors.push({
        code: 'VAL-CARD-003',
        message: 'Card name is required',
        path: 'metadata.name',
        severity: 'error',
      });
    }

    return {
      valid: errors.length === 0,
      fileType: 'card',
      errors,
      warnings,
    };
  }

  /**
   * 验证箱子
   * @param box - 箱子对象
   */
  validateBox(box: Box): FileValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // 验证元数据
    if (!validateBoxMetadata(box.metadata)) {
      errors.push({
        code: 'VAL-BOX-001',
        message: 'Invalid box metadata',
        path: 'metadata',
        severity: 'error',
      });
    }

    // 验证 ID 一致性
    if (box.id !== box.metadata.box_id) {
      errors.push({
        code: 'VAL-BOX-002',
        message: 'Box ID mismatch',
        path: 'id',
        severity: 'error',
      });
    }

    // 验证布局
    if (!box.metadata.layout) {
      errors.push({
        code: 'VAL-BOX-003',
        message: 'Box layout is required',
        path: 'metadata.layout',
        severity: 'error',
      });
    }

    return {
      valid: errors.length === 0,
      fileType: 'box',
      errors,
      warnings,
    };
  }

  /**
   * 验证文件
   * @param path - 文件路径
   * @param options - 验证选项
   */
  async validateFile(path: string, options?: ValidateOptions): Promise<FileValidationResult> {
    this._logger.debug('Validating file', { path });

    const response = await this._connector.request<FileValidationResult>({
      service: 'file',
      method: 'validate',
      payload: { path, options },
    });

    if (!response.success) {
      return {
        valid: false,
        fileType: 'unknown',
        errors: [
          {
            code: 'VAL-1001',
            message: response.error || 'Validation failed',
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }

    return response.data!;
  }

  /**
   * 获取文件信息
   * @param path - 文件路径
   */
  async getFileInfo(path: string): Promise<FileInfo> {
    const response = await this._connector.request<FileInfo>({
      service: 'file',
      method: 'info',
      payload: { path },
    });

    if (!response.success || !response.data) {
      throw new FileError(ErrorCodes.FILE_NOT_FOUND, 'File not found', { path });
    }

    return response.data;
  }

  /**
   * 检查文件是否存在
   * @param path - 文件路径
   */
  async exists(path: string): Promise<boolean> {
    return this._checkFileExists(path);
  }

  /**
   * 复制文件
   * @param sourcePath - 源路径
   * @param destPath - 目标路径
   * @param overwrite - 是否覆盖
   */
  async copy(sourcePath: string, destPath: string, overwrite = false): Promise<void> {
    const response = await this._connector.request({
      service: 'file',
      method: 'copy',
      payload: { sourcePath, destPath, overwrite },
    });

    if (!response.success) {
      throw new FileError(ErrorCodes.FILE_WRITE_FAILED, response.error || 'Copy failed', {
        sourcePath,
        destPath,
      });
    }
  }

  /**
   * 移动文件
   * @param sourcePath - 源路径
   * @param destPath - 目标路径
   * @param overwrite - 是否覆盖
   */
  async move(sourcePath: string, destPath: string, overwrite = false): Promise<void> {
    const response = await this._connector.request({
      service: 'file',
      method: 'move',
      payload: { sourcePath, destPath, overwrite },
    });

    if (!response.success) {
      throw new FileError(ErrorCodes.FILE_WRITE_FAILED, response.error || 'Move failed', {
        sourcePath,
        destPath,
      });
    }

    // 更新缓存
    if (this._cache.has(sourcePath)) {
      const cached = this._cache.get(sourcePath);
      this._cache.delete(sourcePath);
      if (cached) {
        this._cache.set(destPath, cached);
      }
    }
  }

  /**
   * 删除文件
   * @param path - 文件路径
   */
  async delete(path: string): Promise<void> {
    const response = await this._connector.request({
      service: 'file',
      method: 'delete',
      payload: { path },
    });

    if (!response.success) {
      throw new FileError(ErrorCodes.FILE_WRITE_FAILED, response.error || 'Delete failed', {
        path,
      });
    }

    // 清除缓存
    this._cache.delete(path);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this._cache.clear();
    this._logger.debug('File cache cleared');
  }

  /**
   * 从缓存中移除
   * @param path - 文件路径
   */
  removeFromCache(path: string): void {
    this._cache.delete(path);
  }

  /**
   * 获取缓存大小
   */
  get cacheSize(): number {
    return this._cache.size;
  }

  // ========== 私有方法 ==========

  /**
   * 检查文件是否存在
   */
  private async _checkFileExists(path: string): Promise<boolean> {
    const response = await this._connector.request<boolean>({
      service: 'file',
      method: 'exists',
      payload: { path },
    });
    return response.success && response.data === true;
  }

  /**
   * 解析卡片数据
   */
  private async _parseCard(data: RawFileData, path: string): Promise<Card> {
    // 通过 Core 解析 YAML
    const metadataResponse = await this._connector.request<CardMetadata>({
      service: 'parser',
      method: 'parseYaml',
      payload: { content: data.metadata },
    });

    if (!metadataResponse.success || !metadataResponse.data) {
      throw new FileError(ErrorCodes.FILE_FORMAT_INVALID, 'Failed to parse card metadata', {
        path,
      });
    }

    const structureResponse = await this._connector.request<CardStructure>({
      service: 'parser',
      method: 'parseYaml',
      payload: { content: data.structure },
    });

    const metadata = metadataResponse.data;
    const structure = structureResponse.data || {
      structure: [],
      manifest: { card_count: 0, resource_count: 0, resources: [] },
    };

    return {
      id: metadata.card_id,
      metadata,
      structure,
      resources: data.resources,
    };
  }

  /**
   * 解析箱子数据
   */
  private async _parseBox(data: RawFileData, path: string): Promise<Box> {
    const metadataResponse = await this._connector.request<BoxMetadata>({
      service: 'parser',
      method: 'parseYaml',
      payload: { content: data.metadata },
    });

    if (!metadataResponse.success || !metadataResponse.data) {
      throw new FileError(ErrorCodes.FILE_FORMAT_INVALID, 'Failed to parse box metadata', {
        path,
      });
    }

    const structureResponse = await this._connector.request<BoxStructure>({
      service: 'parser',
      method: 'parseYaml',
      payload: { content: data.structure },
    });

    const contentResponse = await this._connector.request<BoxContent>({
      service: 'parser',
      method: 'parseYaml',
      payload: { content: data.content },
    });

    const metadata = metadataResponse.data;
    const structure = structureResponse.data || { cards: [] };
    const content = contentResponse.data || {
      active_layout: metadata.layout || 'grid',
      layout_configs: {},
    };

    return {
      id: metadata.box_id,
      metadata,
      structure,
      content,
    };
  }

  /**
   * 序列化卡片数据
   */
  private _serializeCard(card: Card): Record<string, unknown> {
    return {
      metadata: card.metadata,
      structure: card.structure,
      resources: Object.fromEntries(card.resources),
    };
  }

  /**
   * 序列化箱子数据
   */
  private _serializeBox(box: Box): Record<string, unknown> {
    return {
      metadata: box.metadata,
      structure: box.structure,
      content: box.content,
    };
  }

  /**
   * 添加到缓存
   */
  private _addToCache(path: string, item: Card | Box): void {
    // LRU 策略
    if (this._cache.size >= this._cacheMaxSize) {
      const firstKey = this._cache.keys().next().value;
      if (firstKey) {
        this._cache.delete(firstKey);
      }
    }
    this._cache.set(path, item);
  }
}
