/**
 * 卡片结构Schema验证
 */

import type { CardStructure } from '../../types';
import { validateId } from '../../utils/validation';

/**
 * 验证卡片结构
 * @param data 待验证的数据
 * @returns 验证结果
 */
export function validateCardStructure(data: unknown): data is CardStructure {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const structure = data as Record<string, unknown>;

  // 检查structure数组
  if (!Array.isArray(structure.structure)) {
    return false;
  }

  for (const item of structure.structure) {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const structureItem = item as Record<string, unknown>;

    // 检查id
    if (typeof structureItem.id !== 'string' || !validateId(structureItem.id)) {
      return false;
    }

    // 检查type
    if (typeof structureItem.type !== 'string') {
      return false;
    }
  }

  // 检查manifest
  if (!structure.manifest || typeof structure.manifest !== 'object') {
    return false;
  }

  const manifest = structure.manifest as Record<string, unknown>;

  if (typeof manifest.card_count !== 'number' || manifest.card_count < 0) {
    return false;
  }

  if (
    typeof manifest.resource_count !== 'number' ||
    manifest.resource_count < 0
  ) {
    return false;
  }

  // resources是可选的
  if (manifest.resources !== undefined && !Array.isArray(manifest.resources)) {
    return false;
  }

  return true;
}

/**
 * 标准化卡片结构
 * @param structure 结构数据
 * @returns 标准化后的结构
 */
export function normalizeCardStructure(
  structure: Partial<CardStructure>
): CardStructure {
  return {
    structure: structure.structure ?? [],
    manifest: {
      card_count: structure.manifest?.card_count ?? 0,
      resource_count: structure.manifest?.resource_count ?? 0,
      resources: structure.manifest?.resources,
    },
  };
}
