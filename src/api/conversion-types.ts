/**
 * 文件转换类型定义
 * @module api/conversion-types
 */

// ========== 转换器类型 ==========

/**
 * 转换器元数据
 */
export interface ConverterMetadata {
  /** 转换器 ID */
  id: string;
  /** 转换器名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 描述 */
  description?: string;
  /** 作者 */
  author?: string;
}

/**
 * 转换能力
 * 描述转换器支持的源类型到目标格式的转换
 */
export interface ConversionCapability {
  /** 源类型（如 'card', 'box', 'markdown'） */
  sourceType: string;
  /** 目标格式（如 'html', 'png', 'pdf'） */
  targetFormat: string;
}

/**
 * 转换器接口
 * 第三方转换器必须实现此接口
 *
 * @example
 * ```ts
 * const markdownConverter: Converter = {
 *   metadata: {
 *     id: 'markdown-to-card',
 *     name: 'Markdown Converter',
 *     version: '1.0.0'
 *   },
 *   async convert(source, options) {
 *     // 转换逻辑
 *     return result;
 *   },
 *   getCapabilities() {
 *     return [{ sourceType: 'markdown', targetFormat: 'card' }];
 *   }
 * };
 * ```
 */
export interface Converter {
  /** 元数据 */
  metadata: ConverterMetadata;
  /** 执行转换 */
  convert(source: unknown, options: unknown): Promise<unknown>;
  /** 获取支持的转换能力 */
  getCapabilities(): ConversionCapability[];
}

// ========== 转换选项类型 ==========

/**
 * 图片转换选项
 */
export interface ImageConversionOptions {
  /** 图片格式 */
  format?: 'png' | 'jpg' | 'webp';
  /** 图片质量 (1-100) */
  quality?: number;
  /** 缩放比例 */
  scale?: number;
  /** 宽度（像素） */
  width?: number;
  /** 高度（像素） */
  height?: number;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 是否透明背景（仅 PNG） */
  transparent?: boolean;
}

/**
 * PDF 转换选项
 */
export interface PDFConversionOptions {
  /** 页面大小 */
  pageSize?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal';
  /** 页面方向 */
  orientation?: 'portrait' | 'landscape';
  /** 边距（毫米） */
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** 是否包含封面 */
  includeCover?: boolean;
  /** 是否包含目录 */
  includeTableOfContents?: boolean;
  /** 是否包含页码 */
  includePageNumbers?: boolean;
  /** 页眉文本 */
  headerText?: string;
  /** 页脚文本 */
  footerText?: string;
}

/**
 * HTML 转换选项
 */
export interface HTMLConversionOptions {
  /** 是否内联资源（将图片等转为 base64） */
  inlineResources?: boolean;
  /** 是否包含主题样式 */
  includeTheme?: boolean;
  /** 自定义 CSS */
  customCSS?: string;
  /** 是否压缩输出 */
  minify?: boolean;
  /** 是否生成单文件 */
  singleFile?: boolean;
}

// ========== 进度与状态类型 ==========

/**
 * 转换状态
 */
export type ConversionStatus =
  | 'pending'    // 等待开始
  | 'running'    // 执行中
  | 'completed'  // 已完成
  | 'failed'     // 失败
  | 'cancelled'; // 已取消

/**
 * 进度信息
 */
export interface ConversionProgress {
  /** 任务 ID */
  taskId: string;
  /** 进度 (0-100) */
  progress: number;
  /** 当前步骤描述 */
  currentStep?: string;
  /** 状态 */
  status: ConversionStatus;
  /** 错误信息（仅在失败时） */
  error?: Error;
}

/**
 * 进度回调函数
 */
export type ProgressCallback = (progress: ConversionProgress) => void;

// ========== 转换请求与结果类型 ==========

/**
 * 转换选项
 */
export interface ConversionOptions {
  /** 输出路径 */
  outputPath?: string;
  /** 进度回调 */
  onProgress?: ProgressCallback;
  /** 图片选项 */
  image?: ImageConversionOptions;
  /** PDF 选项 */
  pdf?: PDFConversionOptions;
  /** HTML 选项 */
  html?: HTMLConversionOptions;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 转换结果
 */
export interface ConversionResult {
  /** 是否成功 */
  success: boolean;
  /** 任务 ID */
  taskId: string;
  /** 输出路径（文件输出时） */
  outputPath?: string;
  /** 输出数据（内存输出时） */
  outputData?: ArrayBuffer;
  /** 耗时（毫秒） */
  duration: number;
  /** 错误信息（失败时） */
  error?: Error;
}

// ========== 内部类型（供 ConversionAPI 使用） ==========

/**
 * 转换任务
 * @internal
 */
export interface ConversionTask {
  /** 任务 ID */
  id: string;
  /** 进度 */
  progress: number;
  /** 当前步骤 */
  currentStep?: string;
  /** 状态 */
  status: ConversionStatus;
  /** 选项 */
  options: ConversionOptions;
  /** 开始时间 */
  startTime: number;
}

/**
 * 转换请求参数
 * @internal
 */
export interface ConversionRequest {
  /** 源数据 */
  source: unknown;
  /** 源类型 */
  sourceType: string;
  /** 目标格式 */
  targetFormat: string;
  /** 选项 */
  options: ConversionOptions;
  /** 任务 ID */
  taskId: string;
}

/**
 * 转换响应数据
 * @internal
 */
export interface ConversionResponseData {
  /** 输出路径 */
  outputPath?: string;
  /** 输出数据 */
  outputData?: ArrayBuffer;
  /** 耗时 */
  duration: number;
}

/**
 * 获取能力响应
 * @internal
 */
export interface GetCapabilitiesResponse {
  /** 能力列表 */
  capabilities: ConversionCapability[];
}
