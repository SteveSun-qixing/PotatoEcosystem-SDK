/**
 * 箱子相关类型定义
 */

/**
 * 箱子布局类型枚举
 */
export enum BoxLayoutType {
  // 基础布局
  List = 'ListLayout',
  Grid = 'GridLayout',
  Waterfall = 'WaterfallLayout',
  Desktop = 'DesktopLayout',

  // 专业布局
  Timeline = 'TimelineLayout',
  Bookshelf = 'BookshelfLayout',
  Profile = 'ProfileLayout',
  Moments = 'MomentsLayout',
}

/**
 * 卡片位置类型
 */
export enum CardLocation {
  Internal = 'internal',
  External = 'external',
}

/**
 * 箱子类型
 */
export enum BoxType {
  Full = 'full', // 全填充箱子
  Empty = 'empty', // 空壳箱子
  Partial = 'partial', // 半空壳箱子
}

/**
 * 卡片导入模式
 */
export enum ImportMode {
  Copy = 'copy', // 复制
  Move = 'move', // 移动
  Reference = 'reference', // 登记地址
}

// 导出 - 类型由index.ts定义
