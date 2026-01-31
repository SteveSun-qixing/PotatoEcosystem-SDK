/**
 * list命令 - 列出目录中的卡片
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { NodeAdapter } from '../../src/platform/node/NodeAdapter';
import { Logger } from '../../src/core/logger';
import { FileAPI } from '../../src/api/FileAPI';

interface CardInfo {
  path: string;
  name: string;
  id: string;
  size: number;
  modifiedAt: Date;
  cardCount: number;
}

/**
 * 创建list命令
 */
export function listCommand(): Command {
  const command = new Command('list');

  command
    .description('列出目录中的卡片文件')
    .argument('[directory]', '目录路径', '.')
    .option('-r, --recursive', '递归搜索子目录', false)
    .option('-j, --json', '以JSON格式输出', false)
    .option('-s, --sort <field>', '排序字段 (name|size|date)', 'name')
    .option('--reverse', '反向排序', false)
    .action(async (directory: string, options) => {
      try {
        // 验证目录是否存在
        const stats = await fs.stat(directory).catch(() => null);
        if (!stats) {
          console.error(`错误: 目录不存在: ${directory}`);
          process.exit(1);
        }

        if (!stats.isDirectory()) {
          console.error(`错误: 不是有效的目录: ${directory}`);
          process.exit(1);
        }

        // 初始化SDK组件
        const adapter = new NodeAdapter();
        const { LogLevel } = await import('../../src/types');
        const logger = new Logger({ level: LogLevel.Warn });
        const fileAPI = new FileAPI(adapter, logger);

        // 获取所有card文件
        const cardFiles = await getAllCardFiles(directory, options.recursive);

        if (cardFiles.length === 0) {
          if (!options.json) {
            console.log('未找到卡片文件');
          }
          return;
        }

        // 加载卡片信息
        const cardInfos: CardInfo[] = [];
        
        for (const filePath of cardFiles) {
          try {
            const card = await fileAPI.loadCard(filePath);
            const fileStats = await fs.stat(filePath);

            cardInfos.push({
              path: path.relative(directory, filePath),
              name: card.metadata.name,
              id: card.metadata.card_id,
              size: fileStats.size,
              modifiedAt: fileStats.mtime,
              cardCount: card.structure.manifest.card_count,
            });
          } catch (error) {
            // 跳过无法加载的文件
            if (!options.json) {
              console.error(`警告: 无法加载文件: ${filePath}`);
            }
          }
        }

        // 排序
        sortCardInfos(cardInfos, options.sort, options.reverse);

        // 输出
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                directory: directory,
                count: cardInfos.length,
                cards: cardInfos,
              },
              null,
              2
            )
          );
        } else {
          // 人类可读格式
          console.log(`\n📂 目录: ${directory}`);
          console.log('═'.repeat(80));
          console.log(`找到 ${cardInfos.length} 个卡片文件\n`);

          // 表格头
          console.log(
            String('文件路径').padEnd(40) +
              String('卡片名称').padEnd(20) +
              String('大小').padEnd(10) +
              String('修改时间').padEnd(20)
          );
          console.log('─'.repeat(80));

          // 表格内容
          for (const info of cardInfos) {
            const relativePath = info.path.length > 38 ? '...' + info.path.slice(-35) : info.path;
            const name = info.name.length > 18 ? info.name.slice(0, 15) + '...' : info.name;
            const size = formatSize(info.size);
            const date = info.modifiedAt.toLocaleString().slice(0, 16);

            console.log(
              relativePath.padEnd(40) +
                name.padEnd(20) +
                size.padEnd(10) +
                date.padEnd(20)
            );
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

/**
 * 获取目录中所有.card文件
 */
async function getAllCardFiles(dir: string, recursive: boolean): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && entry.name.endsWith('.card')) {
      files.push(fullPath);
    } else if (entry.isDirectory() && recursive) {
      const subFiles = await getAllCardFiles(fullPath, recursive);
      files.push(...subFiles);
    }
  }

  return files;
}

/**
 * 排序卡片信息
 */
function sortCardInfos(infos: CardInfo[], sortField: string, reverse: boolean): void {
  infos.sort((a, b) => {
    let result = 0;

    switch (sortField) {
      case 'name':
        result = a.name.localeCompare(b.name);
        break;
      case 'size':
        result = a.size - b.size;
        break;
      case 'date':
        result = a.modifiedAt.getTime() - b.modifiedAt.getTime();
        break;
      default:
        result = a.name.localeCompare(b.name);
    }

    return reverse ? -result : result;
  });
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
