/**
 * HTML格式转换器
 */

import type { Card } from '../types';
import { IdGenerator } from '../core/id';
import { toISODateTime } from '../utils/format';

/**
 * HTML转换器
 */
export class HtmlConverter {
  /**
   * 从HTML导入为卡片
   * @param html HTML文本
   * @param cardName 卡片名称
   * @returns 卡片对象
   */
  static importFromHTML(html: string, cardName: string): Card {
    const cardId = IdGenerator.generate();
    const baseCardId = IdGenerator.generate();
    const now = toISODateTime();

    return {
      metadata: {
        chip_standards_version: '1.0.0',
        card_id: cardId,
        name: cardName,
        created_at: now,
        modified_at: now,
      },
      structure: {
        structure: [
          {
            id: baseCardId,
            type: 'RichTextCard',
          },
        ],
        manifest: {
          card_count: 1,
          resource_count: 0,
        },
      },
      content: {
        [baseCardId]: {
          card_type: 'RichTextCard',
          content_source: 'inline',
          content_text: html,
          toolbar: false,
        },
      },
    };
  }

  /**
   * 导出卡片为HTML
   * @param card 卡片对象
   * @returns HTML文本
   */
  static exportToHTML(card: Card): string {
    const parts: string[] = [];

    // HTML头部
    parts.push(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(card.metadata.name)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(card.metadata.name)}</h1>
`);

    // 遍历基础卡片
    for (const item of card.structure.structure) {
      const config = card.content[item.id];

      if (!config) continue;

      switch (config.card_type) {
        case 'RichTextCard': {
          const rtConfig = config as {
            content_source: string;
            content_text?: string;
          };

          if (rtConfig.content_source === 'inline' && rtConfig.content_text) {
            parts.push(
              `  <div class="richtext">${rtConfig.content_text}</div>\n`
            );
          }
          break;
        }

        case 'MarkdownCard': {
          const mdConfig = config as {
            content_source: string;
            content_text?: string;
          };

          if (mdConfig.content_source === 'inline' && mdConfig.content_text) {
            // 简单的Markdown到HTML转换（基础实现）
            const html = this.markdownToHtml(mdConfig.content_text);
            parts.push(`  <div class="markdown">${html}</div>\n`);
          }
          break;
        }

        case 'ImageCard': {
          const imgConfig = config as {
            image_file: string;
            title?: string;
            caption?: string;
          };

          const title = imgConfig.title ? this.escapeHtml(imgConfig.title) : '';
          const caption = imgConfig.caption
            ? this.escapeHtml(imgConfig.caption)
            : '';

          parts.push(`  <figure>
    <img src="${this.escapeHtml(imgConfig.image_file)}" alt="${title}">
    ${caption ? `<figcaption>${caption}</figcaption>` : ''}
  </figure>\n`);
          break;
        }

        default:
          parts.push(`  <p>[${config.card_type}]</p>\n`);
      }
    }

    // HTML尾部
    parts.push(`</body>
</html>`);

    return parts.join('');
  }

  /**
   * 简单的Markdown到HTML转换
   * @param markdown Markdown文本
   * @returns HTML文本
   */
  private static markdownToHtml(markdown: string): string {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>');
  }

  /**
   * 转义HTML特殊字符
   * @param text 文本
   * @returns 转义后的文本
   */
  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
