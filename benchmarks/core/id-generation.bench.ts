/**
 * ID生成性能基准测试
 * 目标: 100万个ID < 1秒
 */

import { runBenchmark, runBenchmarks } from '../utils/metrics';
import { performanceTargets } from '../config';

// 模拟ID生成函数（基于62进制）
const BASE62_CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function generateBase62ID(length: number = 10): string {
  let id = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * BASE62_CHARS.length);
    id += BASE62_CHARS[randomIndex];
  }
  return id;
}

function generateTimestampID(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return (timestamp + random).substring(0, 10);
}

function generateUUIDv4Short(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
    .substring(0, 10);
}

// 带缓存的ID生成器
class CachedIDGenerator {
  private cache: Set<string> = new Set();
  private cacheSize: number = 1000;

  generate(): string {
    let id: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      id = generateBase62ID();
      attempts++;
      if (attempts > maxAttempts) {
        // 清理缓存
        if (this.cache.size >= this.cacheSize) {
          const toDelete = Array.from(this.cache).slice(
            0,
            this.cacheSize / 2
          );
          toDelete.forEach((id) => this.cache.delete(id));
        }
      }
    } while (this.cache.has(id) && attempts <= maxAttempts);

    this.cache.add(id);
    return id;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * 单个ID生成性能测试
 */
async function benchmarkSingleIDGeneration() {
  console.log('\n=== Single ID Generation Benchmark ===\n');

  const results = await runBenchmarks(
    [
      {
        name: 'Base62 ID (10 chars)',
        fn: () => generateBase62ID(10),
      },
      {
        name: 'Timestamp-based ID',
        fn: () => generateTimestampID(),
      },
      {
        name: 'UUID v4 Short',
        fn: () => generateUUIDv4Short(),
      },
    ],
    { iterations: 10000, warmup: 100 }
  );

  return results;
}

/**
 * 批量ID生成性能测试
 */
async function benchmarkBatchIDGeneration() {
  console.log('\n=== Batch ID Generation Benchmark ===\n');

  const sizes = [1000, 10000, 100000, 1000000];
  const results = [];

  for (const size of sizes) {
    console.log(`Testing batch size: ${size}...`);

    const result = await runBenchmark(
      `Batch ID Generation (${size} IDs)`,
      () => {
        const ids: string[] = [];
        for (let i = 0; i < size; i++) {
          ids.push(generateBase62ID());
        }
        return ids;
      },
      { iterations: 5, warmup: 1 }
    );

    results.push(result);

    // 检查是否达到目标
    if (size === 1000000) {
      const target = performanceTargets.idGeneration.million;
      const passed = result.averageTime <= target;
      console.log(
        `  Target: ${target}ms, Actual: ${result.averageTime.toFixed(2)}ms, ${passed ? '✅ PASS' : '❌ FAIL'}`
      );
    }
  }

  return results;
}

/**
 * ID唯一性测试
 */
async function benchmarkIDUniqueness() {
  console.log('\n=== ID Uniqueness Benchmark ===\n');

  const counts = [10000, 100000, 1000000];
  const results = [];

  for (const count of counts) {
    console.log(`Testing uniqueness with ${count} IDs...`);

    const result = await runBenchmark(
      `ID Uniqueness Check (${count} IDs)`,
      () => {
        const ids = new Set<string>();
        let duplicates = 0;

        for (let i = 0; i < count; i++) {
          const id = generateBase62ID();
          if (ids.has(id)) {
            duplicates++;
          }
          ids.add(id);
        }

        const uniquenessRate = ((count - duplicates) / count) * 100;
        if (duplicates > 0) {
          console.log(`  Warning: ${duplicates} duplicates found (${uniquenessRate.toFixed(4)}% unique)`);
        }
      },
      { iterations: 3, warmup: 1 }
    );

    results.push(result);
  }

  return results;
}

/**
 * 带缓存的ID生成性能测试
 */
async function benchmarkCachedIDGeneration() {
  console.log('\n=== Cached ID Generation Benchmark ===\n');

  const generator = new CachedIDGenerator();

  const results = await runBenchmarks(
    [
      {
        name: 'Cached ID Generation',
        fn: () => generator.generate(),
      },
      {
        name: 'Uncached ID Generation',
        fn: () => generateBase62ID(),
      },
    ],
    { iterations: 10000, warmup: 100 }
  );

  generator.clear();
  return results;
}

/**
 * ID生成并发性能测试
 */
async function benchmarkConcurrentIDGeneration() {
  console.log('\n=== Concurrent ID Generation Benchmark ===\n');

  const concurrency = [10, 100, 1000];
  const results = [];

  for (const count of concurrency) {
    console.log(`Testing ${count} concurrent ID generations...`);

    const result = await runBenchmark(
      `Concurrent ID Generation (${count})`,
      async () => {
        const promises = Array(count)
          .fill(0)
          .map(() => Promise.resolve(generateBase62ID()));
        await Promise.all(promises);
      },
      { iterations: 100, warmup: 10 }
    );

    results.push(result);
  }

  return results;
}

/**
 * 运行所有ID生成基准测试
 */
export async function runIDGenerationBenchmarks() {
  console.log('\n' + '='.repeat(60));
  console.log('ID Generation Performance Benchmarks');
  console.log('='.repeat(60));

  const allResults = [];

  // 单个ID生成
  const singleResults = await benchmarkSingleIDGeneration();
  allResults.push(...singleResults);

  // 批量ID生成
  const batchResults = await benchmarkBatchIDGeneration();
  allResults.push(...batchResults);

  // ID唯一性
  const uniquenessResults = await benchmarkIDUniqueness();
  allResults.push(...uniquenessResults);

  // 带缓存的ID生成
  const cachedResults = await benchmarkCachedIDGeneration();
  allResults.push(...cachedResults);

  // 并发ID生成
  const concurrentResults = await benchmarkConcurrentIDGeneration();
  allResults.push(...concurrentResults);

  console.log('\n' + '='.repeat(60));
  console.log('ID Generation Benchmarks Complete');
  console.log('='.repeat(60) + '\n');

  return allResults;
}

// 如果直接运行此文件
if (require.main === module) {
  runIDGenerationBenchmarks()
    .then((results) => {
      console.log(`\nCompleted ${results.length} benchmarks`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
