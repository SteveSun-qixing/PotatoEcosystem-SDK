/**
 * 基础类型定义
 * @module types/base
 */

/**
 * 十位 62 进制 ID
 * 格式: [0-9a-zA-Z]{10}
 */
export type ChipsId = string;

/**
 * 时间戳 ISO 8601 格式
 * 格式: YYYY-MM-DDTHH:mm:ss.sssZ
 */
export type Timestamp = string;

/**
 * 标签类型
 * 支持简单字符串标签或键值对标签
 */
export type Tag = string | [string, ...string[]];

/**
 * 协议版本号
 * 格式: major.minor.patch
 */
export type ProtocolVersion = `${number}.${number}.${number}`;

/**
 * 操作状态
 */
export type Status = 'success' | 'error' | 'partial';

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 文件类型
 */
export type FileType = 'card' | 'box' | 'resource' | 'unknown';

/**
 * 位置类型
 */
export type LocationType = 'internal' | 'external';

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc';

/**
 * 排序选项
 */
export interface SortOptions {
  field: string;
  direction: SortDirection;
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
