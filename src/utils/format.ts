/**
 * 格式化工具函数
 */

/**
 * 生成ISO 8601格式的时间戳
 * @param date 日期对象（可选，默认当前时间）
 * @returns ISO 8601格式字符串
 */
export function toISODateTime(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * 解析ISO 8601时间戳
 * @param isoString ISO 8601格式字符串
 * @returns Date对象
 */
export function fromISODateTime(isoString: string): Date {
  return new Date(isoString);
}

/**
 * 格式化时间戳为人类可读格式
 * @param isoString ISO 8601格式字符串
 * @param locale 语言环境
 * @returns 格式化的时间字符串
 */
export function formatDateTime(isoString: string, locale = 'zh-CN'): string {
  const date = new Date(isoString);
  return date.toLocaleString(locale);
}

/**
 * 深拷贝对象
 * @param obj 原对象
 * @returns 深拷贝后的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map((item: unknown) => deepClone(item)) as T;
  }

  if (obj instanceof Map) {
    const clonedMap = new Map();
    obj.forEach((value, key) => {
      clonedMap.set(key, deepClone(value));
    });
    return clonedMap as T;
  }

  if (obj instanceof Set) {
    const clonedSet = new Set();
    obj.forEach((value) => {
      clonedSet.add(deepClone(value));
    });
    return clonedSet as T;
  }

  // 对象类型
  const clonedObj = {} as Record<string, unknown>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }

  return clonedObj as T;
}

/**
 * 深度合并对象
 * @param target 目标对象
 * @param sources 源对象
 * @returns 合并后的对象
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;

  const source = sources.shift();
  if (!source) return target;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        target[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        target[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return deepMerge(target, ...sources);
}
