/**
 * 资源加载器
 *
 * 支持多种资源协议（http、https、file等）
 */

import type { IPlatformAdapter } from '../types';
import { Logger } from '../core/logger';
import { NetworkError, ResourceError } from '../core/error';
import { ERROR_CODES } from '../constants/errors';

/**
 * 资源协议类型
 */
export type ResourceProtocol = 'http' | 'https' | 'file' | 'data' | 'blob';

/**
 * 资源加载选项
 */
export interface ResourceLoadOptions {
  timeout?: number;
  headers?: Record<string, string>;
  cache?: boolean;
  retry?: number;
  retryDelay?: number;
}

/**
 * 资源加载结果
 */
export interface ResourceLoadResult {
  data: ArrayBuffer;
  contentType?: string;
  size: number;
  url: string;
  cached: boolean;
}

/**
 * 资源加载器类
 */
export class ResourceLoader {
  private adapter?: IPlatformAdapter;
  private logger: Logger;
  private defaultTimeout: number;
  private defaultRetry: number;
  private defaultRetryDelay: number;

  constructor(
    logger: Logger,
    adapter?: IPlatformAdapter,
    options: {
      defaultTimeout?: number;
      defaultRetry?: number;
      defaultRetryDelay?: number;
    } = {}
  ) {
    this.logger = logger;
    this.adapter = adapter;
    this.defaultTimeout = options.defaultTimeout ?? 10000; // 10秒
    this.defaultRetry = options.defaultRetry ?? 3;
    this.defaultRetryDelay = options.defaultRetryDelay ?? 1000; // 1秒
  }

  /**
   * 设置平台适配器
   * @param adapter 平台适配器
   */
  setAdapter(adapter: IPlatformAdapter): void {
    this.adapter = adapter;
  }

  /**
   * 检测资源协议
   * @param url 资源URL
   * @returns 协议类型
   */
  detectProtocol(url: string): ResourceProtocol {
    if (url.startsWith('http://')) {
      return 'http';
    }
    if (url.startsWith('https://')) {
      return 'https';
    }
    if (url.startsWith('file://')) {
      return 'file';
    }
    if (url.startsWith('data:')) {
      return 'data';
    }
    if (url.startsWith('blob:')) {
      return 'blob';
    }

    // 默认视为文件路径
    return 'file';
  }

  /**
   * 规范化URL
   * @param url 原始URL
   * @returns 规范化后的URL
   */
  normalizeURL(url: string): string {
    const protocol = this.detectProtocol(url);

    if (protocol === 'file') {
      // 移除 file:// 前缀
      return url.replace(/^file:\/\//, '');
    }

    return url;
  }

  /**
   * 加载资源
   * @param url 资源URL
   * @param options 加载选项
   * @returns 资源数据
   */
  async load(
    url: string,
    options: ResourceLoadOptions = {}
  ): Promise<ResourceLoadResult> {
    const normalizedURL = this.normalizeURL(url);
    const protocol = this.detectProtocol(url);

    this.logger.debug('Loading resource', {
      url: normalizedURL,
      protocol,
      options,
    });

    try {
      const result = await this.loadWithRetry(normalizedURL, protocol, options);

      this.logger.info('Resource loaded successfully', {
        url: normalizedURL,
        size: result.size,
        cached: result.cached,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to load resource', error as Error, {
        url: normalizedURL,
        protocol,
      });

      if (error instanceof NetworkError || error instanceof ResourceError) {
        throw error;
      }

      throw new ResourceError(
        ERROR_CODES.RESOURCE_LOAD_FAILED,
        `Failed to load resource: ${normalizedURL}`,
        { originalError: error, url: normalizedURL, protocol }
      );
    }
  }

  /**
   * 带重试的资源加载
   * @param url 资源URL
   * @param protocol 协议类型
   * @param options 加载选项
   * @returns 资源数据
   */
  private async loadWithRetry(
    url: string,
    protocol: ResourceProtocol,
    options: ResourceLoadOptions
  ): Promise<ResourceLoadResult> {
    const maxRetries = options.retry ?? this.defaultRetry;
    const retryDelay = options.retryDelay ?? this.defaultRetryDelay;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.loadResource(url, protocol, options);
      } catch (error) {
        lastError = error as Error;

        // 如果是最后一次尝试，直接抛出错误
        if (attempt === maxRetries) {
          break;
        }

        // 等待后重试
        this.logger.debug('Retrying resource load', {
          url,
          attempt: attempt + 1,
          maxRetries,
        });

        await this.delay(retryDelay * (attempt + 1)); // 指数退避
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * 加载资源（具体实现）
   * @param url 资源URL
   * @param protocol 协议类型
   * @param options 加载选项
   * @returns 资源数据
   */
  private async loadResource(
    url: string,
    protocol: ResourceProtocol,
    options: ResourceLoadOptions
  ): Promise<ResourceLoadResult> {
    switch (protocol) {
      case 'http':
      case 'https':
        return this.loadHTTP(url, options);

      case 'file':
        return this.loadFile(url, options);

      case 'data':
        return this.loadDataURL(url);

      case 'blob':
        return this.loadBlob(url);

      default: {
        const protocolStr = String(protocol);
        throw new ResourceError(
          ERROR_CODES.RESOURCE_INVALID_URI,
          `Unsupported protocol: ${protocolStr}`,
          { url, protocol: protocolStr }
        );
      }
    }
  }

  /**
   * 加载HTTP/HTTPS资源
   * @param url 资源URL
   * @param options 加载选项
   * @returns 资源数据
   */
  private async loadHTTP(
    url: string,
    options: ResourceLoadOptions
  ): Promise<ResourceLoadResult> {
    const timeout = options.timeout ?? this.defaultTimeout;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const headers = options.headers ?? {};

      const response = await fetch(url, {
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new NetworkError(`HTTP error! status: ${response.status}`, {
          url,
          status: response.status,
          statusText: response.statusText,
        });
      }

      const data = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') ?? undefined;

      return {
        data,
        contentType,
        size: data.byteLength,
        url,
        cached: response.headers.get('x-cache') === 'HIT',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(`Request timeout after ${timeout}ms`, {
          url,
          timeout,
        });
      }

      throw error;
    }
  }

  /**
   * 加载文件资源
   * @param url 文件路径
   * @param _options 加载选项
   * @returns 资源数据
   */
  private async loadFile(
    url: string,
    _options: ResourceLoadOptions
  ): Promise<ResourceLoadResult> {
    if (!this.adapter) {
      throw new ResourceError(
        ERROR_CODES.RESOURCE_ACCESS_FAILED,
        'Platform adapter not set',
        { url }
      );
    }

    try {
      const data = await this.adapter.readFile(url);

      return {
        data,
        size: data.byteLength,
        url,
        cached: false,
      };
    } catch (error) {
      throw new ResourceError(
        ERROR_CODES.RESOURCE_ACCESS_FAILED,
        `Failed to read file: ${url}`,
        { originalError: error, url }
      );
    }
  }

  /**
   * 加载Data URL资源
   * @param url Data URL
   * @returns 资源数据
   */
  private async loadDataURL(url: string): Promise<ResourceLoadResult> {
    try {
      const commaIndex = url.indexOf(',');
      if (commaIndex === -1) {
        throw new ResourceError(
          ERROR_CODES.RESOURCE_INVALID_URI,
          'Invalid data URL format',
          { url }
        );
      }

      const header = url.substring(0, commaIndex);
      const dataPart = url.substring(commaIndex + 1);

      // 解析Content-Type
      const contentTypeMatch = header.match(/data:([^;]+)/);
      const contentType = contentTypeMatch ? contentTypeMatch[1] : undefined;

      // 检查是否base64编码
      const isBase64 = header.includes('base64');

      let data: ArrayBuffer;

      if (isBase64) {
        // Base64解码
        const binaryString = atob(dataPart);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        data = bytes.buffer;
      } else {
        // URL编码解码
        const decoded = decodeURIComponent(dataPart);
        const encoder = new TextEncoder();
        data = encoder.encode(decoded).buffer;
      }

      return {
        data,
        contentType,
        size: data.byteLength,
        url,
        cached: false,
      };
    } catch (error) {
      throw new ResourceError(
        ERROR_CODES.RESOURCE_LOAD_FAILED,
        `Failed to load data URL`,
        { originalError: error, url }
      );
    }
  }

  /**
   * 加载Blob URL资源
   * @param url Blob URL
   * @returns 资源数据
   */
  private async loadBlob(url: string): Promise<ResourceLoadResult> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new ResourceError(
          ERROR_CODES.RESOURCE_ACCESS_FAILED,
          `Failed to load blob URL`,
          { url, status: response.status }
        );
      }

      const data = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') ?? undefined;

      return {
        data,
        contentType,
        size: data.byteLength,
        url,
        cached: false,
      };
    } catch (error) {
      throw new ResourceError(
        ERROR_CODES.RESOURCE_LOAD_FAILED,
        `Failed to load blob URL`,
        { originalError: error, url }
      );
    }
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 批量加载资源
   * @param urls 资源URL数组
   * @param options 加载选项
   * @returns 资源数据数组
   */
  async loadBatch(
    urls: string[],
    options: ResourceLoadOptions = {}
  ): Promise<ResourceLoadResult[]> {
    const promises = urls.map((url) => this.load(url, options));
    return Promise.all(promises);
  }

  /**
   * 预加载资源
   * @param url 资源URL
   * @param options 加载选项
   */
  async preload(url: string, options: ResourceLoadOptions = {}): Promise<void> {
    try {
      await this.load(url, { ...options, cache: true });
    } catch (error) {
      // 预加载失败不抛出错误，只记录日志
      this.logger.warn('Preload failed', { url, error });
    }
  }

  /**
   * 批量预加载资源
   * @param urls 资源URL数组
   * @param options 加载选项
   */
  async preloadBatch(
    urls: string[],
    options: ResourceLoadOptions = {}
  ): Promise<void> {
    await Promise.all(urls.map((url) => this.preload(url, options)));
  }
}
