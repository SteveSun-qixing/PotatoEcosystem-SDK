/**
 * validate命令 - 验证文件格式
 */

import { Command } from 'commander';
import { NodeAdapter } from '../../src/platform/node/NodeAdapter';
import { Logger } from '../../src/core/logger';
import { ParserEngine } from '../../src/parser/ParserEngine';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 创建validate命令
 */
export function validateCommand(): Command {
  const command = new Command('validate');

  command
    .description('验证卡片文件格式')
    .argument('<file>', '卡片文件路径（.card文件）或目录路径')
    .option('-r, --recursive', '递归验证目录中的所有文件', false)
    .option('-j, --json', '以JSON格式输出', false)
    .option('--strict', '严格模式：遇到错误立即退出', false)
    .action(async (file: string, options) => {
      try {
        const adapter = new NodeAdapter();
        const { LogLevel } = await import('../../src/types');
        new Logger({ level: LogLevel.Warn });

        const results: Array<{
          file: string;
          valid: boolean;
          error?: string;
        }> = [];

        // 检查是文件还是目录
        const stats = await fs.stat(file).catch(() => null);
        if (!stats) {
          console.error(`错误: 文件或目录不存在: ${file}`);
          process.exit(1);
        }

        const filesToValidate: string[] = [];

        if (stats.isFile()) {
          // 单个文件
          if (file.endsWith('.card')) {
            filesToValidate.push(file);
          } else {
            console.error('错误: 输入文件必须是.card格式');
            process.exit(1);
          }
        } else if (stats.isDirectory()) {
          // 目录
          const files = await getAllCardFiles(file, options.recursive);
          filesToValidate.push(...files);
        }

        if (filesToValidate.length === 0) {
          console.log('未找到需要验证的.card文件');
          return;
        }

        // 验证每个文件
        for (const filePath of filesToValidate) {
          try {
            // 尝试解析文件
            const data = await adapter.readFile(filePath);
            await ParserEngine.parseCard(data);

            results.push({
              file: filePath,
              valid: true,
            });

            if (!options.json) {
              console.log(`✓ ${filePath}`);
            }
          } catch (error) {
            const errorMessage = (error as Error).message;
            results.push({
              file: filePath,
              valid: false,
              error: errorMessage,
            });

            if (!options.json) {
              console.error(`✗ ${filePath}`);
              console.error(`  错误: ${errorMessage}`);
            }

            if (options.strict) {
              console.error(`\n严格模式：验证失败，退出`);
              process.exit(1);
            }
          }
        }

        // 输出总结
        const validCount = results.filter((r) => r.valid).length;
        const invalidCount = results.length - validCount;

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                total: results.length,
                valid: validCount,
                invalid: invalidCount,
                results: results,
              },
              null,
              2
            )
          );
        } else {
          console.log('\n' + '═'.repeat(50));
          console.log(`总计: ${results.length} 个文件`);
          console.log(`✓ 有效: ${validCount}`);
          console.log(`✗ 无效: ${invalidCount}`);
        }

        // 如果有无效文件，退出码为1
        if (invalidCount > 0) {
          process.exit(1);
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
