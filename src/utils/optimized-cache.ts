/**
 * 优化的缓存策略实现
 * 包含LRU、LFU、TTL等多种策略
 */

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccess: number;
}

/**
 * 缓存策略类型
 */
export type CacheStrategy = 'lru' | 'lfu' | 'fifo' | 'ttl';

/**
 * 缓存配置
 */
export interface CacheConfig {
  maxSize: number;
  strategy: CacheStrategy;
  defaultTTL?: number;
  onEvict?: (key: string, value: any) => void;
}

/**
 * 优化的缓存类
 */
export class OptimizedCache<K = string, V = any> {
  private cache: Map<K, CacheItem<V>>;
  protected config: Required<CacheConfig>;
  private hitCount: number = 0;
  private missCount: number = 0;
  private evictionCount: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      strategy: config.strategy || 'lru',
      defaultTTL: config.defaultTTL || 0,
      onEvict: config.onEvict || (() => {}),
    };
    this.cache = new Map();
  }

  /**
   * 获取缓存值
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);

    if (!item) {
      this.missCount++;
      return undefined;
    }

    // 检查TTL
    if (this.isExpired(item)) {
      this.delete(key);
      this.missCount++;
      return undefined;
    }

    // 更新访问信息
    item.accessCount++;
    item.lastAccess = Date.now();

    this.hitCount++;
    return item.value;
  }

  /**
   * 设置缓存值
   */
  set(key: K, value: V, ttl?: number): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 检查大小限制
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }

    // 添加新项
    const item: CacheItem<V> = {
      key: key as string,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccess: Date.now(),
    };

    this.cache.set(key, item);
  }

  /**
   * 检查键是否存在
   */
  has(key: K): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (this.isExpired(item)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: K): boolean {
    const item = this.cache.get(key);
    if (item) {
      this.config.onEvict(item.key, item.value);
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    // 触发所有驱逐回调
    for (const [_key, item] of this.cache) {
      this.config.onEvict(item.key, item.value);
    }
    this.cache.clear();
    this.resetStats();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存命中率
   */
  getHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total === 0 ? 0 : this.hitCount / total;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      evictionCount: this.evictionCount,
      hitRate: this.getHitRate(),
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  /**
   * 检查是否过期
   */
  private isExpired(item: CacheItem<V>): boolean {
    if (!item.ttl || item.ttl === 0) {
      return false;
    }
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * 驱逐策略
   */
  private evict(): void {
    let keyToEvict: K | undefined;

    switch (this.config.strategy) {
      case 'lru':
        keyToEvict = this.evictLRU();
        break;
      case 'lfu':
        keyToEvict = this.evictLFU();
        break;
      case 'fifo':
        keyToEvict = this.evictFIFO();
        break;
      case 'ttl':
        keyToEvict = this.evictTTL();
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
      this.evictionCount++;
    }
  }

  /**
   * LRU驱逐：最近最少使用
   */
  private evictLRU(): K | undefined {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache) {
      if (item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * LFU驱逐：最不经常使用
   */
  private evictLFU(): K | undefined {
    let leastKey: K | undefined;
    let leastCount = Infinity;

    for (const [key, item] of this.cache) {
      if (item.accessCount < leastCount) {
        leastCount = item.accessCount;
        leastKey = key;
      }
    }

    return leastKey;
  }

  /**
   * FIFO驱逐：先进先出
   */
  private evictFIFO(): K | undefined {
    return this.cache.keys().next().value;
  }

  /**
   * TTL驱逐：优先删除过期的
   */
  private evictTTL(): K | undefined {
    // 先找过期的
    for (const [key, item] of this.cache) {
      if (this.isExpired(item)) {
        return key;
      }
    }
    // 没有过期的，使用LRU
    return this.evictLRU();
  }

  /**
   * 批量获取
   */
  mget(keys: K[]): Map<K, V> {
    const result = new Map<K, V>();
    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    }
    return result;
  }

  /**
   * 批量设置
   */
  mset(entries: Array<{ key: K; value: V; ttl?: number }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.ttl);
    }
  }

  /**
   * 获取所有键
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有值
   */
  values(): V[] {
    return Array.from(this.cache.values()).map((item) => item.value);
  }

  /**
   * 清理过期项
   */
  cleanup(): void {
    const keysToDelete: K[] = [];

    for (const [key, item] of this.cache) {
      if (this.isExpired(item)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
    }
  }
}

/**
 * 多级缓存
 */
export class TieredCache<K = string, V = any> {
  private l1Cache: OptimizedCache<K, V>; // 内存缓存
  private l2Cache?: OptimizedCache<K, V>; // 二级缓存

  constructor(l1Config: Partial<CacheConfig>, l2Config?: Partial<CacheConfig>) {
    this.l1Cache = new OptimizedCache<K, V>(l1Config);
    if (l2Config) {
      this.l2Cache = new OptimizedCache<K, V>(l2Config);
    }
  }

  async get(key: K): Promise<V | undefined> {
    // 先查L1
    let value = this.l1Cache.get(key);
    if (value !== undefined) {
      return value;
    }

    // 再查L2
    if (this.l2Cache) {
      value = this.l2Cache.get(key);
      if (value !== undefined) {
        // 提升到L1
        this.l1Cache.set(key, value);
        return value;
      }
    }

    return undefined;
  }

  set(key: K, value: V, ttl?: number): void {
    // 设置到L1
    this.l1Cache.set(key, value, ttl);
    // 同时设置到L2
    if (this.l2Cache) {
      this.l2Cache.set(key, value, ttl);
    }
  }

  delete(key: K): void {
    this.l1Cache.delete(key);
    this.l2Cache?.delete(key);
  }

  clear(): void {
    this.l1Cache.clear();
    this.l2Cache?.clear();
  }

  getStats() {
    return {
      l1: this.l1Cache.getStats(),
      l2: this.l2Cache?.getStats(),
    };
  }
}

/**
 * 自适应缓存
 * 根据访问模式自动调整策略
 */
export class AdaptiveCache<K = string, V = any> extends OptimizedCache<K, V> {
  private accessPattern: 'sequential' | 'random' | 'hotspot' = 'random';
  private patternCheckInterval: number = 10000; // 10秒
  private lastPatternCheck: number = Date.now();

  constructor(config: Partial<CacheConfig> = {}) {
    super(config);
  }

  override get(key: K): V | undefined {
    const value = super.get(key);

    // 定期检查访问模式
    if (Date.now() - this.lastPatternCheck > this.patternCheckInterval) {
      this.detectAccessPattern();
      this.adjustStrategy();
      this.lastPatternCheck = Date.now();
    }

    return value;
  }

  private detectAccessPattern(): void {
    // 简单的模式检测逻辑
    const stats = this.getStats();
    const hitRate = stats.hitRate;

    if (hitRate > 0.9) {
      this.accessPattern = 'hotspot'; // 热点访问
    } else if (hitRate < 0.3) {
      this.accessPattern = 'sequential'; // 顺序访问
    } else {
      this.accessPattern = 'random'; // 随机访问
    }
  }

  private adjustStrategy(): void {
    // 根据访问模式调整策略
    switch (this.accessPattern) {
      case 'hotspot':
        // 热点访问：使用LFU
        this.config.strategy = 'lfu';
        break;
      case 'sequential':
        // 顺序访问：使用FIFO
        this.config.strategy = 'fifo';
        break;
      case 'random':
        // 随机访问：使用LRU
        this.config.strategy = 'lru';
        break;
    }
  }

  getAccessPattern(): string {
    return this.accessPattern;
  }
}
