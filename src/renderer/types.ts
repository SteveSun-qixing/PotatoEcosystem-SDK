/**
 * 渲染引擎类型定义
 * @module renderer/types
 *
 * 定义卡片渲染模块使用的所有数据结构和接口类型。
 *
 * 设计原则：
 * - 与卡片文件格式规范（生态共用/02-卡片文件格式规范.md）保持一致
 * - 与 CardtoHTML 转换插件的类型体系对齐，确保渲染一致性
 * - 保留原有 RendererEngine 公开 API 的兼容性
 */

import type { Card } from '../types/card';
import type { Box } from '../types/box';

// ============================================================================
// 卡片解析相关类型
// ============================================================================

/**
 * 解析后的卡片元数据
 *
 * 从 .card/metadata.yaml 中提取，字段名与卡片文件格式规范一致
 */
export interface ParsedCardMetadata {
  /** 卡片 ID（10位62进制） */
  id: string;
  /** 卡片名称 */
  name: string;
  /** 卡片版本 */
  version: string;
  /** 卡片描述 */
  description?: string;
  /** 创建时间 (ISO 8601) */
  createdAt: string;
  /** 修改时间 (ISO 8601) */
  modifiedAt: string;
  /** 主题 ID */
  themeId?: string;
  /** 标签列表 */
  tags?: string[];
  /** 薯片标准版本号 */
  chipsStandardsVersion: string;
}

/**
 * 解析后的卡片结构
 *
 * 从 .card/structure.yaml 中提取
 */
export interface ParsedCardStructure {
  /** 基础卡片 ID 列表（按顺序排列） */
  baseCardIds: string[];
  /** 布局配置（可选） */
  layout?: {
    /** 布局类型 */
    type: string;
    /** 布局参数 */
    params?: Record<string, unknown>;
  };
}

/**
 * 基础卡片配置
 *
 * 从 content/{id}.yaml 中提取，每个基础卡片一份
 */
export interface ParsedBaseCardConfig {
  /** 基础卡片 ID */
  id: string;
  /** 基础卡片类型（PascalCase，如 RichTextCard、ImageCard） */
  type: string;
  /** 卡片名称（可选） */
  name?: string;
  /** 配置数据（类型由基础卡片插件定义） */
  config: Record<string, unknown>;
}

/**
 * 解析后的完整卡片数据
 *
 * CardParser 的输出，包含渲染所需的全部信息
 */
export interface ParsedCardData {
  /** 元数据 */
  metadata: ParsedCardMetadata;
  /** 结构定义 */
  structure: ParsedCardStructure;
  /** 基础卡片配置列表（按 structure 中的顺序排列） */
  baseCards: ParsedBaseCardConfig[];
  /** 原始文件内容（用于资源提取） */
  rawFiles?: Map<string, Uint8Array>;
}

/**
 * 卡片解析源
 *
 * 支持多种输入方式：
 * - files: 已解压的文件映射（编辑器场景）
 * - data: ZIP 格式的 Uint8Array（标准 .card 文件）
 * - card: 已通过 SDK CardAPI 加载的 Card 对象
 */
export interface CardParseSource {
  /** 源类型 */
  type: 'files' | 'data' | 'card';
  /** 文件映射（type 为 files 时） */
  files?: Map<string, Uint8Array>;
  /** ZIP 数据（type 为 data 时） */
  data?: Uint8Array;
  /** Card 对象（type 为 card 时） */
  card?: Card;
}

/**
 * 卡片解析结果
 */
export interface CardParseResult {
  /** 是否成功 */
  success: boolean;
  /** 解析后的卡片数据（成功时） */
  data?: ParsedCardData;
  /** 错误信息（失败时） */
  error?: string;
  /** 警告列表 */
  warnings?: string[];
}

/**
 * 卡片解析器选项
 */
export interface CardParserOptions {
  /** 是否严格模式（遇到任何错误都中止） */
  strict?: boolean;
  /** 是否保留原始文件内容 */
  keepRawFiles?: boolean;
}

// ============================================================================
// 渲染代码相关类型
// ============================================================================

/**
 * 渲染代码
 *
 * 每种基础卡片类型的前端渲染代码，是一个完整的 HTML 页面模板。
 * 渲染代码通过 window.CHIPS_CARD_CONFIG 读取卡片配置数据。
 */
export interface RendererCode {
  /** HTML 模板（完整的 HTML 页面） */
  html: string;
  /** CSS 样式（可选，额外的样式） */
  css: string;
  /** JavaScript 代码（可选） */
  js?: string;
  /** 依赖的外部脚本 URL */
  externalScripts?: string[];
  /** 依赖的外部样式 URL */
  externalStyles?: string[];
}

/**
 * 渲染代码映射
 *
 * key 为基础卡片类型（PascalCase），value 为对应的渲染代码
 */
export type RendererCodeMap = Map<string, RendererCode>;

/**
 * 渲染代码获取器选项
 */
export interface RendererFetcherOptions {
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存过期时间（毫秒） */
  cacheExpiry?: number;
}

// ============================================================================
// 渲染管理器相关类型
// ============================================================================

/**
 * 隔离模式
 *
 * 基础卡片的渲染隔离方式，开发者可以根据场景自由选择：
 *
 * - iframe（默认，推荐）：每个基础卡片在独立的 iframe 中渲染，拥有完整的浏览器
 *   环境。完全安全隔离，故障隔离，插件可用任何框架和 API。与设计原稿一致：
 *   "每个基础卡片渲染为一个独立的 iframe 窗口"。适合查看器、第三方嵌入、安全场景。
 *
 * - shadow-dom（轻量备选）：基础卡片在同一页面内通过 Shadow DOM 隔离。CSS 隔离
 *   有效，JS 通过作用域代理隔离（非完全）。更轻量，适合静态导出、性能优化、预览。
 */
export type IsolationMode = 'shadow-dom' | 'iframe';

/**
 * 卡片渲染管理器选项
 */
export interface CardRenderManagerOptions {
  /** 隔离模式（默认 iframe） */
  isolationMode?: IsolationMode;
  /** 是否启用动画 */
  animations?: boolean;
  /** 基础卡片之间的间距（像素） */
  cardGap?: number;
  /** 容器内边距（像素） */
  containerPadding?: number;
}

/**
 * 已挂载的基础卡片实例
 *
 * 跟踪每个已渲染的基础卡片，用于更新和清理
 */
export interface MountedBaseCard {
  /** 基础卡片 ID */
  id: string;
  /** 基础卡片类型 */
  type: string;
  /** 宿主 DOM 元素 */
  hostElement: HTMLElement;
  /** Shadow Root（shadow-dom 模式时） */
  shadowRoot?: ShadowRoot;
  /** iframe 元素（iframe 模式时） */
  iframe?: HTMLIFrameElement;
  /** 销毁方法 */
  destroy: () => void;
}

/**
 * 卡片渲染结果（CardRenderManager 的输出）
 */
export interface CardMountResult {
  /** 是否成功 */
  success: boolean;
  /** 容器元素 */
  container?: HTMLElement;
  /** 已挂载的基础卡片列表 */
  mountedCards?: MountedBaseCard[];
  /** 错误信息 */
  error?: string;
  /** 警告列表 */
  warnings?: string[];
  /** 销毁所有已挂载的卡片 */
  destroy?: () => void;
}

// ============================================================================
// 渲染引擎（公开 API）相关类型 - 保持向后兼容
// ============================================================================

/**
 * 渲染目标类型
 */
export type RenderTargetType = 'card' | 'box' | 'cover' | 'preview';

/**
 * 渲染模式
 */
export type RenderMode = 'full' | 'lazy' | 'partial';

/**
 * 渲染选项（RendererEngine 公开 API）
 */
export interface RenderOptions {
  /** 渲染目标类型 */
  targetType?: RenderTargetType;
  /** 渲染模式 */
  mode?: RenderMode;
  /** 主题 ID */
  theme?: string;
  /** 是否启用动画 */
  animations?: boolean;
  /** 是否懒加载 */
  lazyLoad?: boolean;
  /** 自定义样式 */
  customStyles?: Record<string, string>;
  /** 渲染超时（毫秒） */
  timeout?: number;
  /** 隔离模式 */
  isolationMode?: IsolationMode;
}

/**
 * 渲染结果（RendererEngine 公开 API）
 */
export interface RenderResult {
  /** 是否成功 */
  success: boolean;
  /** HTML 内容（用于简单渲染） */
  html?: string;
  /** CSS 内容 */
  css?: string;
  /** 错误信息 */
  error?: string;
  /** 渲染耗时（毫秒） */
  duration?: number;
  /** 已挂载的基础卡片列表 */
  mountedCards?: MountedBaseCard[];
  /** 销毁渲染结果 */
  destroy?: () => void;
}

/**
 * 渲染上下文（传递给自定义渲染器）
 */
export interface RenderContext {
  /** 容器元素 */
  container: HTMLElement;
  /** 卡片或箱子数据 */
  data: Card | Box;
  /** 渲染选项 */
  options: RenderOptions;
  /** 主题 CSS 变量 */
  themeVars: Record<string, string>;
}

/**
 * 渲染器接口（自定义渲染器基础接口）
 */
export interface Renderer {
  /** 渲染器名称 */
  name: string;
  /** 渲染 */
  render(context: RenderContext): Promise<RenderResult>;
  /** 更新 */
  update?(context: RenderContext): Promise<void>;
  /** 销毁 */
  destroy?(): void;
}

/**
 * 卡片渲染器（自定义卡片类型渲染器）
 */
export interface CardRenderer extends Renderer {
  /** 支持的卡片类型 */
  supportedTypes: string[];
}

/**
 * 箱子渲染器（自定义布局类型渲染器）
 */
export interface BoxRenderer extends Renderer {
  /** 支持的布局类型 */
  supportedLayouts: string[];
}

/**
 * 渲染引擎选项
 */
export interface RendererEngineOptions {
  /** 默认主题 */
  defaultTheme?: string;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存大小 */
  cacheSize?: number;
  /** 默认渲染模式 */
  defaultMode?: RenderMode;
  /** 渲染超时（毫秒） */
  timeout?: number;
  /** 默认隔离模式 */
  defaultIsolationMode?: IsolationMode;
  /** 渲染代码获取器选项 */
  rendererFetcher?: RendererFetcherOptions;
  /** 卡片渲染管理器选项 */
  renderManager?: CardRenderManagerOptions;
}

/**
 * 渲染事件
 */
export interface RenderEvent {
  /** 事件类型 */
  type: 'start' | 'complete' | 'error';
  /** 目标类型 */
  targetType: RenderTargetType;
  /** 目标 ID */
  targetId: string;
  /** 耗时 */
  duration?: number;
  /** 错误 */
  error?: string;
}
