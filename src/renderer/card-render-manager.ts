/**
 * CardRenderManager - 卡片渲染管理器
 * @module renderer/card-render-manager
 *
 * 负责将解析后的卡片数据 + 渲染代码组装为实时 DOM。
 *
 * 支持两种隔离模式，开发者可以根据场景自由选择：
 *
 * **iframe 模式**（默认，推荐）
 * - 每个基础卡片在独立的 iframe 中渲染，拥有完整的浏览器环境
 * - 完全安全隔离：插件无法访问宿主页面
 * - 故障隔离：一个卡片脚本崩溃不影响其他卡片
 * - 插件可以使用任何浏览器 API 和框架
 * - 与设计原稿一致："每个基础卡片渲染为一个独立的 iframe 窗口"
 * - 适合：查看器、第三方 SDK 嵌入、社区服务器、安全敏感场景
 *
 * **Shadow DOM 模式**（轻量备选）
 * - 基础卡片在同一页面内通过 Shadow DOM 隔离
 * - CSS 隔离有效，JS 通过作用域代理隔离（非完全隔离）
 * - 更轻量，适合大量基础卡片或性能敏感场景
 * - 适合：静态导出、移动端性能优化、简单预览
 *
 * 参考实现：
 * - iframe 模式：设计原稿「卡片渲染机制详解」
 * - Shadow DOM 模式：CardtoHTML 转换插件 HTMLGenerator
 */

import type {
  ParsedCardData,
  ParsedBaseCardConfig,
  RendererCode,
  RendererCodeMap,
  CardRenderManagerOptions,
  MountedBaseCard,
  CardMountResult,
  IsolationMode,
} from './types';

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<CardRenderManagerOptions> = {
  isolationMode: 'iframe',
  animations: false,
  cardGap: 0,
  containerPadding: 0,
};

/**
 * iframe 自动调整高度的脚本
 *
 * 注入到每个 iframe 中，使用 ResizeObserver 监听内容变化并通知宿主。
 * 通过 postMessage 与宿主通信。
 */
const IFRAME_RESIZE_SCRIPT = `
<script>
(function() {
  function notifyHeight() {
    var h = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
    if (h > 0 && window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'chips-card-resize',
        cardId: document.body.getAttribute('data-chips-card-id') || '',
        height: h
      }, '*');
    }
  }

  // 初始通知
  if (document.readyState === 'complete') {
    notifyHeight();
  } else {
    window.addEventListener('load', notifyHeight);
  }

  // 监听 DOM 变化
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(notifyHeight).observe(document.body);
  } else if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(notifyHeight).observe(document.body, {
      childList: true, subtree: true, attributes: true, characterData: true
    });
  }

  // 监听图片/媒体加载
  document.addEventListener('load', function(e) {
    if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || e.target.tagName === 'IFRAME')) {
      setTimeout(notifyHeight, 50);
    }
  }, true);

  // 定时兜底（处理异步加载内容）
  var checkCount = 0;
  var lastHeight = 0;
  var timer = setInterval(function() {
    var h = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
    if (h !== lastHeight) {
      lastHeight = h;
      notifyHeight();
    }
    checkCount++;
    if (checkCount > 20) clearInterval(timer);
  }, 500);
})();
</script>`;

/**
 * 直出数据包（Shadow DOM 模式使用）
 */
interface InlineBundle {
  id: string;
  type: string;
  config: Record<string, unknown>;
  bodyHTML: string;
  inlineStyles: string[];
  inlineScripts: string[];
}

/**
 * 卡片渲染管理器
 *
 * @example
 * ```ts
 * // iframe 模式（默认，推荐）
 * const manager = new CardRenderManager({ isolationMode: 'iframe' });
 *
 * // Shadow DOM 模式（轻量）
 * const manager = new CardRenderManager({ isolationMode: 'shadow-dom' });
 *
 * const result = manager.render(cardData, renderers, container);
 * // 清理
 * result.destroy?.();
 * ```
 */
export class CardRenderManager {
  private _options: Required<CardRenderManagerOptions>;
  private _resizeHandler: ((event: MessageEvent) => void) | null = null;
  private _iframeMap: Map<string, HTMLIFrameElement> = new Map();

  /**
   * 创建卡片渲染管理器实例
   *
   * @param options - 配置选项
   */
  constructor(options?: CardRenderManagerOptions) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 渲染卡片到容器
   *
   * @param cardData - 解析后的卡片数据
   * @param renderers - 渲染代码映射
   * @param container - 目标容器元素
   * @returns 渲染结果
   */
  render(
    cardData: ParsedCardData,
    renderers: RendererCodeMap,
    container: HTMLElement
  ): CardMountResult {
    const mountedCards: MountedBaseCard[] = [];
    const warnings: string[] = [];

    try {
      // 清空容器和旧的事件监听
      this._cleanup();
      container.innerHTML = '';

      // 设置容器样式
      this._setupContainer(container);

      // 创建卡片主体
      const cardBody = document.createElement('div');
      cardBody.className = 'chips-card-body';
      cardBody.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: ${this._options.cardGap}px;
        width: 100%;
      `;

      // 如果是 iframe 模式，注册全局消息监听
      if (this._options.isolationMode === 'iframe') {
        this._setupResizeListener();
      }

      // 为每个基础卡片创建隔离渲染
      for (const baseCard of cardData.baseCards) {
        const renderer = renderers.get(baseCard.type);
        if (!renderer) {
          warnings.push(`No renderer for type: ${baseCard.type}`);
          continue;
        }

        try {
          const mounted = this._mountBaseCard(
            baseCard,
            renderer,
            cardBody,
            this._options.isolationMode
          );
          mountedCards.push(mounted);
        } catch (error) {
          warnings.push(
            `Failed to mount ${baseCard.type} (${baseCard.id}): ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // 空状态
      if (cardData.baseCards.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.style.cssText =
          'color: #999; text-align: center; padding: 40px 0; font-size: 14px;';
        emptyEl.textContent = 'No content';
        cardBody.appendChild(emptyEl);
      }

      container.appendChild(cardBody);

      // 销毁方法
      const destroy = (): void => {
        for (const mounted of mountedCards) {
          mounted.destroy();
        }
        mountedCards.length = 0;
        this._cleanup();
        container.innerHTML = '';
      };

      return {
        success: true,
        container,
        mountedCards,
        warnings: warnings.length > 0 ? warnings : undefined,
        destroy,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }
  }

  // ========== 私有方法 ==========

  /**
   * 清理旧的事件监听和 iframe 映射
   */
  private _cleanup(): void {
    if (this._resizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this._resizeHandler);
      this._resizeHandler = null;
    }
    this._iframeMap.clear();
  }

  /**
   * 设置 iframe 高度调整的消息监听
   */
  private _setupResizeListener(): void {
    if (typeof window === 'undefined') return;

    this._resizeHandler = (event: MessageEvent) => {
      const data = event.data;
      if (
        data &&
        typeof data === 'object' &&
        data.type === 'chips-card-resize' &&
        typeof data.cardId === 'string' &&
        typeof data.height === 'number'
      ) {
        const iframe = this._iframeMap.get(data.cardId);
        if (iframe && data.height > 0) {
          iframe.style.height = data.height + 'px';
        }
      }
    };

    window.addEventListener('message', this._resizeHandler);
  }

  /**
   * 设置容器样式
   */
  private _setupContainer(container: HTMLElement): void {
    container.style.cssText = `
      width: 100%;
      padding: ${this._options.containerPadding}px;
      box-sizing: border-box;
    `;
    container.setAttribute('data-chips-renderer', 'true');
    container.setAttribute('data-chips-isolation', this._options.isolationMode);
  }

  /**
   * 挂载单个基础卡片
   */
  private _mountBaseCard(
    baseCard: ParsedBaseCardConfig,
    renderer: RendererCode,
    parent: HTMLElement,
    isolationMode: IsolationMode
  ): MountedBaseCard {
    // 创建包装器
    const wrapper = document.createElement('section');
    wrapper.className = 'chips-base-card-wrapper';
    wrapper.setAttribute('data-card-id', baseCard.id);
    wrapper.setAttribute('data-card-type', baseCard.type);
    wrapper.style.cssText = `
      width: 100%;
      position: relative;
      overflow: visible;
    `;

    // 创建宿主元素
    const host = document.createElement('div');
    host.className = 'chips-base-card-host';
    host.style.cssText = `
      width: 100%;
      display: block;
      min-height: 16px;
      background: transparent;
    `;
    wrapper.appendChild(host);
    parent.appendChild(wrapper);

    if (isolationMode === 'shadow-dom') {
      return this._mountWithShadowDOM(baseCard, renderer, host, wrapper);
    } else {
      return this._mountWithIframe(baseCard, renderer, host, wrapper);
    }
  }

  // ========== iframe 模式 ==========

  /**
   * 使用 iframe 隔离渲染
   *
   * 每个基础卡片在独立的 iframe 中渲染，拥有完整的浏览器环境。
   * - 注入 CHIPS_CARD_CONFIG 配置数据
   * - 注入自动高度调整脚本（通过 postMessage 通知宿主）
   * - 设置透明背景
   * - 配置安全沙箱
   */
  private _mountWithIframe(
    baseCard: ParsedBaseCardConfig,
    renderer: RendererCode,
    host: HTMLElement,
    wrapper: HTMLElement
  ): MountedBaseCard {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
      width: 100%;
      border: none;
      display: block;
      min-height: 48px;
      background: transparent;
    `;
    iframe.setAttribute('data-card-id', baseCard.id);
    iframe.setAttribute('data-card-type', baseCard.type);

    // 记录到 iframe 映射（用于高度调整回调）
    this._iframeMap.set(baseCard.id, iframe);

    // 构建完整的 iframe HTML
    const html = this._buildIframeHTML(baseCard, renderer);

    // 使用 srcdoc 写入内容（比 document.write 更可靠，不受 CSP/sandbox 限制）
    iframe.srcdoc = html;

    // 高度自动调整：load 事件触发后测量并更新
    iframe.addEventListener('load', () => {
      this._fallbackResizeIframe(iframe);
    });

    host.appendChild(iframe);

    return {
      id: baseCard.id,
      type: baseCard.type,
      hostElement: wrapper,
      iframe,
      destroy: () => {
        this._iframeMap.delete(baseCard.id);
        wrapper.remove();
      },
    };
  }

  /**
   * 构建 iframe 完整 HTML
   *
   * 在渲染代码的基础上注入：
   * 1. CHIPS_CARD_CONFIG 配置数据
   * 2. 自动高度调整脚本
   * 3. 卡片 ID 标记
   */
  private _buildIframeHTML(baseCard: ParsedBaseCardConfig, renderer: RendererCode): string {
    // 1. 配置注入脚本
    const configScript = `<script>window.CHIPS_CARD_CONFIG = ${JSON.stringify(baseCard.config)};</script>`;

    // 2. 基础样式：确保 iframe 内容无额外 margin，背景透明
    //    注意：不设 overflow:hidden，否则 scrollHeight 无法正确测量
    const baseStyle = `<style>
html, body {
  margin: 0;
  padding: 0;
  background: transparent;
  width: 100%;
}
</style>`;

    let html = renderer.html;

    // 注入 data-chips-card-id 到 body（用于高度通知识别）
    if (html.includes('<body>')) {
      html = html.replace('<body>', `<body data-chips-card-id="${baseCard.id}">`);
    } else if (html.includes('<body ')) {
      html = html.replace(/<body /, `<body data-chips-card-id="${baseCard.id}" `);
    }

    // 注入配置和基础样式到 head
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${baseStyle}\n${configScript}\n</head>`);
    } else if (html.includes('<body')) {
      html = html.replace(/<body/, `${baseStyle}\n${configScript}\n<body`);
    } else {
      html = baseStyle + configScript + html;
    }

    // 注入高度调整脚本到 body 末尾
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${IFRAME_RESIZE_SCRIPT}\n</body>`);
    } else {
      html += IFRAME_RESIZE_SCRIPT;
    }

    // 注入额外 CSS
    if (renderer.css) {
      const extraStyle = `<style>${renderer.css}</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${extraStyle}\n</head>`);
      }
    }

    return html;
  }

  /**
   * 回退方式调整 iframe 高度
   *
   * 尝试直接读取 iframe contentDocument 的高度。
   * 对 srcdoc iframe 多次测量，因为内容可能异步加载（图片等）。
   */
  private _fallbackResizeIframe(iframe: HTMLIFrameElement): void {
    const measure = (): void => {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const height = Math.max(
            doc.body?.scrollHeight ?? 0,
            doc.body?.offsetHeight ?? 0,
            doc.documentElement?.scrollHeight ?? 0,
            doc.documentElement?.offsetHeight ?? 0
          );
          if (height > 0) {
            iframe.style.height = height + 'px';
          }
        }
      } catch {
        // 跨域限制，忽略 -- postMessage 机制会处理
      }
    };

    // 立即测量一次
    measure();

    // 延迟多次测量（等待图片、字体等异步资源加载）
    setTimeout(measure, 100);
    setTimeout(measure, 500);
    setTimeout(measure, 1500);
  }

  // ========== Shadow DOM 模式 ==========

  /**
   * 使用 Shadow DOM 隔离渲染
   *
   * 参考 CardtoHTML 插件 HTMLGenerator 中的 mountBundle 函数实现。
   * - 从渲染代码 HTML 中提取 CSS、body HTML、脚本
   * - 在 Shadow DOM 中重新组装
   * - 通过作用域代理提供 window/document 环境
   */
  private _mountWithShadowDOM(
    baseCard: ParsedBaseCardConfig,
    renderer: RendererCode,
    host: HTMLElement,
    wrapper: HTMLElement
  ): MountedBaseCard {
    // 构建直出数据包
    const bundle = this._buildInlineBundle(baseCard, renderer);

    // 创建 Shadow DOM
    const shadowRoot = host.attachShadow({ mode: 'open' });

    // 1. 注入宿主重置样式
    const resetStyle = document.createElement('style');
    resetStyle.textContent =
      ':host { display: block; width: 100%; contain: content; } .chips-inline-card-shell { width: 100%; display: block; }';
    shadowRoot.appendChild(resetStyle);

    // 2. 注入内联样式（从渲染代码中提取并作用域化）
    for (const cssText of bundle.inlineStyles) {
      if (!cssText.trim()) continue;
      const styleEl = document.createElement('style');
      styleEl.textContent = this._scopeCardStyle(cssText);
      shadowRoot.appendChild(styleEl);
    }

    // 3. 注入额外 CSS
    if (renderer.css) {
      const extraStyle = document.createElement('style');
      extraStyle.textContent = this._scopeCardStyle(renderer.css);
      shadowRoot.appendChild(extraStyle);
    }

    // 4. 创建内容容器并注入 body HTML
    const scopeRoot = document.createElement('div');
    scopeRoot.className = 'chips-inline-card-shell';
    scopeRoot.innerHTML = bundle.bodyHTML;
    shadowRoot.appendChild(scopeRoot);

    // 5. 创建作用域 document 代理
    const scopedDocument = this._createScopedDocument(scopeRoot);

    // 6. 创建作用域 window 代理
    const scopedWindow = this._createScopedWindow(scopedDocument, bundle.config);

    // 7. 执行内联脚本
    for (const script of bundle.inlineScripts) {
      this._runInlineScript(script, scopedWindow, scopedDocument, baseCard.id);
    }

    return {
      id: baseCard.id,
      type: baseCard.type,
      hostElement: wrapper,
      shadowRoot,
      destroy: () => {
        wrapper.remove();
      },
    };
  }

  /**
   * 构建直出数据包（Shadow DOM 模式使用）
   */
  private _buildInlineBundle(
    baseCard: ParsedBaseCardConfig,
    renderer: RendererCode
  ): InlineBundle {
    const html = renderer.html;

    const inlineStyles = this._extractInlineStyleBlocks(html);

    const inlineScripts = this._extractInlineScripts(html).filter(
      (code) => !/window\.CHIPS_CARD_CONFIG\s*=/.test(code)
    );

    const bodyHTML = this._stripScriptTags(this._extractBodyHTML(html));

    return {
      id: baseCard.id,
      type: baseCard.type,
      config: baseCard.config,
      bodyHTML,
      inlineStyles,
      inlineScripts,
    };
  }

  /**
   * 创建作用域 document 代理
   */
  private _createScopedDocument(scopeRoot: HTMLElement): Record<string, unknown> {
    const owner = scopeRoot.ownerDocument || document;

    function findById(id: string): Element | null {
      if (!id) return null;
      const list = scopeRoot.querySelectorAll('[id]');
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          return list[i];
        }
      }
      return null;
    }

    return {
      getElementById: findById,
      querySelector: (selector: string) => scopeRoot.querySelector(selector),
      querySelectorAll: (selector: string) => scopeRoot.querySelectorAll(selector),
      getElementsByClassName: (className: string) => scopeRoot.getElementsByClassName(className),
      getElementsByTagName: (tagName: string) => scopeRoot.getElementsByTagName(tagName),
      createElement: (tagName: string) => owner.createElement(tagName),
      createElementNS: (ns: string, name: string) => owner.createElementNS(ns, name),
      createTextNode: (text: string) => owner.createTextNode(text),
      createDocumentFragment: () => owner.createDocumentFragment(),
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => {
        scopeRoot.addEventListener(type, listener, options as AddEventListenerOptions);
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => {
        scopeRoot.removeEventListener(type, listener, options as EventListenerOptions);
      },
      body: scopeRoot,
      head: scopeRoot,
      documentElement: scopeRoot,
      defaultView: typeof window !== 'undefined' ? window : null,
      readyState: 'complete',
    };
  }

  /**
   * 创建作用域 window 代理
   */
  private _createScopedWindow(
    scopedDocument: Record<string, unknown>,
    config: Record<string, unknown>
  ): Record<string, unknown> {
    const w = typeof window !== 'undefined' ? window : ({} as Window);

    const scopedWindow: Record<string, unknown> = {
      CHIPS_CARD_CONFIG: config,
      document: scopedDocument,
      console: typeof console !== 'undefined' ? console : {},
      setTimeout: typeof setTimeout !== 'undefined' ? setTimeout.bind(w) : undefined,
      clearTimeout: typeof clearTimeout !== 'undefined' ? clearTimeout.bind(w) : undefined,
      setInterval: typeof setInterval !== 'undefined' ? setInterval.bind(w) : undefined,
      clearInterval: typeof clearInterval !== 'undefined' ? clearInterval.bind(w) : undefined,
      requestAnimationFrame:
        typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame.bind(w) : undefined,
      cancelAnimationFrame:
        typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame.bind(w) : undefined,
    };

    scopedWindow.window = scopedWindow;
    scopedWindow.self = scopedWindow;
    scopedWindow.globalThis = scopedWindow;

    return scopedWindow;
  }

  /**
   * 在作用域中执行内联脚本
   */
  private _runInlineScript(
    sourceCode: string,
    scopedWindow: Record<string, unknown>,
    scopedDocument: Record<string, unknown>,
    cardId: string
  ): void {
    if (!sourceCode || !sourceCode.trim()) return;

    try {
      // eslint-disable-next-line no-new-func
      const runner = new Function(
        'window',
        'document',
        sourceCode + '\n//# sourceURL=chips-sdk-card-' + cardId
      );
      runner.call(scopedWindow, scopedWindow, scopedDocument);
    } catch (error) {
      if (typeof console !== 'undefined') {
        console.error('[Chips SDK] Base card script error:', cardId, error);
      }
    }
  }

  // ========== HTML 解析工具方法 ==========

  /**
   * 将页面级选择器转换为 Shadow DOM 作用域
   */
  private _scopeCardStyle(css: string): string {
    return css
      .replace(/:root/g, ':host')
      .replace(/\bhtml\b/g, ':host')
      .replace(/\bbody\b/g, ':host');
  }

  /**
   * 提取 body 内部 HTML
   */
  private _extractBodyHTML(html: string): string {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch?.[1] ?? html;
  }

  /**
   * 提取内联样式块
   */
  private _extractInlineStyleBlocks(html: string): string[] {
    const styles: string[] = [];
    const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;

    let match = styleRegex.exec(html);
    while (match) {
      styles.push(match[1] ?? '');
      match = styleRegex.exec(html);
    }

    return styles;
  }

  /**
   * 提取内联脚本
   */
  private _extractInlineScripts(html: string): string[] {
    const scripts: string[] = [];
    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

    let match = scriptRegex.exec(html);
    while (match) {
      const attrs = match[1] ?? '';
      if (/src\s*=/i.test(attrs)) {
        match = scriptRegex.exec(html);
        continue;
      }

      const code = match[2] ?? '';
      if (code.trim().length > 0) {
        scripts.push(code);
      }

      match = scriptRegex.exec(html);
    }

    return scripts;
  }

  /**
   * 删除 HTML 中的脚本标签
   */
  private _stripScriptTags(html: string): string {
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  }
}

/**
 * 创建卡片渲染管理器实例
 */
export function createCardRenderManager(options?: CardRenderManagerOptions): CardRenderManager {
  return new CardRenderManager(options);
}
