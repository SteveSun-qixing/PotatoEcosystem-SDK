/**
 * 文件管理器
 *
 * 提供文件系统操作的便捷接口
 */

import type { IPlatformAdapter } from '../types';
import { Logger } from '../core/logger';
import { normalizePath } from '../utils/file';

/**
 * 文件管理器配置
 */
export interface FileManagerConfig {
  basePath?: string;
  autoIndex?: boolean;
}

/**
 * 文件管理器类
 */
export class FileManager {
  private adapter: IPlatformAdapter;
  private basePath: string;
  // private _autoIndex: boolean; // 未使用，暂时注释
  private logger: Logger;

  constructor(
    adapter: IPlatformAdapter,
    logger: Logger,
    config: FileManagerConfig = {}
  ) {
    this.adapter = adapter;
    this.basePath = config.basePath ?? '.';
    // this._autoIndex = config.autoIndex ?? false; // 未使用，暂时注释
    this.logger = logger;
  }

  /**
   * 列出文件
   * @param pattern 文件模式（简单的glob）
   * @returns 文件路径数组
   */
  async list(pattern?: string): Promise<string[]> {
    const files = await this.adapter.listFiles(this.basePath);

    if (!pattern) {
      return files;
    }

    // 简单的模式匹配
    return files.filter((file) => this.matchPattern(file, pattern));
  }

  /**
   * 检查文件是否存在
   * @param filename 文件名
   * @returns 是否存在
   */
  async exists(filename: string): Promise<boolean> {
    const fullPath = this.resolveFullPath(filename);
    return this.adapter.exists(fullPath);
  }

  /**
   * 复制文件
   * @param src 源路径
   * @param dest 目标路径
   */
  async copy(src: string, dest: string): Promise<void> {
    const srcPath = this.resolveFullPath(src);
    const destPath = this.resolveFullPath(dest);

    this.logger.debug('Copying file', { src: srcPath, dest: destPath });

    const data = await this.adapter.readFile(srcPath);
    await this.adapter.writeFile(destPath, data);

    this.logger.info('File copied', { src: srcPath, dest: destPath });
  }

  /**
   * 移动文件
   * @param src 源路径
   * @param dest 目标路径
   */
  async move(src: string, dest: string): Promise<void> {
    await this.copy(src, dest);
    await this.delete(src);

    this.logger.info('File moved', { src, dest });
  }

  /**
   * 删除文件
   * @param filename 文件名
   */
  async delete(filename: string): Promise<void> {
    const fullPath = this.resolveFullPath(filename);

    this.logger.debug('Deleting file', { path: fullPath });

    await this.adapter.deleteFile(fullPath);

    this.logger.info('File deleted', { path: fullPath });
  }

  /**
   * 创建目录
   * @param dirName 目录名
   */
  async mkdir(dirName: string): Promise<void> {
    const fullPath = this.resolveFullPath(dirName);
    const fs = this.adapter.getFileSystem();

    await fs.mkdir(fullPath, { recursive: true });

    this.logger.info('Directory created', { path: fullPath });
  }

  /**
   * 删除目录
   * @param dirName 目录名
   */
  async rmdir(dirName: string): Promise<void> {
    const fullPath = this.resolveFullPath(dirName);
    const fs = this.adapter.getFileSystem();

    await fs.rmdir(fullPath, { recursive: true });

    this.logger.info('Directory removed', { path: fullPath });
  }

  /**
   * 遍历目录
   * @param dirPath 目录路径
   * @param callback 回调函数
   */
  async walk(
    dirPath: string,
    callback: (path: string, isFile: boolean) => void | Promise<void>
  ): Promise<void> {
    const fullPath = this.resolveFullPath(dirPath);
    const fs = this.adapter.getFileSystem();

    const entries = await fs.readdir(fullPath);

    for (const entry of entries) {
      const entryPath = `${fullPath}/${entry}`;
      const stats = await fs.stat(entryPath);

      await callback(entryPath, stats.isFile);

      if (stats.isDirectory) {
        await this.walk(entryPath, callback);
      }
    }
  }

  /**
   * 设置基础路径
   * @param path 路径
   */
  setBasePath(path: string): void {
    this.basePath = path;
  }

  /**
   * 获取基础路径
   * @returns 基础路径
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * 解析完整路径
   * @param filename 文件名
   * @returns 完整路径
   */
  private resolveFullPath(filename: string): string {
    if (filename.startsWith('/') || /^[a-zA-Z]:/.test(filename)) {
      // 绝对路径
      return normalizePath(filename);
    }

    // 相对路径
    return normalizePath(`${this.basePath}/${filename}`);
  }

  /**
   * 模式匹配（简单实现）
   * @param filename 文件名
   * @param pattern 模式
   * @returns 是否匹配
   */
  private matchPattern(filename: string, pattern: string): boolean {
    // 转换简单的glob模式为正则表达式
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  }
}
