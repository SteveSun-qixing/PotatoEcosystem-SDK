#!/usr/bin/env node
/**
 * Chips SDK CLI工具
 *
 * 提供命令行接口用于创建、转换、查看和验证卡片文件
 */

import { Command } from 'commander';
import { createCommand } from './commands/create';
import { convertCommand } from './commands/convert';
import { infoCommand } from './commands/info';
import { validateCommand } from './commands/validate';
import { listCommand } from './commands/list';
import * as fs from 'fs/promises';
import * as path from 'path';

// 读取版本号
async function getVersion(): Promise<string> {
  // 尝试多个可能的路径读取版本
  const possiblePaths = [
    path.join(__dirname, '../VERSION'),
    path.join(__dirname, '../../VERSION'),
    path.join(process.cwd(), 'VERSION'),
  ];

  // 尝试读取VERSION文件
  for (const versionPath of possiblePaths) {
    try {
      const version = await fs.readFile(versionPath, 'utf-8');
      return version.trim();
    } catch {
      continue;
    }
  }

  // 尝试从package.json读取
  const pkgPaths = [
    path.join(__dirname, '../package.json'),
    path.join(__dirname, '../../package.json'),
    path.join(process.cwd(), 'package.json'),
  ];

  for (const pkgPath of pkgPaths) {
    try {
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
      return pkg.version || '0.1.0';
    } catch {
      continue;
    }
  }

  // 默认版本
  return '0.1.0';
}

async function main() {
  const version = await getVersion();
  const program = new Command();

  program
    .name('chips')
    .description('Chips SDK CLI - 卡片文件操作工具')
    .version(version);

  // 注册命令
  program.addCommand(createCommand());
  program.addCommand(convertCommand());
  program.addCommand(infoCommand());
  program.addCommand(validateCommand());
  program.addCommand(listCommand());

  // 解析命令行参数
  program.parse();
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
