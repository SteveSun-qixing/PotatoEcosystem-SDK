/**
 * 性能指标收集工具
 */

export interface PerformanceMetrics {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  medianTime: number;
  p95Time: number;
  p99Time: number;
  opsPerSecond: number;
  memoryUsage?: MemoryMetrics;
  timestamp: number;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface BenchmarkResult {
  name: string;
  duration: number;
  memory?: MemoryMetrics;
}

export class MetricsCollector {
  private results: number[] = [];
  private memorySnapshots: MemoryMetrics[] = [];
  private startMemory?: MemoryMetrics;

  constructor(private name: string) {}

  /** 开始测试 */
  start(): void {
    this.results = [];
    this.memorySnapshots = [];
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.startMemory = this.getMemoryUsage();
    }
  }

  /** 记录单次测试结果 */
  record(duration: number): void {
    this.results.push(duration);
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.memorySnapshots.push(this.getMemoryUsage());
    }
  }

  /** 计算性能指标 */
  getMetrics(): PerformanceMetrics {
    const sorted = [...this.results].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;

    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    const medianIndex = Math.floor(sorted.length / 2);

    const avgMemory = this.getAverageMemory();

    return {
      name: this.name,
      iterations: this.results.length,
      totalTime: sum,
      averageTime: avg,
      minTime: sorted[0],
      maxTime: sorted[sorted.length - 1],
      medianTime: sorted[medianIndex],
      p95Time: sorted[p95Index],
      p99Time: sorted[p99Index],
      opsPerSecond: 1000 / avg,
      memoryUsage: avgMemory,
      timestamp: Date.now(),
    };
  }

  /** 获取内存使用情况 */
  private getMemoryUsage(): MemoryMetrics {
    if (typeof process === 'undefined' || !process.memoryUsage) {
      return {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
      };
    }

    const mem = process.memoryUsage();
    return {
      heapUsed: mem.heapUsed / 1024 / 1024, // MB
      heapTotal: mem.heapTotal / 1024 / 1024,
      external: mem.external / 1024 / 1024,
      rss: mem.rss / 1024 / 1024,
    };
  }

  /** 计算平均内存使用 */
  private getAverageMemory(): MemoryMetrics | undefined {
    if (this.memorySnapshots.length === 0) {
      return undefined;
    }

    const sum = this.memorySnapshots.reduce(
      (acc, mem) => ({
        heapUsed: acc.heapUsed + mem.heapUsed,
        heapTotal: acc.heapTotal + mem.heapTotal,
        external: acc.external + mem.external,
        rss: acc.rss + mem.rss,
      }),
      { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }
    );

    const count = this.memorySnapshots.length;
    return {
      heapUsed: sum.heapUsed / count,
      heapTotal: sum.heapTotal / count,
      external: sum.external / count,
      rss: sum.rss / count,
    };
  }

  /** 重置收集器 */
  reset(): void {
    this.results = [];
    this.memorySnapshots = [];
    this.startMemory = undefined;
  }
}

/**
 * 运行基准测试
 */
export async function runBenchmark(
  name: string,
  fn: () => void | Promise<void>,
  options: {
    iterations?: number;
    warmup?: number;
  } = {}
): Promise<PerformanceMetrics> {
  const { iterations = 100, warmup = 10 } = options;
  const collector = new MetricsCollector(name);

  // 预热
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc();
  }

  // 正式测试
  collector.start();
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    collector.record(end - start);
  }

  return collector.getMetrics();
}

/**
 * 批量运行基准测试
 */
export async function runBenchmarks(
  tests: Array<{
    name: string;
    fn: () => void | Promise<void>;
  }>,
  options?: {
    iterations?: number;
    warmup?: number;
  }
): Promise<PerformanceMetrics[]> {
  const results: PerformanceMetrics[] = [];

  for (const test of tests) {
    console.log(`Running benchmark: ${test.name}...`);
    const metrics = await runBenchmark(test.name, test.fn, options);
    results.push(metrics);
    console.log(
      `  Average: ${metrics.averageTime.toFixed(2)}ms, ` +
        `Ops/sec: ${metrics.opsPerSecond.toFixed(0)}`
    );
  }

  return results;
}

/**
 * 测量内存使用
 */
export function measureMemory(): MemoryMetrics {
  if (typeof process === 'undefined' || !process.memoryUsage) {
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    };
  }

  const mem = process.memoryUsage();
  return {
    heapUsed: mem.heapUsed / 1024 / 1024,
    heapTotal: mem.heapTotal / 1024 / 1024,
    external: mem.external / 1024 / 1024,
    rss: mem.rss / 1024 / 1024,
  };
}

/**
 * 计算百分位数
 */
export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * p);
  return sorted[index];
}

/**
 * 格式化时间
 */
export function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * 格式化内存大小
 */
export function formatMemory(mb: number): string {
  if (mb < 1) {
    return `${(mb * 1024).toFixed(2)}KB`;
  } else if (mb < 1024) {
    return `${mb.toFixed(2)}MB`;
  } else {
    return `${(mb / 1024).toFixed(2)}GB`;
  }
}
