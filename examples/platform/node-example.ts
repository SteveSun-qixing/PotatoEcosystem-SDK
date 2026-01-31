/**
 * Chips SDK - Node.js平台示例
 * 
 * 演示如何在Node.js环境中使用Chips SDK的平台适配器
 * 
 * 运行方式:
 *   ts-node examples/platform/node-example.ts
 *   或
 *   npm run example:node
 */

import * as path from 'path';
import * as os from 'os';
import { createPlatformAdapter, getPlatformInfo } from '../../src/platform';
import { Platform } from '../../src/types';

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function main() {
  log('Chips SDK - Node.js平台适配器示例', 'blue');
  log('=====================================\n', 'blue');

  // 1. 初始化平台适配器
  section('1. 初始化平台适配器');
  const adapter = createPlatformAdapter(Platform.Node);
  log(`✓ 适配器创建成功`, 'green');
  log(`  平台类型: ${adapter.platform}`, 'reset');

  // 2. 显示平台信息
  section('2. 平台信息');
  const platformInfo = getPlatformInfo();
  console.log(JSON.stringify(platformInfo, null, 2));

  // 3. 创建临时目录
  section('3. 文件系统操作');
  const testDir = path.join(os.tmpdir(), `chips-example-${Date.now()}`);
  const fileSystem = adapter.getFileSystem();
  
  try {
    await fileSystem.mkdir(testDir, { recursive: true });
    log(`✓ 创建测试目录: ${testDir}`, 'green');

    // 4. 写入文件
    const testFile = path.join(testDir, 'example.txt');
    const content = `Hello from Chips SDK on Node.js!
时间: ${new Date().toISOString()}
平台: ${adapter.platform}
Node版本: ${process.version}`;
    
    const data = new TextEncoder().encode(content);
    await adapter.writeFile(testFile, data.buffer);
    log(`✓ 文件写入成功: ${testFile}`, 'green');

    // 5. 读取文件
    const readData = await adapter.readFile(testFile);
    const readContent = new TextDecoder().decode(readData);
    log(`✓ 文件读取成功:`, 'green');
    console.log(readContent);

    // 6. 检查文件是否存在
    const exists = await adapter.exists(testFile);
    log(`✓ 文件存在检查: ${exists}`, 'green');

    // 7. 获取文件状态
    const stats = await fileSystem.stat(testFile);
    log(`✓ 文件状态:`, 'green');
    console.log(`  大小: ${stats.size} 字节`);
    console.log(`  是文件: ${stats.isFile}`);
    console.log(`  是目录: ${stats.isDirectory}`);
    console.log(`  创建时间: ${stats.createdAt.toISOString()}`);
    console.log(`  修改时间: ${stats.modifiedAt.toISOString()}`);

    // 8. 写入多个文件
    section('4. 批量文件操作');
    const files = ['file1.txt', 'file2.txt', 'file3.txt'];
    
    for (const file of files) {
      const filePath = path.join(testDir, file);
      const fileData = new TextEncoder().encode(`内容: ${file}`);
      await adapter.writeFile(filePath, fileData.buffer);
    }
    log(`✓ 写入 ${files.length} 个文件`, 'green');

    // 9. 列出目录中的文件
    const fileList = await adapter.listFiles(testDir);
    log(`✓ 目录中的文件:`, 'green');
    fileList.forEach(file => {
      console.log(`  - ${path.basename(file)}`);
    });

    // 10. 创建嵌套目录和文件
    section('5. 嵌套目录操作');
    const nestedFile = path.join(testDir, 'nested', 'deep', 'file.txt');
    await adapter.writeFile(nestedFile, new TextEncoder().encode('Deep nested file').buffer);
    log(`✓ 创建嵌套文件: ${nestedFile}`, 'green');

    // 11. 递归列出所有文件
    async function listFilesRecursive(dir: string): Promise<string[]> {
      const entries = await fileSystem.readdir(dir);
      const files: string[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await fileSystem.stat(fullPath);

        if (stats.isFile) {
          files.push(fullPath);
        } else if (stats.isDirectory) {
          const subFiles = await listFilesRecursive(fullPath);
          files.push(...subFiles);
        }
      }

      return files;
    }

    const allFiles = await listFilesRecursive(testDir);
    log(`✓ 递归找到 ${allFiles.length} 个文件`, 'green');

    // 12. 二进制数据处理
    section('6. 二进制数据处理');
    const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
    const binaryFile = path.join(testDir, 'binary.bin');
    
    await adapter.writeFile(binaryFile, binaryData.buffer);
    const readBinary = await adapter.readFile(binaryFile);
    const readBinaryArray = new Uint8Array(readBinary);
    
    log(`✓ 二进制数据写入和读取`, 'green');
    console.log(`  原始数据: [${Array.from(binaryData).join(', ')}]`);
    console.log(`  读取数据: [${Array.from(readBinaryArray).join(', ')}]`);
    console.log(`  数据匹配: ${binaryData.toString() === readBinaryArray.toString()}`);

    // 13. 大文件处理
    section('7. 大文件处理');
    const largeData = new Uint8Array(1024 * 1024); // 1MB
    for (let i = 0; i < largeData.length; i++) {
      largeData[i] = i % 256;
    }
    
    const largeFile = path.join(testDir, 'large.bin');
    const startTime = Date.now();
    await adapter.writeFile(largeFile, largeData.buffer);
    const writeTime = Date.now() - startTime;
    
    const startReadTime = Date.now();
    const readLargeData = await adapter.readFile(largeFile);
    const readTime = Date.now() - startReadTime;
    
    log(`✓ 大文件处理完成`, 'green');
    console.log(`  文件大小: ${largeData.byteLength} 字节 (1MB)`);
    console.log(`  写入时间: ${writeTime}ms`);
    console.log(`  读取时间: ${readTime}ms`);
    console.log(`  数据完整: ${readLargeData.byteLength === largeData.byteLength}`);

    // 14. 清理
    section('8. 清理测试文件');
    
    // 删除所有文件
    for (const file of allFiles) {
      await adapter.deleteFile(file);
    }
    log(`✓ 删除了 ${allFiles.length} 个文件`, 'green');

    // 递归删除目录
    await fileSystem.rmdir(testDir, { recursive: true });
    log(`✓ 删除测试目录`, 'green');

    // 验证目录已删除
    const dirExists = await fileSystem.exists(testDir);
    log(`✓ 目录已删除: ${!dirExists}`, 'green');

  } catch (error) {
    log(`✗ 发生错误: ${(error as Error).message}`, 'red');
    console.error(error);
  }

  // 15. 性能测试
  section('9. 性能测试');
  const perfTestDir = path.join(os.tmpdir(), `chips-perf-${Date.now()}`);
  await fileSystem.mkdir(perfTestDir, { recursive: true });

  try {
    // 写入性能
    const writeCount = 100;
    const writeStartTime = Date.now();
    
    for (let i = 0; i < writeCount; i++) {
      const file = path.join(perfTestDir, `file-${i}.txt`);
      const data = new TextEncoder().encode(`File ${i}`);
      await adapter.writeFile(file, data.buffer);
    }
    
    const writeElapsed = Date.now() - writeStartTime;
    log(`✓ 写入 ${writeCount} 个文件耗时: ${writeElapsed}ms`, 'green');
    log(`  平均: ${(writeElapsed / writeCount).toFixed(2)}ms/文件`, 'reset');

    // 读取性能
    const readStartTime = Date.now();
    
    for (let i = 0; i < writeCount; i++) {
      const file = path.join(perfTestDir, `file-${i}.txt`);
      await adapter.readFile(file);
    }
    
    const readElapsed = Date.now() - readStartTime;
    log(`✓ 读取 ${writeCount} 个文件耗时: ${readElapsed}ms`, 'green');
    log(`  平均: ${(readElapsed / writeCount).toFixed(2)}ms/文件`, 'reset');

    // 清理性能测试目录
    await fileSystem.rmdir(perfTestDir, { recursive: true });
    
  } catch (error) {
    log(`✗ 性能测试失败: ${(error as Error).message}`, 'red');
  }

  section('示例完成');
  log('✓ 所有操作成功完成!', 'green');
}

// 运行示例
main().catch(error => {
  log(`\n✗ 示例执行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
