/**
 * SDK常量定义
 */

/**
 * 当前SDK版本
 */
export const SDK_VERSION = '0.1.0';

/**
 * 支持的薯片标准版本
 */
export const CHIPS_STANDARDS_VERSION = '1.0.0';

/**
 * 默认协议版本
 */
export const DEFAULT_PROTOCOL_VERSION = '1.0.0';

/**
 * 文件扩展名
 */
export const FILE_EXTENSIONS = {
  CARD: '.card',
  BOX: '.box',
  ZIP: '.zip',
} as const;

/**
 * MIME类型
 */
export const MIME_TYPES = {
  CARD: 'application/x-card',
  BOX: 'application/x-box',
  ZIP: 'application/zip',
} as const;

/**
 * 默认配置文件名
 */
export const CONFIG_FILES = {
  METADATA: 'metadata.yaml',
  STRUCTURE: 'structure.yaml',
  CONTENT: 'content.yaml',
  COVER: 'cover.html',
} as const;

/**
 * 配置目录名
 */
export const CONFIG_DIRS = {
  CARD: '.card',
  BOX: '.box',
  CONTENT: 'content',
  CARD_COVER: 'cardcover',
} as const;

/**
 * 默认超时时间（毫秒）
 */
export const DEFAULT_TIMEOUT = 10000;

/**
 * 默认缓存大小（字节）
 */
export const DEFAULT_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * 默认缓存TTL（毫秒）
 */
export const DEFAULT_CACHE_TTL = 3600 * 1000; // 1小时

/**
 * 文件大小限制
 */
export const FILE_SIZE_LIMITS = {
  CARD: 2 * 1024 * 1024 * 1024, // 2GB
  RESOURCE: 500 * 1024 * 1024, // 500MB
  CONFIG: 1 * 1024 * 1024, // 1MB
} as const;

/**
 * ID长度
 */
export const ID_LENGTH = 10;

/**
 * 62进制字符集
 */
export const BASE62_CHARS =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
