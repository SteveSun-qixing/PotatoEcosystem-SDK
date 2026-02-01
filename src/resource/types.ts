/**
 * 资源管理类型定义
 * @module resource/types
 */

/**
 * 资源类型
 */
export type ResourceType = 'image' | 'video' | 'audio' | 'font' | 'document' | 'other';

/**
 * 资源状态
 */
export type ResourceState = 'pending' | 'loading' | 'loaded' | 'error';

/**
 * 资源信息
 */
export interface ResourceInfo {
  /** 资源 ID */
  id: string;
  /** 资源名称 */
  name: string;
  /** 资源路径 */
  path: string;
  /** 资源类型 */
  type: ResourceType;
  /** MIME 类型 */
  mimeType: string;
  /** 文件大小 */
  size: number;
  /** 校验和 */
  checksum?: string;
  /** 创建时间 */
  created?: string;
  /** 修改时间 */
  modified?: string;
}

/**
 * 资源缓存条目
 */
export interface CacheEntry {
  /** 资源信息 */
  info: ResourceInfo;
  /** 资源数据 */
  data: Blob | ArrayBuffer;
  /** 对象 URL */
  objectUrl?: string;
  /** 状态 */
  state: ResourceState;
  /** 最后访问时间 */
  lastAccess: number;
  /** 引用计数 */
  refCount: number;
}

/**
 * 资源加载选项
 */
export interface ResourceLoadOptions {
  /** 是否使用缓存 */
  cache?: boolean;
  /** 优先级 */
  priority?: 'high' | 'normal' | 'low';
  /** 超时时间 */
  timeout?: number;
  /** 进度回调 */
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * 资源管理器选项
 */
export interface ResourceManagerOptions {
  /** 最大缓存大小（字节） */
  maxCacheSize?: number;
  /** 最大缓存数量 */
  maxCacheCount?: number;
  /** 缓存 TTL（毫秒） */
  cacheTTL?: number;
  /** 是否自动清理 */
  autoCleanup?: boolean;
}

/**
 * 资源上传选项
 */
export interface ResourceUploadOptions {
  /** 目标路径 */
  path: string;
  /** 是否覆盖 */
  overwrite?: boolean;
  /** 进度回调 */
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * 资源预加载选项
 */
export interface PreloadOptions {
  /** 优先级 */
  priority?: 'high' | 'normal' | 'low';
  /** 并发数 */
  concurrency?: number;
}
