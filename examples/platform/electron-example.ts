/**
 * Chips SDK - Electron平台示例
 * 
 * 演示如何在Electron环境中使用Chips SDK的平台适配器
 * 
 * 此示例展示了Electron平台的特殊功能，如：
 * - 完整的文件系统访问
 * - 应用数据路径管理
 * - 系统集成功能
 * 
 * 使用方法:
 * 1. 在Electron主进程或渲染进程中导入此模块
 * 2. 调用 runElectronExample() 函数
 */

import * as path from 'path';
import { createPlatformAdapter } from '../../src/platform';
import { ElectronAdapter } from '../../src/platform/electron/ElectronAdapter';
import { Platform } from '../../src/types';

/**
 * 日志工具函数
 */
class Logger {
  static log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ',
      success: '✓',
      error: '✗',
      warn: '⚠',
    }[type];
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  static section(title: string) {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${title}`);
    console.log('='.repeat(60));
  }
}

/**
 * 主示例函数
 */
export async function runElectronExample() {
  Logger.log('Chips SDK - Electron平台适配器示例', 'info');
  Logger.section('开始执行');

  try {
    // 1. 创建Electron适配器
    Logger.section('1. 初始化Electron适配器');
    const adapter = createPlatformAdapter(Platform.Electron) as ElectronAdapter;
    Logger.log(`适配器创建成功`, 'success');
    Logger.log(`平台类型: ${adapter.platform}`, 'info');

    // 2. 获取Electron特有的路径
    Logger.section('2. Electron特有功能 - 应用路径');
    
    const appDataPath = adapter.getAppDataPath();
    Logger.log(`应用数据路径: ${appDataPath}`, 'info');
    
    const tempPath = adapter.getTempPath();
    Logger.log(`临时文件路径: ${tempPath}`, 'info');

    // 3. 在应用数据目录中创建测试文件
    Logger.section('3. 文件操作 - 应用数据目录');
    
    const testDir = path.join(appDataPath, 'chips-sdk-test');
    const fileSystem = adapter.getFileSystem();
    
    await fileSystem.mkdir(testDir, { recursive: true });
    Logger.log(`创建测试目录: ${testDir}`, 'success');

    // 4. 写入配置文件
    const configFile = path.join(testDir, 'config.json');
    const config = {
      appName: 'Chips SDK',
      version: '1.0.0',
      platform: 'Electron',
      timestamp: new Date().toISOString(),
      features: {
        fileSystem: true,
        systemIntegration: true,
        nativeMenus: true,
      },
    };
    
    const configData = new TextEncoder().encode(JSON.stringify(config, null, 2));
    await adapter.writeFile(configFile, configData.buffer);
    Logger.log(`配置文件已写入: ${configFile}`, 'success');

    // 5. 读取配置文件
    const readConfig = await adapter.readFile(configFile);
    const configText = new TextDecoder().decode(readConfig);
    Logger.log(`配置文件内容:\n${configText}`, 'info');

    // 6. 创建用户数据文件
    Logger.section('4. 用户数据管理');
    
    const userDataDir = path.join(testDir, 'user-data');
    await fileSystem.mkdir(userDataDir, { recursive: true });
    
    const userData = {
      userId: 'user-12345',
      preferences: {
        theme: 'dark',
        language: 'zh-CN',
        notifications: true,
      },
      lastLogin: new Date().toISOString(),
    };
    
    const userFile = path.join(userDataDir, 'user-profile.json');
    const userDataBuffer = new TextEncoder().encode(JSON.stringify(userData, null, 2));
    await adapter.writeFile(userFile, userDataBuffer.buffer);
    Logger.log(`用户数据已保存: ${userFile}`, 'success');

    // 7. 创建缓存文件
    Logger.section('5. 缓存管理');
    
    const cacheDir = path.join(testDir, 'cache');
    await fileSystem.mkdir(cacheDir, { recursive: true });
    
    const cacheItems = [
      { key: 'item1', data: 'Cached data 1', size: 1024 },
      { key: 'item2', data: 'Cached data 2', size: 2048 },
      { key: 'item3', data: 'Cached data 3', size: 512 },
    ];
    
    for (const item of cacheItems) {
      const cacheFile = path.join(cacheDir, `${item.key}.cache`);
      const cacheData = new TextEncoder().encode(JSON.stringify(item));
      await adapter.writeFile(cacheFile, cacheData.buffer);
    }
    Logger.log(`已创建 ${cacheItems.length} 个缓存文件`, 'success');

    // 8. 列出所有文件
    Logger.section('6. 文件系统遍历');
    
    async function listAllFiles(dir: string, indent: string = ''): Promise<void> {
      const entries = await fileSystem.readdir(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await fileSystem.stat(fullPath);
        
        if (stats.isDirectory) {
          Logger.log(`${indent}📁 ${entry}/`, 'info');
          await listAllFiles(fullPath, indent + '  ');
        } else {
          const sizeKB = (stats.size / 1024).toFixed(2);
          Logger.log(`${indent}📄 ${entry} (${sizeKB} KB)`, 'info');
        }
      }
    }
    
    Logger.log('目录结构:', 'info');
    await listAllFiles(testDir);

    // 9. 文件统计
    Logger.section('7. 文件统计信息');
    
    const allFiles = await adapter.listFiles(testDir);
    let totalSize = 0;
    
    for (const file of allFiles) {
      const stats = await fileSystem.stat(file);
      totalSize += stats.size;
    }
    
    Logger.log(`总文件数: ${allFiles.length}`, 'info');
    Logger.log(`总大小: ${(totalSize / 1024).toFixed(2)} KB`, 'info');

    // 10. Electron系统集成功能（如果可用）
    Logger.section('8. Electron系统集成');
    
    try {
      // 尝试在文件管理器中显示文件
      Logger.log('尝试在文件管理器中显示配置文件...', 'info');
      await adapter.showInFolder(configFile);
      Logger.log('已请求在文件管理器中显示文件', 'success');
    } catch (error) {
      Logger.log('系统集成功能在当前环境不可用（这是正常的）', 'warn');
    }

    // 11. 创建日志文件
    Logger.section('9. 日志系统示例');
    
    const logsDir = path.join(testDir, 'logs');
    await fileSystem.mkdir(logsDir, { recursive: true });
    
    const logEntries = [
      { level: 'INFO', message: 'Application started', timestamp: new Date().toISOString() },
      { level: 'DEBUG', message: 'Initializing modules', timestamp: new Date().toISOString() },
      { level: 'INFO', message: 'All modules loaded', timestamp: new Date().toISOString() },
    ];
    
    const logFile = path.join(logsDir, `app-${Date.now()}.log`);
    const logContent = logEntries
      .map(entry => `[${entry.timestamp}] ${entry.level}: ${entry.message}`)
      .join('\n');
    
    const logData = new TextEncoder().encode(logContent);
    await adapter.writeFile(logFile, logData.buffer);
    Logger.log(`日志文件已创建: ${logFile}`, 'success');

    // 12. 性能测试
    Logger.section('10. 性能测试');
    
    const perfDir = path.join(tempPath, `chips-perf-${Date.now()}`);
    await fileSystem.mkdir(perfDir, { recursive: true });
    
    const fileCount = 50;
    const startWrite = Date.now();
    
    for (let i = 0; i < fileCount; i++) {
      const file = path.join(perfDir, `perf-${i}.dat`);
      const data = new Uint8Array(1024); // 1KB per file
      data.fill(i % 256);
      await adapter.writeFile(file, data.buffer);
    }
    
    const writeTime = Date.now() - startWrite;
    Logger.log(`写入 ${fileCount} 个文件耗时: ${writeTime}ms`, 'info');
    Logger.log(`平均: ${(writeTime / fileCount).toFixed(2)}ms/文件`, 'info');
    
    const startRead = Date.now();
    
    for (let i = 0; i < fileCount; i++) {
      const file = path.join(perfDir, `perf-${i}.dat`);
      await adapter.readFile(file);
    }
    
    const readTime = Date.now() - startRead;
    Logger.log(`读取 ${fileCount} 个文件耗时: ${readTime}ms`, 'info');
    Logger.log(`平均: ${(readTime / fileCount).toFixed(2)}ms/文件`, 'info');

    // 清理性能测试文件
    await fileSystem.rmdir(perfDir, { recursive: true });
    Logger.log('性能测试文件已清理', 'success');

    // 13. 导出数据功能示例
    Logger.section('11. 数据导出示例');
    
    const exportDir = path.join(testDir, 'exports');
    await fileSystem.mkdir(exportDir, { recursive: true });
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      platform: 'Electron',
      data: {
        config,
        userData,
        cacheItems,
        logEntries,
      },
      metadata: {
        version: '1.0.0',
        format: 'json',
      },
    };
    
    const exportFile = path.join(exportDir, `export-${Date.now()}.json`);
    const exportBuffer = new TextEncoder().encode(JSON.stringify(exportData, null, 2));
    await adapter.writeFile(exportFile, exportBuffer.buffer);
    Logger.log(`数据已导出至: ${exportFile}`, 'success');

    // 14. 报告摘要
    Logger.section('12. 执行摘要');
    
    const summary = {
      totalFiles: allFiles.length,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      directories: [testDir, userDataDir, cacheDir, logsDir, exportDir],
      operations: {
        writes: fileCount + cacheItems.length + 4, // config + user + logs + export
        reads: fileCount + 1,
      },
      performance: {
        avgWriteTime: (writeTime / fileCount).toFixed(2) + 'ms',
        avgReadTime: (readTime / fileCount).toFixed(2) + 'ms',
      },
    };
    
    Logger.log(JSON.stringify(summary, null, 2), 'info');

    // 15. 清理（可选）
    Logger.section('13. 清理选项');
    Logger.log('测试文件保留在应用数据目录中', 'info');
    Logger.log('如需清理，可以删除目录:', 'info');
    Logger.log(testDir, 'info');
    Logger.log('', 'info');
    Logger.log('要清理测试文件，取消下面代码的注释:', 'warn');
    Logger.log('// await fileSystem.rmdir(testDir, { recursive: true });', 'warn');

    // 取消注释以清理测试文件:
    // await fileSystem.rmdir(testDir, { recursive: true });
    // Logger.log('测试文件已清理', 'success');

    Logger.section('示例执行完成');
    Logger.log('所有操作成功完成!', 'success');
    
    return {
      success: true,
      testDir,
      summary,
    };

  } catch (error) {
    Logger.log(`示例执行失败: ${(error as Error).message}`, 'error');
    console.error(error);
    
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * 如果直接运行此文件（在Electron环境中）
 */
if (require.main === module) {
  runElectronExample()
    .then(result => {
      if (result.success) {
        console.log('\n✓ 示例成功完成');
        process.exit(0);
      } else {
        console.error('\n✗ 示例执行失败');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n✗ 未预期的错误:', error);
      process.exit(1);
    });
}
