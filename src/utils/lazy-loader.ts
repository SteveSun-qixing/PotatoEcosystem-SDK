/**
 * 懒加载工具
 * 用于按需加载模块，优化初始加载性能
 */

type LoaderFunction<T> = () => Promise<T>;

/**
 * 懒加载缓存
 */
class LazyLoadCache<T> {
  private cache = new Map<string, Promise<T>>();

  get(key: string, loader: LoaderFunction<T>): Promise<T> {
    if (!this.cache.has(key)) {
      this.cache.set(key, loader());
    }
    return this.cache.get(key)!;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

const lazyCache = new LazyLoadCache();

/**
 * 创建懒加载函数
 */
export function createLazyLoader<T>(
  key: string,
  loader: LoaderFunction<T>
): () => Promise<T> {
  return () => lazyCache.get(key, loader) as Promise<T>;
}

/**
 * 预加载资源
 */
export function preload<T>(key: string, loader: LoaderFunction<T>): void {
  if (!lazyCache.has(key)) {
    lazyCache.get(key, loader).catch((error) => {
      console.error(`Failed to preload ${key}:`, error);
      lazyCache.clear(key);
    });
  }
}

/**
 * 懒加载组件示例
 */
export const lazyLoadComponents = {
  // 解析器模块
  parser: createLazyLoader('parser', () => import('../parser')),

  // 渲染器模块
  renderer: createLazyLoader('renderer', () => import('../renderer')),

  // 主题模块
  theme: createLazyLoader('theme', () => import('../theme')),

  // 编辑器模块
  editor: createLazyLoader('editor', () => import('../editor')),

  // 资源管理器
  resource: createLazyLoader('resource', () => import('../resource')),
};

/**
 * 智能预加载策略
 */
export class PreloadStrategy {
  private preloadQueue: Array<{
    key: string;
    loader: LoaderFunction<any>;
    priority: number;
  }> = [];

  /**
   * 添加预加载任务
   */
  add<T>(key: string, loader: LoaderFunction<T>, priority: number = 0): void {
    this.preloadQueue.push({ key, loader, priority });
  }

  /**
   * 执行预加载
   */
  async execute(): Promise<void> {
    // 按优先级排序
    this.preloadQueue.sort((a, b) => b.priority - a.priority);

    // 使用requestIdleCallback在空闲时预加载
    if (typeof requestIdleCallback !== 'undefined') {
      for (const task of this.preloadQueue) {
        await new Promise<void>((resolve) => {
          requestIdleCallback(() => {
            preload(task.key, task.loader);
            resolve();
          });
        });
      }
    } else {
      // 降级方案：使用setTimeout
      for (const task of this.preloadQueue) {
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            preload(task.key, task.loader);
            resolve();
          }, 0);
        });
      }
    }
  }

  /**
   * 清空预加载队列
   */
  clear(): void {
    this.preloadQueue = [];
  }
}

/**
 * 条件懒加载
 * 根据条件决定是否加载模块
 */
export function conditionalLoad<T>(
  condition: boolean | (() => boolean),
  loader: LoaderFunction<T>
): Promise<T | null> {
  const shouldLoad = typeof condition === 'function' ? condition() : condition;

  if (shouldLoad) {
    return loader();
  }

  return Promise.resolve(null);
}

/**
 * 批量懒加载
 */
export async function batchLoad<T>(
  loaders: Array<{
    key: string;
    loader: LoaderFunction<T>;
  }>,
  options: {
    parallel?: boolean;
    onProgress?: (loaded: number, total: number) => void;
  } = {}
): Promise<T[]> {
  const { parallel = true, onProgress } = options;
  const total = loaders.length;
  let loaded = 0;

  if (parallel) {
    // 并行加载
    const promises = loaders.map((item) => {
      return lazyCache.get(item.key, item.loader).then((result) => {
        loaded++;
        onProgress?.(loaded, total);
        return result;
      });
    });
    return Promise.all(promises) as Promise<T[]>;
  } else {
    // 串行加载
    const results: T[] = [];
    for (const item of loaders) {
      const result = await lazyCache.get(item.key, item.loader) as T;
      loaded++;
      onProgress?.(loaded, total);
      results.push(result);
    }
    return results;
  }
}

/**
 * 动态导入辅助函数
 */
export function dynamicImport<T = any>(modulePath: string): Promise<T> {
  return import(/* @vite-ignore */ modulePath);
}

/**
 * 创建懒加载工厂
 */
export function createLazyFactory<T, Args extends any[]>(
  loader: LoaderFunction<{ default: new (...args: Args) => T }>
): (...args: Args) => Promise<T> {
  return async (...args: Args) => {
    const module = await loader();
    return new module.default(...args);
  };
}

/**
 * 懒加载单例
 */
export function lazySingleton<T>(loader: LoaderFunction<T>): () => Promise<T> {
  let instance: T | null = null;
  let loading: Promise<T> | null = null;

  return () => {
    if (instance) {
      return Promise.resolve(instance);
    }

    if (loading) {
      return loading;
    }

    loading = loader().then((result) => {
      instance = result;
      loading = null;
      return result;
    });

    return loading;
  };
}

/**
 * 懒加载装饰器（用于类方法）
 */
export function LazyLoad<T>(loader: LoaderFunction<T>) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    let cached: T | null = null;

    descriptor.value = async function (...args: any[]) {
      if (!cached) {
        cached = await loader();
      }
      return originalMethod.apply(this, [cached, ...args]);
    };

    return descriptor;
  };
}
