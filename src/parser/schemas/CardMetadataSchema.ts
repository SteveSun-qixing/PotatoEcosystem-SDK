/**
 * 卡片元数据Schema验证
 */

import type { CardMetadata } from '../../types';
import {
  validateSemanticVersion,
  validateId,
  validateThemeId,
  validateTag,
} from '../../utils/validation';

/**
 * 验证卡片元数据
 * @param data 待验证的数据
 * @returns 验证结果
 */
export function validateCardMetadata(data: unknown): data is CardMetadata {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const metadata = data as Record<string, unknown>;

  // 必需字段检查
  if (
    typeof metadata.chip_standards_version !== 'string' ||
    !validateSemanticVersion(metadata.chip_standards_version)
  ) {
    return false;
  }

  if (typeof metadata.card_id !== 'string' || !validateId(metadata.card_id)) {
    return false;
  }

  if (
    typeof metadata.name !== 'string' ||
    metadata.name.length === 0 ||
    metadata.name.length > 500
  ) {
    return false;
  }

  if (typeof metadata.created_at !== 'string') {
    return false;
  }

  if (typeof metadata.modified_at !== 'string') {
    return false;
  }

  // 可选字段检查
  if (metadata.theme !== undefined) {
    if (
      typeof metadata.theme !== 'string' ||
      !validateThemeId(metadata.theme)
    ) {
      return false;
    }
  }

  if (metadata.tags !== undefined) {
    if (!Array.isArray(metadata.tags)) {
      return false;
    }

    for (const tag of metadata.tags) {
      if (
        (typeof tag !== 'string' && !Array.isArray(tag)) ||
        !validateTag(tag as string | string[])
      ) {
        return false;
      }
    }
  }

  if (metadata.visibility !== undefined) {
    if (
      !['public', 'private', 'unlisted'].includes(metadata.visibility as string)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 标准化卡片元数据（填充默认值）
 * @param metadata 元数据
 * @returns 标准化后的元数据
 */
export function normalizeCardMetadata(
  metadata: Partial<CardMetadata>
): CardMetadata {
  return {
    chip_standards_version: metadata.chip_standards_version ?? '1.0.0',
    card_id: metadata.card_id ?? '',
    name: metadata.name ?? '',
    created_at: metadata.created_at ?? new Date().toISOString(),
    modified_at: metadata.modified_at ?? new Date().toISOString(),
    theme: metadata.theme,
    tags: metadata.tags,
    visibility: metadata.visibility,
    downloadable: metadata.downloadable,
    remixable: metadata.remixable,
    commentable: metadata.commentable,
    license: metadata.license,
    age_rating: metadata.age_rating,
    content_warning: metadata.content_warning,
    file_info: metadata.file_info,
  };
}
