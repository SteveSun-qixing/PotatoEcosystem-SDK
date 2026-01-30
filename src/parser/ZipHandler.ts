/**
 * ZIP文件处理器
 *
 * 实现零压缩率的ZIP文件读写，符合卡片文件格式规范
 */

import JSZip from 'jszip';
import { ParseError } from '../core/error';

/**
 * ZIP文件处理器类
 */
export class ZipHandler {
  /**
   * 读取ZIP文件
   * @param data ZIP文件数据
   * @returns JSZip实例
   */
  static async read(data: ArrayBuffer | Blob): Promise<JSZip> {
    try {
      const zip = new JSZip();
      return await zip.loadAsync(data);
    } catch (error) {
      throw new ParseError('Failed to read ZIP file', {
        originalError: error,
      });
    }
  }

  /**
   * 创建ZIP文件
   * @returns JSZip实例
   */
  static create(): JSZip {
    return new JSZip();
  }

  /**
   * 生成ZIP文件（零压缩率）
   * @param zip JSZip实例
   * @returns ZIP文件数据
   */
  static async generate(zip: JSZip): Promise<ArrayBuffer> {
    try {
      // 使用STORE压缩方法（零压缩率）
      const blob = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'STORE', // 零压缩率
        compressionOptions: {
          level: 0,
        },
      });

      return blob;
    } catch (error) {
      throw new ParseError('Failed to generate ZIP file', {
        originalError: error,
      });
    }
  }

  /**
   * 读取ZIP中的文件
   * @param zip JSZip实例
   * @param path 文件路径
   * @returns 文件内容
   */
  static async readFile(zip: JSZip, path: string): Promise<ArrayBuffer | null> {
    const file = zip.file(path);

    if (!file) {
      return null;
    }

    try {
      return await file.async('arraybuffer');
    } catch (error) {
      throw new ParseError(`Failed to read file from ZIP: ${path}`, {
        originalError: error,
      });
    }
  }

  /**
   * 读取ZIP中的文本文件
   * @param zip JSZip实例
   * @param path 文件路径
   * @returns 文本内容
   */
  static async readTextFile(zip: JSZip, path: string): Promise<string | null> {
    const file = zip.file(path);

    if (!file) {
      return null;
    }

    try {
      return await file.async('text');
    } catch (error) {
      throw new ParseError(`Failed to read text file from ZIP: ${path}`, {
        originalError: error,
      });
    }
  }

  /**
   * 添加文件到ZIP
   * @param zip JSZip实例
   * @param path 文件路径
   * @param data 文件数据
   */
  static addFile(zip: JSZip, path: string, data: string | ArrayBuffer): void {
    zip.file(path, data);
  }

  /**
   * 添加目录到ZIP
   * @param zip JSZip实例
   * @param path 目录路径
   */
  static addFolder(zip: JSZip, path: string): void {
    zip.folder(path);
  }

  /**
   * 列出ZIP中的所有文件
   * @param zip JSZip实例
   * @param folderPath 文件夹路径（可选，不提供则列出所有文件）
   * @returns 文件路径数组
   */
  static listFiles(zip: JSZip, folderPath?: string): string[] {
    const files: string[] = [];

    zip.forEach((relativePath, file) => {
      if (!file.dir) {
        if (!folderPath || relativePath.startsWith(folderPath)) {
          files.push(relativePath);
        }
      }
    });

    return files;
  }

  /**
   * 检查文件是否存在
   * @param zip JSZip实例
   * @param path 文件路径
   * @returns 是否存在
   */
  static fileExists(zip: JSZip, path: string): boolean {
    const file = zip.file(path);
    return file !== null && !file.dir;
  }

  /**
   * 检查目录是否存在
   * @param zip JSZip实例
   * @param path 目录路径
   * @returns 是否存在
   */
  static folderExists(zip: JSZip, path: string): boolean {
    const folder = zip.folder(path);
    return folder !== null;
  }

  /**
   * 删除文件
   * @param zip JSZip实例
   * @param path 文件路径
   */
  static removeFile(zip: JSZip, path: string): void {
    zip.remove(path);
  }
}
