/**
 * Chips SDK - 薯片生态开发工具包
 * @module @chips/sdk
 * @version 1.0.0
 */

// ========== 核心模块 ==========
export {
  CoreConnector,
  ChipsError,
  ConnectionError,
  TimeoutError,
  ProtocolError,
  RouteError,
  FileError,
  ValidationError,
  PluginError,
  RenderError,
  ResourceError,
  ErrorCodes,
} from './core';

export type {
  ErrorCode,
  ConnectorOptions,
  RequestParams,
  ResponseData,
  MessageType,
  IpcRequest,
  IpcResponse,
} from './core';

// ========== 基础支撑模块 ==========
export { Logger } from './logger';
export type { LogEntry, LoggerOptions, LogHandler, LogTransport } from './logger';

export { ConfigManager } from './config';
export type { ConfigSchema, ConfigManagerOptions, ConfigChangeHandler } from './config';

export { EventBus } from './event';
export type { EventData, EventHandler, EventSubscription, EventBusOptions } from './event';

export { I18nManager } from './i18n';
export type { Locale, Translation, I18nManagerOptions, PluralRules, LocaleChangeHandler } from './i18n';

// ========== 插件系统 ==========
export { PluginManager } from './plugin';
export type {
  PluginState,
  PluginMetadata,
  PluginDependency,
  PluginConfig,
  PluginContext,
  PluginInstance,
  PluginRegistration,
  PluginQueryOptions,
  CommandHandler,
  RendererDefinition,
  EventHandlerFn,
} from './plugin';

// ========== 主题系统 ==========
export { ThemeManager } from './theme';
export type {
  ThemeType,
  CSSVariables,
  ThemeMetadata,
  ThemeColors,
  ThemeSpacing,
  ThemeRadius,
  ThemeShadow,
  ThemeTypography,
  ThemeAnimation,
  Theme,
  ThemeManagerOptions,
  ThemeChangeEvent,
} from './theme';

// ========== 渲染引擎 ==========
export { RendererEngine } from './renderer';
export type {
  RenderTargetType,
  RenderMode,
  RenderOptions as RendererRenderOptions,
  RenderResult,
  RenderContext,
  Renderer,
  CardRenderer,
  BoxRenderer,
  RendererEngineOptions,
  RenderEvent,
} from './renderer';

// ========== 资源管理 ==========
export { ResourceManager } from './resource';
export type {
  ResourceType,
  ResourceState,
  ResourceInfo as ResourceDetails,
  CacheEntry,
  ResourceLoadOptions,
  ResourceManagerOptions,
  ResourceUploadOptions,
  PreloadOptions,
} from './resource';

// ========== API 模块 ==========
export { FileAPI, CardAPI, BoxAPI } from './api';
export type {
  FileInfo,
  LoadOptions,
  SaveOptions,
  ValidateOptions,
  FileValidationResult,
  ValidationIssue,
  ZipEntry,
  RawFileData,
  CreateCardOptions,
  CardQueryOptions,
  UpdateCardOptions,
  CreateBoxOptions,
  BoxQueryOptions,
  CardPosition,
} from './api';

// ========== 类型定义 ==========
export type {
  // 基础类型
  ChipsId,
  Timestamp,
  Tag,
  ProtocolVersion,
  Status,
  LogLevel,
  FileType,
  LocationType,
  SortDirection,
  SortOptions,
  PaginationOptions,
  PaginatedResult,
  // 卡片类型
  Card,
  CardMetadata,
  CardStructure,
  CardManifest,
  BaseCardInfo,
  ResourceInfo,
  QueryCardOptions,
  BaseCardData,
  CardResource,
  // 箱子类型
  Box,
  BoxMetadata,
  BoxStructure,
  BoxContent,
  BoxCardInfo,
  UpdateBoxOptions,
  QueryBoxOptions,
  AddCardToBoxOptions,
  ReorderCardsOptions,
  LayoutConfig,
  // API 类型
  RenderOptions,
  ValidationResult,
  ValidationError as ValidationErrorType,
  ValidationWarning,
} from './types';

// ========== 工具函数 ==========
export {
  // ID 工具
  generateId,
  isValidId,
  generateUuid,
  isValidUuid,
  generateShortId,
  // 路径工具
  normalizePath,
  getExtension,
  getFileName,
  getBaseName,
  getDirPath,
  joinPath,
  isSafePath,
  isCardFile,
  isBoxFile,
  isChipsFile,
  getRelativePath,
  resolvePath,
  // 验证工具
  validateCardMetadata,
  validateBoxMetadata,
  validateProtocolVersion,
  validateTimestamp,
  validateTag,
  validateTags,
  validateResourcePath,
  validateFileSize,
  validateMimeType,
  validateUrl,
  validateEmail,
  // 异步工具
  delay,
  withTimeout,
  retry,
  concurrent,
  debounce,
  throttle,
  createCancellable,
  sequence,
} from './utils';

export type { RetryOptions } from './utils';
