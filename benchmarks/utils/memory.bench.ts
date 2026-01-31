/**
 * 内存使用基准测试
 * 目标: 核心模块 < 50MB
 */

import { measureMemory, formatMemory } from './metrics';
import { performanceTargets } from '../config';

/**
 * 内存快照
 */
interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  label?: string;
}

/**
 * 内存分析器
 */
export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private baseline?: MemorySnapshot;

  /** 记录基线 */
  recordBaseline(label: string = 'Baseline'): void {
    if (global.gc) {
      global.gc();
    }
    this.baseline = {
      ...measureMemory(),
      timestamp: Date.now(),
      label,
    };
    this.snapshots.push(this.baseline);
  }

  /** 记录快照 */
  recordSnapshot(label: string): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      ...measureMemory(),
      timestamp: Date.now(),
      label,
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  /** 获取所有快照 */
  getSnapshots(): MemorySnapshot[] {
    return this.snapshots;
  }

  /** 获取内存增长 */
  getMemoryGrowth(): number {
    if (!this.baseline || this.snapshots.length < 2) {
      return 0;
    }
    const latest = this.snapshots[this.snapshots.length - 1];
    return latest.heapUsed - this.baseline.heapUsed;
  }

  /** 清空快照 */
  clear(): void {
    this.snapshots = [];
    this.baseline = undefined;
  }

  /** 打印报告 */
  printReport(): void {
    console.log('\n=== Memory Profile Report ===\n');

    if (this.baseline) {
      console.log(`Baseline (${this.baseline.label}):`);
      console.log(`  Heap Used: ${formatMemory(this.baseline.heapUsed)}`);
      console.log(`  Heap Total: ${formatMemory(this.baseline.heapTotal)}`);
      console.log(`  RSS: ${formatMemory(this.baseline.rss)}\n`);
    }

    for (let i = 1; i < this.snapshots.length; i++) {
      const snapshot = this.snapshots[i];
      const prev = this.snapshots[i - 1];
      const growth = snapshot.heapUsed - prev.heapUsed;

      console.log(`${snapshot.label}:`);
      console.log(`  Heap Used: ${formatMemory(snapshot.heapUsed)}`);
      console.log(`  Growth: ${formatMemory(growth)} (${growth >= 0 ? '+' : ''}${((growth / prev.heapUsed) * 100).toFixed(2)}%)`);
      console.log(`  RSS: ${formatMemory(snapshot.rss)}\n`);
    }

    if (this.baseline) {
      const totalGrowth = this.getMemoryGrowth();
      console.log(`Total Growth: ${formatMemory(totalGrowth)}\n`);
    }
  }

  /** 检查内存泄漏 */
  checkMemoryLeak(threshold: number = 10): boolean {
    if (this.snapshots.length < 3) {
      return false;
    }

    // 检查最近3个快照是否持续增长
    const recent = this.snapshots.slice(-3);
    let increasing = true;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i].heapUsed <= recent[i - 1].heapUsed) {
        increasing = false;
        break;
      }
    }

    if (!increasing) {
      return false;
    }

    // 检查增长率是否超过阈值
    const growth =
      ((recent[2].heapUsed - recent[0].heapUsed) / recent[0].heapUsed) * 100;
    return growth > threshold;
  }
}

/**
 * 测试核心模块内存使用
 */
export async function benchmarkCoreModuleMemory(): Promise<MemorySnapshot[]> {
  console.log('\n=== Core Module Memory Usage ===\n');

  const profiler = new MemoryProfiler();

  // 记录基线
  profiler.recordBaseline('Initial');

  // 模拟加载核心模块
  console.log('Loading core modules...');
  const coreModules = {
    id: Array(1000)
      .fill(0)
      .map(() => Math.random().toString(36)),
    cache: new Map(
      Array(1000)
        .fill(0)
        .map((_, i) => [`key${i}`, `value${i}`])
    ),
    config: { settings: Array(100).fill({ key: 'value' }) },
  };

  profiler.recordSnapshot('After Core Module Load');

  // 检查是否达到目标
  const memUsed = profiler.getMemoryGrowth();
  const target = performanceTargets.memory.coreModule;
  const passed = memUsed <= target;

  console.log(
    `Target: ${formatMemory(target)}, Actual: ${formatMemory(memUsed)}, ${passed ? '✅ PASS' : '❌ FAIL'}`
  );

  profiler.printReport();

  return profiler.getSnapshots();
}

/**
 * 测试解析器内存使用
 */
export async function benchmarkParserMemory(): Promise<MemorySnapshot[]> {
  console.log('\n=== Parser Memory Usage ===\n');

  const profiler = new MemoryProfiler();
  profiler.recordBaseline('Initial');

  // 模拟解析大量卡片
  console.log('Parsing 1000 cards...');
  const cards = [];
  for (let i = 0; i < 1000; i++) {
    cards.push({
      id: `card_${i}`,
      title: `Card ${i}`,
      content: `Content ${i}`.repeat(50),
      metadata: { tags: [`tag${i % 10}`] },
    });
  }

  profiler.recordSnapshot('After Parsing 1000 Cards');

  // 清空卡片
  cards.length = 0;
  if (global.gc) {
    global.gc();
  }

  // 等待GC
  await new Promise((resolve) => setTimeout(resolve, 100));
  profiler.recordSnapshot('After GC');

  // 检查是否达到目标
  const memUsed = profiler.getSnapshots()[1].heapUsed;
  const target = performanceTargets.memory.parser;
  const passed = memUsed <= target;

  console.log(
    `Target: ${formatMemory(target)}, Actual: ${formatMemory(memUsed)}, ${passed ? '✅ PASS' : '❌ FAIL'}`
  );

  profiler.printReport();

  return profiler.getSnapshots();
}

/**
 * 测试渲染器内存使用
 */
export async function benchmarkRendererMemory(): Promise<MemorySnapshot[]> {
  console.log('\n=== Renderer Memory Usage ===\n');

  const profiler = new MemoryProfiler();
  profiler.recordBaseline('Initial');

  // 模拟渲染大量元素
  console.log('Rendering 1000 cards...');
  const elements = [];
  for (let i = 0; i < 1000; i++) {
    elements.push({
      id: `element_${i}`,
      type: 'div',
      props: { className: 'card' },
      children: [
        { type: 'h2', props: {}, children: [`Title ${i}`] },
        { type: 'p', props: {}, children: [`Content ${i}`.repeat(20)] },
      ],
    });
  }

  profiler.recordSnapshot('After Rendering 1000 Cards');

  // 清空元素
  elements.length = 0;
  if (global.gc) {
    global.gc();
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  profiler.recordSnapshot('After GC');

  // 检查是否达到目标
  const memUsed = profiler.getSnapshots()[1].heapUsed;
  const target = performanceTargets.memory.renderer;
  const passed = memUsed <= target;

  console.log(
    `Target: ${formatMemory(target)}, Actual: ${formatMemory(memUsed)}, ${passed ? '✅ PASS' : '❌ FAIL'}`
  );

  profiler.printReport();

  return profiler.getSnapshots();
}

/**
 * 内存泄漏检测
 */
export async function benchmarkMemoryLeak(): Promise<void> {
  console.log('\n=== Memory Leak Detection ===\n');

  const profiler = new MemoryProfiler();
  profiler.recordBaseline('Initial');

  // 模拟重复操作
  for (let i = 0; i < 10; i++) {
    console.log(`Iteration ${i + 1}/10...`);

    // 创建和销毁对象
    const temp = Array(1000)
      .fill(0)
      .map((_, j) => ({
        id: j,
        data: `Data ${j}`.repeat(50),
      }));

    profiler.recordSnapshot(`After Iteration ${i + 1}`);

    // 清空（模拟内存泄漏的情况下，这里的清空可能不完全）
    temp.length = 0;
  }

  // 强制GC
  if (global.gc) {
    global.gc();
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  profiler.recordSnapshot('After Final GC');

  // 检查内存泄漏
  const hasLeak = profiler.checkMemoryLeak(5);
  console.log(`\nMemory Leak Detected: ${hasLeak ? '❌ YES' : '✅ NO'}`);

  profiler.printReport();
}

/**
 * 长时间运行内存稳定性测试
 */
export async function benchmarkLongRunningMemory(): Promise<void> {
  console.log('\n=== Long Running Memory Stability ===\n');

  const profiler = new MemoryProfiler();
  profiler.recordBaseline('Initial');

  const duration = 5000; // 5秒
  const interval = 500; // 每500ms记录一次
  const iterations = duration / interval;

  console.log(`Running for ${duration}ms...`);

  for (let i = 0; i < iterations; i++) {
    // 模拟持续工作
    const work = Array(100)
      .fill(0)
      .map((_, j) => ({
        id: j,
        timestamp: Date.now(),
      }));

    await new Promise((resolve) => setTimeout(resolve, interval));
    profiler.recordSnapshot(`T+${(i + 1) * interval}ms`);
  }

  // 检查内存增长趋势
  const growth = profiler.getMemoryGrowth();
  const growthRate = (growth / profiler.getSnapshots()[0].heapUsed) * 100;

  console.log(`\nTotal Memory Growth: ${formatMemory(growth)} (${growthRate.toFixed(2)}%)`);

  // 内存增长应该小于10%
  const stable = growthRate < 10;
  console.log(`Memory Stable: ${stable ? '✅ YES' : '❌ NO'}`);

  // 只打印关键快照
  const snapshots = profiler.getSnapshots();
  console.log('\nKey Snapshots:');
  console.log(
    `Initial: ${formatMemory(snapshots[0].heapUsed)}`
  );
  console.log(
    `Final: ${formatMemory(snapshots[snapshots.length - 1].heapUsed)}`
  );
}

/**
 * 运行所有内存基准测试
 */
export async function runMemoryBenchmarks() {
  console.log('\n' + '='.repeat(60));
  console.log('Memory Performance Benchmarks');
  console.log('='.repeat(60));

  // 核心模块内存
  await benchmarkCoreModuleMemory();

  // 解析器内存
  await benchmarkParserMemory();

  // 渲染器内存
  await benchmarkRendererMemory();

  // 内存泄漏检测
  await benchmarkMemoryLeak();

  // 长时间运行稳定性
  await benchmarkLongRunningMemory();

  console.log('\n' + '='.repeat(60));
  console.log('Memory Benchmarks Complete');
  console.log('='.repeat(60) + '\n');
}

// 如果直接运行此文件
if (require.main === module) {
  runMemoryBenchmarks()
    .then(() => {
      console.log('\nAll memory benchmarks completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
