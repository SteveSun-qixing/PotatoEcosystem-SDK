/**
 * convert命令 - 格式转换
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { NodeAdapter } from '../../src/platform/node/NodeAdapter';
import { Logger } from '../../src/core/logger';
import { FileAPI } from '../../src/api/FileAPI';
import { MarkdownConverter } from '../../src/converter/MarkdownConverter';
import { HtmlConverter } from '../../src/converter/HtmlConverter';

/**
 * 创建convert命令
 */
export function convertCommand(): Command {
  const command = new Command('convert');

  command
    .description('转换卡片文件格式')
    .argument('<input>', '输入文件路径（.card文件）')
    .argument('<output>', '输出文件路径')
    .option('-f, --format <format>', '输出格式 (markdown|html|card)', 'markdown')
    .option('--from-format <format>', '输入格式（用于从markdown/html转换为card）')
    .option('--from-input <file>', '输入文件（用于从markdown/html转换为card）')
    .action(async (input: string, output: string, options) => {
      try {
        // 初始化SDK组件
        const adapter = new NodeAdapter();
        const { LogLevel } = await import('../../src/types');
        const logger = new Logger({ level: LogLevel.Info });
        const fileAPI = new FileAPI(adapter, logger);

        // 如果是从markdown/html转换为card
        if (options.fromFormat && options.fromInput) {
          let content: string;
          try {
            content = await fs.readFile(options.fromInput, 'utf-8');
          } catch (error) {
            console.error(`错误: 无法读取输入文件: ${options.fromInput}`);
            process.exit(1);
          }

          let card;
          const cardName = path.basename(output, '.card');

          if (options.fromFormat === 'markdown') {
            card = MarkdownConverter.importFromMarkdown(content, cardName);
          } else if (options.fromFormat === 'html') {
            card = HtmlConverter.importFromHTML(content, cardName);
          } else {
            console.error(`错误: 不支持的输入格式: ${options.fromFormat}`);
            process.exit(1);
          }

          await fileAPI.saveCard(card, output, { overwrite: true });
          console.log(`✓ 转换成功: ${options.fromInput} -> ${output}`);
          return;
        }

        // 从card转换为其他格式
        if (!input.endsWith('.card')) {
          console.error('错误: 输入文件必须是.card格式');
          process.exit(1);
        }

        // 加载卡片
        const card = await fileAPI.loadCard(input);

        // 根据格式转换
        switch (options.format) {
          case 'markdown': {
            const markdown = MarkdownConverter.exportToMarkdown(card);
            await fs.writeFile(output, markdown, 'utf-8');
            console.log(`✓ 转换成功: ${input} -> ${output}`);
            console.log(`  格式: Card -> Markdown`);
            break;
          }

          case 'html': {
            const html = HtmlConverter.exportToHTML(card);
            await fs.writeFile(output, html, 'utf-8');
            console.log(`✓ 转换成功: ${input} -> ${output}`);
            console.log(`  格式: Card -> HTML`);
            break;
          }

          case 'card': {
            // 复制卡片文件
            const data = await fs.readFile(input);
            await fs.writeFile(output, data);
            console.log(`✓ 复制成功: ${input} -> ${output}`);
            break;
          }

          default:
            console.error(`错误: 不支持的输出格式: ${options.format}`);
            process.exit(1);
        }
      } catch (error) {
        console.error('错误:', (error as Error).message);
        process.exit(1);
      }
    });

  return command;
}
