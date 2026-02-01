/**
 * Chips SDK - 薯片生态开发工具包
 * @module @chips/sdk
 * @version 1.0.0
 */

// ========== 核心模块 ==========
export {
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
  CreateCardOptions,
  UpdateCardOptions,
  QueryCardOptions,
  BaseCardData,
  CardResource,
  // 箱子类型
  Box,
  BoxMetadata,
  BoxStructure,
  BoxContent,
  BoxCardInfo,
  CreateBoxOptions,
  UpdateBoxOptions,
  QueryBoxOptions,
  AddCardToBoxOptions,
  ReorderCardsOptions,
  LayoutConfig,
  // API 类型
  LoadOptions,
  SaveOptions,
  RenderOptions,
  ValidateOptions,
  ValidationResult,
  ValidationError as ValidationErrorType,
  ValidationWarning,
  FileInfo,
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
