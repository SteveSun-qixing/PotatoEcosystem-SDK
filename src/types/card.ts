/**
 * 卡片类型定义
 * @module types/card
 */

import { ChipsId, Timestamp, Tag, ProtocolVersion } from './base';

/**
 * 卡片元数据
 */
export interface CardMetadata {
  /** 协议版本 */
  chip_standards_version: ProtocolVersion;
  /** 卡片 ID */
  card_id: ChipsId;
  /** 卡片名称 */
  name: string;
  /** 创建时间 */
  created_at: Timestamp;
  /** 修改时间 */
  modified_at: Timestamp;
  /** 主题 ID */
  theme?: string;
  /** 标签列表 */
  tags?: Tag[];
  /** 描述 */
  description?: string;
  /** 作者 */
  author?: string;
  /** 扩展数据 */
  [key: string]: unknown;
}

/**
 * 基础卡片信息
 */
export interface BaseCardInfo {
  /** 基础卡片 ID */
  id: ChipsId;
  /** 基础卡片类型 */
  type: string;
}

/**
 * 资源信息
 */
export interface ResourceInfo {
  /** 资源路径 */
  path: string;
  /** 资源大小（字节） */
  size: number;
  /** 资源类型 */
  type: string;
  /** 校验和 */
  checksum?: string;
}

/**
 * 卡片清单
 */
export interface CardManifest {
  /** 基础卡片数量 */
  card_count: number;
  /** 资源数量 */
  resource_count: number;
  /** 资源列表 */
  resources: ResourceInfo[];
}

/**
 * 卡片结构
 */
export interface CardStructure {
  /** 基础卡片结构 */
  structure: BaseCardInfo[];
  /** 清单 */
  manifest: CardManifest;
}

/**
 * 卡片对象
 */
export interface Card {
  /** 卡片 ID */
  id: ChipsId;
  /** 元数据 */
  metadata: CardMetadata;
  /** 结构 */
  structure: CardStructure;
  /** 资源映射 */
  resources: Map<string, Blob | ArrayBuffer>;
}

/**
 * 卡片创建选项
 */
export interface CreateCardOptions {
  /** 卡片名称 */
  name: string;
  /** 基础卡片类型 */
  type?: string;
  /** 主题 ID */
  theme?: string;
  /** 标签列表 */
  tags?: Tag[];
  /** 描述 */
  description?: string;
  /** 额外元数据 */
  metadata?: Partial<CardMetadata>;
}

/**
 * 卡片更新选项
 */
export interface UpdateCardOptions {
  /** 卡片名称 */
  name?: string;
  /** 主题 ID */
  theme?: string;
  /** 标签列表 */
  tags?: Tag[];
  /** 描述 */
  description?: string;
  /** 额外元数据 */
  metadata?: Partial<CardMetadata>;
}

/**
 * 卡片查询选项
 */
export interface QueryCardOptions {
  /** 标签过滤 */
  tags?: Tag[];
  /** 类型过滤 */
  type?: string;
  /** 名称搜索 */
  name?: string;
  /** 创建时间起始 */
  createdAfter?: Timestamp;
  /** 创建时间截止 */
  createdBefore?: Timestamp;
  /** 修改时间起始 */
  modifiedAfter?: Timestamp;
  /** 修改时间截止 */
  modifiedBefore?: Timestamp;
  /** 数量限制 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 基础卡片数据
 */
export interface BaseCardData {
  /** 基础卡片 ID */
  id: ChipsId;
  /** 基础卡片类型 */
  type: string;
  /** 配置 */
  config: Record<string, unknown>;
  /** 内容 */
  content: unknown;
}

/**
 * 卡片资源
 */
export interface CardResource {
  /** 资源路径 */
  path: string;
  /** 资源名称 */
  name: string;
  /** 资源类型 */
  type: string;
  /** 资源大小 */
  size: number;
  /** 资源数据 */
  data?: ArrayBuffer;
}
