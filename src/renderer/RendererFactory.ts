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
   * @throws 如果渲染器不存在则抛出错误
   */
  getRenderer(cardType: string): BaseCardRenderer {
    const renderer = this.renderers.get(cardType);

    if (!renderer) {
      throw new Error(`Renderer not found for card type: ${cardType}`);
    }

    return renderer;
  }

  /**
   * 注册自定义渲染器（别名）
   * @param cardType 卡片类型
   * @param renderer 渲染器实例
   */
  registerRenderer(cardType: string, renderer: BaseCardRenderer): void {
    this.register(cardType, renderer);
  }

  /**
   * 获取所有支持的类型
   * @returns 支持的卡片类型数组
   */
  getSupportedTypes(): string[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * 检查是否支持指定类型
   * @param cardType 卡片类型
   * @returns 是否支持
   */
  supportsType(cardType: string): boolean {
    return this.renderers.has(cardType);
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
