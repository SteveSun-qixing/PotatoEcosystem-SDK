/**
 * 渲染引擎
 * @module renderer/engine
 */

import { RenderError, ErrorCodes } from '../core';
import { Logger } from '../logger';
import { EventBus } from '../event';
import { ThemeManager } from '../theme';
import { Card } from '../types/card';
import { Box } from '../types/box';
import {
  RenderOptions,
  RenderResult,
  RenderContext,
  CardRenderer,
  BoxRenderer,
  RendererEngineOptions,
} from './types';

/**
 * 默认选项
 */
const DEFAULT_OPTIONS: Required<RendererEngineOptions> = {
  defaultTheme: 'default-light',
  enableCache: true,
  cacheSize: 50,
  defaultMode: 'full',
  timeout: 10000,
};

/**
 * 渲染引擎
 *
 * @example
 * ```ts
 * const engine = new RendererEngine(logger, eventBus, themeManager);
 *
 * // 渲染卡片
 * const result = await engine.renderCard(card, container);
 *
 * // 渲染箱子
 * await engine.renderBox(box, container);
 * ```
 */
export class RendererEngine {
  private _cardRenderers = new Map<string, CardRenderer>();
  private _boxRenderers = new Map<string, BoxRenderer>();
  private _cache = new Map<string, RenderResult>();
  private _logger: Logger;
  private _eventBus: EventBus;
  private _themeManager: ThemeManager;
  private _options: Required<RendererEngineOptions>;

  /**
   * 创建渲染引擎
   * @param logger - 日志实例
   * @param eventBus - 事件总线
   * @param themeManager - 主题管理器
   * @param options - 配置选项
   */
  constructor(
    logger: Logger,
    eventBus: EventBus,
    themeManager: ThemeManager,
    options?: RendererEngineOptions
  ) {
    this._logger = logger.createChild('RendererEngine');
    this._eventBus = eventBus;
    this._themeManager = themeManager;
    this._options = { ...DEFAULT_OPTIONS, ...options };

    // 注册默认渲染器
    this._registerDefaultRenderers();
  }

  /**
   * 注册卡片渲染器
   * @param renderer - 渲染器实例
   */
  registerCardRenderer(renderer: CardRenderer): void {
    for (const type of renderer.supportedTypes) {
      this._cardRenderers.set(type, renderer);
    }
    this._logger.info('Card renderer registered', {
      name: renderer.name,
      types: renderer.supportedTypes,
    });
  }

  /**
   * 注册箱子渲染器
   * @param renderer - 渲染器实例
   */
  registerBoxRenderer(renderer: BoxRenderer): void {
    for (const layout of renderer.supportedLayouts) {
      this._boxRenderers.set(layout, renderer);
    }
    this._logger.info('Box renderer registered', {
      name: renderer.name,
      layouts: renderer.supportedLayouts,
    });
  }

  /**
   * 渲染卡片
   * @param card - 卡片对象
   * @param container - 容器元素
   * @param options - 渲染选项
   */
  async renderCard(card: Card, container: HTMLElement, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    const opts = this._mergeOptions(options);

    this._logger.debug('Rendering card', { id: card.id, options: opts });
    await this._eventBus.emit('render:start', { type: 'card', targetId: card.id });

    try {
      // 检查缓存
      const cacheKey = this._getCacheKey('card', card.id, opts);
      if (opts.mode !== 'partial' && this._cache.has(cacheKey)) {
        const cached = this._cache.get(cacheKey)!;
        this._applyToContainer(container, cached);
        return cached;
      }

      // 获取渲染器
      const cardType = (card.metadata as Record<string, unknown>).type as string || 'basic';
      const renderer = this._cardRenderers.get(cardType) || this._cardRenderers.get('basic');

      if (!renderer) {
        throw new RenderError(ErrorCodes.RENDER_FAILED, `No renderer for card type: ${cardType}`);
      }

      // 创建上下文
      const context: RenderContext = {
        container,
        data: card,
        options: opts,
        themeVars: this._themeManager.getCSSVariables(),
      };

      // 执行渲染
      const result = await this._executeWithTimeout(
        () => renderer.render(context),
        opts.timeout || this._options.timeout
      );

      if (result.success) {
        // 应用到容器
        this._applyToContainer(container, result);

        // 缓存结果
        if (this._options.enableCache && opts.mode !== 'partial') {
          this._addToCache(cacheKey, result);
        }
      }

      result.duration = Date.now() - startTime;

      await this._eventBus.emit('render:complete', {
        type: 'card',
        targetId: card.id,
        duration: result.duration,
      });

      this._logger.debug('Card rendered', { id: card.id, duration: result.duration });
      return result;
    } catch (error) {
      const errorMessage = String(error);
      this._logger.error('Card render failed', { id: card.id, error: errorMessage });

      await this._eventBus.emit('render:error', {
        type: 'card',
        targetId: card.id,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 渲染箱子
   * @param box - 箱子对象
   * @param container - 容器元素
   * @param options - 渲染选项
   */
  async renderBox(box: Box, container: HTMLElement, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    const opts = this._mergeOptions(options);

    this._logger.debug('Rendering box', { id: box.id, options: opts });
    await this._eventBus.emit('render:start', { type: 'box', targetId: box.id });

    try {
      // 检查缓存
      const cacheKey = this._getCacheKey('box', box.id, opts);
      if (opts.mode !== 'partial' && this._cache.has(cacheKey)) {
        const cached = this._cache.get(cacheKey)!;
        this._applyToContainer(container, cached);
        return cached;
      }

      // 获取渲染器
      const layout = box.metadata.layout || 'grid';
      const renderer = this._boxRenderers.get(layout) || this._boxRenderers.get('grid');

      if (!renderer) {
        throw new RenderError(ErrorCodes.RENDER_FAILED, `No renderer for layout: ${layout}`);
      }

      // 创建上下文
      const context: RenderContext = {
        container,
        data: box,
        options: opts,
        themeVars: this._themeManager.getCSSVariables(),
      };

      // 执行渲染
      const result = await this._executeWithTimeout(
        () => renderer.render(context),
        opts.timeout || this._options.timeout
      );

      if (result.success) {
        this._applyToContainer(container, result);

        if (this._options.enableCache && opts.mode !== 'partial') {
          this._addToCache(cacheKey, result);
        }
      }

      result.duration = Date.now() - startTime;

      await this._eventBus.emit('render:complete', {
        type: 'box',
        targetId: box.id,
        duration: result.duration,
      });

      this._logger.debug('Box rendered', { id: box.id, duration: result.duration });
      return result;
    } catch (error) {
      const errorMessage = String(error);
      this._logger.error('Box render failed', { id: box.id, error: errorMessage });

      await this._eventBus.emit('render:error', {
        type: 'box',
        targetId: box.id,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 渲染封面
   * @param card - 卡片对象
   * @param container - 容器元素
   */
  async renderCover(card: Card, container: HTMLElement): Promise<RenderResult> {
    return this.renderCard(card, container, { targetType: 'cover' });
  }

  /**
   * 渲染预览
   * @param data - 卡片或箱子
   * @param container - 容器元素
   */
  async renderPreview(
    data: Card | Box,
    container: HTMLElement
  ): Promise<RenderResult> {
    if ('structure' in data && 'manifest' in data.structure) {
      return this.renderCard(data as Card, container, { targetType: 'preview' });
    }
    return this.renderBox(data as Box, container, { targetType: 'preview' });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this._cache.clear();
    this._logger.debug('Render cache cleared');
  }

  /**
   * 获取缓存大小
   */
  get cacheSize(): number {
    return this._cache.size;
  }

  /**
   * 获取已注册的卡片类型
   */
  getRegisteredCardTypes(): string[] {
    return Array.from(this._cardRenderers.keys());
  }

  /**
   * 获取已注册的布局类型
   */
  getRegisteredLayouts(): string[] {
    return Array.from(this._boxRenderers.keys());
  }

  // ========== 私有方法 ==========

  /**
   * 注册默认渲染器
   */
  private _registerDefaultRenderers(): void {
    // 基础卡片渲染器
    const basicCardRenderer: CardRenderer = {
      name: 'basic',
      supportedTypes: ['basic', 'text', 'image', 'link'],
      render: async (context) => {
        const card = context.data as Card;
        const html = this._renderBasicCard(card, context.themeVars);
        return { success: true, html };
      },
    };

    // 网格布局渲染器
    const gridBoxRenderer: BoxRenderer = {
      name: 'grid',
      supportedLayouts: ['grid', 'masonry'],
      render: async (context) => {
        const box = context.data as Box;
        const html = this._renderGridBox(box, context.themeVars);
        return { success: true, html };
      },
    };

    // 列表布局渲染器
    const listBoxRenderer: BoxRenderer = {
      name: 'list',
      supportedLayouts: ['list', 'compact'],
      render: async (context) => {
        const box = context.data as Box;
        const html = this._renderListBox(box, context.themeVars);
        return { success: true, html };
      },
    };

    this.registerCardRenderer(basicCardRenderer);
    this.registerBoxRenderer(gridBoxRenderer);
    this.registerBoxRenderer(listBoxRenderer);
  }

  /**
   * 渲染基础卡片
   */
  private _renderBasicCard(card: Card, themeVars: Record<string, string>): string {
    const name = card.metadata.name || 'Untitled';
    const description = card.metadata.description || '';

    return `
      <div class="chips-card" style="
        background: ${themeVars['--chips-color-surface'] || '#fff'};
        border: 1px solid ${themeVars['--chips-color-border'] || '#e2e8f0'};
        border-radius: ${themeVars['--chips-radius-md'] || '0.5rem'};
        padding: ${themeVars['--chips-spacing-md'] || '1rem'};
        font-family: ${themeVars['--chips-font-family'] || 'system-ui'};
      ">
        <h3 class="chips-card-title" style="
          margin: 0 0 0.5rem 0;
          color: ${themeVars['--chips-color-text'] || '#1e293b'};
          font-size: ${themeVars['--chips-font-size-lg'] || '1.125rem'};
        ">${this._escapeHtml(name)}</h3>
        ${description ? `
          <p class="chips-card-description" style="
            margin: 0;
            color: ${themeVars['--chips-color-text-secondary'] || '#64748b'};
            font-size: ${themeVars['--chips-font-size-sm'] || '0.875rem'};
          ">${this._escapeHtml(description)}</p>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染网格箱子
   */
  private _renderGridBox(box: Box, themeVars: Record<string, string>): string {
    const cardCount = box.structure.cards.length;

    return `
      <div class="chips-box chips-box-grid" style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: ${themeVars['--chips-spacing-md'] || '1rem'};
        padding: ${themeVars['--chips-spacing-md'] || '1rem'};
        background: ${themeVars['--chips-color-background'] || '#fff'};
      ">
        ${box.structure.cards.map((cardInfo, index) => `
          <div class="chips-box-item" data-card-id="${cardInfo.id}" data-order="${index}">
            <div style="
              background: ${themeVars['--chips-color-surface'] || '#f8fafc'};
              border: 1px solid ${themeVars['--chips-color-border'] || '#e2e8f0'};
              border-radius: ${themeVars['--chips-radius-md'] || '0.5rem'};
              padding: ${themeVars['--chips-spacing-md'] || '1rem'};
              text-align: center;
            ">
              ${this._escapeHtml(cardInfo.filename || cardInfo.path)}
            </div>
          </div>
        `).join('')}
        ${cardCount === 0 ? `
          <div style="
            grid-column: 1 / -1;
            text-align: center;
            padding: ${themeVars['--chips-spacing-xl'] || '2rem'};
            color: ${themeVars['--chips-color-text-secondary'] || '#64748b'};
          ">暂无卡片</div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染列表箱子
   */
  private _renderListBox(box: Box, themeVars: Record<string, string>): string {
    return `
      <div class="chips-box chips-box-list" style="
        display: flex;
        flex-direction: column;
        gap: ${themeVars['--chips-spacing-sm'] || '0.5rem'};
        padding: ${themeVars['--chips-spacing-md'] || '1rem'};
        background: ${themeVars['--chips-color-background'] || '#fff'};
      ">
        ${box.structure.cards.map((cardInfo, index) => `
          <div class="chips-box-item" data-card-id="${cardInfo.id}" data-order="${index}" style="
            background: ${themeVars['--chips-color-surface'] || '#f8fafc'};
            border: 1px solid ${themeVars['--chips-color-border'] || '#e2e8f0'};
            border-radius: ${themeVars['--chips-radius-sm'] || '0.25rem'};
            padding: ${themeVars['--chips-spacing-sm'] || '0.5rem'} ${themeVars['--chips-spacing-md'] || '1rem'};
          ">
            ${this._escapeHtml(cardInfo.filename || cardInfo.path)}
          </div>
        `).join('')}
        ${box.structure.cards.length === 0 ? `
          <div style="
            text-align: center;
            padding: ${themeVars['--chips-spacing-xl'] || '2rem'};
            color: ${themeVars['--chips-color-text-secondary'] || '#64748b'};
          ">暂无卡片</div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 合并选项
   */
  private _mergeOptions(options?: RenderOptions): RenderOptions {
    return {
      targetType: options?.targetType || 'card',
      mode: options?.mode || this._options.defaultMode,
      theme: options?.theme || this._options.defaultTheme,
      animations: options?.animations ?? true,
      lazyLoad: options?.lazyLoad ?? true,
      customStyles: options?.customStyles || {},
      timeout: options?.timeout || this._options.timeout,
    };
  }

  /**
   * 获取缓存键
   */
  private _getCacheKey(type: string, id: string, options: RenderOptions): string {
    return `${type}:${id}:${options.theme}:${options.targetType}`;
  }

  /**
   * 添加到缓存
   */
  private _addToCache(key: string, result: RenderResult): void {
    if (this._cache.size >= this._options.cacheSize) {
      const firstKey = this._cache.keys().next().value;
      if (firstKey) {
        this._cache.delete(firstKey);
      }
    }
    this._cache.set(key, result);
  }

  /**
   * 应用到容器
   */
  private _applyToContainer(container: HTMLElement, result: RenderResult): void {
    if (result.html) {
      container.innerHTML = result.html;
    }
    if (result.css) {
      const styleEl = document.createElement('style');
      styleEl.textContent = result.css;
      container.appendChild(styleEl);
    }
  }

  /**
   * 带超时执行
   */
  private async _executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Render timeout after ${timeout}ms`));
      }, timeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * HTML 转义
   */
  private _escapeHtml(str: string): string {
    const div = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (div) {
      div.textContent = str;
      return div.innerHTML;
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
