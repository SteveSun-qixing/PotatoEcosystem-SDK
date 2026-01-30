/**
 * 数据验证工具函数
 */

/**
 * 验证ID格式
 * @param id 待验证的ID
 * @returns 是否有效
 */
export function validateId(id: string): boolean {
  if (id.length !== 10) {
    return false;
  }

  const pattern = /^[0-9a-zA-Z]{10}$/;
  if (!pattern.test(id)) {
    return false;
  }

  if (id === '0000000000') {
    return false;
  }

  return true;
}

/**
 * 验证语义化版本号
 * @param version 版本号
 * @returns 是否有效
 */
export function validateSemanticVersion(version: string): boolean {
  const pattern = /^\d+\.\d+\.\d+$/;
  return pattern.test(version);
}

/**
 * 验证URL格式
 * @param url URL字符串
 * @returns 是否有效
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证主题ID格式
 * @param themeId 主题ID（格式：发行商:主题包名称）
 * @returns 是否有效
 */
export function validateThemeId(themeId: string): boolean {
  if (!themeId) return true; // 空主题ID是允许的

  const parts = themeId.split(':');
  return (
    parts.length === 2 &&
    (parts[0]?.length ?? 0) > 0 &&
    (parts[1]?.length ?? 0) > 0
  );
}

/**
 * 验证卡片名称
 * @param name 卡片名称
 * @returns 是否有效
 */
export function validateCardName(name: string): boolean {
  return name.length > 0 && name.length <= 500;
}

/**
 * 验证标签
 * @param tag 标签
 * @returns 是否有效
 */
export function validateTag(tag: string | string[]): boolean {
  if (typeof tag === 'string') {
    return tag.length > 0;
  }

  if (Array.isArray(tag)) {
    return tag.length >= 2 && tag.every((item) => typeof item === 'string');
  }

  return false;
}
