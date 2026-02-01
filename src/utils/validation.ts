/**
 * 验证工具
 * @module utils/validation
 */

import { CardMetadata } from '../types/card';
import { BoxMetadata } from '../types/box';
import { isValidId } from './id';

/**
 * 验证卡片元数据
 * @param metadata - 元数据对象
 * @returns 是否为有效的卡片元数据
 */
export function validateCardMetadata(metadata: unknown): metadata is CardMetadata {
  if (!metadata || typeof metadata !== 'object') return false;

  const m = metadata as Record<string, unknown>;

  // 必填字段检查
  if (typeof m.chip_standards_version !== 'string') return false;
  if (typeof m.card_id !== 'string' || !isValidId(m.card_id)) return false;
  if (typeof m.name !== 'string' || m.name.trim() === '') return false;
  if (typeof m.created_at !== 'string' || !validateTimestamp(m.created_at)) return false;
  if (typeof m.modified_at !== 'string' || !validateTimestamp(m.modified_at)) return false;

  // 可选字段检查
  if (m.theme !== undefined && typeof m.theme !== 'string') return false;
  if (m.tags !== undefined && !Array.isArray(m.tags)) return false;
  if (m.description !== undefined && typeof m.description !== 'string') return false;
  if (m.author !== undefined && typeof m.author !== 'string') return false;

  return true;
}

/**
 * 验证箱子元数据
 * @param metadata - 元数据对象
 * @returns 是否为有效的箱子元数据
 */
export function validateBoxMetadata(metadata: unknown): metadata is BoxMetadata {
  if (!metadata || typeof metadata !== 'object') return false;

  const m = metadata as Record<string, unknown>;

  // 必填字段检查
  if (typeof m.chip_standards_version !== 'string') return false;
  if (typeof m.box_id !== 'string' || !isValidId(m.box_id)) return false;
  if (typeof m.name !== 'string' || m.name.trim() === '') return false;
  if (typeof m.layout !== 'string') return false;
  if (typeof m.created_at !== 'string' || !validateTimestamp(m.created_at)) return false;
  if (typeof m.modified_at !== 'string' || !validateTimestamp(m.modified_at)) return false;

  // 可选字段检查
  if (m.tags !== undefined && !Array.isArray(m.tags)) return false;
  if (m.description !== undefined && typeof m.description !== 'string') return false;
  if (m.author !== undefined && typeof m.author !== 'string') return false;

  return true;
}

/**
 * 验证协议版本格式
 * @param version - 版本字符串
 * @returns 是否为有效的版本格式
 * @example
 * ```ts
 * validateProtocolVersion('1.0.0'); // => true
 * validateProtocolVersion('v1.0'); // => false
 * ```
 */
export function validateProtocolVersion(version: string): boolean {
  if (typeof version !== 'string') return false;
  return /^\d+\.\d+\.\d+$/.test(version);
}

/**
 * 验证时间戳格式（ISO 8601）
 * @param timestamp - 时间戳字符串
 * @returns 是否为有效的时间戳
 * @example
 * ```ts
 * validateTimestamp('2026-02-01T12:00:00.000Z'); // => true
 * validateTimestamp('invalid'); // => false
 * ```
 */
export function validateTimestamp(timestamp: string): boolean {
  if (typeof timestamp !== 'string') return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * 验证标签格式
 * @param tag - 标签
 * @returns 是否为有效的标签
 */
export function validateTag(tag: unknown): boolean {
  if (typeof tag === 'string') {
    return tag.trim().length > 0;
  }
  if (Array.isArray(tag)) {
    return tag.length > 0 && tag.every((t) => typeof t === 'string' && t.trim().length > 0);
  }
  return false;
}

/**
 * 验证标签列表
 * @param tags - 标签列表
 * @returns 是否为有效的标签列表
 */
export function validateTags(tags: unknown): boolean {
  if (!Array.isArray(tags)) return false;
  return tags.every(validateTag);
}

/**
 * 验证资源路径
 * @param path - 资源路径
 * @returns 是否为有效的资源路径
 */
export function validateResourcePath(path: string): boolean {
  if (typeof path !== 'string') return false;
  if (path.trim() === '') return false;
  // 不允许路径遍历
  if (path.includes('..')) return false;
  // 必须以 resources/ 开头
  if (!path.startsWith('resources/')) return false;
  return true;
}

/**
 * 验证文件大小
 * @param size - 文件大小（字节）
 * @param maxSize - 最大允许大小（字节）
 * @returns 是否在允许范围内
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  return typeof size === 'number' && size >= 0 && size <= maxSize;
}

/**
 * 验证 MIME 类型
 * @param mimeType - MIME 类型字符串
 * @returns 是否为有效的 MIME 类型
 */
export function validateMimeType(mimeType: string): boolean {
  if (typeof mimeType !== 'string') return false;
  return /^[\w+-]+\/[\w+-]+$/.test(mimeType);
}

/**
 * 验证 URL 格式
 * @param url - URL 字符串
 * @returns 是否为有效的 URL
 */
export function validateUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证邮箱格式
 * @param email - 邮箱字符串
 * @returns 是否为有效的邮箱
 */
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
