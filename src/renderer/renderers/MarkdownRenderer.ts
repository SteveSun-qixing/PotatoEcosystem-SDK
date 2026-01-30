/**
 * Markdown卡片渲染器
 */

import type { BaseCardRenderer } from './BaseCardRenderer';
import type { BaseCardConfig } from '../../types';
import type { RenderOptions } from '../RendererEngine';

/**
 * Markdown渲染器
 */
export class MarkdownRenderer implements BaseCardRenderer {
  render(
    config: BaseCardConfig,
    container: HTMLElement,
    _options: RenderOptions
  ): void {
    const mdConfig = config as {
      content_source: string;
      content_text?: string;
      content_file?: string;
    };

    // 创建内容容器
    const contentDiv = document.createElement('div');
    contentDiv.className = 'markdown-content';

    if (mdConfig.content_source === 'inline' && mdConfig.content_text) {
      // 简单的Markdown到HTML转换（基础实现）
      const html = this.markdownToHtml(mdConfig.content_text);
      contentDiv.innerHTML = html;
    } else if (mdConfig.content_file) {
      contentDiv.innerHTML = `<p>加载中: ${mdConfig.content_file}</p>`;
    } else {
      contentDiv.innerHTML = '<p>无内容</p>';
    }

    container.appendChild(contentDiv);
  }

  /**
   * 简单的Markdown到HTML转换
   * @param markdown Markdown文本
   * @returns HTML文本
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>');
  }
}
