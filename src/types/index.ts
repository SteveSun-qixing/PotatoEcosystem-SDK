/**
 * Chips SDK - 核心类型定义
 *
 * 定义SDK中使用的所有核心类型、接口和枚举
 */

// ============================================
// 基础类型
// ============================================

/**
 * 十位62进制ID类型（品牌类型，确保类型安全）
 */
export type CardId = string & { readonly __brand: 'CardId' };
export type BoxId = string & { readonly __brand: 'BoxId' };
export type BaseCardId = string & { readonly __brand: 'BaseCardId' };
export type UserId = string & { readonly __brand: 'UserId' };

/**
 * 时间戳类型（ISO 8601格式字符串）
 */
export type ISODateTime = string;

/**
 * 主题标识符（格式：发行商:主题包名称）
 */
export type ThemeId = string;

/**
 * 语义化版本号
 */
export type SemanticVersion = string;

// ============================================
// 卡片相关类型
// ============================================

/**
 * 基础卡片类型枚举
 */
export enum BaseCardType {
  // 文本类
  RichText = 'RichTextCard',
  Markdown = 'MarkdownCard',
  Code = 'CodeCard',

  // 媒体类
  Image = 'ImageCard',
  Video = 'VideoCard',
  Audio = 'AudioCard',
  Model3D = 'Model3DCard',

  // 交互类
  List = 'ListCard',
  Rating = 'RatingCard',
  WebView = 'WebViewCard',
  Game = 'GameCard',
  App = 'AppCard',

  // 专业类
  Calendar = 'CalendarCard',
  Day = 'DayCard',
  Gantt = 'GanttCard',
  Heatmap = 'HeatmapCard',
  MindMap = 'MindMapCard',
  Canvas = 'CanvasCard',
  Map = 'MapCard',

  // 内容类
  Series = 'SeriesCard',
  Article = 'ArticleCard',
  Post = 'PostCard',
  Chat = 'ChatCard',

  // 信息类
  Contact = 'ContactCard',
  Product = 'ProductCard',
  Device = 'DeviceCard',
}

/**
 * 标签类型（简单标签或结构化标签）
 */
export type Tag = string | string[];

/**
 * 卡片元数据
 */
export interface CardMetadata {
  chip_standards_version: SemanticVersion;
  card_id: CardId;
  name: string;
  created_at: ISODateTime;
  modified_at: ISODateTime;
  theme?: ThemeId;
  tags?: Tag[];
  visibility?: 'public' | 'private' | 'unlisted';
  downloadable?: boolean;
  remixable?: boolean;
  commentable?: boolean;
  license?: string;
  age_rating?: 'all' | 'pg' | 'pg13' | 'r' | 'nc17';
  content_warning?: string[];
  file_info?: {
    total_size: number;
    file_count: number;
    checksum: string;
    generated_at: ISODateTime;
  };
}

/**
 * 基础卡片结构项
 */
export interface BaseCardStructureItem {
  id: BaseCardId;
  type: string;
}

/**
 * 卡片结构定义
 */
export interface CardStructure {
  structure: BaseCardStructureItem[];
  manifest: {
    card_count: number;
    resource_count: number;
    resources?: ResourceManifestItem[];
  };
}

/**
 * 资源清单项
 */
export interface ResourceManifestItem {
  path: string;
  size: number;
  type: string;
  duration?: number;
  width?: number;
  height?: number;
  language?: string;
  checksum?: string;
}

/**
 * 基础卡片配置（通用字段）
 */
export interface BaseCardConfig {
  card_type: string;
  theme?: ThemeId;
  layout?: {
    height_mode?: 'auto' | 'fixed';
    fixed_height?: number;
    aspect_ratio?: string;
  };
}

/**
 * 完整卡片数据
 */
export interface Card {
  metadata: CardMetadata;
  structure: CardStructure;
  content: Record<string, BaseCardConfig>;
  resources?: Map<string, ArrayBuffer>;
}

// ============================================
// 箱子相关类型
// ============================================

/**
 * 箱子类型
 */
export enum BoxType {
  Full = 'full', // 全填充箱子
  Empty = 'empty', // 空壳箱子
  Partial = 'partial', // 半空壳箱子
}

/**
 * 箱子元数据
 */
export interface BoxMetadata {
  chip_standards_version: SemanticVersion;
  box_id: BoxId;
  name: string;
  created_at: ISODateTime;
  modified_at: ISODateTime;
  layout: string;
  theme?: ThemeId;
  tags?: Tag[];
}

/**
 * 箱子结构中的卡片项
 */
export interface BoxCardItem {
  id: CardId;
  path: string;
  location: 'internal' | 'external';
}

/**
 * 箱子结构
 */
export interface BoxStructure {
  cards: BoxCardItem[];
  scan_paths?: string[];
}

/**
 * 完整箱子数据
 */
export interface Box {
  metadata: BoxMetadata;
  structure: BoxStructure;
  content: Record<string, unknown>;
  type: BoxType;
}

// ============================================
// 协议相关类型
// ============================================

/**
 * 薯片协议消息优先级
 */
export enum MessagePriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical',
}

/**
 * 请求消息
 */
export interface ChipsRequestMessage {
  protocol_version: SemanticVersion;
  message_id: string;
  timestamp: ISODateTime;
  sender?: string;
  service: string;
  payload: Record<string, unknown>;
  options?: {
    timeout?: number;
    priority?: MessagePriority;
    trace?: boolean;
  };
}

/**
 * 响应消息状态
 */
export const ResponseStatus = {
  Success: 'success',
  Error: 'error',
  Partial: 'partial',
} as const;

export type ResponseStatus =
  (typeof ResponseStatus)[keyof typeof ResponseStatus];

/**
 * 响应消息
 */
export interface ChipsResponseMessage {
  protocol_version: SemanticVersion;
  message_id: string;
  request_id: string;
  timestamp: ISODateTime;
  status: ResponseStatus;
  data: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    execution_time?: number;
    cache_hit?: boolean;
  };
}

/**
 * 事件消息
 */
export interface ChipsEventMessage {
  protocol_version: SemanticVersion;
  event_id: string;
  timestamp: ISODateTime;
  source?: string;
  event_type: string;
  payload: Record<string, unknown>;
  propagate?: boolean;
}

// ============================================
// 平台相关类型
// ============================================

/**
 * 支持的平台类型
 */
export enum Platform {
  Web = 'web',
  Node = 'node',
  Electron = 'electron',
  Mobile = 'mobile',
}

/**
 * 平台适配器接口
 */
export interface IPlatformAdapter {
  readonly platform: Platform;
  readFile(path: string): Promise<ArrayBuffer>;
  writeFile(path: string, data: ArrayBuffer): Promise<void>;
  exists(path: string): Promise<boolean>;
  listFiles(path: string): Promise<string[]>;
  deleteFile(path: string): Promise<void>;
  getFileSystem(): IFileSystem;
}

/**
 * 文件系统接口
 */
export interface IFileSystem {
  readFile(path: string): Promise<ArrayBuffer>;
  writeFile(path: string, data: ArrayBuffer): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileStats>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  unlink(path: string): Promise<void>;
  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
}

/**
 * 文件统计信息
 */
export interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

// ============================================
// 配置相关类型
// ============================================

/**
 * SDK配置选项
 */
export interface SDKOptions {
  platform?: Platform;
  adapter?: IPlatformAdapter;
  debug?: boolean;
  logLevel?: LogLevel;
  cache?: CacheOptions;
  i18n?: I18nOptions;
}

/**
 * 缓存配置
 */
export interface CacheOptions {
  enabled?: boolean;
  maxSize?: number;
  ttl?: number;
  strategy?: 'lru' | 'lfu' | 'fifo';
}

/**
 * 多语言配置
 */
export interface I18nOptions {
  defaultLanguage?: SupportedLanguage;
  fallbackLanguage?: SupportedLanguage;
}

/**
 * 支持的语言
 */
export enum SupportedLanguage {
  ZhCN = 'zh-CN',
  ZhTW = 'zh-TW',
  EnUS = 'en-US',
  JaJP = 'ja-JP',
  KoKR = 'ko-KR',
}

// ============================================
// 日志相关类型
// ============================================

/**
 * 日志级别
 */
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: ISODateTime;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

// ============================================
// 错误相关类型
// ============================================

/**
 * 错误代码前缀
 */
export enum ErrorPrefix {
  Core = 'CORE',
  Module = 'MODULE',
  Protocol = 'PROTOCOL',
  Permission = 'PERMISSION',
  Resource = 'RESOURCE',
  Validation = 'VAL',
  System = 'SYS',
}

/**
 * Chips错误接口
 */
export interface IChipsError extends Error {
  code: string;
  details?: unknown;
}

// ============================================
// 插件相关类型
// ============================================

/**
 * 插件类型
 */
export enum PluginType {
  BaseCard = 'base_card',
  Layout = 'layout',
  Theme = 'theme',
  Tool = 'tool',
}

/**
 * 插件接口
 */
export interface Plugin {
  id: string;
  name: string;
  version: SemanticVersion;
  type?: PluginType;
  description?: string;
  author?: string;
  install(context: PluginContext): void | Promise<void>;
  uninstall?(): void | Promise<void>;
}

/**
 * 插件上下文
 */
export interface PluginContext {
  registerCardType(type: string, renderer: unknown): void;
  registerCommand(name: string, handler: (...args: unknown[]) => unknown): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

// ============================================
// 事件相关类型
// ============================================

/**
 * 事件监听器类型
 */
export type EventListener = (...args: unknown[]) => void;

/**
 * 事件类型定义
 */
export interface EventTypes {
  'card:load': (card: Card) => void;
  'card:save': (card: Card) => void;
  'card:update': (card: Card, changes: unknown) => void;
  'card:delete': (cardId: CardId) => void;
  'box:load': (box: Box) => void;
  'box:save': (box: Box) => void;
  error: (error: Error) => void;
  'render:start': (card: Card) => void;
  'render:complete': (card: Card) => void;
  'render:error': (error: Error) => void;
}

// ============================================
// 导出所有类型
// ============================================

export * from './card';
export * from './box';
export * from './protocol';
export * from './platform';
export * from './config';
export * from './plugin';
