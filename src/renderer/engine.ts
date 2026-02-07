/**
 * 渲染引擎
 * @module renderer/engine
 *
 * RendererEngine 是 SDK 渲染模块的入口，协调四阶段渲染流水线：
 * 1. CardParser - 解析 .card 文件
 * 2. ResourceResolver - 解析资源路径为 blob URL
 * 3. RendererFetcher - 获取基础卡片渲染代码
 * 4. CardRenderManager - 隔离渲染（支持 iframe 和 Shadow DOM 两种模式）
 *
 * 默认使用 iframe 模式（与设计原稿一致），开发者可通过 isolationMode 选项
 * 切换为 Shadow DOM 模式。保留原有的公开 API 接口。
 */

import { RenderError, ErrorCodes } from '../core';
import { Logger } from '../logger';
import { EventBus } from '../event';
import { ThemeManager } from '../theme';
import { Card } from '../types/card';
import { Box } from '../types/box';
import { CardParser } from './card-parser';
import { RendererFetcher } from './renderer-fetcher';
import { CardRenderManager } from './card-render-manager';
import { ResourceResolver } from './resource-resolver';
import type {
  RenderOptions,
  RenderResult,
  RenderContext,
  CardRenderer,
  BoxRenderer,
  RendererEngineOptions,
  CardParseSource,
  ParsedCardData,
  RendererCode,
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
  defaultIsolationMode: 'iframe',
  rendererFetcher: {},
  renderManager: {},
};

/**
 * 渲染引擎
 *
 * 薯片 SDK 的核心渲染模块，提供卡片和箱子的渲染能力。
 *
 * 支持两种渲染路径：
 * - **标准路径**（推荐）：通过 renderCardFromSource 直接从 .card 文件数据渲染，
 *   使用三阶段流水线（解析 → 获取渲染代码 → Shadow DOM 挂载）
 * - **兼容路径**：通过 renderCard 从已加载的 Card 对象渲染，保持与旧 API 兼容
 *
 * @example
 * ```ts
 * // iframe 模式（默认，推荐）
 * const engine = new RendererEngine(logger, eventBus, themeManager);
 *
 * // Shadow DOM 模式（轻量）
 * const engine = new RendererEngine(logger, eventBus, themeManager, {
 *   defaultIsolationMode: 'shadow-dom',
 * });
 *
 * // 从 ZIP 数据渲染
 * const result = await engine.renderCardFromSource(
 *   { type: 'data', data: zipBuffer },
 *   container
 * );
 *
 * // 单次指定隔离模式
 * const result = await engine.renderCardFromSource(
 *   { type: 'data', data: zipBuffer },
 *   container,
 *   { isolationMode: 'shadow-dom' }  // 仅本次使用 Shadow DOM
 * );
 *
 * // 清理
 * result.destroy?.();
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

  // 四阶段流水线组件
  private _parser: CardParser;
  private _resourceResolver: ResourceResolver;
  private _fetcher: RendererFetcher;
  private _renderManager: CardRenderManager;

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

    // 初始化四阶段流水线组件
    this._parser = new CardParser({ keepRawFiles: true });
    this._resourceResolver = new ResourceResolver();
    this._fetcher = new RendererFetcher(this._options.rendererFetcher);
    this._renderManager = new CardRenderManager({
      isolationMode: this._options.defaultIsolationMode,
      ...this._options.renderManager,
    });

    // 注册默认箱子渲染器
    this._registerDefaultBoxRenderers();
  }

  // ========== 新增 API：标准渲染路径 ==========

  /**
   * 从源数据渲染卡片（标准路径）
   *
   * 完整的三阶段流水线：解析 → 获取渲染代码 → Shadow DOM 挂载
   *
   * @param source - 卡片数据源（ZIP 数据、文件映射或 Card 对象）
   * @param container - 目标容器元素
   * @param options - 渲染选项
   * @returns 渲染结果
   */
  async renderCardFromSource(
    source: CardParseSource,
    container: HTMLElement,
    options?: RenderOptions
  ): Promise<RenderResult> {
    const startTime = Date.now();
    const opts = this._mergeOptions(options);

    this._logger.debug('Rendering card from source', { sourceType: source.type });
    await this._eventBus.emit('render:start', { type: 'card', targetId: 'source' });

    try {
      // 阶段 1：解析
      const parseResult = await this._executeWithTimeout(
        () => this._parser.parse(source),
        opts.timeout || this._options.timeout
      );

      if (!parseResult.success || !parseResult.data) {
        throw new RenderError(
          ErrorCodes.RENDER_FAILED,
          `Card parse failed: ${parseResult.error}`,
          { warnings: parseResult.warnings }
        );
      }

      let cardData = parseResult.data;

      // 阶段 2：资源解析（将相对路径转为 blob URL）
      this._resourceResolver.cleanup(); // 清理上一次的 blob URL
      const resolveResult = this._resourceResolver.resolve(cardData);
      cardData = resolveResult.cardData;

      if (resolveResult.resolvedCount > 0) {
        this._logger.debug('Resources resolved', {
          resolved: resolveResult.resolvedCount,
          failed: resolveResult.failedPaths.length,
        });
      }

      // 阶段 3：获取渲染代码
      const cardTypes = cardData.baseCards.map((bc) => bc.type);
      const renderers = await this._executeWithTimeout(
        () => this._fetcher.fetchRenderers(cardTypes),
        opts.timeout || this._options.timeout
      );

      // 阶段 4：隔离渲染（根据选项决定使用 iframe 或 Shadow DOM）
      const manager = this._getManagerForOptions(opts);
      const mountResult = manager.render(cardData, renderers, container);

      const duration = Date.now() - startTime;

      await this._eventBus.emit('render:complete', {
        type: 'card',
        targetId: cardData.metadata.id,
        duration,
      });

      this._logger.debug('Card rendered from source', {
        id: cardData.metadata.id,
        duration,
        baseCardCount: cardData.baseCards.length,
        isolationMode: opts.isolationMode,
        resourcesResolved: resolveResult.resolvedCount,
      });

      return {
        success: mountResult.success,
        error: mountResult.error,
        duration,
        mountedCards: mountResult.mountedCards,
        destroy: mountResult.destroy,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this._logger.error('Card render from source failed', { error: errorMessage });

      await this._eventBus.emit('render:error', {
        type: 'card',
        targetId: 'source',
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
   * 从解析后的数据渲染卡片
   *
   * 适用于已经通过 CardParser 解析后的数据，跳过解析阶段。
   *
   * @param cardData - 解析后的卡片数据
   * @param container - 目标容器元素
   * @param options - 渲染选项
   * @returns 渲染结果
   */
  async renderParsedCard(
    cardData: ParsedCardData,
    container: HTMLElement,
    options?: RenderOptions
  ): Promise<RenderResult> {
    const startTime = Date.now();
    const opts = this._mergeOptions(options);

    this._logger.debug('Rendering parsed card', {
      id: cardData.metadata.id,
      isolationMode: opts.isolationMode,
    });

    try {
      // 资源解析
      this._resourceResolver.cleanup();
      const resolveResult = this._resourceResolver.resolve(cardData);
      const resolvedCardData = resolveResult.cardData;

      // 获取渲染代码
      const cardTypes = resolvedCardData.baseCards.map((bc) => bc.type);
      const renderers = await this._executeWithTimeout(
        () => this._fetcher.fetchRenderers(cardTypes),
        opts.timeout || this._options.timeout
      );

      // 隔离渲染
      const manager = this._getManagerForOptions(opts);
      const mountResult = manager.render(resolvedCardData, renderers, container);

      return {
        success: mountResult.success,
        error: mountResult.error,
        duration: Date.now() - startTime,
        mountedCards: mountResult.mountedCards,
        destroy: mountResult.destroy,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 注册基础卡片渲染器
   *
   * 注册特定类型基础卡片的渲染代码，优先级高于内置后备渲染器。
   *
   * @param cardType - 卡片类型（PascalCase，如 'ImageCard'）
   * @param code - 渲染代码
   */
  registerBaseCardRenderer(cardType: string, code: RendererCode): void {
    this._fetcher.registerRenderer(cardType, code);
    this._logger.info('Base card renderer registered', { type: cardType });
  }

  /**
   * 注销基础卡片渲染器
   *
   * @param cardType - 卡片类型
   */
  unregisterBaseCardRenderer(cardType: string): void {
    this._fetcher.unregisterRenderer(cardType);
    this._logger.info('Base card renderer unregistered', { type: cardType });
  }

  /**
   * 获取卡片解析器
   */
  get parser(): CardParser {
    return this._parser;
  }

  /**
   * 获取渲染代码获取器
   */
  get fetcher(): RendererFetcher {
    return this._fetcher;
  }

  /**
   * 获取卡片渲染管理器
   */
  get renderManager(): CardRenderManager {
    return this._renderManager;
  }

  // ========== 兼容 API：原有渲染路径 ==========

  /**
   * 注册卡片渲染器（兼容旧 API）
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
   * 渲染卡片（兼容旧 API + 新流水线）
   *
   * 当传入的 Card 对象包含结构信息时，使用新的三阶段流水线渲染。
   * 否则回退到自定义渲染器。
   *
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

      let result: RenderResult;

      // 尝试使用新流水线：当 Card 对象有 structure 且有 base card 信息时
      if (card.structure?.structure && card.structure.structure.length > 0) {
        result = await this.renderCardFromSource(
          { type: 'card', card },
          container,
          opts
        );
      } else {
        // 回退到自定义渲染器
        const cardType = (card.metadata as Record<string, unknown>).type as string || 'basic';
        const renderer = this._cardRenderers.get(cardType) || this._cardRenderers.get('basic');

        if (renderer) {
          const context: RenderContext = {
            container,
            data: card,
            options: opts,
            themeVars: this._themeManager.getCSSVariables(),
          };

          result = await this._executeWithTimeout(
            () => renderer.render(context),
            opts.timeout || this._options.timeout
          );

          if (result.success) {
            this._applyToContainer(container, result);
          }
        } else {
          // 最终回退：简单文本渲染
          result = {
            success: true,
            html: this._renderFallbackCard(card),
          };
          this._applyToContainer(container, result);
        }
      }

      result.duration = Date.now() - startTime;

      // 缓存结果
      if (this._options.enableCache && opts.mode !== 'partial' && result.success) {
        this._addToCache(cacheKey, result);
      }

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
    if ('structure' in data && 'manifest' in (data as Card).structure) {
      return this.renderCard(data as Card, container, { targetType: 'preview' });
    }
    return this.renderBox(data as Box, container, { targetType: 'preview' });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this._cache.clear();
    this._fetcher.clearCache();
    this._resourceResolver.cleanup();
    this._logger.debug('Render cache cleared');
  }

  /**
   * 获取缓存大小
   */
  get cacheSize(): number {
    return this._cache.size;
  }

  /**
   * 获取已注册的卡片类型（自定义渲染器）
   */
  getRegisteredCardTypes(): string[] {
    return Array.from(this._cardRenderers.keys());
  }

  /**
   * 获取已注册的基础卡片类型（RendererFetcher）
   */
  getRegisteredBaseCardTypes(): string[] {
    return this._fetcher.getRegisteredTypes();
  }

  /**
   * 获取已注册的布局类型
   */
  getRegisteredLayouts(): string[] {
    return Array.from(this._boxRenderers.keys());
  }

  // ========== 私有方法 ==========

  /**
   * 根据渲染选项获取合适的 CardRenderManager
   *
   * 如果选项中指定的 isolationMode 与默认实例一致，复用默认实例；
   * 否则创建临时实例。
   */
  private _getManagerForOptions(opts: RenderOptions): CardRenderManager {
    const requestedMode = opts.isolationMode || this._options.defaultIsolationMode;
    if (requestedMode === this._options.defaultIsolationMode) {
      return this._renderManager;
    }
    // 创建临时实例（不同的隔离模式）
    return new CardRenderManager({
      ...this._options.renderManager,
      isolationMode: requestedMode,
    });
  }

  /**
   * 注册默认箱子渲染器
   */
  private _registerDefaultBoxRenderers(): void {
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

    this.registerBoxRenderer(gridBoxRenderer);
    this.registerBoxRenderer(listBoxRenderer);
  }

  /**
   * 回退卡片渲染
   */
  private _renderFallbackCard(card: Card): string {
    const name = card.metadata.name || 'Untitled';
    const description = card.metadata.description || '';

    return `
      <div class="chips-card" style="
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 1rem;
        font-family: system-ui, sans-serif;
      ">
        <h3 style="margin: 0 0 0.5rem 0; color: #1e293b; font-size: 1.125rem;">
          ${this._escapeHtml(name)}
        </h3>
        ${description ? `<p style="margin: 0; color: #64748b; font-size: 0.875rem;">${this._escapeHtml(description)}</p>` : ''}
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
          ">No cards</div>
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
          ">No cards</div>
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
      isolationMode: options?.isolationMode || this._options.defaultIsolationMode,
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
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
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
