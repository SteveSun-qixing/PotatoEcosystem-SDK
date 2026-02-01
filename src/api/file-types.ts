/**
 * 文件操作类型定义
 * @module api/file-types
 */

import { Timestamp, FileType } from '../types/base';

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
  /** 文件大小（字节） */
  size: number;
  /** 修改时间 */
  modified: Timestamp;
  /** 文件类型 */
  type: FileType;
}

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
  /** 是否压缩（.card/.box 文件为零压缩） */
  compress?: boolean;
  /** 是否验证保存后的文件 */
  verify?: boolean;
  /** 备份原文件 */
  backup?: boolean;
}

/**
 * 文件验证选项
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
 * 文件验证结果
 */
export interface FileValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 文件类型 */
  fileType: FileType;
  /** 错误列表 */
  errors: ValidationIssue[];
  /** 警告列表 */
  warnings: ValidationIssue[];
}

/**
 * 验证问题
 */
export interface ValidationIssue {
  /** 问题代码 */
  code: string;
  /** 问题描述 */
  message: string;
  /** 问题路径 */
  path?: string;
  /** 严重程度 */
  severity: 'error' | 'warning';
}

/**
 * ZIP 文件条目
 */
export interface ZipEntry {
  /** 条目名称 */
  name: string;
  /** 原始大小 */
  size: number;
  /** 压缩大小 */
  compressedSize: number;
  /** 是否为目录 */
  isDirectory: boolean;
  /** 内容 */
  content?: ArrayBuffer;
}

/**
 * 原始文件数据
 */
export interface RawFileData {
  /** metadata.yaml 内容 */
  metadata?: string;
  /** structure.yaml 内容 */
  structure?: string;
  /** content.yaml 内容 */
  content?: string;
  /** cover.html 内容 */
  cover?: string;
  /** 资源文件映射 */
  resources: Map<string, ArrayBuffer>;
}
