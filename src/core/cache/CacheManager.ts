/**
 * 缓存管理器
 *
 * 提供多级缓存支持（内存+持久化）
 */

import type { CacheOptions } from '../../types';
import { DEFAULT_CACHE_SIZE, DEFAULT_CACHE_TTL } from '../../constants';

/**
 * 缓存项
 */
interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccess: number;
}

/**
 * 缓存策略类型
 */
export type CacheStrategy = 'lru' | 'lfu' | 'fifo';

/**
 * 缓存管理器类
 */
export class CacheManager<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number;
  private strategy: CacheStrategy;
  private currentSize: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? DEFAULT_CACHE_SIZE;
    this.defaultTTL = options.ttl ?? DEFAULT_CACHE_TTL;
    this.strategy = options.strategy ?? 'lru';
    this.currentSize = 0;
  }

  /**
   * 获取缓存
   * @param key 键
   * @returns 缓存值（如果存在且未过期）
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      return null;
    }

    // 更新访问信息（用于LRU和LFU）
    entry.accessCount++;
    entry.lastAccess = Date.now();

    return entry.value;
  }

  /**
   * 设置缓存
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（可选）
   */
  set(key: string, value: T, ttl?: number): void {
    const size = this.estimateSize(value);

    // 如果超过最大缓存大小，拒绝缓存
    if (size > this.maxSize) {
      return;
    }

    // 如果键已存在，先删除旧值
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentSize -= oldEntry.size;
    }

    // 确保有足够空间
    this.ensureSpace(size);

    // 创建缓存项
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      size,
      accessCount: 0,
      lastAccess: Date.now(),
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  /**
   * 删除缓存
   * @param key 键
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);

    if (entry) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      return true;
    }

    return false;
  }

  /**
   * 检查缓存是否存在
   * @param key 键
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) {
        expired++;
      }
    }

    return {
      total: this.cache.size,
      expired,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
    };
  }

  /**
   * 设置缓存策略
   * @param strategy 策略类型
   */
  setStrategy(strategy: CacheStrategy): void {
    this.strategy = strategy;
  }

  /**
   * 判断缓存项是否过期
   * @param entry 缓存项
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * 确保有足够的缓存空间
   * @param requiredSize 需要的空间
   */
  private ensureSpace(requiredSize: number): void {
    while (this.currentSize + requiredSize > this.maxSize) {
      const evictKey = this.selectEvictionKey();

      if (!evictKey) {
        break;
      }

      this.delete(evictKey);
    }
  }

  /**
   * 根据策略选择要驱逐的缓存键
   */
  private selectEvictionKey(): string | null {
    if (this.cache.size === 0) {
      return null;
    }

    switch (this.strategy) {
      case 'lru':
        return this.selectLRU();
      case 'lfu':
        return this.selectLFU();
      case 'fifo':
        return this.selectFIFO();
      default:
        return this.selectLRU();
    }
  }

  /**
   * LRU策略：选择最久未使用的
   */
  private selectLRU(): string | null {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * LFU策略：选择访问频率最低的
   */
  private selectLFU(): string | null {
    let leastKey: string | null = null;
    let leastCount = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastKey = key;
      }
    }

    return leastKey;
  }

  /**
   * FIFO策略：选择最早添加的
   */
  private selectFIFO(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * 估算值的大小（字节）
   * @param value 值
   */
  private estimateSize(value: unknown): number {
    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }

    if (typeof value === 'string') {
      return value.length * 2; // 粗略估算（UTF-16）
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value).length * 2;
    }

    return 100; // 默认大小
  }

  /**
   * 计算命中率
   */
  private calculateHitRate(): number {
    // 简化实现：根据访问次数估算
    if (this.cache.size === 0) return 0;

    let totalAccess = 0;
    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
    }

    return totalAccess / (totalAccess + this.cache.size);
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    let cleaned = 0;
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.delete(key);
      cleaned++;
    }

    return cleaned;
  }
}
