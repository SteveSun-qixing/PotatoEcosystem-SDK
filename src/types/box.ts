/**
 * 箱子类型定义
 * @module types/box
 */

import { ChipsId, Timestamp, Tag, ProtocolVersion, LocationType } from './base';

/**
 * 箱子元数据
 */
export interface BoxMetadata {
  /** 协议版本 */
  chip_standards_version: ProtocolVersion;
  /** 箱子 ID */
  box_id: ChipsId;
  /** 箱子名称 */
  name: string;
  /** 创建时间 */
  created_at: Timestamp;
  /** 修改时间 */
  modified_at: Timestamp;
  /** 布局类型 */
  layout: string;
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
 * 箱子中的卡片信息
 */
export interface BoxCardInfo {
  /** 卡片 ID */
  id: ChipsId;
  /** 位置类型 */
  location: LocationType;
  /** 卡片路径 */
  path: string;
  /** 文件名 */
  filename: string;
}

/**
 * 箱子结构
 */
export interface BoxStructure {
  /** 卡片列表 */
  cards: BoxCardInfo[];
}

/**
 * 箱子内容
 */
export interface BoxContent {
  /** 当前激活的布局 */
  active_layout: string;
  /** 布局配置 */
  layout_configs: Record<string, unknown>;
}

/**
 * 箱子对象
 */
export interface Box {
  /** 箱子 ID */
  id: ChipsId;
  /** 元数据 */
  metadata: BoxMetadata;
  /** 结构 */
  structure: BoxStructure;
  /** 内容 */
  content: BoxContent;
}

/**
 * 箱子创建选项
 */
export interface CreateBoxOptions {
  /** 箱子名称 */
  name: string;
  /** 布局类型 */
  layout?: string;
  /** 标签列表 */
  tags?: Tag[];
  /** 描述 */
  description?: string;
  /** 额外元数据 */
  metadata?: Partial<BoxMetadata>;
}

/**
 * 箱子更新选项
 */
export interface UpdateBoxOptions {
  /** 箱子名称 */
  name?: string;
  /** 布局类型 */
  layout?: string;
  /** 标签列表 */
  tags?: Tag[];
  /** 描述 */
  description?: string;
  /** 额外元数据 */
  metadata?: Partial<BoxMetadata>;
}

/**
 * 箱子查询选项
 */
export interface QueryBoxOptions {
  /** 标签过滤 */
  tags?: Tag[];
  /** 布局过滤 */
  layout?: string;
  /** 名称搜索 */
  name?: string;
  /** 创建时间起始 */
  createdAfter?: Timestamp;
  /** 创建时间截止 */
  createdBefore?: Timestamp;
  /** 数量限制 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 添加卡片到箱子选项
 */
export interface AddCardToBoxOptions {
  /** 卡片 ID */
  cardId: ChipsId;
  /** 位置类型 */
  location: LocationType;
  /** 卡片路径 */
  path?: string;
  /** 插入位置 */
  position?: number;
}

/**
 * 重排卡片选项
 */
export interface ReorderCardsOptions {
  /** 卡片 ID 列表（新顺序） */
  cardIds: ChipsId[];
}

/**
 * 布局配置
 */
export interface LayoutConfig {
  /** 布局类型 */
  type: string;
  /** 列数 */
  columns?: number;
  /** 间距 */
  gap?: number;
  /** 内边距 */
  padding?: number;
  /** 项目宽度 */
  itemWidth?: number;
  /** 项目高度 */
  itemHeight?: number;
  /** 扩展配置 */
  [key: string]: unknown;
}
