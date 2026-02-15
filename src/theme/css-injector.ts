/**
 * CSS 动态注入器
 * 管理 <style> 标签的创建、更新和移除
 * @module theme/css-injector
 */

import { Logger } from '../logger';

/**
 * 注入的样式条目
 */
interface InjectedStyle {
  /** style 元素 */
  element: HTMLStyleElement;
  /** 样式内容的哈希（用于判断是否需要更新） */
  contentHash: string;
}

/**
 * CSS 注入器配置
 */
export interface CssInjectorOptions {
  /** style 标签的 ID 前缀 */
  idPrefix?: string;
}

/**
 * CSS 动态注入器
 *
 * 负责将主题 CSS 动态注入到 DOM 中，
 * 管理 style 标签的生命周期。
 *
 * @example
 * ```ts
 * const injector = new CssInjector(logger);
 * injector.inject('tokens', ':root { --chips-color-primary: #3b82f6; }');
 * injector.inject('components', '.chips-button { display: flex; }');
 * injector.removeAll();
 * ```
 */
export class CssInjector {
  private readonly _styles = new Map<string, InjectedStyle>();
  private readonly _logger: Logger;
  private readonly _idPrefix: string;

  constructor(logger: Logger, options?: CssInjectorOptions) {
    this._logger = logger.createChild('CssInjector');
    this._idPrefix = options?.idPrefix ?? 'chips-theme';
  }

  /**
   * 检测是否在浏览器环境中
   */
  private _hasDom(): boolean {
    return typeof document !== 'undefined' && typeof document.createElement === 'function';
  }

  /**
   * 计算内容哈希（简单的字符串哈希）
   */
  private _hash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash.toString(36);
  }

  /**
   * 注入 CSS 到 DOM
   * @param key - 样式标识（如 'tokens'、'components'、'animations'）
   * @param css - CSS 内容
   * @returns 是否实际更新了 DOM
   */
  inject(key: string, css: string): boolean {
    if (!this._hasDom()) {
      this._logger.debug('Skipping CSS injection: no DOM environment', { key });
      return false;
    }

    const contentHash = this._hash(css);
    const existing = this._styles.get(key);

    if (existing && existing.contentHash === contentHash) {
      this._logger.debug('CSS unchanged, skipping injection', { key });
      return false;
    }

    if (existing) {
      existing.element.textContent = css;
      existing.contentHash = contentHash;
      this._logger.debug('CSS updated', { key });
      return true;
    }

    const element = document.createElement('style');
    element.id = `${this._idPrefix}-${key}`;
    element.setAttribute('data-chips-theme-layer', key);
    element.textContent = css;

    const head = document.head;
    if (!head) {
      this._logger.warn('Cannot inject CSS: document.head is null');
      return false;
    }

    head.appendChild(element);
    this._styles.set(key, { element, contentHash });
    this._logger.debug('CSS injected', { key, id: element.id });
    return true;
  }

  /**
   * 批量注入多个 CSS 层
   * @param layers - 键值对，key 为层标识，value 为 CSS 内容
   * @returns 实际更新的层数
   */
  injectAll(layers: Record<string, string>): number {
    let updated = 0;
    for (const [key, css] of Object.entries(layers)) {
      if (this.inject(key, css)) {
        updated++;
      }
    }
    return updated;
  }

  /**
   * 移除指定 key 的样式
   * @param key - 样式标识
   * @returns 是否成功移除
   */
  remove(key: string): boolean {
    const entry = this._styles.get(key);
    if (!entry) {
      return false;
    }

    entry.element.remove();
    this._styles.delete(key);
    this._logger.debug('CSS removed', { key });
    return true;
  }

  /**
   * 移除所有注入的样式
   */
  removeAll(): void {
    for (const [key, entry] of this._styles) {
      entry.element.remove();
      this._logger.debug('CSS removed', { key });
    }
    this._styles.clear();
  }

  /**
   * 检查指定 key 是否已注入
   */
  has(key: string): boolean {
    return this._styles.has(key);
  }

  /**
   * 获取已注入的样式 key 列表
   */
  get keys(): string[] {
    return Array.from(this._styles.keys());
  }

  /**
   * 获取已注入的样式数量
   */
  get count(): number {
    return this._styles.size;
  }
}
