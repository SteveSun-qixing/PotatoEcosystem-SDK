/**
 * 异步工具
 * @module utils/async
 */

/**
 * 延迟执行
 * @param ms - 延迟毫秒数
 * @returns Promise
 * @example
 * ```ts
 * await delay(1000); // 等待 1 秒
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带超时的 Promise
 * @param promise - 原始 Promise
 * @param timeoutMs - 超时毫秒数
 * @param timeoutError - 超时错误（可选）
 * @returns 带超时控制的 Promise
 * @example
 * ```ts
 * const result = await withTimeout(fetch(url), 5000);
 * ```
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(timeoutError ?? new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * 重试选项
 */
export interface RetryOptions {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  delayMs?: number;
  /** 是否使用指数退避 */
  backoff?: boolean;
  /** 最大延迟（毫秒） */
  maxDelayMs?: number;
  /** 重试条件 */
  shouldRetry?: (error: Error) => boolean;
  /** 重试回调 */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * 重试执行
 * @param fn - 要执行的异步函数
 * @param options - 重试选项
 * @returns 执行结果
 * @example
 * ```ts
 * const result = await retry(() => fetch(url), { maxRetries: 3 });
 * ```
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    maxDelayMs = 30000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否应该重试
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      // 最后一次尝试不需要延迟
      if (attempt < maxRetries - 1) {
        // 计算延迟时间
        const waitTime = backoff ? Math.min(delayMs * Math.pow(2, attempt), maxDelayMs) : delayMs;

        // 调用重试回调
        onRetry?.(lastError, attempt + 1);

        await delay(waitTime);
      }
    }
  }

  throw lastError;
}

/**
 * 并发限制执行
 * @param tasks - 任务函数列表
 * @param limit - 并发限制
 * @returns 执行结果列表
 * @example
 * ```ts
 * const results = await concurrent(
 *   urls.map(url => () => fetch(url)),
 *   3 // 最多 3 个并发
 * );
 * ```
 */
export async function concurrent<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const [index, task] of tasks.entries()) {
    const p = task().then((result) => {
      results[index] = result;
    });

    const e = p.then(() => {
      executing.splice(executing.indexOf(e), 1);
    });

    executing.push(e);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 防抖函数
 * @param fn - 要防抖的函数
 * @param waitMs - 等待时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, waitMs);
  };
}

/**
 * 节流函数
 * @param fn - 要节流的函数
 * @param limitMs - 限制时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>): void {
    const now = Date.now();

    if (now - lastTime >= limitMs) {
      fn.apply(this, args);
      lastTime = now;
    } else if (!timeoutId) {
      timeoutId = setTimeout(
        () => {
          fn.apply(this, args);
          lastTime = Date.now();
          timeoutId = null;
        },
        limitMs - (now - lastTime)
      );
    }
  };
}

/**
 * 创建可取消的 Promise
 * @returns 包含 promise 和 cancel 方法的对象
 */
export function createCancellable<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  cancel: () => void;
  isCancelled: () => boolean;
} {
  let cancelled = false;
  let resolveRef: (value: T) => void;
  let rejectRef: (reason?: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveRef = resolve;
    rejectRef = reject;
  });

  return {
    promise,
    resolve: (value: T) => {
      if (!cancelled) resolveRef(value);
    },
    reject: (reason?: unknown) => {
      if (!cancelled) rejectRef(reason);
    },
    cancel: () => {
      cancelled = true;
    },
    isCancelled: () => cancelled,
  };
}

/**
 * 序列执行异步函数
 * @param tasks - 任务函数列表
 * @returns 执行结果列表
 */
export async function sequence<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}
