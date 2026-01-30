/**
 * Markdown格式转换器
 */

import type { Card } from '../types';
import { IdGenerator } from '../core/id';
import { toISODateTime } from '../utils/format';

/**
 * Markdown转换器
 */
export class MarkdownConverter {
  /**
   * 从Markdown导入为卡片
   * @param markdown Markdown文本
   * @param cardName 卡片名称
   * @returns 卡片对象
   */
  static importFromMarkdown(markdown: string, cardName: string): Card {
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
            type: 'MarkdownCard',
          },
        ],
        manifest: {
          card_count: 1,
          resource_count: 0,
        },
      },
      content: {
        [baseCardId]: {
          card_type: 'MarkdownCard',
          content_source: 'inline',
          content_text: markdown,
          show_toc: true,
          syntax_highlight: true,
          highlight_theme: 'github',
        },
      },
    };
  }

  /**
   * 导出卡片为Markdown
   * @param card 卡片对象
   * @returns Markdown文本
   */
  static exportToMarkdown(card: Card): string {
    const parts: string[] = [];

    // 添加卡片标题
    parts.push(`# ${card.metadata.name}\n`);

    // 遍历基础卡片
    for (const item of card.structure.structure) {
      const config = card.content[item.id];

      if (!config) continue;

      // 处理不同类型的基础卡片
      switch (config.card_type) {
        case 'MarkdownCard': {
          const mdConfig = config as {
            content_source: string;
            content_text?: string;
            content_file?: string;
          };

          if (mdConfig.content_source === 'inline' && mdConfig.content_text) {
            parts.push(mdConfig.content_text);
          } else if (mdConfig.content_file) {
            parts.push(`[Markdown文件: ${mdConfig.content_file}]`);
          }
          break;
        }

        case 'RichTextCard': {
          const rtConfig = config as {
            content_source: string;
            content_text?: string;
          };

          if (rtConfig.content_source === 'inline' && rtConfig.content_text) {
            // 简单的HTML到Markdown转换（基础实现）
            const text = this.htmlToMarkdown(rtConfig.content_text);
            parts.push(text);
          }
          break;
        }

        case 'ImageCard': {
          const imgConfig = config as {
            image_file: string;
            title?: string;
          };

          const title = imgConfig.title ?? 'Image';
          parts.push(`![${title}](${imgConfig.image_file})\n`);
          break;
        }

        case 'VideoCard': {
          const vidConfig = config as { video_file: string };
          parts.push(`[Video: ${vidConfig.video_file}]\n`);
          break;
        }

        default:
          parts.push(`[${config.card_type}]\n`);
      }

      parts.push('\n');
    }

    return parts.join('');
  }

  /**
   * 简单的HTML到Markdown转换
   * @param html HTML文本
   * @returns Markdown文本
   */
  private static htmlToMarkdown(html: string): string {
    // 基础实现：移除HTML标签
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''); // 移除剩余的HTML标签
  }
}
