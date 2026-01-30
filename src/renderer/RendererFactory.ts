/**
 * 渲染器工厂
 *
 * 管理和创建各种类型的卡片渲染器
 */

import type { BaseCardRenderer } from './renderers/BaseCardRenderer';
import { RichTextRenderer } from './renderers/RichTextRenderer';
import { MarkdownRenderer } from './renderers/MarkdownRenderer';
import { ImageRenderer } from './renderers/ImageRenderer';
import { VideoRenderer } from './renderers/VideoRenderer';

/**
 * 渲染器工厂类
 */
export class RendererFactory {
  private renderers: Map<string, BaseCardRenderer>;

  constructor() {
    this.renderers = new Map();
    this.registerDefaultRenderers();
  }

  /**
   * 注册默认渲染器
   */
  private registerDefaultRenderers(): void {
    this.register('RichTextCard', new RichTextRenderer());
    this.register('MarkdownCard', new MarkdownRenderer());
    this.register('ImageCard', new ImageRenderer());
    this.register('VideoCard', new VideoRenderer());
  }

  /**
   * 注册渲染器
   * @param cardType 卡片类型
   * @param renderer 渲染器实例
   */
  register(cardType: string, renderer: BaseCardRenderer): void {
    this.renderers.set(cardType, renderer);
  }

  /**
   * 获取渲染器
   * @param cardType 卡片类型
   * @returns 渲染器实例
   */
  getRenderer(cardType: string): BaseCardRenderer {
    const renderer = this.renderers.get(cardType);

    if (!renderer) {
      // 如果没有对应的渲染器，返回默认渲染器
      return new RichTextRenderer();
    }

    return renderer;
  }

  /**
   * 检查渲染器是否存在
   * @param cardType 卡片类型
   * @returns 是否存在
   */
  hasRenderer(cardType: string): boolean {
    return this.renderers.has(cardType);
  }

  /**
   * 列出所有渲染器
   * @returns 卡片类型数组
   */
  listRenderers(): string[] {
    return Array.from(this.renderers.keys());
  }
}
