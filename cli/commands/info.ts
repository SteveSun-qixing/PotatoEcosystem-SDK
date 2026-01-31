/**
 * info命令 - 查看卡片信息
 */

import { Command } from 'commander';
import { NodeAdapter } from '../../src/platform/node/NodeAdapter';
import { Logger } from '../../src/core/logger';
import { FileAPI } from '../../src/api/FileAPI';
import * as fs from 'fs/promises';

/**
 * 创建info命令
 */
export function infoCommand(): Command {
  const command = new Command('info');

  command
    .description('查看卡片文件信息')
    .argument('<file>', '卡片文件路径（.card文件）')
    .option('-j, --json', '以JSON格式输出', false)
    .option('-v, --verbose', '显示详细信息', false)
    .action(async (file: string, options) => {
      try {
        // 验证文件路径
        if (!file.endsWith('.card')) {
          console.error('错误: 输入文件必须是.card格式');
          process.exit(1);
        }

        // 初始化SDK组件
        const adapter = new NodeAdapter();
        const { LogLevel } = await import('../../src/types');
        const logger = new Logger({ level: LogLevel.Warn }); // 减少日志输出
        const fileAPI = new FileAPI(adapter, logger);

        // 加载卡片
        const card = await fileAPI.loadCard(file);

        // 获取文件统计信息
        const stats = await fs.stat(file);

        if (options.json) {
          // JSON格式输出
          const info = {
            file: file,
            metadata: card.metadata,
            structure: {
              cardCount: card.structure.manifest.card_count,
              resourceCount: card.structure.manifest.resource_count,
              baseCards: card.structure.structure.map((item) => ({
                id: item.id,
                type: item.type,
              })),
            },
            fileSize: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
          };

          if (options.verbose) {
            (info as any).content = card.content;
            if (card.resources) {
              (info as any).resources = card.resources;
            }
          }

          console.log(JSON.stringify(info, null, 2));
        } else {
          // 人类可读格式输出
          console.log('\n📋 卡片信息');
          console.log('═'.repeat(50));
          console.log(`文件路径: ${file}`);
          console.log(`文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
          console.log(`创建时间: ${stats.birthtime.toLocaleString()}`);
          console.log(`修改时间: ${stats.mtime.toLocaleString()}`);
          console.log('\n📝 元数据');
          console.log('─'.repeat(50));
          console.log(`卡片ID: ${card.metadata.card_id}`);
          console.log(`卡片名称: ${card.metadata.name}`);
          console.log(`标准版本: ${card.metadata.chip_standards_version}`);
          console.log(`创建时间: ${card.metadata.created_at}`);
          console.log(`修改时间: ${card.metadata.modified_at}`);

          // 显示可选的元数据字段（如果存在）
          const metadata = card.metadata as any;
          if (metadata.author) {
            console.log(`作者: ${metadata.author}`);
          }
          if (metadata.description) {
            console.log(`描述: ${metadata.description}`);
          }
          if (card.metadata.tags && card.metadata.tags.length > 0) {
            console.log(`标签: ${card.metadata.tags.join(', ')}`);
          }

          console.log('\n🏗️  结构信息');
          console.log('─'.repeat(50));
          console.log(`基础卡片数量: ${card.structure.manifest.card_count}`);
          console.log(`资源文件数量: ${card.structure.manifest.resource_count}`);

          if (options.verbose) {
            console.log('\n📦 基础卡片列表');
            console.log('─'.repeat(50));
            card.structure.structure.forEach((item, index) => {
              const config = card.content[item.id];
              console.log(`${index + 1}. ${item.type} (ID: ${item.id})`);
              if (config) {
                if (config.card_type === 'MarkdownCard' || config.card_type === 'RichTextCard') {
                  const textConfig = config as { content_text?: string };
                  if (textConfig.content_text) {
                    const preview = textConfig.content_text.substring(0, 100);
                    console.log(`   内容预览: ${preview}${textConfig.content_text.length > 100 ? '...' : ''}`);
                  }
                }
              }
            });

            if (card.resources && Object.keys(card.resources).length > 0) {
              console.log('\n📎 资源文件');
              console.log('─'.repeat(50));
              Object.entries(card.resources).forEach(([key, value]) => {
                console.log(`- ${key}: ${value}`);
              });
            }
          }

          console.log('\n');
        }
      } catch (error) {
        console.error('错误:', (error as Error).message);
        process.exit(1);
      }
    });

  return command;
}
