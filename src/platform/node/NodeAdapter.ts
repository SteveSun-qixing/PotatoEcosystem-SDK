/**
 * Node.js平台适配器
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { IPlatformAdapter, IFileSystem, FileStats } from '../../types';
import { Platform } from '../../types';

/**
 * Node.js文件系统
 */
class NodeFileSystem implements IFileSystem {
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
    await fs.rmdir(dirpath, { recursive: options?.recursive ?? false });
  }
}

/**
 * Node.js平台适配器
 */
export class NodeAdapter implements IPlatformAdapter {
  readonly platform = Platform.Node;
  private fileSystem: NodeFileSystem;

  constructor() {
    this.fileSystem = new NodeFileSystem();
  }

  async readFile(filepath: string): Promise<ArrayBuffer> {
    return this.fileSystem.readFile(filepath);
  }

  async writeFile(filepath: string, data: ArrayBuffer): Promise<void> {
    // 确保目录存在
    const dir = path.dirname(filepath);
    await this.fileSystem.mkdir(dir, { recursive: true });

    return this.fileSystem.writeFile(filepath, data);
  }

  async exists(filepath: string): Promise<boolean> {
    return this.fileSystem.exists(filepath);
  }

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

  async deleteFile(filepath: string): Promise<void> {
    return this.fileSystem.unlink(filepath);
  }

  getFileSystem(): IFileSystem {
    return this.fileSystem;
  }
}
