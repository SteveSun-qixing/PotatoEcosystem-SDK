/**
 * API 模块导出
 * @module api
 */

export { FileAPI } from './file-api';
export { CardAPI } from './card-api';
export { BoxAPI } from './box-api';
export { ConversionAPI } from './conversion-api';

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

export type {
  CreateCardOptions,
  CardQueryOptions,
  UpdateCardOptions,
} from './card-api';

export type {
  CreateBoxOptions,
  BoxQueryOptions,
  CardPosition,
} from './box-api';

export type {
  ConversionSource,
  ConversionSourceType,
  AssetStrategy,
  HTMLConversionOptions,
  ImageConversionOptions,
  PDFConversionOptions,
  CardExportOptions,
  ConversionStatus,
  ConversionProgress,
  ConversionStats,
  ConversionResult,
  SupportedConversion,
} from './conversion-api';
