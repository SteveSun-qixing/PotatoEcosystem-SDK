/**
 * 文件转换 API
 * @module api/conversion-api
 */

import { CoreConnector, ChipsError } from '../core';
import { Logger } from '../logger';
import { ConfigManager } from '../config';
import { Card } from '../types/card';
import { Box } from '../types/box';
import { generateUuid } from '../utils/id';
import {
  ConverterMetadata,
  ConversionCapability,
  Converter,
  ConversionProgress,
  ConversionOptions,
  ConversionResult,
  ConversionTask,
  ConversionRequest,
  ConversionResponseData,
  GetCapabilitiesResponse,
} from './conversion-types';

// 重新导出类型以保持向后兼容
export type {
  ConverterMetadata,
  ConversionCapability,
  Converter,
  ImageConversionOptions,
  PDFConversionOptions,
  HTMLConversionOptions,
  ConversionProgress,
  ProgressCallback,
  ConversionOptions,
  ConversionResult,
} from './conversion-types';

/**
 * 文件转换 API
 *
 * 提供统一的文件格式转换接口，支持卡片/箱子到 HTML、图片、PDF 等格式的转换。
 * 所有通信通过 CoreConnector 与微内核交互，由微内核路由到 file-converter 模块执行转换。
 *
 * @example
 * ```ts
 * const conversionApi = new ConversionAPI(connector, logger, config);
 *
 * // 基础转换
 * const result = await conversionApi.convert(card, 'html');
 *
 * // 带选项的转换
 * const pdfResult = await conversionApi.convert(card, 'pdf', {
 *   outputPath: './output.pdf',
 *   pdf: { pageSize: 'A4', orientation: 'portrait' }
 * });
 *
 * // 批量转换
 * const results = await conversionApi.convertBatch(cards, 'png', {
 *   image: { format: 'png', scale: 2 }
 * });
 * ```
 */
export class ConversionAPI {
  private _connector: CoreConnector;
  private _logger: Logger;
  private _config: ConfigManager;
  private _converters: Map<string, Converter>;
  private _tasks: Map<string, ConversionTask>;
  private _capabilities: ConversionCapability[];
  private _initialized: boolean;

  /**
   * 创建转换 API
   * @param connector - Core 连接器
   * @param logger - 日志实例
   * @param config - 配置管理器
   */
  constructor(connector: CoreConnector, logger: Logger, config: ConfigManager) {
    this._connector = connector;
    this._logger = logger.createChild('ConversionAPI');
    this._config = config;
    this._converters = new Map();
    this._tasks = new Map();
    this._capabilities = [];
    this._initialized = false;

    // 监听转换进度事件
    this._setupEventListeners();
  }

  /**
   * 初始化转换 API
   * 查询并缓存系统支持的转换能力
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    this._logger.debug('Initializing ConversionAPI');

    try {
      const response = await this._connector.request<GetCapabilitiesResponse>({
        service: 'file-converter',
        method: 'getCapabilities',
        payload: {},
        timeout: this._config.get('timeout.default', 30000),
      });

      if (response.success && response.data) {
        this._capabilities = response.data.capabilities;
        this._logger.info('ConversionAPI initialized', {
          capabilityCount: this._capabilities.length,
        });
      }

      this._initialized = true;
    } catch (error) {
      this._logger.warn('Failed to initialize ConversionAPI', { error });
      // 初始化失败不抛出错误，允许后续按需获取能力
      this._initialized = true;
    }
  }

  /**
   * 执行转换
   *
   * 将源数据转换为指定格式。源数据可以是文件路径、Card 对象或 Box 对象。
   * 转换请求通过 CoreConnector 发送到 file-converter 服务执行。
   *
   * @param source - 源数据（文件路径、Card 对象或 Box 对象）
   * @param targetFormat - 目标格式（如 'html', 'png', 'pdf'）
   * @param options - 转换选项
   * @returns 转换结果
   *
   * @example
   * ```ts
   * // 卡片转 HTML
   * const result = await conversionApi.convert(card, 'html');
   *
   * // 卡片转高质量图片
   * const imgResult = await conversionApi.convert(card, 'png', {
   *   outputPath: './preview.png',
   *   image: { quality: 100, scale: 2 }
   * });
   *
   * // 带进度回调
   * const pdfResult = await conversionApi.convert(card, 'pdf', {
   *   onProgress: (progress) => {
   *     console.log(`${progress.progress}%: ${progress.currentStep}`);
   *   }
   * });
   * ```
   */
  async convert(
    source: string | Card | Box,
    targetFormat: string,
    options?: ConversionOptions
  ): Promise<ConversionResult> {
    const taskId = generateUuid();
    const startTime = Date.now();
    const opts = options || {};

    this._logger.debug('Starting conversion', {
      taskId,
      targetFormat,
      sourceType: this._getSourceType(source),
    });

    // 创建任务记录
    this._tasks.set(taskId, {
      id: taskId,
      progress: 0,
      status: 'pending',
      options: opts,
      startTime,
    });

    try {
      // 检查是否支持该转换
      const sourceType = this._getSourceType(source);
      if (!this.canConvert(sourceType, targetFormat)) {
        throw new ChipsError(
          'CONV-1001',
          `Unsupported conversion: ${sourceType} -> ${targetFormat}`,
          { sourceType, targetFormat }
        );
      }

      // 更新任务状态
      this._updateTask(taskId, { status: 'running', progress: 10 });

      // 构造请求
      const request: ConversionRequest = {
        source: this._serializeSource(source),
        sourceType,
        targetFormat,
        options: opts,
        taskId,
      };

      // 发送转换请求
      const timeout = opts.timeout || this._config.get('timeout.conversion', 300000);
      const response = await this._connector.request<ConversionResponseData>({
        service: 'file-converter',
        method: 'convert',
        payload: request,
        timeout,
      });

      if (!response.success) {
        throw new ChipsError(
          'CONV-1002',
          response.error || 'Conversion failed',
          { taskId }
        );
      }

      // 更新任务状态
      this._updateTask(taskId, { status: 'completed', progress: 100 });

      const result: ConversionResult = {
        success: true,
        taskId,
        outputPath: response.data?.outputPath,
        outputData: response.data?.outputData,
        duration: Date.now() - startTime,
      };

      this._logger.info('Conversion completed', {
        taskId,
        duration: result.duration,
        outputPath: result.outputPath,
      });

      return result;
    } catch (error) {
      // 更新任务状态
      this._updateTask(taskId, {
        status: 'failed',
        currentStep: 'error',
      });

      const errorObj = error instanceof Error ? error : new Error(String(error));

      this._logger.error('Conversion failed', errorObj, { taskId });

      return {
        success: false,
        taskId,
        duration: Date.now() - startTime,
        error: errorObj,
      };
    } finally {
      // 延迟清理任务记录，便于查询最终状态
      this._scheduleTaskCleanup(taskId);
    }
  }

  /**
   * 获取支持的转换类型
   *
   * 返回系统支持的所有转换能力，包括内置转换器和已注册的第三方转换器。
   *
   * @returns 支持的转换能力列表
   *
   * @example
   * ```ts
   * const capabilities = conversionApi.getSupportedConversions();
   * // => [
   * //   { sourceType: 'card', targetFormat: 'html' },
   * //   { sourceType: 'card', targetFormat: 'png' },
   * //   { sourceType: 'card', targetFormat: 'pdf' },
   * // ]
   * ```
   */
  getSupportedConversions(): ConversionCapability[] {
    // 合并系统能力和本地注册的转换器能力
    const localCapabilities: ConversionCapability[] = [];
    for (const converter of this._converters.values()) {
      localCapabilities.push(...converter.getCapabilities());
    }

    return [...this._capabilities, ...localCapabilities];
  }

  /**
   * 检查是否支持某种转换
   *
   * @param sourceType - 源类型（如 'card', 'box'）
   * @param targetFormat - 目标格式（如 'html', 'png', 'pdf'）
   * @returns 是否支持该转换
   *
   * @example
   * ```ts
   * if (conversionApi.canConvert('card', 'pdf')) {
   *   await conversionApi.convert(card, 'pdf');
   * } else {
   *   console.log('PDF conversion not supported');
   * }
   * ```
   */
  canConvert(sourceType: string, targetFormat: string): boolean {
    const capabilities = this.getSupportedConversions();
    return capabilities.some(
      (cap) => cap.sourceType === sourceType && cap.targetFormat === targetFormat
    );
  }

  /**
   * 注册转换器
   *
   * 将第三方转换器注册到系统中。注册后，该转换器支持的转换类型可通过 convert 方法使用。
   * 转换器会同时注册到本地和 Core 的 file-converter 模块。
   *
   * @param converter - 转换器实例，必须实现 Converter 接口
   * @throws {ChipsError} 当转换器元数据无效或 ID 已存在时抛出
   *
   * @example
   * ```ts
   * const customConverter: Converter = {
   *   metadata: {
   *     id: 'markdown-converter',
   *     name: 'Markdown to Card Converter',
   *     version: '1.0.0'
   *   },
   *   async convert(source, options) {
   *     // 转换逻辑
   *     return cardData;
   *   },
   *   getCapabilities() {
   *     return [{ sourceType: 'markdown', targetFormat: 'card' }];
   *   }
   * };
   *
   * await conversionApi.registerConverter(customConverter);
   * ```
   */
  async registerConverter(converter: Converter): Promise<void> {
    const { id, name, version } = converter.metadata;

    this._logger.debug('Registering converter', { id, name, version });

    // 验证转换器元数据
    if (!id || !name || !version) {
      throw new ChipsError(
        'CONV-2001',
        'Invalid converter metadata: id, name, and version are required',
        { id, name, version }
      );
    }

    // 检查 ID 冲突
    if (this._converters.has(id)) {
      throw new ChipsError(
        'CONV-2002',
        `Converter with id '${id}' already exists`,
        { id }
      );
    }

    // 本地注册
    this._converters.set(id, converter);

    // 通知 Core
    try {
      await this._connector.request({
        service: 'file-converter',
        method: 'registerConverter',
        payload: {
          metadata: converter.metadata,
          capabilities: converter.getCapabilities(),
        },
        timeout: this._config.get('timeout.default', 30000),
      });

      this._logger.info('Converter registered', { id, name, version });
    } catch (error) {
      // 注册失败时回滚本地状态
      this._converters.delete(id);
      throw error;
    }
  }

  /**
   * 注销转换器
   *
   * @param converterId - 转换器 ID
   */
  async unregisterConverter(converterId: string): Promise<void> {
    this._logger.debug('Unregistering converter', { id: converterId });

    if (!this._converters.has(converterId)) {
      this._logger.warn('Converter not found for unregistration', { id: converterId });
      return;
    }

    // 本地注销
    this._converters.delete(converterId);

    // 通知 Core
    try {
      await this._connector.request({
        service: 'file-converter',
        method: 'unregisterConverter',
        payload: { converterId },
        timeout: this._config.get('timeout.default', 30000),
      });

      this._logger.info('Converter unregistered', { id: converterId });
    } catch (error) {
      this._logger.error('Failed to unregister converter from Core', error as Error, {
        id: converterId,
      });
      // 本地已删除，不回滚
    }
  }

  /**
   * 列出已注册的转换器
   *
   * 返回所有本地注册的转换器元数据。
   *
   * @returns 转换器元数据列表
   *
   * @example
   * ```ts
   * const converters = conversionApi.listConverters();
   * converters.forEach(c => {
   *   console.log(`${c.name} v${c.version}: ${c.description}`);
   * });
   * ```
   */
  listConverters(): ConverterMetadata[] {
    return Array.from(this._converters.values()).map((c) => c.metadata);
  }

  /**
   * 批量转换
   *
   * 并行转换多个源数据到指定格式。使用配置的并发数控制同时执行的转换数量。
   *
   * @param sources - 源数据数组
   * @param targetFormat - 目标格式
   * @param options - 转换选项（应用于所有转换）
   * @returns 转换结果数组
   *
   * @example
   * ```ts
   * const cards = [card1, card2, card3];
   * const results = await conversionApi.convertBatch(cards, 'png', {
   *   outputPath: './previews',
   *   image: { format: 'png', scale: 1 }
   * });
   *
   * const succeeded = results.filter(r => r.success).length;
   * console.log(`${succeeded}/${results.length} conversions succeeded`);
   * ```
   */
  async convertBatch(
    sources: Array<string | Card | Box>,
    targetFormat: string,
    options?: ConversionOptions
  ): Promise<ConversionResult[]> {
    this._logger.debug('Starting batch conversion', {
      count: sources.length,
      targetFormat,
    });

    const concurrency = this._config.get('conversion.concurrency', 3);
    const results: ConversionResult[] = [];

    // 分批并行执行
    for (let i = 0; i < sources.length; i += concurrency) {
      const batch = sources.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((source) => this.convert(source, targetFormat, options))
      );
      results.push(...batchResults);
    }

    const succeeded = results.filter((r) => r.success).length;
    this._logger.info('Batch conversion completed', {
      total: sources.length,
      succeeded,
      failed: sources.length - succeeded,
    });

    return results;
  }

  /**
   * 获取任务状态
   *
   * @param taskId - 任务 ID
   * @returns 任务进度信息，如果任务不存在则返回 undefined
   */
  getTaskStatus(taskId: string): ConversionProgress | undefined {
    const task = this._tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    return {
      taskId: task.id,
      progress: task.progress,
      currentStep: task.currentStep,
      status: task.status,
    };
  }

  /**
   * 取消转换任务
   *
   * 请求取消正在执行的转换任务。已完成或已失败的任务无法取消。
   *
   * @param taskId - 任务 ID
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = this._tasks.get(taskId);
    if (!task || task.status === 'completed' || task.status === 'failed') {
      this._logger.debug('Task cannot be cancelled', {
        taskId,
        reason: !task ? 'not found' : `status is ${task.status}`,
      });
      return;
    }

    this._logger.debug('Cancelling task', { taskId });

    try {
      await this._connector.request({
        service: 'file-converter',
        method: 'cancelTask',
        payload: { taskId },
        timeout: this._config.get('timeout.default', 30000),
      });

      this._updateTask(taskId, { status: 'cancelled' });
      this._logger.info('Task cancelled', { taskId });
    } catch (error) {
      this._logger.error('Failed to cancel task', error as Error, { taskId });
    }
  }

  /**
   * 获取转换器信息
   *
   * @param converterId - 转换器 ID
   * @returns 转换器元数据和能力，如果不存在则返回 undefined
   */
  getConverterInfo(converterId: string): { metadata: ConverterMetadata; capabilities: ConversionCapability[] } | undefined {
    const converter = this._converters.get(converterId);
    if (!converter) {
      return undefined;
    }

    return {
      metadata: converter.metadata,
      capabilities: converter.getCapabilities(),
    };
  }

  /**
   * 刷新转换能力
   *
   * 重新从 Core 获取支持的转换能力列表。
   */
  async refreshCapabilities(): Promise<void> {
    this._logger.debug('Refreshing conversion capabilities');

    try {
      const response = await this._connector.request<GetCapabilitiesResponse>({
        service: 'file-converter',
        method: 'getCapabilities',
        payload: {},
        timeout: this._config.get('timeout.default', 30000),
      });

      if (response.success && response.data) {
        this._capabilities = response.data.capabilities;
        this._logger.info('Conversion capabilities refreshed', {
          capabilityCount: this._capabilities.length,
        });
      }
    } catch (error) {
      this._logger.error('Failed to refresh capabilities', error as Error);
    }
  }

  // ========== 私有方法 ==========

  /**
   * 设置事件监听
   */
  private _setupEventListeners(): void {
    // 监听转换进度事件
    this._connector.on('conversion:progress', (data) => {
      this._handleProgressEvent(data as ConversionProgress);
    });
  }

  /**
   * 获取源类型
   */
  private _getSourceType(source: string | Card | Box): string {
    if (typeof source === 'string') {
      // 根据文件扩展名判断
      if (source.endsWith('.card')) return 'card';
      if (source.endsWith('.box')) return 'box';
      return 'file';
    }

    if ('metadata' in source) {
      if ('card_id' in source.metadata) return 'card';
      if ('box_id' in source.metadata) return 'box';
    }

    return 'unknown';
  }

  /**
   * 序列化源数据
   */
  private _serializeSource(source: string | Card | Box): unknown {
    if (typeof source === 'string') {
      return { type: 'path', value: source };
    }

    return { type: this._getSourceType(source), value: source };
  }

  /**
   * 更新任务状态
   */
  private _updateTask(taskId: string, updates: Partial<ConversionTask>): void {
    const task = this._tasks.get(taskId);
    if (task) {
      Object.assign(task, updates);

      // 触发进度回调
      if (task.options.onProgress) {
        task.options.onProgress({
          taskId: task.id,
          progress: task.progress,
          currentStep: task.currentStep,
          status: task.status,
        });
      }
    }
  }

  /**
   * 处理进度事件
   */
  private _handleProgressEvent(data: ConversionProgress): void {
    const task = this._tasks.get(data.taskId);
    if (task) {
      task.progress = data.progress;
      task.currentStep = data.currentStep;
      task.status = data.status;

      // 触发回调
      if (task.options.onProgress) {
        task.options.onProgress(data);
      }
    }
  }

  /**
   * 安排任务清理
   */
  private _scheduleTaskCleanup(taskId: string): void {
    // 延迟 60 秒清理，便于查询最终状态
    setTimeout(() => {
      this._tasks.delete(taskId);
    }, 60000);
  }
}
