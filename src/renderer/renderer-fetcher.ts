/**
 * RendererFetcher - 渲染代码获取模块
 * @module renderer/renderer-fetcher
 *
 * 负责获取各类型基础卡片的前端渲染代码（HTML/CSS/JS）。
 *
 * 架构设计：
 * - 外部注册渲染器：通过 registerRenderer() 方法，基础卡片插件可以在
 *   运行时动态注册渲染代码，优先级最高。
 * - 内置后备渲染器：为常见基础卡片类型（RichTextCard、ImageCard 等）
 *   提供内置的渲染器，在插件尚未注册时作为后备。
 * - 占位渲染器：当以上两种方式都找不到时，返回占位页面。
 *
 * 查找优先级：外部注册 > 内置后备 > 占位渲染器
 *
 * 所有卡片类型名统一使用 PascalCase 格式（如 ImageCard、RichTextCard），
 * 与卡片文件格式规范、插件清单（manifest.yaml）、编辑器 store 保持一致。
 *
 * 内置渲染器的 HTML 模板复用自 CardtoHTML 转换插件中已验证正确的版本，
 * 确保 SDK 渲染结果与转换导出一致。
 *
 * 参考实现：CardtoHTML 转换插件的 renderer-fetcher.ts
 */

import type { RendererCode, RendererCodeMap, RendererFetcherOptions } from './types';

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<RendererFetcherOptions> = {
  enableCache: true,
  cacheExpiry: 3600000, // 1 小时
};

/**
 * 占位渲染器 HTML 模板
 */
const PLACEHOLDER_HTML = (cardType: string): string => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100px;
      box-sizing: border-box;
    }
    .placeholder {
      text-align: center;
      color: #666;
    }
    .placeholder-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    .placeholder-type {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="placeholder">
    <div class="placeholder-icon">📄</div>
    <div class="placeholder-type">${cardType}</div>
  </div>
</body>
</html>
`;

/**
 * 缓存条目
 */
interface CacheEntry {
  code: RendererCode;
  timestamp: number;
}

/**
 * 渲染代码获取器
 *
 * @example
 * ```ts
 * const fetcher = new RendererFetcher();
 *
 * // 注册外部渲染器
 * fetcher.registerRenderer('CustomCard', { html: '...', css: '' });
 *
 * // 获取渲染代码
 * const code = await fetcher.fetchRenderer('ImageCard');
 *
 * // 批量获取
 * const codeMap = await fetcher.fetchRenderers(['RichTextCard', 'ImageCard']);
 * ```
 */
export class RendererFetcher {
  private _options: Required<RendererFetcherOptions>;
  private _cache: Map<string, CacheEntry> = new Map();

  /** 外部注册的渲染器（来自基础卡片插件） */
  private _externalRenderers: Map<string, RendererCode> = new Map();

  /** 内置后备渲染器（惰性创建） */
  private _builtinRenderers: Record<string, () => RendererCode>;

  /**
   * 创建渲染代码获取器实例
   *
   * @param options - 配置选项
   */
  constructor(options?: RendererFetcherOptions) {
    this._options = { ...DEFAULT_OPTIONS, ...options };

    // 内置后备渲染器使用惰性创建，避免构造时的开销
    // key 统一使用 PascalCase，与卡片文件格式规范一致
    this._builtinRenderers = {
      RichTextCard: () => this._createRichTextRenderer(),
      ImageCard: () => this._createImageRenderer(),
      VideoCard: () => this._createVideoRenderer(),
      AudioCard: () => this._createAudioRenderer(),
      CodeBlockCard: () => this._createCodeRenderer(),
      MarkdownCard: () => this._createMarkdownRenderer(),
    };
  }

  /**
   * 注册外部渲染器
   *
   * 允许基础卡片插件在运行时动态注册渲染代码。
   * 注册后的渲染器优先级高于内置后备渲染器。
   *
   * @param cardType - 卡片类型（PascalCase，如 'ImageCard'）
   * @param code - 渲染代码
   */
  registerRenderer(cardType: string, code: RendererCode): void {
    this._externalRenderers.set(cardType, code);
    // 清除该类型的缓存，确保下次获取时使用新注册的渲染器
    this.clearCache(cardType);
  }

  /**
   * 注销外部渲染器
   *
   * 插件卸载时调用，移除该类型的外部渲染器注册。
   *
   * @param cardType - 卡片类型
   */
  unregisterRenderer(cardType: string): void {
    this._externalRenderers.delete(cardType);
    this.clearCache(cardType);
  }

  /**
   * 获取所有已注册的渲染器类型（外部 + 内置）
   */
  getRegisteredTypes(): string[] {
    const types = new Set<string>();
    for (const type of this._externalRenderers.keys()) {
      types.add(type);
    }
    for (const type of Object.keys(this._builtinRenderers)) {
      types.add(type);
    }
    return Array.from(types);
  }

  /**
   * 批量获取渲染代码
   *
   * @param cardTypes - 卡片类型列表
   * @returns 渲染代码映射
   */
  async fetchRenderers(cardTypes: string[]): Promise<RendererCodeMap> {
    const result: RendererCodeMap = new Map();
    const uniqueTypes = [...new Set(cardTypes)];

    for (const cardType of uniqueTypes) {
      const renderer = await this.fetchRenderer(cardType);
      result.set(cardType, renderer);
    }

    return result;
  }

  /**
   * 获取单个类型的渲染代码
   *
   * @param cardType - 卡片类型
   * @returns 渲染代码
   */
  async fetchRenderer(cardType: string): Promise<RendererCode> {
    // 检查缓存
    if (this._options.enableCache) {
      const cached = this._getFromCache(cardType);
      if (cached) {
        return cached;
      }
    }

    // 按优先级查找渲染器
    const renderer = this._resolve(cardType);

    // 存入缓存
    if (this._options.enableCache) {
      this._setToCache(cardType, renderer);
    }

    return renderer;
  }

  /**
   * 获取占位渲染器
   *
   * @param cardType - 卡片类型
   * @returns 占位渲染代码
   */
  getPlaceholderRenderer(cardType: string): RendererCode {
    return {
      html: PLACEHOLDER_HTML(cardType),
      css: '',
    };
  }

  /**
   * 清除缓存
   *
   * @param cardType - 指定类型（不传则清除全部）
   */
  clearCache(cardType?: string): void {
    if (cardType) {
      this._cache.delete(cardType);
    } else {
      this._cache.clear();
    }
  }

  // ========== 私有方法 ==========

  /**
   * 从缓存获取
   */
  private _getFromCache(cardType: string): RendererCode | null {
    const entry = this._cache.get(cardType);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this._options.cacheExpiry) {
      this._cache.delete(cardType);
      return null;
    }

    return entry.code;
  }

  /**
   * 存入缓存
   */
  private _setToCache(cardType: string, code: RendererCode): void {
    this._cache.set(cardType, {
      code,
      timestamp: Date.now(),
    });
  }

  /**
   * 按优先级解析渲染代码
   *
   * 查找优先级：
   * 1. 外部注册的渲染器
   * 2. 内置后备渲染器
   * 3. 占位渲染器
   */
  private _resolve(cardType: string): RendererCode {
    // 1. 外部注册的渲染器（优先级最高）
    const external = this._externalRenderers.get(cardType);
    if (external) {
      return external;
    }

    // 2. 内置后备渲染器
    const builtinFactory = this._builtinRenderers[cardType];
    if (builtinFactory) {
      return builtinFactory();
    }

    // 3. 占位渲染器
    return this.getPlaceholderRenderer(cardType);
  }

  // ========== 内置后备渲染器 ==========
  // 以下渲染器的 HTML 模板直接复用自 CardtoHTML 转换插件中已验证正确的版本。
  // 渲染代码通过 window.CHIPS_CARD_CONFIG 读取卡片配置数据。
  // 未来插件通过 registerRenderer() 注册后，将自动覆盖这些内置版本。

  /**
   * 创建富文本渲染器（RichTextCard）
   */
  private _createRichTextRenderer(): RendererCode {
    return {
      html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--font-size-base, 16px);
      line-height: var(--line-height-base, 1.6);
      color: var(--text-color, #333);
      background: var(--bg-color, transparent);
    }
    .rich-text-content {
      max-width: 100%;
    }
    .rich-text-content img {
      max-width: 100%;
      height: auto;
    }
    .rich-text-content a {
      color: var(--link-color, #0066cc);
    }
    .rich-text-content h1 { font-size: 1.8em; margin: 0.8em 0 0.4em; }
    .rich-text-content h2 { font-size: 1.5em; margin: 0.8em 0 0.4em; }
    .rich-text-content h3 { font-size: 1.25em; margin: 0.8em 0 0.4em; }
    .rich-text-content p { margin: 0.6em 0; }
    .rich-text-content ul, .rich-text-content ol { padding-left: 1.5em; margin: 0.6em 0; }
    .rich-text-content blockquote {
      margin: 0.8em 0;
      padding: 0.5em 1em;
      border-left: 4px solid var(--border-color, #ddd);
      background: var(--bg-secondary, #f9f9f9);
      color: var(--text-secondary, #666);
    }
    .rich-text-content code {
      background: var(--code-inline-bg, #f5f5f5);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--font-mono, monospace);
      font-size: 0.9em;
    }
    .rich-text-content pre {
      background: var(--code-bg, #1e1e1e);
      color: var(--code-color, #d4d4d4);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    .rich-text-content pre code {
      background: transparent;
      padding: 0;
    }
    .rich-text-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.8em 0;
    }
    .rich-text-content th, .rich-text-content td {
      border: 1px solid var(--border-color, #ddd);
      padding: 8px 12px;
      text-align: left;
    }
    .rich-text-content th {
      background: var(--bg-secondary, #f5f5f5);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="rich-text-content" id="content"></div>
  <script>
    (function() {
      var config = window.CHIPS_CARD_CONFIG || {};
      var content = config.content_text || config.content || config.text || '';
      document.getElementById('content').innerHTML = content;
    })();
  </script>
</body>
</html>`,
      css: '',
    };
  }

  /**
   * 创建图片渲染器（ImageCard）
   *
   * 支持四种布局：single、grid、long-scroll、horizontal-scroll
   * 与编辑引擎 CardWindow.vue 和 CardtoHTML 插件的渲染效果一致
   */
  private _createImageRenderer(): RendererCode {
    return {
      html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: var(--bg-color, transparent);
      color: var(--text-color, #333);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .image-card { width: 100%; }
    .image-content { width: 100%; }
    .image-empty {
      padding: 28px 16px;
      text-align: center;
      color: #999;
      font-size: 14px;
    }
    .image-title {
      padding: 12px 16px 4px;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color, #333);
      word-break: break-word;
    }
    .image-caption {
      padding: 4px 16px 12px;
      font-size: 14px;
      color: var(--text-secondary, #666);
      word-break: break-word;
    }
    .layout-single {
      display: flex;
      width: 100%;
    }
    .layout-single img {
      max-width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
    }
    .layout-grid {
      display: grid;
      width: 100%;
    }
    .layout-grid .grid-cell {
      position: relative;
      overflow: hidden;
      aspect-ratio: 1;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.04);
    }
    .layout-grid .grid-cell img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .layout-grid .grid-overflow {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 20px;
      font-weight: 600;
      background: rgba(0, 0, 0, 0.45);
    }
    .layout-long-scroll {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    .layout-long-scroll img {
      width: 100%;
      height: auto;
      display: block;
    }
    .layout-horizontal-scroll {
      display: flex;
      overflow-x: auto;
      overflow-y: hidden;
      width: 100%;
      -webkit-overflow-scrolling: touch;
    }
    .layout-horizontal-scroll img {
      height: 220px;
      width: auto;
      flex-shrink: 0;
      border-radius: 4px;
      object-fit: cover;
    }
  </style>
</head>
<body>
  <div class="image-card">
    <div class="image-content" id="image-container"></div>
    <div class="image-title" id="title"></div>
    <div class="image-caption" id="caption"></div>
  </div>
  <script>
    (function() {
      var config = window.CHIPS_CARD_CONFIG || {};
      var container = document.getElementById('image-container');
      var titleEl = document.getElementById('title');
      var captionEl = document.getElementById('caption');

      function toArray(value) {
        return Array.isArray(value) ? value : [];
      }

      function resolveImageSrc(item) {
        if (!item || typeof item !== 'object') return '';
        if (item.source === 'url' && item.url) return String(item.url);
        if (item.url) return String(item.url);
        if (item.file_path) return String(item.file_path);
        return '';
      }

      function createImageElement(item, className) {
        var img = document.createElement('img');
        img.src = resolveImageSrc(item);
        img.alt = item && item.alt ? String(item.alt) : '';
        img.title = item && item.title ? String(item.title) : '';
        if (className) img.className = className;
        return img;
      }

      function renderLegacySingle() {
        var imageSrc = config.image_file || config.src || config.url || config.image || '';
        if (!imageSrc) {
          container.innerHTML = '<div class="image-empty">No image</div>';
          return;
        }
        var wrapper = document.createElement('div');
        wrapper.className = 'layout-single';
        wrapper.style.justifyContent = 'center';
        var img = document.createElement('img');
        img.src = String(imageSrc);
        var fitMode = config.fit_mode || config.fitMode || 'contain';
        if (fitMode && fitMode !== 'none') img.style.objectFit = String(fitMode);
        wrapper.appendChild(img);
        container.appendChild(wrapper);
      }

      var images = toArray(config.images).filter(function(item) {
        return resolveImageSrc(item);
      });

      if (images.length === 0) {
        renderLegacySingle();
      } else {
        var layoutType = images.length <= 1 ? 'single' : (config.layout_type || 'single');
        var layoutOptions = config.layout_options || {};
        var gap = Number(layoutOptions.gap);
        if (!isFinite(gap)) gap = 8;

        if (layoutType === 'single') {
          var single = document.createElement('div');
          single.className = 'layout-single';
          var align = layoutOptions.single_alignment || 'center';
          var justify = align === 'left' ? 'flex-start' : (align === 'right' ? 'flex-end' : 'center');
          single.style.justifyContent = justify;
          var widthPercent = Number(layoutOptions.single_width_percent);
          if (!isFinite(widthPercent)) widthPercent = 100;
          var singleImg = createImageElement(images[0], '');
          singleImg.style.width = Math.max(10, Math.min(100, widthPercent)) + '%';
          single.appendChild(singleImg);
          container.appendChild(single);
        } else if (layoutType === 'grid') {
          var grid = document.createElement('div');
          grid.className = 'layout-grid';
          grid.style.gap = gap + 'px';
          var gridMode = layoutOptions.grid_mode || '2x2';
          var cols = gridMode === '2x2' ? 2 : 3;
          grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
          var limit = gridMode === '3-column-infinite' ? images.length : (gridMode === '3x3' ? 9 : 4);
          var hasOverflow = images.length > limit && gridMode !== '3-column-infinite';
          var displayCount = hasOverflow ? limit : Math.min(images.length, limit);

          for (var i = 0; i < displayCount; i++) {
            var cell = document.createElement('div');
            cell.className = 'grid-cell';
            var img = createImageElement(images[i], '');
            cell.appendChild(img);
            if (hasOverflow && i === displayCount - 1) {
              var overlay = document.createElement('div');
              overlay.className = 'grid-overflow';
              overlay.textContent = '+' + String(images.length - limit + 1);
              cell.appendChild(overlay);
            }
            grid.appendChild(cell);
          }
          container.appendChild(grid);
        } else if (layoutType === 'long-scroll') {
          var longScroll = document.createElement('div');
          longScroll.className = 'layout-long-scroll';
          longScroll.style.gap = gap + 'px';
          var scrollMode = layoutOptions.scroll_mode || 'fixed-window';
          if (scrollMode === 'fixed-window') {
            var fixedHeight = Number(layoutOptions.fixed_window_height);
            if (!isFinite(fixedHeight)) fixedHeight = 600;
            longScroll.style.maxHeight = fixedHeight + 'px';
            longScroll.style.overflowY = 'auto';
          }
          images.forEach(function(item) {
            longScroll.appendChild(createImageElement(item, ''));
          });
          container.appendChild(longScroll);
        } else if (layoutType === 'horizontal-scroll') {
          var horizontal = document.createElement('div');
          horizontal.className = 'layout-horizontal-scroll';
          horizontal.style.gap = gap + 'px';
          images.forEach(function(item) {
            horizontal.appendChild(createImageElement(item, ''));
          });
          container.appendChild(horizontal);
        } else {
          renderLegacySingle();
        }
      }

      var title = config.title || '';
      if (!title && config.use_image_title_as_title === true && images[0] && images[0].title) {
        title = images[0].title;
      }
      var caption = config.caption || config.description || '';
      if (title) {
        titleEl.textContent = String(title);
      } else {
        titleEl.style.display = 'none';
      }
      if (caption) {
        captionEl.textContent = String(caption);
      } else {
        captionEl.style.display = 'none';
      }
    })();
  </script>
</body>
</html>`,
      css: '',
    };
  }

  /**
   * 创建视频渲染器（VideoCard）
   */
  private _createVideoRenderer(): RendererCode {
    return {
      html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
    }
    .video-container {
      width: 100%;
      height: 100%;
    }
    video {
      width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="video-container">
    <video id="video" controls></video>
  </div>
  <script>
    (function() {
      var config = window.CHIPS_CARD_CONFIG || {};
      var video = document.getElementById('video');
      video.src = config.video_file || config.src || config.url || '';
      var poster = config.cover_image || config.poster || '';
      if (poster) video.poster = poster;
      if (config.autoplay) video.autoplay = true;
      if (config.loop) video.loop = true;
      if (config.muted) video.muted = true;
    })();
  </script>
</body>
</html>`,
      css: '',
    };
  }

  /**
   * 创建音频渲染器（AudioCard）
   */
  private _createAudioRenderer(): RendererCode {
    return {
      html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: var(--bg-color, transparent);
    }
    .audio-container {
      background: var(--bg-secondary, #f8f9fa);
      border-radius: 8px;
      padding: 16px;
    }
    .audio-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 12px;
      color: var(--text-color, #333);
    }
    .audio-artist {
      font-size: 14px;
      color: var(--text-secondary, #666);
      margin-bottom: 12px;
    }
    audio {
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="audio-container">
    <div class="audio-title" id="title"></div>
    <div class="audio-artist" id="artist"></div>
    <audio id="audio" controls></audio>
  </div>
  <script>
    (function() {
      var config = window.CHIPS_CARD_CONFIG || {};
      var audio = document.getElementById('audio');
      var titleEl = document.getElementById('title');
      var artistEl = document.getElementById('artist');
      audio.src = config.audio_file || config.src || config.url || '';
      var title = config.title || config.name || '';
      var artist = config.artist || '';
      if (title) {
        titleEl.textContent = title;
      } else {
        titleEl.style.display = 'none';
      }
      if (artist) {
        artistEl.textContent = artist;
      } else {
        artistEl.style.display = 'none';
      }
    })();
  </script>
</body>
</html>`,
      css: '',
    };
  }

  /**
   * 创建代码渲染器（CodeBlockCard）
   */
  private _createCodeRenderer(): RendererCode {
    return {
      html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: var(--code-bg, #1e1e1e);
    }
    .code-container {
      font-family: var(--font-mono, 'Consolas', 'Monaco', 'Fira Code', monospace);
      font-size: 14px;
      line-height: 1.5;
    }
    .code-header {
      padding: 8px 16px;
      background: var(--code-header-bg, #2d2d2d);
      color: var(--code-header-color, #ccc);
      font-size: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    pre {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
      color: var(--code-color, #d4d4d4);
    }
    code {
      font-family: inherit;
    }
    .line {
      display: block;
    }
    .line-num {
      display: inline-block;
      width: 3em;
      text-align: right;
      margin-right: 1em;
      opacity: 0.4;
      user-select: none;
    }
  </style>
</head>
<body>
  <div class="code-container">
    <div class="code-header" id="language"></div>
    <pre><code id="code"></code></pre>
  </div>
  <script>
    (function() {
      var config = window.CHIPS_CARD_CONFIG || {};
      var codeEl = document.getElementById('code');
      var langEl = document.getElementById('language');
      var codeText = config.code || config.content || '';
      var language = config.language || 'plaintext';
      var showLineNumbers = config.show_line_numbers !== false;

      langEl.textContent = language;

      if (showLineNumbers && codeText) {
        var lines = codeText.split('\\n');
        var html = '';
        for (var i = 0; i < lines.length; i++) {
          var lineContent = lines[i]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          html += '<span class="line"><span class="line-num">' + (i + 1) + '</span>' + lineContent + '</span>';
        }
        codeEl.innerHTML = html;
      } else {
        codeEl.textContent = codeText;
      }
    })();
  </script>
</body>
</html>`,
      css: '',
    };
  }

  /**
   * 创建 Markdown 渲染器（MarkdownCard）
   */
  private _createMarkdownRenderer(): RendererCode {
    return {
      html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 16px 24px;
      font-family: var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--font-size-base, 16px);
      line-height: var(--line-height-base, 1.6);
      color: var(--text-color, #333);
      background: var(--bg-color, transparent);
    }
    .markdown-content h1, .markdown-content h2, .markdown-content h3 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    .markdown-content h1 { font-size: 1.8em; }
    .markdown-content h2 { font-size: 1.5em; }
    .markdown-content h3 { font-size: 1.25em; }
    .markdown-content p { margin: 1em 0; }
    .markdown-content ul, .markdown-content ol { padding-left: 1.5em; margin: 0.6em 0; }
    .markdown-content li { margin: 0.3em 0; }
    .markdown-content code {
      background: var(--code-inline-bg, #f5f5f5);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--font-mono, monospace);
      font-size: 0.9em;
    }
    .markdown-content pre {
      background: var(--code-bg, #1e1e1e);
      color: var(--code-color, #d4d4d4);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    .markdown-content pre code {
      background: transparent;
      padding: 0;
    }
    .markdown-content blockquote {
      margin: 1em 0;
      padding: 0.5em 1em;
      border-left: 4px solid var(--border-color, #ddd);
      background: var(--bg-secondary, #f9f9f9);
    }
    .markdown-content hr {
      border: none;
      border-top: 1px solid var(--border-color, #ddd);
      margin: 1.5em 0;
    }
    .markdown-content a {
      color: var(--link-color, #0066cc);
    }
    .markdown-content img {
      max-width: 100%;
      height: auto;
    }
    .markdown-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.8em 0;
    }
    .markdown-content th, .markdown-content td {
      border: 1px solid var(--border-color, #ddd);
      padding: 8px 12px;
      text-align: left;
    }
    .markdown-content th {
      background: var(--bg-secondary, #f5f5f5);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="markdown-content" id="content"></div>
  <script>
    (function() {
      var config = window.CHIPS_CARD_CONFIG || {};
      var content = config.content || config.markdown || config.text || '';

      function escapeHtml(str) {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      function convertMarkdown(md) {
        var html = escapeHtml(md);

        // 代码块
        html = html.replace(/` + '`' + '`' + '`' + `(\\w*)\\n([\\s\\S]*?)` + '`' + '`' + '`' + `/g, function(_, lang, code) {
          return '<pre><code class="language-' + lang + '">' + code.trim() + '</code></pre>';
        });

        // 标题
        html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
        html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
        html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // 水平线
        html = html.replace(/^---$/gm, '<hr>');

        // 加粗和斜体
        html = html.replace(/[*][*](.+?)[*][*]/g, '<strong>$1</strong>');
        html = html.replace(/[*](.+?)[*]/g, '<em>$1</em>');
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

        // 行内代码
        html = html.replace(/` + '`' + `([^` + '`' + `]+)` + '`' + `/g, '<code>$1</code>');

        // 链接
        html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>');

        // 图片
        html = html.replace(/!\\[([^\\]]*)\\]\\(([^)]+)\\)/g, '<img src="$2" alt="$1">');

        // 引用
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

        // 无序列表
        html = html.replace(/^[*\\-] (.+)$/gm, '<li>$1</li>');

        // 段落
        html = html.replace(/^(?!<[a-z/])(.+)$/gm, '<p>$1</p>');

        return html;
      }

      document.getElementById('content').innerHTML = convertMarkdown(content);
    })();
  </script>
</body>
</html>`,
      css: '',
    };
  }
}

/**
 * 创建渲染代码获取器实例
 */
export function createRendererFetcher(options?: RendererFetcherOptions): RendererFetcher {
  return new RendererFetcher(options);
}
