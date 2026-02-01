/**
 * ID 生成工具
 * @module utils/id
 */

/** 62 进制字符集 */
const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** ID 长度 */
const ID_LENGTH = 10;

/** ID 验证正则 */
const ID_REGEX = /^[0-9a-zA-Z]{10}$/;

/**
 * 生成十位 62 进制 ID
 * @returns 十位 62 进制字符串
 * @example
 * ```ts
 * const id = generateId();
 * // => "a1B2c3D4e5"
 * ```
 */
export function generateId(): string {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return id;
}

/**
 * 验证 ID 格式是否正确
 * @param id - 要验证的 ID
 * @returns 是否为有效的 ID
 * @example
 * ```ts
 * isValidId('a1B2c3D4e5'); // => true
 * isValidId('invalid'); // => false
 * ```
 */
export function isValidId(id: string): boolean {
  if (typeof id !== 'string') return false;
  return ID_REGEX.test(id);
}

/**
 * 生成 UUID v4
 * @returns UUID 字符串
 * @example
 * ```ts
 * const uuid = generateUuid();
 * // => "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 验证 UUID 格式
 * @param uuid - 要验证的 UUID
 * @returns 是否为有效的 UUID
 */
export function isValidUuid(uuid: string): boolean {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * 生成短 ID（8 位）
 * @returns 8 位随机字符串
 */
export function generateShortId(): string {
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return id;
}
