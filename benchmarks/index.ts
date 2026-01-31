/**
 * 基准测试主入口
 * 运行所有性能基准测试并生成报告
 */

import { Reporter } from './utils/reporter';
import { runIDGenerationBenchmarks } from './core/id-generation.bench';
import { runCacheBenchmarks } from './core/cache.bench';
import { runParserBenchmarks } from './parser/card-parser.bench';
import { runRendererBenchmarks } from './renderer/render-performance.bench';
import { runMemoryBenchmarks } from './utils/memory.bench';
import * as path from 'path';

/**
 * 运行所有基准测试
 */
async function runAllBenchmarks() {
  console.log('\n' + '='.repeat(70));
  console.log(' '.repeat(15) + 'Chips SDK Performance Benchmarks');
  console.log('='.repeat(70) + '\n');

  const reporter = new Reporter();
  const startTime = Date.now();

  try {
    // ID生成性能测试
    console.log('\n[1/5] Running ID Generation Benchmarks...');
    const idResults = await runIDGenerationBenchmarks();
    reporter.addResults(idResults);

    // 缓存性能测试
    console.log('\n[2/5] Running Cache Benchmarks...');
    const cacheResults = await runCacheBenchmarks();
    reporter.addResults(cacheResults);

    // 解析器性能测试
    console.log('\n[3/5] Running Parser Benchmarks...');
    const parserResults = await runParserBenchmarks();
    reporter.addResults(parserResults);

    // 渲染器性能测试
    console.log('\n[4/5] Running Renderer Benchmarks...');
    const rendererResults = await runRendererBenchmarks();
    reporter.addResults(rendererResults);

    // 内存性能测试
    console.log('\n[5/5] Running Memory Benchmarks...');
    await runMemoryBenchmarks();

    // 生成报告
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log('\n' + '='.repeat(70));
    console.log(`All benchmarks completed in ${(totalTime / 1000).toFixed(2)}s`);
    console.log('='.repeat(70) + '\n');

    // 打印控制台报告
    reporter.printConsole();

    // 保存报告
    const reportDir = path.join(__dirname, 'reports');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    reporter.saveJSON(path.join(reportDir, `benchmark-${timestamp}.json`));
    reporter.saveMarkdown(path.join(reportDir, `benchmark-${timestamp}.md`));
    reporter.saveHTML(path.join(reportDir, `benchmark-${timestamp}.html`));

    // 保存最新报告
    reporter.saveJSON(path.join(reportDir, 'latest.json'));
    reporter.saveMarkdown(path.join(reportDir, 'latest.md'));
    reporter.saveHTML(path.join(reportDir, 'latest.html'));

    console.log('\nReports generated successfully!');
    console.log(`  - JSON: benchmarks/reports/benchmark-${timestamp}.json`);
    console.log(`  - Markdown: benchmarks/reports/benchmark-${timestamp}.md`);
    console.log(`  - HTML: benchmarks/reports/benchmark-${timestamp}.html`);
    console.log('\nView latest report: benchmarks/reports/latest.html\n');

    return 0;
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    return 1;
  }
}

/**
 * 运行特定类别的基准测试
 */
async function runSpecificBenchmark(category: string) {
  const reporter = new Reporter();

  switch (category.toLowerCase()) {
    case 'id':
    case 'id-generation':
      console.log('Running ID Generation Benchmarks...');
      const idResults = await runIDGenerationBenchmarks();
      reporter.addResults(idResults);
      break;

    case 'cache':
      console.log('Running Cache Benchmarks...');
      const cacheResults = await runCacheBenchmarks();
      reporter.addResults(cacheResults);
      break;

    case 'parser':
    case 'parse':
      console.log('Running Parser Benchmarks...');
      const parserResults = await runParserBenchmarks();
      reporter.addResults(parserResults);
      break;

    case 'renderer':
    case 'render':
      console.log('Running Renderer Benchmarks...');
      const rendererResults = await runRendererBenchmarks();
      reporter.addResults(rendererResults);
      break;

    case 'memory':
    case 'mem':
      console.log('Running Memory Benchmarks...');
      await runMemoryBenchmarks();
      return 0;

    default:
      console.error(`Unknown benchmark category: ${category}`);
      console.log('Available categories: id, cache, parser, renderer, memory');
      return 1;
  }

  // 打印报告
  reporter.printConsole();

  // 保存报告
  const reportDir = path.join(__dirname, 'reports');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  reporter.saveJSON(
    path.join(reportDir, `${category}-${timestamp}.json`)
  );
  reporter.saveMarkdown(
    path.join(reportDir, `${category}-${timestamp}.md`)
  );

  return 0;
}

// CLI入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const category = args[0];

  const benchmark = category
    ? runSpecificBenchmark(category)
    : runAllBenchmarks();

  benchmark
    .then((exitCode) => {
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

// 导出以供程序化使用
export {
  runAllBenchmarks,
  runSpecificBenchmark,
  runIDGenerationBenchmarks,
  runCacheBenchmarks,
  runParserBenchmarks,
  runRendererBenchmarks,
  runMemoryBenchmarks,
};
