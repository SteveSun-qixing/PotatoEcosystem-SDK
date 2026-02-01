/**
 * 渲染引擎类型定义
 * @module renderer/types
 */

import { Card } from '../types/card';
import { Box } from '../types/box';

/**
 * 渲染目标类型
 */
export type RenderTargetType = 'card' | 'box' | 'cover' | 'preview';

/**
 * 渲染模式
 */
export type RenderMode = 'full' | 'lazy' | 'partial';

/**
 * 渲染选项
 */
export interface RenderOptions {
  /** 渲染目标类型 */
  targetType?: RenderTargetType;
  /** 渲染模式 */
  mode?: RenderMode;
  /** 主题 ID */
  theme?: string;
  /** 是否启用动画 */
  animations?: boolean;
  /** 是否懒加载 */
  lazyLoad?: boolean;
  /** 自定义样式 */
  customStyles?: Record<string, string>;
  /** 渲染超时 */
  timeout?: number;
}

/**
 * 渲染结果
 */
export interface RenderResult {
  /** 是否成功 */
  success: boolean;
  /** HTML 内容 */
  html?: string;
  /** CSS 内容 */
  css?: string;
  /** 错误信息 */
  error?: string;
  /** 渲染耗时 */
  duration?: number;
}

/**
 * 渲染上下文
 */
export interface RenderContext {
  /** 容器元素 */
  container: HTMLElement;
  /** 卡片或箱子 */
  data: Card | Box;
  /** 渲染选项 */
  options: RenderOptions;
  /** 主题 CSS 变量 */
  themeVars: Record<string, string>;
}

/**
 * 渲染器接口
 */
export interface Renderer {
  /** 渲染器名称 */
  name: string;
  /** 渲染 */
  render(context: RenderContext): Promise<RenderResult>;
  /** 更新 */
  update?(context: RenderContext): Promise<void>;
  /** 销毁 */
  destroy?(): void;
}

/**
 * 卡片渲染器
 */
export interface CardRenderer extends Renderer {
  /** 支持的卡片类型 */
  supportedTypes: string[];
}

/**
 * 箱子渲染器
 */
export interface BoxRenderer extends Renderer {
  /** 支持的布局类型 */
  supportedLayouts: string[];
}

/**
 * 渲染引擎选项
 */
export interface RendererEngineOptions {
  /** 默认主题 */
  defaultTheme?: string;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存大小 */
  cacheSize?: number;
  /** 默认渲染模式 */
  defaultMode?: RenderMode;
  /** 渲染超时 */
  timeout?: number;
}

/**
 * 渲染事件
 */
export interface RenderEvent {
  /** 事件类型 */
  type: 'start' | 'complete' | 'error';
  /** 目标类型 */
  targetType: RenderTargetType;
  /** 目标 ID */
  targetId: string;
  /** 耗时 */
  duration?: number;
  /** 错误 */
  error?: string;
}
