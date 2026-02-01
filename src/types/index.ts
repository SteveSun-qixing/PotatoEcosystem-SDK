/**
 * 类型定义导出
 * @module types
 */

// 基础类型
export type {
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
} from './base';

// 卡片类型
export type {
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
} from './card';

// 箱子类型
export type {
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
} from './box';

// API 类型
export type {
  LoadOptions,
  SaveOptions,
  RenderOptions,
  ValidateOptions,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  FileInfo,
} from './api';
