/**
 * 对象处理工具函数
 */

/**
 * 判断是否为空对象
 * @param obj 对象
 * @returns 是否为空
 */
export function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * 选择对象的部分属性
 * @param obj 源对象
 * @param keys 要选择的键
 * @returns 新对象
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * 排除对象的部分属性
 * @param obj 源对象
 * @param keys 要排除的键
 * @returns 新对象
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  return result;
}

/**
 * 获取嵌套对象的值
 * @param obj 对象
 * @param path 路径（点分隔）
 * @param defaultValue 默认值
 * @returns 值
 */
export function getNestedValue<T = unknown>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return defaultValue as T;
    }
  }

  return current as T;
}

/**
 * 设置嵌套对象的值
 * @param obj 对象
 * @param path 路径（点分隔）
 * @param value 值
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split('.');
  const lastKey = keys.pop();

  if (!lastKey) return;

  let current: Record<string, unknown> = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[lastKey] = value;
}
