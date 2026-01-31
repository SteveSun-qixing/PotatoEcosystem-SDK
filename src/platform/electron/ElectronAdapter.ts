/**
 * Electron平台适配器
 *
 * Electron结合了Node.js和浏览器的特性，提供完整的文件系统访问和桌面应用能力
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { IPlatformAdapter, IFileSystem, FileStats } from '../../types';
import { Platform } from '../../types';

/**
 * Electron文件系统
 * 基于Node.js的文件系统，增加Electron特定功能
 */
class ElectronFileSystem implements IFileSystem {
  async readFile(filepath: string): Promise<ArrayBuffer> {
    const buffer = await fs.readFile(filepath);
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  }

  async writeFile(filepath: string, data: ArrayBuffer): Promise<void> {
    await fs.writeFile(filepath, Buffer.from(data));
  }

  async exists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  async stat(filepath: string): Promise<FileStats> {
    const stats = await fs.stat(filepath);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  }

  async mkdir(
    dirpath: string,
    options?: { recursive?: boolean }
  ): Promise<void> {
    await fs.mkdir(dirpath, { recursive: options?.recursive ?? false });
  }

  async readdir(dirpath: string): Promise<string[]> {
    return fs.readdir(dirpath);
  }

  async unlink(filepath: string): Promise<void> {
    await fs.unlink(filepath);
  }

  async rmdir(
    dirpath: string,
    options?: { recursive?: boolean }
  ): Promise<void> {
    if (options?.recursive) {
      await fs.rm(dirpath, { recursive: true, force: true });
    } else {
      await fs.rmdir(dirpath);
    }
  }
}

/**
 * Electron平台适配器
 *
 * 提供Electron环境下的文件操作和平台特性
 * 支持完整的Node.js API和Electron特定功能
 */
export class ElectronAdapter implements IPlatformAdapter {
  readonly platform = Platform.Electron;
  private fileSystem: ElectronFileSystem;

  constructor() {
    this.fileSystem = new ElectronFileSystem();
  }

  /**
   * 读取文件
   * @param filepath 文件路径
   * @returns 文件内容的ArrayBuffer
   */
  async readFile(filepath: string): Promise<ArrayBuffer> {
    return this.fileSystem.readFile(filepath);
  }

  /**
   * 写入文件
   * @param filepath 文件路径
   * @param data 要写入的数据
   */
  async writeFile(filepath: string, data: ArrayBuffer): Promise<void> {
    // 确保目录存在
    const dir = path.dirname(filepath);
    await this.fileSystem.mkdir(dir, { recursive: true });

    return this.fileSystem.writeFile(filepath, data);
  }

  /**
   * 检查文件是否存在
   * @param filepath 文件路径
   * @returns 是否存在
   */
  async exists(filepath: string): Promise<boolean> {
    return this.fileSystem.exists(filepath);
  }

  /**
   * 列出目录中的所有文件
   * @param dirpath 目录路径
   * @returns 文件路径数组
   */
  async listFiles(dirpath: string): Promise<string[]> {
    const entries = await this.fileSystem.readdir(dirpath);
    const fullPaths = entries.map((entry) => path.join(dirpath, entry));

    // 过滤出文件
    const files: string[] = [];
    for (const fullPath of fullPaths) {
      const stats = await this.fileSystem.stat(fullPath);
      if (stats.isFile) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * 删除文件
   * @param filepath 文件路径
   */
  async deleteFile(filepath: string): Promise<void> {
    return this.fileSystem.unlink(filepath);
  }

  /**
   * 获取文件系统接口
   * @returns 文件系统实例
   */
  getFileSystem(): IFileSystem {
    return this.fileSystem;
  }

  /**
   * 获取应用数据路径
   * 利用Electron的app.getPath API（如果可用）
   */
  getAppDataPath(): string {
    try {
      // 尝试导入electron模块
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { app } = require('electron');
      return app.getPath('userData');
    } catch {
      // 如果不在Electron环境中，返回默认路径
      return process.cwd();
    }
  }

  /**
   * 获取临时文件路径
   */
  getTempPath(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { app } = require('electron');
      return app.getPath('temp');
    } catch {
      // 使用系统临时目录
      const os = require('os');
      return os.tmpdir();
    }
  }

  /**
   * 在文件管理器中显示文件
   * @param filepath 文件路径
   */
  async showInFolder(filepath: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { shell } = require('electron');
      shell.showItemInFolder(filepath);
    } catch {
      // 如果不在Electron环境中，静默失败
      console.warn('showInFolder is only available in Electron environment');
    }
  }

  /**
   * 使用系统默认应用打开文件
   * @param filepath 文件路径
   */
  async openExternal(filepath: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { shell } = require('electron');
      await shell.openPath(filepath);
    } catch {
      console.warn('openExternal is only available in Electron environment');
    }
  }
}
