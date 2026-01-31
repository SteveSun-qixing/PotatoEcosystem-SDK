/**
 * 缓存性能基准测试
 * 目标: 缓存命中率 > 90%
 */

import { runBenchmark, runBenchmarks } from '../utils/metrics';
import { performanceTargets } from '../config';

/**
 * 简单LRU缓存实现
 */
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // 移到最前面（LRU）
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // 如果满了，删除最旧的
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * 测试数据生成器
 */
function generateTestData(count: number): Array<{ key: string; value: any }> {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      key: `key_${i}`,
      value: {
        id: i,
        name: `Item ${i}`,
        data: `Data ${i}`.repeat(10),
      },
    });
  }
  return data;
}

/**
 * 缓存读取性能测试
 */
async function benchmarkCacheRead() {
  console.log('\n=== Cache Read Performance ===\n');

  const cache = new LRUCache<string, any>(1000);
  const testData = generateTestData(1000);

  // 预填充缓存
  testData.forEach((item) => cache.set(item.key, item.value));

  const result = await runBenchmark(
    'Cache Read',
    () => {
      const key = `key_${Math.floor(Math.random() * 1000)}`;
      cache.get(key);
    },
    { iterations: 10000, warmup: 100 }
  );

  // 检查是否达到目标
  const target = performanceTargets.cache.readTime;
  const passed = result.averageTime <= target;
  console.log(
    `Target: ${target}ms, Actual: ${result.averageTime.toFixed(4)}ms, ${passed ? '✅ PASS' : '❌ FAIL'}`
  );

  return [result];
}

/**
 * 缓存写入性能测试
 */
async function benchmarkCacheWrite() {
  console.log('\n=== Cache Write Performance ===\n');

  const cache = new LRUCache<string, any>(1000);
  const testData = generateTestData(10000);
  let index = 0;

  const result = await runBenchmark(
    'Cache Write',
    () => {
      const item = testData[index % testData.length];
      cache.set(item.key, item.value);
      index++;
    },
    { iterations: 10000, warmup: 100 }
  );

  // 检查是否达到目标
  const target = performanceTargets.cache.writeTime;
  const passed = result.averageTime <= target;
  console.log(
    `Target: ${target}ms, Actual: ${result.averageTime.toFixed(4)}ms, ${passed ? '✅ PASS' : '❌ FAIL'}`
  );

  return [result];
}

/**
 * 缓存命中率测试
 */
async function benchmarkCacheHitRate() {
  console.log('\n=== Cache Hit Rate Test ===\n');

  const cacheSizes = [100, 500, 1000, 5000];
  const results = [];

  for (const cacheSize of cacheSizes) {
    console.log(`Testing cache size: ${cacheSize}...`);

    const cache = new LRUCache<string, any>(cacheSize);
    const testData = generateTestData(cacheSize * 2);
    let hits = 0;
    let misses = 0;
    const accessCount = 10000;

    const result = await runBenchmark(
      `Cache Hit Rate (size: ${cacheSize})`,
      () => {
        // 80/20规则：80%的访问集中在20%的数据
        const hot = Math.random() < 0.8;
        const index = hot
          ? Math.floor(Math.random() * (cacheSize * 0.2))
          : Math.floor(Math.random() * testData.length);

        const item = testData[index];

        if (cache.has(item.key)) {
          hits++;
          cache.get(item.key);
        } else {
          misses++;
          cache.set(item.key, item.value);
        }
      },
      { iterations: accessCount, warmup: 100 }
    );

    const hitRate = hits / (hits + misses);
    console.log(
      `  Hit Rate: ${(hitRate * 100).toFixed(2)}%, Hits: ${hits}, Misses: ${misses}`
    );

    // 检查是否达到目标
    const target = performanceTargets.cache.hitRate;
    const passed = hitRate >= target;
    console.log(
      `  Target: ${(target * 100).toFixed(0)}%, Actual: ${(hitRate * 100).toFixed(2)}%, ${passed ? '✅ PASS' : '❌ FAIL'}`
    );

    results.push(result);
  }

  return results;
}

/**
 * 缓存驱逐策略性能测试
 */
async function benchmarkCacheEviction() {
  console.log('\n=== Cache Eviction Performance ===\n');

  const cache = new LRUCache<string, any>(1000);
  const testData = generateTestData(5000);

  const result = await runBenchmark(
    'Cache Eviction (LRU)',
    () => {
      const item = testData[Math.floor(Math.random() * testData.length)];
      cache.set(item.key, item.value);
    },
    { iterations: 10000, warmup: 100 }
  );

  return [result];
}

/**
 * 不同缓存大小的性能对比
 */
async function benchmarkCacheSizeComparison() {
  console.log('\n=== Cache Size Comparison ===\n');

  const sizes = [100, 500, 1000, 5000, 10000];
  const results = [];

  for (const size of sizes) {
    console.log(`Testing cache size: ${size}...`);

    const cache = new LRUCache<string, any>(size);
    const testData = generateTestData(size);

    // 预填充
    testData.forEach((item) => cache.set(item.key, item.value));

    const result = await runBenchmark(
      `Cache Operations (size: ${size})`,
      () => {
        const operation = Math.random();
        const key = `key_${Math.floor(Math.random() * size)}`;

        if (operation < 0.7) {
          // 70% 读
          cache.get(key);
        } else if (operation < 0.95) {
          // 25% 写
          cache.set(key, { data: `Updated ${Date.now()}` });
        } else {
          // 5% 检查
          cache.has(key);
        }
      },
      { iterations: 10000, warmup: 100 }
    );

    results.push(result);
  }

  return results;
}

/**
 * 缓存并发访问性能测试
 */
async function benchmarkConcurrentAccess() {
  console.log('\n=== Concurrent Cache Access ===\n');

  const cache = new LRUCache<string, any>(1000);
  const testData = generateTestData(1000);

  // 预填充
  testData.forEach((item) => cache.set(item.key, item.value));

  const concurrency = [10, 50, 100, 500];
  const results = [];

  for (const count of concurrency) {
    console.log(`Testing ${count} concurrent accesses...`);

    const result = await runBenchmark(
      `Concurrent Access (${count})`,
      async () => {
        const promises = Array(count)
          .fill(0)
          .map(() => {
            const key = `key_${Math.floor(Math.random() * 1000)}`;
            return Promise.resolve(cache.get(key));
          });
        await Promise.all(promises);
      },
      { iterations: 100, warmup: 10 }
    );

    results.push(result);
  }

  return results;
}

/**
 * 运行所有缓存基准测试
 */
export async function runCacheBenchmarks() {
  console.log('\n' + '='.repeat(60));
  console.log('Cache Performance Benchmarks');
  console.log('='.repeat(60));

  const allResults = [];

  // 缓存读取
  const readResults = await benchmarkCacheRead();
  allResults.push(...readResults);

  // 缓存写入
  const writeResults = await benchmarkCacheWrite();
  allResults.push(...writeResults);

  // 缓存命中率
  const hitRateResults = await benchmarkCacheHitRate();
  allResults.push(...hitRateResults);

  // 缓存驱逐
  const evictionResults = await benchmarkCacheEviction();
  allResults.push(...evictionResults);

  // 缓存大小对比
  const sizeResults = await benchmarkCacheSizeComparison();
  allResults.push(...sizeResults);

  // 并发访问
  const concurrentResults = await benchmarkConcurrentAccess();
  allResults.push(...concurrentResults);

  console.log('\n' + '='.repeat(60));
  console.log('Cache Benchmarks Complete');
  console.log('='.repeat(60) + '\n');

  return allResults;
}

// 如果直接运行此文件
if (require.main === module) {
  runCacheBenchmarks()
    .then((results) => {
      console.log(`\nCompleted ${results.length} benchmarks`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
