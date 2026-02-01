/**
 * API 相关类型定义
 * @module types/api
 */

/**
 * 文件加载选项
 */
export interface LoadOptions {
  /** 是否使用缓存 */
  cache?: boolean;
  /** 是否验证文件完整性 */
  verify?: boolean;
  /** 是否加载资源文件 */
  loadResources?: boolean;
  /** 最大资源加载数量 */
  maxResourceCount?: number;
}

/**
 * 文件保存选项
 */
export interface SaveOptions {
  /** 是否覆盖现有文件 */
  overwrite?: boolean;
  /** 是否压缩 */
  compress?: boolean;
  /** 是否验证保存后的文件 */
  verify?: boolean;
  /** 是否备份原文件 */
  backup?: boolean;
}

/**
 * 渲染选项
 */
export interface RenderOptions {
  /** 主题 ID */
  theme?: string;
  /** 渲染模式 */
  mode?: 'view' | 'edit' | 'preview';
  /** 是否只读 */
  readOnly?: boolean;
  /** 是否可交互 */
  interactive?: boolean;
  /** 是否懒加载 */
  lazyLoad?: boolean;
  /** 是否虚拟滚动 */
  virtualScroll?: boolean;
  /** 是否启用动画 */
  animations?: boolean;
  /** 布局类型 */
  layout?: string;
  /** 布局配置 */
  layoutConfig?: Record<string, unknown>;
  /** CSS 类名 */
  className?: string;
  /** 内联样式 */
  style?: Record<string, string>;
  /** HTML 属性 */
  attributes?: Record<string, string>;
}

/**
 * 验证选项
 */
export interface ValidateOptions {
  /** 验证结构完整性 */
  structure?: boolean;
  /** 验证资源完整性 */
  resources?: boolean;
  /** 验证元数据 */
  metadata?: boolean;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors?: ValidationError[];
  /** 警告列表 */
  warnings?: ValidationWarning[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误路径 */
  path?: string;
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  /** 警告码 */
  code: string;
  /** 警告消息 */
  message: string;
  /** 警告路径 */
  path?: string;
}

/**
 * 文件信息
 */
export interface FileInfo {
  /** 文件路径 */
  path: string;
  /** 文件名 */
  name: string;
  /** 扩展名 */
  extension: string;
  /** 文件大小 */
  size: number;
  /** 修改时间 */
  modified: string;
  /** 文件类型 */
  type: 'card' | 'box' | 'resource' | 'unknown';
}
