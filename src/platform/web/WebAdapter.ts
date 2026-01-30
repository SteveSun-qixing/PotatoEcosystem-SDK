/**
 * Web平台适配器
 */

import type { IPlatformAdapter, IFileSystem, FileStats } from '../../types';
import { Platform } from '../../types';

/**
 * Web文件系统（基于IndexedDB）
 */
class WebFileSystem implements IFileSystem {
  private dbName = 'chips-sdk-fs';
  private dbVersion = 1;
  private storeName = 'files';

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'path' });
        }
      };
    });
  }

  async readFile(path: string): Promise<ArrayBuffer> {
    const db = await this.getDB();
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(path);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as { data: ArrayBuffer } | undefined;
        if (result?.data) {
          resolve(result.data);
        } else {
          reject(new Error(`File not found: ${path}`));
        }
      };
    });
  }

  async writeFile(path: string, data: ArrayBuffer): Promise<void> {
    const db = await this.getDB();

    // 检查是否已存在
    const existing = await this.exists(path);
    const createdAt = existing ? (await this.stat(path)).createdAt : new Date();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({
        path,
        data,
        modifiedAt: new Date(),
        createdAt,
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.readFile(path);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<FileStats> {
    const db = await this.getDB();
    return new Promise<FileStats>((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(path);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as
          | {
              data: ArrayBuffer;
              createdAt: Date;
              modifiedAt: Date;
            }
          | undefined;

        if (result) {
          resolve({
            size: result.data.byteLength,
            isFile: true,
            isDirectory: false,
            createdAt: result.createdAt,
            modifiedAt: result.modifiedAt,
          });
        } else {
          reject(new Error(`File not found: ${path}`));
        }
      };
    });
  }

  async mkdir(): Promise<void> {
    // Web环境不需要创建目录
    return Promise.resolve();
  }

  async readdir(path: string): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const keys = request.result as string[];
        const filtered = keys.filter((key) => key.startsWith(path));
        resolve(filtered);
      };
    });
  }

  async unlink(path: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(path);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async rmdir(): Promise<void> {
    // Web环境不需要删除目录
    return Promise.resolve();
  }
}

/**
 * Web平台适配器
 */
export class WebAdapter implements IPlatformAdapter {
  readonly platform = Platform.Web;
  private fileSystem: WebFileSystem;

  constructor() {
    this.fileSystem = new WebFileSystem();
  }

  async readFile(path: string): Promise<ArrayBuffer> {
    // 如果是URL，使用fetch
    if (/^https?:\/\//.test(path)) {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.arrayBuffer();
    }

    // 否则从IndexedDB读取
    return this.fileSystem.readFile(path);
  }

  async writeFile(path: string, data: ArrayBuffer): Promise<void> {
    return this.fileSystem.writeFile(path, data);
  }

  async exists(path: string): Promise<boolean> {
    return this.fileSystem.exists(path);
  }

  async listFiles(path: string): Promise<string[]> {
    return this.fileSystem.readdir(path);
  }

  async deleteFile(path: string): Promise<void> {
    return this.fileSystem.unlink(path);
  }

  getFileSystem(): IFileSystem {
    return this.fileSystem;
  }
}
