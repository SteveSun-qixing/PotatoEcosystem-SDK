/**
 * 标准错误代码定义
 * @module core/error-codes
 * 
 * 定义薯片生态中所有标准化的错误代码
 * 遵循命名规范: [分类]-[编号]
 */

/**
 * 导出相关错误代码
 */
export const ExportErrorCodes = {
  // 通用错误 (EXPORT-0xxx)
  EXPORT_FAILED: 'EXPORT-0001',
  INVALID_FORMAT: 'EXPORT-0002',
  INVALID_OPTIONS: 'EXPORT-0003',
  EXPORT_CANCELLED: 'EXPORT-0004',
  EXPORT_TIMEOUT: 'EXPORT-0005',
  
  // 卡片打包错误 (EXPORT-1xxx)
  PACK_FAILED: 'EXPORT-1001',
  PACK_INVALID_STRUCTURE: 'EXPORT-1002',
  PACK_RESOURCE_MISSING: 'EXPORT-1003',
  PACK_FILE_TOO_LARGE: 'EXPORT-1004',
  PACK_MISSING_REQUIRED_FILE: 'EXPORT-1005',
  PACK_INVALID_METADATA: 'EXPORT-1006',
  PACK_INVALID_CARD_ID: 'EXPORT-1007',
  
  // HTML转换错误 (EXPORT-2xxx)
  HTML_CONVERSION_FAILED: 'EXPORT-2001',
  HTML_RENDERER_NOT_FOUND: 'EXPORT-2002',
  HTML_THEME_NOT_FOUND: 'EXPORT-2003',
  HTML_GENERATION_FAILED: 'EXPORT-2004',
  HTML_RESOURCE_FAILED: 'EXPORT-2005',
  
  // PDF转换错误 (EXPORT-3xxx)
  PDF_CONVERSION_FAILED: 'EXPORT-3001',
  PDF_GENERATION_FAILED: 'EXPORT-3002',
  PDF_BROWSER_LAUNCH_FAILED: 'EXPORT-3003',
  PDF_PAGE_LOAD_FAILED: 'EXPORT-3004',
  PDF_INVALID_FORMAT: 'EXPORT-3005',
  
  // Image转换错误 (EXPORT-4xxx)
  IMAGE_CONVERSION_FAILED: 'EXPORT-4001',
  IMAGE_RENDERING_FAILED: 'EXPORT-4002',
  IMAGE_BROWSER_LAUNCH_FAILED: 'EXPORT-4003',
  IMAGE_SCREENSHOT_FAILED: 'EXPORT-4004',
  IMAGE_INVALID_FORMAT: 'EXPORT-4005',
  
  // 文件系统错误 (EXPORT-5xxx)
  FILE_WRITE_FAILED: 'EXPORT-5001',
  FILE_READ_FAILED: 'EXPORT-5002',
  FILE_PERMISSION_DENIED: 'EXPORT-5003',
  DISK_SPACE_FULL: 'EXPORT-5004',
  FILE_EXISTS: 'EXPORT-5005',
  DIRECTORY_NOT_FOUND: 'EXPORT-5006',
  PATH_TRAVERSAL: 'EXPORT-5007',
  
  // ZIP 相关错误 (EXPORT-6xxx)
  ZIP_CREATE_FAILED: 'EXPORT-6001',
  ZIP_EXTRACT_FAILED: 'EXPORT-6002',
  ZIP_CORRUPTED: 'EXPORT-6003',
  ZIP_TOO_LARGE: 'EXPORT-6004',
} as const;

/**
 * 导出错误代码类型
 */
export type ExportErrorCode = (typeof ExportErrorCodes)[keyof typeof ExportErrorCodes];

/**
 * SDK 内部错误代码
 */
export const SDKErrorCodes = {
  // SDK 状态 (SDK-1xxx)
  SDK_NOT_INITIALIZED: 'SDK-1001',
  SDK_INITIALIZING: 'SDK-1002',
  SDK_DESTROYED: 'SDK-1003',
} as const;

/**
 * SDK 错误代码类型
 */
export type SDKErrorCode = (typeof SDKErrorCodes)[keyof typeof SDKErrorCodes];

/**
 * 文件错误代码
 */
export const FileErrorCodes = {
  FILE_NOT_FOUND: 'FILE-1001',
  FILE_INVALID_PATH: 'FILE-1002',
  FILE_READ_FAILED: 'FILE-1003',
  FILE_WRITE_FAILED: 'FILE-1004',
  FILE_FORMAT_INVALID: 'FILE-1005',
  FILE_CORRUPTED: 'FILE-1006',
  FILE_ALREADY_EXISTS: 'FILE-1007',
} as const;

export type FileErrorCode = (typeof FileErrorCodes)[keyof typeof FileErrorCodes];

/**
 * 插件错误代码
 */
export const PluginErrorCodes = {
  PLUGIN_NOT_FOUND: 'PLUGIN-1001',
  PLUGIN_LOAD_FAILED: 'PLUGIN-1002',
  PLUGIN_DEPENDENCY_MISSING: 'PLUGIN-1003',
  PLUGIN_ALREADY_EXISTS: 'PLUGIN-1006',
} as const;

export type PluginErrorCode = (typeof PluginErrorCodes)[keyof typeof PluginErrorCodes];

/**
 * 渲染错误代码
 */
export const RenderErrorCodes = {
  RENDER_FAILED: 'RENDER-1001',
} as const;

export type RenderErrorCode = (typeof RenderErrorCodes)[keyof typeof RenderErrorCodes];

/**
 * 资源错误代码
 */
export const ResourceErrorCodes = {
  RES_NOT_FOUND: 'RES-1001',
} as const;

export type ResourceErrorCode = (typeof ResourceErrorCodes)[keyof typeof ResourceErrorCodes];

/**
 * 通用错误代码
 */
export const CommonErrorCodes = {
  // 通用 (COMMON-0xxx)
  UNKNOWN: 'COMMON-0001',
  INVALID_INPUT: 'COMMON-0002',
  INVALID_STATE: 'COMMON-0003',
  OPERATION_FAILED: 'COMMON-0004',
  NOT_IMPLEMENTED: 'COMMON-0005',
  
  // 验证 (VAL-1xxx)
  VALIDATION_FAILED: 'VAL-1001',
  INVALID_FORMAT: 'VAL-1002',
  REQUIRED_FIELD_MISSING: 'VAL-1003',
  INVALID_VALUE: 'VAL-1004',
  
  // 权限 (PERM-2xxx)
  PERMISSION_DENIED: 'PERM-2001',
  UNAUTHORIZED: 'PERM-2002',
  FORBIDDEN: 'PERM-2003',
  
  // 资源 (RES-3xxx)
  RESOURCE_NOT_FOUND: 'RES-3001',
  RESOURCE_LOCKED: 'RES-3002',
  RESOURCE_CONFLICT: 'RES-3003',
  RESOURCE_EXHAUSTED: 'RES-3004',
  
  // 网络 (NET-4xxx)
  NETWORK_ERROR: 'NET-4001',
  CONNECTION_FAILED: 'NET-4002',
  REQUEST_TIMEOUT: 'NET-4003',
  SERVER_ERROR: 'NET-4004',
  
  // 系统 (SYS-9xxx)
  SYSTEM_ERROR: 'SYS-9001',
  INTERNAL_ERROR: 'SYS-9002',
  NOT_SUPPORTED: 'SYS-9003',
  DEPRECATED: 'SYS-9004',
} as const;

/**
 * 通用错误代码类型
 */
export type CommonErrorCode = (typeof CommonErrorCodes)[keyof typeof CommonErrorCodes];

/**
 * 所有错误代码
 */
export const ErrorCodes = {
  ...CommonErrorCodes,
  ...ExportErrorCodes,
  ...FileErrorCodes,
  ...PluginErrorCodes,
  ...RenderErrorCodes,
  ...ResourceErrorCodes,
  ...SDKErrorCodes,
} as const;

/**
 * 错误代码类型
 */
export type ErrorCode =
  | CommonErrorCode
  | ExportErrorCode
  | FileErrorCode
  | PluginErrorCode
  | RenderErrorCode
  | ResourceErrorCode
  | SDKErrorCode;
