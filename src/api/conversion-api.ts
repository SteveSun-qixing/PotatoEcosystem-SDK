/**
 * 文件转换 API
 * @module api/conversion-api
 */

import { BridgeClient } from '../bridge';
import { Logger } from '../logger';
import { ConfigManager } from '../config';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 转换源类型
 */
export type ConversionSourceType = 'path' | 'data';

/**
 * 转换源
 */
export interface ConversionSource {
  /** 源类型 */
  type: ConversionSourceType;
  /** 文件路径（type 为 path 时必填） */
  path?: string;
  /** 二进制数据（type 为 data 时必填） */
  data?: Uint8Array;
  /** 文件类型（card, box） */
  fileType: string;
}

/**
 * 资源处理策略
 */
export type AssetStrategy =
  | 'copy-all'
  | 'copy-local'
  | 'embed'
  | 'reference-only';

/**
 * HTML 转换选项
 */
export interface HTMLConversionOptions {
  /** 输出目录路径 */
  outputPath?: string;
  /** 是否包含资源文件 */
  includeAssets?: boolean;
  /** 主题 ID */
  themeId?: string;
  /** 资源处理策略 */
  assetStrategy?: AssetStrategy;
  /** 进度回调 */
  onProgress?: (progress: ConversionProgress) => void;
  /** 外观配置表 ID（由转换模块统一管理） */
  appearanceProfileId?: string;
  /** 外观参数覆盖（用于扩展不同导出外观） */
  appearanceOverrides?: Record<string, unknown>;
}

/**
 * 图片转换选项
 */
export interface ImageConversionOptions {
  /** 输出文件路径 */
  outputPath?: string;
  /** 输出格式 */
  format?: 'png' | 'jpg' | 'jpeg';
  /** 图片质量 (1-100) */
  quality?: number;
  /** 缩放比例 */
  scale?: number;
  /** 固定宽度 */
  width?: number;
  /** 固定高度 */
  height?: number;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 是否透明背景（仅 PNG） */
  transparent?: boolean;
  /** 主题 ID */
  themeId?: string;
  /** 进度回调 */
  onProgress?: (progress: ConversionProgress) => void;
  /** 外观配置表 ID（由转换模块统一管理） */
  appearanceProfileId?: string;
  /** 外观参数覆盖（用于扩展不同导出外观） */
  appearanceOverrides?: Record<string, unknown>;
}

/**
 * PDF 转换选项
 */
export interface PDFConversionOptions {
  /** 输出文件路径 */
  outputPath?: string;
  /** 页面格式 */
  pageFormat?: 'a4' | 'a5' | 'letter' | 'legal';
  /** 页面方向 */
  orientation?: 'portrait' | 'landscape';
  /** 页边距 */
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  /** 主题 ID */
  themeId?: string;
  /** 进度回调 */
  onProgress?: (progress: ConversionProgress) => void;
  /** 是否打印背景图形 */
  printBackground?: boolean;
  /** 外观配置表 ID（由转换模块统一管理） */
  appearanceProfileId?: string;
  /** 外观参数覆盖（用于扩展不同导出外观） */
  appearanceOverrides?: Record<string, unknown>;
}

/**
 * 卡片导出选项
 */
export interface CardExportOptions {
  /** 输出文件路径 */
  outputPath: string;
  /** 是否压缩 */
  compress?: boolean;
  /** 是否包含资源 */
  includeResources?: boolean;
  /** 进度回调 */
  onProgress?: (progress: ConversionProgress) => void;
}

/**
 * 转换状态
 */
export type ConversionStatus =
  | 'pending'
  | 'parsing'
  | 'rendering'
  | 'processing'
  | 'writing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * 转换进度
 */
export interface ConversionProgress {
  /** 任务 ID */
  taskId: string;
  /** 当前状态 */
  status: ConversionStatus;
  /** 完成百分比 (0-100) */
  percent: number;
  /** 当前步骤描述 */
  currentStep?: string;
}

/**
 * 转换统计
 */
export interface ConversionStats {
  /** 耗时（毫秒） */
  duration: number;
  /** 输入大小（字节） */
  inputSize: number;
  /** 输出大小（字节） */
  outputSize: number;
}

/**
 * 转换结果
 */
export interface ConversionResult {
  /** 是否成功 */
  success: boolean;
  /** 任务 ID */
  taskId: string;
  /** 输出路径 */
  outputPath?: string;
  /** 输出数据（未指定 outputPath 时） */
  data?: Uint8Array | Map<string, string | Uint8Array>;
  /** 错误信息 */
  error?: {
    code: string;
    message: string;
  };
  /** 警告列表 */
  warnings?: string[];
  /** 转换统计 */
  stats?: ConversionStats;
}

/**
 * 支持的转换类型
 */
export interface SupportedConversion {
  /** 源类型 */
  sourceType: string;
  /** 目标类型 */
  targetType: string;
  /** 描述 */
  description?: string;
}

// ============================================================================
// ConversionAPI 类
// ============================================================================

/**
 * 文件转换 API
 *
 * 提供卡片文件转换功能，支持转换为 HTML、PDF、图片等格式，
 * 以及导出为 .card 文件。
 *
 * @example
 * ```typescript
 * const conversionApi = new ConversionAPI(bridge, logger, config);
 *
 * // 转换为 HTML
 * const htmlResult = await conversionApi.convertToHTML(
 *   { type: 'path', path: '/path/to/card.card', fileType: 'card' },
 *   { outputPath: '/output/dir' }
 * );
 *
 * // 转换为图片
 * const imageResult = await conversionApi.convertToImage(
 *   { type: 'path', path: '/path/to/card.card', fileType: 'card' },
 *   { format: 'png', scale: 2 }
 * );
 *
 * // 导出为 .card 文件
 * const exportResult = await conversionApi.exportAsCard(cardData, {
 *   outputPath: '/output/card.card'
 * });
 * ```
 */
export class ConversionAPI {
  private _bridge: BridgeClient;
  private _logger: Logger;
  private _config: ConfigManager;
  private _activeTasks: Map<string, { cancelled: boolean }> = new Map();

  /**
   * 创建转换 API
   * @param bridge - Bridge 客户端
   * @param logger - 日志实例
   * @param config - 配置管理器
   */
  constructor(bridge: BridgeClient, logger: Logger, config: ConfigManager) {
    this._bridge = bridge;
    this._logger = logger.createChild('ConversionAPI');
    this._config = config;
  }

  /**
   * 转换为 HTML
   *
   * @param source - 转换源（卡片文件路径或数据）
   * @param options - 转换选项
   * @returns 转换结果
   */
  async convertToHTML(
    source: ConversionSource,
    options?: HTMLConversionOptions
  ): Promise<ConversionResult> {
    this._logger.debug('Converting to HTML', { source, options });

    const taskId = this._generateTaskId();
    this._activeTasks.set(taskId, { cancelled: false });

    try {
      const response = await this._bridge.request<ConversionResult>({
        service: 'conversion',
        method: 'convert',
        payload: {
          source,
          targetType: 'html',
          options: {
            ...options,
            onProgress: undefined, // 回调不能通过 IPC 传递
          },
        },
        timeout: this._config.get('timeout.conversion', 120000),
      });

      if (!response.success) {
        return {
          success: false,
          taskId,
          error: {
            code: 'CONV-001',
            message: response.error || 'HTML conversion failed',
          },
        };
      }

      this._logger.info('HTML conversion completed', { taskId });
      return {
        ...response.data!,
        taskId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('HTML conversion failed', { taskId, error: message });
      return {
        success: false,
        taskId,
        error: {
          code: 'CONV-002',
          message,
        },
      };
    } finally {
      this._activeTasks.delete(taskId);
    }
  }

  /**
   * 转换为图片
   *
   * @param source - 转换源（卡片文件路径或数据）
   * @param options - 转换选项
   * @returns 转换结果
   */
  async convertToImage(
    source: ConversionSource,
    options?: ImageConversionOptions
  ): Promise<ConversionResult> {
    this._logger.debug('Converting to image', { source, options });

    const taskId = this._generateTaskId();
    this._activeTasks.set(taskId, { cancelled: false });

    try {
      const response = await this._bridge.request<ConversionResult>({
        service: 'conversion',
        method: 'convert',
        payload: {
          source,
          targetType: 'image',
          options: {
            ...options,
            onProgress: undefined,
          },
        },
        timeout: this._config.get('timeout.conversion', 180000),
      });

      if (!response.success) {
        return {
          success: false,
          taskId,
          error: {
            code: 'CONV-003',
            message: response.error || 'Image conversion failed',
          },
        };
      }

      this._logger.info('Image conversion completed', { taskId });
      return {
        ...response.data!,
        taskId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('Image conversion failed', { taskId, error: message });
      return {
        success: false,
        taskId,
        error: {
          code: 'CONV-004',
          message,
        },
      };
    } finally {
      this._activeTasks.delete(taskId);
    }
  }

  /**
   * 转换为 PDF
   *
   * @param source - 转换源（卡片文件路径或数据）
   * @param options - 转换选项
   * @returns 转换结果
   */
  async convertToPDF(
    source: ConversionSource,
    options?: PDFConversionOptions
  ): Promise<ConversionResult> {
    this._logger.debug('Converting to PDF', { source, options });

    const taskId = this._generateTaskId();
    this._activeTasks.set(taskId, { cancelled: false });

    try {
      const response = await this._bridge.request<ConversionResult>({
        service: 'conversion',
        method: 'convert',
        payload: {
          source,
          targetType: 'pdf',
          options: {
            ...options,
            onProgress: undefined,
          },
        },
        timeout: this._config.get('timeout.conversion', 180000),
      });

      if (!response.success) {
        return {
          success: false,
          taskId,
          error: {
            code: 'CONV-005',
            message: response.error || 'PDF conversion failed',
          },
        };
      }

      this._logger.info('PDF conversion completed', { taskId });
      return {
        ...response.data!,
        taskId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('PDF conversion failed', { taskId, error: message });
      return {
        success: false,
        taskId,
        error: {
          code: 'CONV-006',
          message,
        },
      };
    } finally {
      this._activeTasks.delete(taskId);
    }
  }

  /**
   * 导出为 .card 文件
   *
   * 将卡片数据打包为 .card 文件格式（ZIP 压缩）
   * 通过 BridgeClient 路由到 Foundation 的 CardPacker 模块
   *
   * @param cardId - 卡片 ID
   * @param options - 导出选项
   * @returns 转换结果
   */
  async exportAsCard(
    cardId: string,
    options: CardExportOptions
  ): Promise<ConversionResult> {
    this._logger.debug('Exporting as .card file', { cardId, outputPath: options.outputPath });

    const taskId = this._generateTaskId();
    this._activeTasks.set(taskId, { cancelled: false });

    try {
      // 通过 BridgeClient 请求卡片打包服务
      // Core 会路由到 Foundation.CardPacker
      const response = await this._bridge.request<ConversionResult>({
        service: 'card.pack',
        method: 'pack',
        payload: {
          cardId,
          outputPath: options.outputPath,
          options: {
            compress: options.compress ?? false,
            includeResources: options.includeResources ?? true,
            onProgress: undefined, // 回调不能通过 IPC 传递
          },
        },
        timeout: this._config.get('timeout.conversion', 60000),
      });

      if (!response.success) {
        return {
          success: false,
          taskId,
          error: {
            code: 'CONV-007',
            message: response.error || 'Card export failed',
          },
        };
      }

      this._logger.info('Card export completed', {
        taskId,
        outputPath: options.outputPath,
      });
      return {
        ...response.data!,
        taskId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('Card export failed', { taskId, error: message });
      return {
        success: false,
        taskId,
        error: {
          code: 'CONV-008',
          message,
        },
      };
    } finally {
      this._activeTasks.delete(taskId);
    }
  }

  /**
   * 获取支持的转换类型
   *
   * @returns 支持的转换类型列表
   */
  async getSupportedConversions(): Promise<SupportedConversion[]> {
    try {
      const response = await this._bridge.request<{
        conversions: SupportedConversion[];
      }>({
        service: 'conversion',
        method: 'getSupportedConversions',
        payload: {},
      });

      if (!response.success || !response.data) {
        return this._getDefaultSupportedConversions();
      }

      return response.data.conversions;
    } catch {
      return this._getDefaultSupportedConversions();
    }
  }

  /**
   * 检查是否支持指定的转换
   *
   * @param sourceType - 源文件类型
   * @param targetType - 目标文件类型
   * @returns 是否支持
   */
  async canConvert(sourceType: string, targetType: string): Promise<boolean> {
    const conversions = await this.getSupportedConversions();
    return conversions.some(
      (c) =>
        c.sourceType.toLowerCase() === sourceType.toLowerCase() &&
        c.targetType.toLowerCase() === targetType.toLowerCase()
    );
  }

  /**
   * 取消转换任务
   *
   * @param taskId - 任务 ID
   * @returns 是否成功取消
   */
  async cancelConversion(taskId: string): Promise<boolean> {
    const task = this._activeTasks.get(taskId);
    if (!task) {
      this._logger.warn('Task not found for cancellation', { taskId });
      return false;
    }

    task.cancelled = true;

    try {
      const response = await this._bridge.request<{ cancelled: boolean }>({
        service: 'conversion',
        method: 'cancel',
        payload: { taskId },
      });

      if (response.success && response.data?.cancelled) {
        this._logger.info('Conversion cancelled', { taskId });
        this._activeTasks.delete(taskId);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 获取活动任务数量
   */
  getActiveTaskCount(): number {
    return this._activeTasks.size;
  }

  // ========== 私有方法 ==========

  /**
   * 生成任务 ID
   */
  private _generateTaskId(): string {
    return `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取默认支持的转换类型
   */
  private _getDefaultSupportedConversions(): SupportedConversion[] {
    return [
      {
        sourceType: 'card',
        targetType: 'html',
        description: '将卡片转换为 HTML 网页',
      },
      {
        sourceType: 'card',
        targetType: 'image',
        description: '将卡片转换为图片（PNG/JPG）',
      },
      {
        sourceType: 'card',
        targetType: 'pdf',
        description: '将卡片转换为 PDF 文档',
      },
    ];
  }
}
