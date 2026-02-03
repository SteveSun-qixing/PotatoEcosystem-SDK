/**
 * API 模块导出
 * @module api
 */

// ========== API 类导出 ==========

export { FileAPI } from './file-api';
export { CardAPI } from './card-api';
export { BoxAPI } from './box-api';
export { ConversionAPI } from './conversion-api';

// ========== 文件类型导出 ==========

export type {
  FileInfo,
  LoadOptions,
  SaveOptions,
  ValidateOptions,
  FileValidationResult,
  ValidationIssue,
  ZipEntry,
  RawFileData,
} from './file-types';

// ========== 卡片类型导出 ==========

export type {
  CreateCardOptions,
  CardQueryOptions,
  UpdateCardOptions,
} from './card-api';

// ========== 箱子类型导出 ==========

export type {
  CreateBoxOptions,
  BoxQueryOptions,
  CardPosition,
} from './box-api';

// ========== 转换类型导出 ==========

export type {
  ConverterMetadata,
  ConversionCapability,
  Converter,
  ImageConversionOptions,
  PDFConversionOptions,
  HTMLConversionOptions,
  ConversionProgress,
  ConversionStatus,
  ProgressCallback,
  ConversionOptions,
  ConversionResult,
} from './conversion-types';
