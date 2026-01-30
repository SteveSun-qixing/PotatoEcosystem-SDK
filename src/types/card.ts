/**
 * 卡片相关类型定义
 */

/**
 * 卡片资源模式
 */
export enum CardResourceMode {
  Full = 'full', // 全填充 - 所有资源在内部
  Empty = 'empty', // 空壳 - 所有资源在外部
  Partial = 'partial', // 半空壳 - 部分资源在内外部
}

/**
 * 高度模式
 */
export enum HeightMode {
  Auto = 'auto',
  Fixed = 'fixed',
}

/**
 * 可见性设置
 */
export enum Visibility {
  Public = 'public',
  Private = 'private',
  Unlisted = 'unlisted',
}

/**
 * 年龄分级
 */
export enum AgeRating {
  All = 'all',
  PG = 'pg',
  PG13 = 'pg13',
  R = 'r',
  NC17 = 'nc17',
}

/**
 * 内容来源类型
 */
export enum ContentSource {
  File = 'file',
  Inline = 'inline',
}

// ============================================
// 视频卡片配置
// ============================================

export interface SubtitleTrack {
  file: string;
  language: string;
  label: string;
  default?: boolean;
}

export interface VideoCardConfig {
  card_type: 'VideoCard';
  theme?: string; // ThemeId
  layout?: {
    height_mode?: HeightMode;
    fixed_height?: number;
    aspect_ratio?: string;
  };
  video_file: string;
  cover_image?: string;
  subtitles?: SubtitleTrack[];
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
}

// ============================================
// 图片卡片配置
// ============================================

export enum ImageFitMode {
  Contain = 'contain',
  Cover = 'cover',
  Fill = 'fill',
  None = 'none',
}

export interface ImageCardConfig {
  card_type: 'ImageCard';
  theme?: string; // ThemeId
  layout?: {
    height_mode?: HeightMode;
    fixed_height?: number;
    aspect_ratio?: string;
  };
  image_file: string;
  title?: string;
  caption?: string;
  fit_mode?: ImageFitMode;
  clickable?: boolean;
}

// ============================================
// 富文本卡片配置
// ============================================

export interface RichTextCardConfig {
  card_type: 'RichTextCard';
  theme?: string; // ThemeId
  layout?: {
    height_mode?: HeightMode;
    fixed_height?: number;
  };
  content_source: ContentSource;
  content_file?: string;
  content_text?: string;
  toolbar?: boolean;
}

// ============================================
// Markdown卡片配置
// ============================================

export interface MarkdownCardConfig {
  card_type: 'MarkdownCard';
  theme?: string; // ThemeId
  layout?: {
    height_mode?: HeightMode;
    fixed_height?: number;
  };
  content_source: ContentSource;
  content_file?: string;
  content_text?: string;
  show_toc?: boolean;
  syntax_highlight?: boolean;
  highlight_theme?: string;
}

// ============================================
// 基础卡片配置联合类型
// ============================================

export type BaseCardConfigType =
  | VideoCardConfig
  | ImageCardConfig
  | RichTextCardConfig
  | MarkdownCardConfig;
// 其他类型根据需要添加

// 类型由index.ts定义和导出
