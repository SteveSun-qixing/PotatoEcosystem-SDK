/**
 * create命令 - 创建新卡片
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import { NodeAdapter } from '../../src/platform/node/NodeAdapter';
import { Logger } from '../../src/core/logger';
import { FileAPI } from '../../src/api/FileAPI';
import { MarkdownConverter } from '../../src/converter/MarkdownConverter';
import { HtmlConverter } from '../../src/converter/HtmlConverter';
import { IdGenerator } from '../../src/core/id';
import { toISODateTime } from '../../src/utils/format';
import type { Card } from '../../src/types';

/**
 * 创建create命令
 */
export function createCommand(): Command {
  const command = new Command('create');

  command
    .description('创建新的卡片文件')
    .argument('<output>', '输出文件路径（.card文件）')
    .option('-n, --name <name>', '卡片名称', 'New Card')
    .option('-t, --type <type>', '卡片类型 (markdown|html|empty)', 'empty')
    .option('-i, --input <file>', '输入文件路径（用于markdown/html类型）')
    .option('-c, --content <text>', '直接指定内容文本')
    .option('-f, --force', '覆盖已存在的文件', false)
    .action(async (output: string, options) => {
      try {
        // 验证输出路径
        if (!output.endsWith('.card')) {
          console.error('错误: 输出文件必须是.card格式');
          process.exit(1);
        }

        // 检查文件是否存在
        const exists = await fs.access(output).then(() => true).catch(() => false);
        if (exists && !options.force) {
          console.error(`错误: 文件已存在: ${output}`);
          console.error('使用 --force 选项可以覆盖已存在的文件');
          process.exit(1);
        }

        // 初始化SDK组件
        const adapter = new NodeAdapter();
        const { LogLevel } = await import('../../src/types');
        const logger = new Logger({ level: LogLevel.Info });
        const fileAPI = new FileAPI(adapter, logger);

        let card: Card;

        // 根据类型创建卡片
        switch (options.type) {
          case 'markdown': {
            let markdown: string;
            if (options.input) {
              markdown = await fs.readFile(options.input, 'utf-8');
            } else if (options.content) {
              markdown = options.content;
            } else {
              console.error('错误: markdown类型需要指定 --input 或 --content');
              process.exit(1);
            }
            card = MarkdownConverter.importFromMarkdown(markdown, options.name);
            break;
          }

          case 'html': {
            let html: string;
            if (options.input) {
              html = await fs.readFile(options.input, 'utf-8');
            } else if (options.content) {
              html = options.content;
            } else {
              console.error('错误: html类型需要指定 --input 或 --content');
              process.exit(1);
            }
            card = HtmlConverter.importFromHTML(html, options.name);
            break;
          }

          case 'empty': {
            // 创建空卡片
            const cardId = IdGenerator.generate() as any;
            const baseCardId = IdGenerator.generate() as any;
            const now = toISODateTime();

            card = {
              metadata: {
                chip_standards_version: '1.0.0',
                card_id: cardId,
                name: options.name,
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
                  content_text: `# ${options.name}\n\n`,
                  show_toc: true,
                  syntax_highlight: true,
                  highlight_theme: 'github',
                } as any,
              },
            };
            break;
          }

          default:
            console.error(`错误: 未知的卡片类型: ${options.type}`);
            process.exit(1);
        }

        // 保存卡片
        await fileAPI.saveCard(card, output, { overwrite: options.force });

        console.log(`✓ 卡片创建成功: ${output}`);
        console.log(`  卡片ID: ${card.metadata.card_id}`);
        console.log(`  卡片名称: ${card.metadata.name}`);
      } catch (error) {
        console.error('错误:', (error as Error).message);
        process.exit(1);
      }
    });

  return command;
}
