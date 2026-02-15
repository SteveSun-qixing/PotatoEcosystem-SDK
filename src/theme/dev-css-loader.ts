/**
 * 开发模式 CSS 加载器
 * 当 Bridge 不可用时，从本地包加载主题 CSS
 * @module theme/dev-css-loader
 */

import { Logger } from '../logger';
import { CssInjector } from './css-injector';

/**
 * 开发模式 CSS 加载器配置
 */
export interface DevCssLoaderOptions {
  /** 主题包的 CSS 基础路径（相对于项目根目录） */
  themeBasePath?: string;
  /** 需要加载的组件 CSS 文件列表 */
  componentFiles?: string[];
}

/**
 * 默认组件 CSS 文件列表
 * 对应 chips-theme-default 中的 24 个组件
 */
const DEFAULT_COMPONENT_FILES = [
  'button', 'input', 'textarea', 'checkbox', 'switch',
  'radio', 'select', 'dialog', 'tabs', 'dropdown',
  'tooltip', 'slider', 'accordion', 'toast',
  'card-wrapper', 'card-loading', 'card-error',
  'iframe-host', 'cover-frame', 'dock',
  'tool-window', 'file-tree', 'tag-input', 'zoom-slider',
];

/**
 * 开发模式 CSS 加载器
 *
 * 在插件独立运行（不在 Host 内）时，
 * 通过 Vite 的 CSS 处理能力直接加载主题包的 CSS 文件。
 *
 * @example
 * ```ts
 * const loader = new DevCssLoader(logger, injector);
 * await loader.loadFromPackage();
 * ```
 */
export class DevCssLoader {
  private readonly _logger: Logger;
  private readonly _injector: CssInjector;
  private readonly _options: Required<DevCssLoaderOptions>;
  private _loaded = false;

  constructor(
    logger: Logger,
    injector: CssInjector,
    options?: DevCssLoaderOptions,
  ) {
    this._logger = logger.createChild('DevCssLoader');
    this._injector = injector;
    this._options = {
      themeBasePath: options?.themeBasePath ?? '@chips/theme-default/dist',
      componentFiles: options?.componentFiles ?? DEFAULT_COMPONENT_FILES,
    };
  }

  /**
   * 是否已加载
   */
  get loaded(): boolean {
    return this._loaded;
  }

  /**
   * 从本地主题包加载所有 CSS
   * 使用动态 import 让 Vite 处理 CSS 文件
   */
  async loadFromPackage(): Promise<boolean> {
    if (this._loaded) {
      this._logger.debug('CSS already loaded, skipping');
      return true;
    }

    try {
      const cssTexts = await this._collectCssTexts();
      if (cssTexts.tokens || cssTexts.components || cssTexts.animations) {
        if (cssTexts.tokens) {
          this._injector.inject('tokens', cssTexts.tokens);
        }
        if (cssTexts.components) {
          this._injector.inject('components', cssTexts.components);
        }
        if (cssTexts.animations) {
          this._injector.inject('animations', cssTexts.animations);
        }
        if (cssTexts.icons) {
          this._injector.inject('icons', cssTexts.icons);
        }

        this._loaded = true;
        this._logger.info('Dev mode CSS loaded from local package');
        return true;
      }

      this._logger.warn('No CSS content collected from local package');
      return false;
    } catch (error) {
      this._logger.warn('Failed to load CSS from local package', {
        error: String(error),
      });
      return false;
    }
  }

  /**
   * 从提供的 CSS 文本直接加载
   * 用于测试或自定义加载场景
   */
  loadFromText(layers: Record<string, string>): void {
    this._injector.injectAll(layers);
    this._loaded = true;
    this._logger.debug('CSS loaded from text', {
      layers: Object.keys(layers),
    });
  }

  /**
   * 收集所有 CSS 文本
   */
  private async _collectCssTexts(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    // 加载 Token CSS
    const tokensCss = await this._fetchCssFile('tokens/global.css');
    if (tokensCss) {
      result.tokens = tokensCss;
    }

    // 加载组件 CSS
    const componentParts: string[] = [];
    for (const name of this._options.componentFiles) {
      const css = await this._fetchCssFile(`components/${name}.css`);
      if (css) {
        componentParts.push(css);
      }
    }
    if (componentParts.length > 0) {
      result.components = componentParts.join('\n');
    }

    // 加载动画 CSS
    const keyframesCss = await this._fetchCssFile('animations/keyframes.css');
    const transitionsCss = await this._fetchCssFile('animations/transitions.css');
    const animationParts = [keyframesCss, transitionsCss].filter(Boolean);
    if (animationParts.length > 0) {
      result.animations = animationParts.join('\n');
    }

    // 加载图标 CSS
    const iconsCss = await this._fetchCssFile('icons/icons.css');
    if (iconsCss) {
      result.icons = iconsCss;
    }

    return result;
  }

  /**
   * 获取单个 CSS 文件内容
   * 通过 fetch 加载（Vite dev server 会处理路径解析）
   */
  private async _fetchCssFile(relativePath: string): Promise<string | null> {
    try {
      const url = `/${this._options.themeBasePath}/${relativePath}`;
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      return await response.text();
    } catch {
      return null;
    }
  }
}
