/**
 * 性能报告生成器
 */

import * as fs from 'fs';
import * as path from 'path';
import { PerformanceMetrics, formatTime, formatMemory } from './metrics';
import { performanceTargets } from '../config';

export interface BenchmarkReport {
  timestamp: number;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalTime: number;
    averageTime: number;
  };
  results: PerformanceMetrics[];
  targetComparison: TargetComparison[];
}

export interface TargetComparison {
  test: string;
  actual: number;
  target: number;
  passed: boolean;
  difference: number;
  differencePercent: number;
}

export class Reporter {
  private results: PerformanceMetrics[] = [];

  /** 添加测试结果 */
  addResult(result: PerformanceMetrics): void {
    this.results.push(result);
  }

  /** 添加多个测试结果 */
  addResults(results: PerformanceMetrics[]): void {
    this.results.push(...results);
  }

  /** 生成报告 */
  generateReport(): BenchmarkReport {
    const totalTime = this.results.reduce((sum, r) => sum + r.totalTime, 0);
    const avgTime =
      this.results.reduce((sum, r) => sum + r.averageTime, 0) /
      this.results.length;

    const targetComparison = this.compareWithTargets();
    const passedTests = targetComparison.filter((c) => c.passed).length;

    return {
      timestamp: Date.now(),
      summary: {
        totalTests: this.results.length,
        passedTests,
        failedTests: targetComparison.length - passedTests,
        totalTime,
        averageTime: avgTime,
      },
      results: this.results,
      targetComparison,
    };
  }

  /** 与目标进行比较 */
  private compareWithTargets(): TargetComparison[] {
    const comparisons: TargetComparison[] = [];

    // 比较解析器性能
    const parserResults = this.results.filter((r) =>
      r.name.includes('parser')
    );
    for (const result of parserResults) {
      if (result.name.includes('batch')) {
        const target = performanceTargets.parser.batchParse;
        comparisons.push(
          this.createComparison(result, target, 'Parser (Batch 1000)')
        );
      } else {
        const target = performanceTargets.parser.singleParse;
        comparisons.push(
          this.createComparison(result, target, 'Parser (Single)')
        );
      }
    }

    // 比较渲染器性能
    const rendererResults = this.results.filter((r) =>
      r.name.includes('renderer')
    );
    for (const result of rendererResults) {
      const target = performanceTargets.renderer.frameTime;
      comparisons.push(
        this.createComparison(result, target, 'Renderer (Frame)')
      );
    }

    // 比较ID生成性能
    const idResults = this.results.filter((r) => r.name.includes('id'));
    for (const result of idResults) {
      const target = performanceTargets.idGeneration.single;
      comparisons.push(this.createComparison(result, target, 'ID Generation'));
    }

    return comparisons;
  }

  /** 创建单个比较结果 */
  private createComparison(
    result: PerformanceMetrics,
    target: number,
    testName: string
  ): TargetComparison {
    const actual = result.averageTime;
    const difference = actual - target;
    const differencePercent = (difference / target) * 100;
    const passed = actual <= target;

    return {
      test: testName,
      actual,
      target,
      passed,
      difference,
      differencePercent,
    };
  }

  /** 保存JSON报告 */
  saveJSON(outputPath: string): void {
    const report = this.generateReport();
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to: ${outputPath}`);
  }

  /** 保存Markdown报告 */
  saveMarkdown(outputPath: string): void {
    const report = this.generateReport();
    const markdown = this.generateMarkdown(report);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, markdown);
    console.log(`Report saved to: ${outputPath}`);
  }

  /** 生成Markdown格式报告 */
  private generateMarkdown(report: BenchmarkReport): string {
    const date = new Date(report.timestamp).toISOString();
    let md = `# Performance Benchmark Report\n\n`;
    md += `**Generated:** ${date}\n\n`;

    // 摘要
    md += `## Summary\n\n`;
    md += `- **Total Tests:** ${report.summary.totalTests}\n`;
    md += `- **Passed:** ${report.summary.passedTests} ✅\n`;
    md += `- **Failed:** ${report.summary.failedTests} ❌\n`;
    md += `- **Total Time:** ${formatTime(report.summary.totalTime)}\n`;
    md += `- **Average Time:** ${formatTime(report.summary.averageTime)}\n\n`;

    // 目标比较
    md += `## Target Comparison\n\n`;
    md += `| Test | Actual | Target | Status | Difference |\n`;
    md += `|------|--------|--------|--------|------------|\n`;
    for (const comp of report.targetComparison) {
      const status = comp.passed ? '✅ Pass' : '❌ Fail';
      const diff = comp.passed
        ? `-${Math.abs(comp.differencePercent).toFixed(1)}%`
        : `+${comp.differencePercent.toFixed(1)}%`;
      md += `| ${comp.test} | ${formatTime(comp.actual)} | ${formatTime(comp.target)} | ${status} | ${diff} |\n`;
    }
    md += `\n`;

    // 详细结果
    md += `## Detailed Results\n\n`;
    for (const result of report.results) {
      md += `### ${result.name}\n\n`;
      md += `- **Iterations:** ${result.iterations}\n`;
      md += `- **Average:** ${formatTime(result.averageTime)}\n`;
      md += `- **Min:** ${formatTime(result.minTime)}\n`;
      md += `- **Max:** ${formatTime(result.maxTime)}\n`;
      md += `- **Median:** ${formatTime(result.medianTime)}\n`;
      md += `- **P95:** ${formatTime(result.p95Time)}\n`;
      md += `- **P99:** ${formatTime(result.p99Time)}\n`;
      md += `- **Ops/sec:** ${result.opsPerSecond.toFixed(0)}\n`;

      if (result.memoryUsage) {
        md += `- **Memory:**\n`;
        md += `  - Heap Used: ${formatMemory(result.memoryUsage.heapUsed)}\n`;
        md += `  - Heap Total: ${formatMemory(result.memoryUsage.heapTotal)}\n`;
        md += `  - RSS: ${formatMemory(result.memoryUsage.rss)}\n`;
      }
      md += `\n`;
    }

    return md;
  }

  /** 保存HTML报告 */
  saveHTML(outputPath: string): void {
    const report = this.generateReport();
    const html = this.generateHTML(report);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, html);
    console.log(`Report saved to: ${outputPath}`);
  }

  /** 生成HTML格式报告 */
  private generateHTML(report: BenchmarkReport): string {
    const date = new Date(report.timestamp).toISOString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Benchmark Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 2rem;
      background: #f5f5f5;
      color: #333;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; }
    h1 { color: #2c3e50; margin-bottom: 0.5rem; }
    .timestamp { color: #7f8c8d; margin-bottom: 2rem; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #ecf0f1;
      padding: 1rem;
      border-radius: 4px;
      border-left: 4px solid #3498db;
    }
    .stat-card.passed { border-left-color: #27ae60; }
    .stat-card.failed { border-left-color: #e74c3c; }
    .stat-label { font-size: 0.875rem; color: #7f8c8d; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.5rem; font-weight: 600; color: #2c3e50; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #ecf0f1;
    }
    th {
      background: #34495e;
      color: white;
      font-weight: 600;
    }
    tr:hover { background: #f8f9fa; }
    .pass { color: #27ae60; font-weight: 600; }
    .fail { color: #e74c3c; font-weight: 600; }
    .metric-card {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    .metric-card h3 { margin-bottom: 0.5rem; color: #2c3e50; }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.5rem;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Performance Benchmark Report</h1>
    <div class="timestamp">Generated: ${date}</div>

    <h2>Summary</h2>
    <div class="summary">
      <div class="stat-card">
        <div class="stat-label">Total Tests</div>
        <div class="stat-value">${report.summary.totalTests}</div>
      </div>
      <div class="stat-card passed">
        <div class="stat-label">Passed</div>
        <div class="stat-value">${report.summary.passedTests}</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-label">Failed</div>
        <div class="stat-value">${report.summary.failedTests}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Average Time</div>
        <div class="stat-value">${formatTime(report.summary.averageTime)}</div>
      </div>
    </div>

    <h2>Target Comparison</h2>
    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th>Actual</th>
          <th>Target</th>
          <th>Status</th>
          <th>Difference</th>
        </tr>
      </thead>
      <tbody>
        ${report.targetComparison
          .map(
            (comp) => `
          <tr>
            <td>${comp.test}</td>
            <td>${formatTime(comp.actual)}</td>
            <td>${formatTime(comp.target)}</td>
            <td class="${comp.passed ? 'pass' : 'fail'}">${comp.passed ? '✅ Pass' : '❌ Fail'}</td>
            <td>${comp.passed ? '-' : '+'}${Math.abs(comp.differencePercent).toFixed(1)}%</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <h2>Detailed Results</h2>
    ${report.results
      .map(
        (result) => `
      <div class="metric-card">
        <h3>${result.name}</h3>
        <div class="metric-grid">
          <div><strong>Iterations:</strong> ${result.iterations}</div>
          <div><strong>Average:</strong> ${formatTime(result.averageTime)}</div>
          <div><strong>Min:</strong> ${formatTime(result.minTime)}</div>
          <div><strong>Max:</strong> ${formatTime(result.maxTime)}</div>
          <div><strong>Median:</strong> ${formatTime(result.medianTime)}</div>
          <div><strong>P95:</strong> ${formatTime(result.p95Time)}</div>
          <div><strong>P99:</strong> ${formatTime(result.p99Time)}</div>
          <div><strong>Ops/sec:</strong> ${result.opsPerSecond.toFixed(0)}</div>
          ${
            result.memoryUsage
              ? `
            <div><strong>Heap Used:</strong> ${formatMemory(result.memoryUsage.heapUsed)}</div>
            <div><strong>RSS:</strong> ${formatMemory(result.memoryUsage.rss)}</div>
          `
              : ''
          }
        </div>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>`;
  }

  /** 打印控制台报告 */
  printConsole(): void {
    const report = this.generateReport();

    console.log('\n' + '='.repeat(60));
    console.log('Performance Benchmark Report');
    console.log('='.repeat(60));

    console.log('\nSummary:');
    console.log(`  Total Tests: ${report.summary.totalTests}`);
    console.log(`  Passed: ${report.summary.passedTests} ✅`);
    console.log(`  Failed: ${report.summary.failedTests} ❌`);
    console.log(`  Average Time: ${formatTime(report.summary.averageTime)}`);

    console.log('\nTarget Comparison:');
    for (const comp of report.targetComparison) {
      const status = comp.passed ? '✅' : '❌';
      const diff = comp.passed
        ? `-${Math.abs(comp.differencePercent).toFixed(1)}%`
        : `+${comp.differencePercent.toFixed(1)}%`;
      console.log(
        `  ${status} ${comp.test}: ${formatTime(comp.actual)} (target: ${formatTime(comp.target)}, ${diff})`
      );
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}
