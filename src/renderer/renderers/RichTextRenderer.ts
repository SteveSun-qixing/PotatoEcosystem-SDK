/**
 * 富文本卡片渲染器
 */

import type { BaseCardRenderer } from './BaseCardRenderer';
import type { BaseCardConfig } from '../../types';
import type { RenderOptions } from '../RendererEngine';

/**
 * 富文本渲染器
 */
export class RichTextRenderer implements BaseCardRenderer {
  render(
    config: BaseCardConfig,
    container: HTMLElement,
    _options: RenderOptions
  ): void {
    const rtConfig = config as any as {
      content_source: string;
      content_text?: string;
      content_file?: string;
    };

    // 创建内容容器
    const contentDiv = document.createElement('div');
    contentDiv.className = 'richtext-content';

    if (rtConfig.content_source === 'inline' && rtConfig.content_text) {
      // 内联内容，直接插入HTML
      contentDiv.innerHTML = rtConfig.content_text;
    } else if (rtConfig.content_file) {
      // 文件内容，显示占位符（实际需要加载文件）
      contentDiv.innerHTML = `<p>加载中: ${rtConfig.content_file}</p>`;
    } else {
      contentDiv.innerHTML = '<p>无内容</p>';
    }

    container.appendChild(contentDiv);
  }
}
