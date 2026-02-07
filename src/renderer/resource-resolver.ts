/**
 * ResourceResolver - 渲染流水线中的资源解析器
 * @module renderer/resource-resolver
 *
 * 在渲染流水线中负责将卡片配置中的资源相对路径解析为浏览器可访问的 URL。
 *
 * 工作流程：
 * 1. 扫描 ParsedBaseCardConfig 中的资源路径字段
 * 2. 对内部资源（在 rawFiles 中），创建 blob URL 并替换路径
 * 3. 对外部资源（http/https/blob/data URL）保持不变
 * 4. 管理 blob URL 生命周期（创建和释放）
 *
 * 未来当内核的 resource.fetch 链路完全打通后，可以改为通过
 * SDK ResourceManager -> CoreConnector -> 内核 -> Foundation ResourceManager
 * 的标准链路获取资源。当前实现直接从 rawFiles 创建 blob URL。
 */

import type { ParsedCardData } from './types';

/**
 * 资源解析结果
 */
export interface ResourceResolveResult {
  /** config 中路径已替换为 blob URL 的卡片数据 */
  cardData: ParsedCardData;
  /** 成功解析的资源数量 */
  resolvedCount: number;
  /** 解析失败的路径列表 */
  failedPaths: string[];
}

/**
 * 已知的资源路径字段名
 */
const RESOURCE_FIELDS = new Set([
  'file_path', 'image_file', 'video_file', 'audio_file',
  'cover_image', 'poster', 'src', 'url', 'path',
  'image', 'video', 'audio', 'file', 'thumbnail',
]);

/**
 * 资源文件扩展名
 */
const RESOURCE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico',
  'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv',
  'mp3', 'wav', 'flac', 'aac', 'm4a', 'wma',
  'woff', 'woff2', 'ttf', 'otf',
  'pdf', 'srt', 'vtt', 'ass',
]);

/**
 * 扩展名到 MIME 类型映射
 */
const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  bmp: 'image/bmp', avif: 'image/avif', ico: 'image/x-icon',
  mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg',
  mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
  aac: 'audio/aac', m4a: 'audio/mp4', wma: 'audio/x-ms-wma',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  pdf: 'application/pdf', srt: 'text/plain', vtt: 'text/vtt', ass: 'text/plain',
};

/**
 * 检查路径是否为外部 URL（不需要解析）
 */
function isExternalUrl(path: string): boolean {
  return (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('chips://')
  );
}

/**
 * 检查路径是否可能是资源路径
 */
function isResourcePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  if (isExternalUrl(path)) return false;
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return RESOURCE_EXTENSIONS.has(ext);
}

/**
 * 推断 MIME 类型
 */
function inferMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_MIME[ext] ?? 'application/octet-stream';
}

/**
 * 资源解析器
 *
 * 管理卡片渲染过程中资源路径到 blob URL 的转换和生命周期。
 *
 * @example
 * ```ts
 * const resolver = new ResourceResolver();
 * const resolved = resolver.resolve(cardData);
 * // 使用 resolved.cardData 进行渲染
 * // 渲染完成后清理
 * resolver.cleanup();
 * ```
 */
export class ResourceResolver {
  /** 已创建的 blob URL 列表 */
  private _blobUrls: string[] = [];

  /**
   * 解析卡片数据中的所有资源路径
   *
   * 深度遍历每个 baseCard.config，找到资源路径字段，
   * 从 rawFiles 中提取资源数据，创建 blob URL，替换路径。
   *
   * @param cardData - 包含 rawFiles 的解析后卡片数据
   * @returns 路径已替换的卡片数据 + 统计信息
   */
  resolve(cardData: ParsedCardData): ResourceResolveResult {
    const rawFiles = cardData.rawFiles;
    if (!rawFiles || rawFiles.size === 0) {
      return { cardData, resolvedCount: 0, failedPaths: [] };
    }

    let resolvedCount = 0;
    const failedPaths: string[] = [];

    // 深拷贝 baseCards，避免修改原始数据
    const resolvedBaseCards = cardData.baseCards.map((bc) => ({
      ...bc,
      config: this._resolveConfig(bc.config, rawFiles, () => { resolvedCount++; }, failedPaths),
    }));

    return {
      cardData: {
        ...cardData,
        baseCards: resolvedBaseCards,
      },
      resolvedCount,
      failedPaths,
    };
  }

  /**
   * 释放所有已创建的 blob URL
   */
  cleanup(): void {
    for (const url of this._blobUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // 忽略释放错误
      }
    }
    this._blobUrls = [];
  }

  /**
   * 获取已创建的 blob URL 数量
   */
  get blobUrlCount(): number {
    return this._blobUrls.length;
  }

  // ========== 私有方法 ==========

  /**
   * 递归解析配置对象中的资源路径
   */
  private _resolveConfig(
    config: Record<string, unknown>,
    rawFiles: Map<string, Uint8Array>,
    onResolved: () => void,
    failedPaths: string[]
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        // 检查是否是资源路径字段
        if (RESOURCE_FIELDS.has(key) && value.trim() && !isExternalUrl(value)) {
          const blobUrl = this._resolveResourcePath(value, rawFiles);
          if (blobUrl) {
            result[key] = blobUrl;
            onResolved();
          } else {
            result[key] = value;
            if (isResourcePath(value)) {
              failedPaths.push(value);
            }
          }
        } else if (isResourcePath(value) && !isExternalUrl(value)) {
          // 通用路径检测（不在已知字段名中但看起来像资源路径）
          const blobUrl = this._resolveResourcePath(value, rawFiles);
          if (blobUrl) {
            result[key] = blobUrl;
            onResolved();
          } else {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      } else if (Array.isArray(value)) {
        // 递归处理数组（如 images: [{file_path: "..."}]）
        result[key] = value.map((item) => {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            return this._resolveConfig(
              item as Record<string, unknown>,
              rawFiles,
              onResolved,
              failedPaths
            );
          }
          return item;
        });
      } else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        result[key] = this._resolveConfig(
          value as Record<string, unknown>,
          rawFiles,
          onResolved,
          failedPaths
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 将资源路径解析为 blob URL
   *
   * @param resourcePath - 资源相对路径（如 "photo.jpg"）
   * @param rawFiles - ZIP 解压后的文件映射
   * @returns blob URL 或 null
   */
  private _resolveResourcePath(
    resourcePath: string,
    rawFiles: Map<string, Uint8Array>
  ): string | null {
    // 尝试多种路径格式查找
    let data = rawFiles.get(resourcePath);
    if (!data) {
      // 去掉开头的 ./
      const altPath = resourcePath.startsWith('./')
        ? resourcePath.slice(2)
        : `./${resourcePath}`;
      data = rawFiles.get(altPath);
    }
    if (!data) {
      // 尝试 URL 解码
      try {
        data = rawFiles.get(decodeURIComponent(resourcePath));
      } catch {
        // 解码失败，忽略
      }
    }

    if (!data || data.byteLength === 0) {
      return null;
    }

    // 创建 blob URL
    const mimeType = inferMimeType(resourcePath);
    const blob = new Blob([data as unknown as BlobPart], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    this._blobUrls.push(blobUrl);

    return blobUrl;
  }
}

/**
 * 创建资源解析器实例
 */
export function createResourceResolver(): ResourceResolver {
  return new ResourceResolver();
}
