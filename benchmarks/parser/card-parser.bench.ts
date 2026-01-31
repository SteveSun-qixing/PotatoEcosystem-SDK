/**
 * 卡片解析性能基准测试
 * 目标: 1000个卡片 < 5秒 (平均每个卡片 < 5ms)
 */

import { runBenchmark } from '../utils/metrics';
import { performanceTargets, testScenarios } from '../config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 模拟卡片数据结构
 */
interface CardMetadata {
  id: string;
  type: string;
  title: string;
  version: string;
  created: string;
  modified: string;
  tags?: string[];
  description?: string;
}

interface CardStructure {
  version: string;
  sections: Array<{
    id: string;
    type: string;
    content: any;
  }>;
}

interface Card {
  metadata: CardMetadata;
  structure: CardStructure;
  content: string;
}

/**
 * 生成测试卡片数据
 */
function generateTestCard(index: number): Card {
  return {
    metadata: {
      id: `test_card_${index}`,
      type: 'text',
      title: `Test Card ${index}`,
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: ['test', `tag${index % 10}`],
      description: `This is test card number ${index}`,
    },
    structure: {
      version: '1.0.0',
      sections: [
        {
          id: `section_${index}_1`,
          type: 'text',
          content: `Content for section 1 of card ${index}`.repeat(10),
        },
        {
          id: `section_${index}_2`,
          type: 'text',
          content: `Content for section 2 of card ${index}`.repeat(10),
        },
      ],
    },
    content: `This is the main content of card ${index}. `.repeat(50),
  };
}

/**
 * 模拟YAML解析
 */
function parseYAML(text: string): any {
  // 简单模拟YAML解析
  const lines = text.split('\n');
  const result: any = {};
  let currentKey = '';

  for (const line of lines) {
    if (line.includes(':')) {
      const [key, value] = line.split(':').map((s) => s.trim());
      currentKey = key;
      result[key] = value || '';
    }
  }

  return result;
}

/**
 * 模拟卡片解析器
 */
class CardParser {
  parse(cardData: string): Card {
    // 模拟解析过程
    const card = JSON.parse(cardData);

    // 验证必需字段
    if (!card.metadata || !card.metadata.id) {
      throw new Error('Invalid card: missing metadata.id');
    }

    // 处理标签
    if (card.metadata.tags && Array.isArray(card.metadata.tags)) {
      card.metadata.tags = card.metadata.tags.map((tag: string) =>
        tag.toLowerCase()
      );
    }

    // 验证结构
    if (card.structure && card.structure.sections) {
      for (const section of card.structure.sections) {
        if (!section.id || !section.type) {
          throw new Error('Invalid section: missing id or type');
        }
      }
    }

    return card;
  }

  parseMetadata(metadataText: string): CardMetadata {
    const metadata = parseYAML(metadataText);
    return metadata as CardMetadata;
  }

  parseStructure(structureText: string): CardStructure {
    const structure = parseYAML(structureText);
    return structure as CardStructure;
  }

  parseMultiple(cardsData: string[]): Card[] {
    return cardsData.map((data) => this.parse(data));
  }
}

/**
 * 单个卡片解析性能测试
 */
async function benchmarkSingleCardParsing() {
  console.log('\n=== Single Card Parsing ===\n');

  const parser = new CardParser();
  const testCard = generateTestCard(1);
  const cardData = JSON.stringify(testCard);

  const result = await runBenchmark(
    'Parse Single Card',
    () => {
      parser.parse(cardData);
    },
    { iterations: 1000, warmup: 50 }
  );

  // 检查是否达到目标
  const target = performanceTargets.parser.singleParse;
  const passed = result.averageTime <= target;
  console.log(
    `Target: ${target}ms, Actual: ${result.averageTime.toFixed(4)}ms, ${passed ? '✅ PASS' : '❌ FAIL'}`
  );

  return [result];
}

/**
 * 批量卡片解析性能测试
 */
async function benchmarkBatchCardParsing() {
  console.log('\n=== Batch Card Parsing ===\n');

  const parser = new CardParser();
  const counts = [10, 100, 1000];
  const results = [];

  for (const count of counts) {
    console.log(`Testing batch size: ${count}...`);

    // 生成测试数据
    const cards = Array.from({ length: count }, (_, i) =>
      JSON.stringify(generateTestCard(i))
    );

    const result = await runBenchmark(
      `Parse ${count} Cards`,
      () => {
        parser.parseMultiple(cards);
      },
      { iterations: count >= 1000 ? 5 : 50, warmup: count >= 1000 ? 1 : 10 }
    );

    results.push(result);

    // 对于1000个卡片，检查是否达到目标
    if (count === 1000) {
      const target = performanceTargets.parser.batchParse;
      const passed = result.averageTime <= target;
      console.log(
        `Target: ${target}ms, Actual: ${result.averageTime.toFixed(2)}ms, ${passed ? '✅ PASS' : '❌ FAIL'}`
      );
    }
  }

  return results;
}

/**
 * 元数据解析性能测试
 */
async function benchmarkMetadataParsing() {
  console.log('\n=== Metadata Parsing ===\n');

  const parser = new CardParser();
  const metadataText = `
id: test_card_1
type: text
title: Test Card 1
version: 1.0.0
created: 2024-01-01T00:00:00Z
modified: 2024-01-01T00:00:00Z
tags: test, example
description: This is a test card
`;

  const result = await runBenchmark(
    'Parse Metadata',
    () => {
      parser.parseMetadata(metadataText);
    },
    { iterations: 1000, warmup: 50 }
  );

  return [result];
}

/**
 * 结构解析性能测试
 */
async function benchmarkStructureParsing() {
  console.log('\n=== Structure Parsing ===\n');

  const parser = new CardParser();
  const structureText = `
version: 1.0.0
sections:
  - id: section_1
    type: text
    content: Section 1 content
  - id: section_2
    type: text
    content: Section 2 content
`;

  const result = await runBenchmark(
    'Parse Structure',
    () => {
      parser.parseStructure(structureText);
    },
    { iterations: 1000, warmup: 50 }
  );

  return [result];
}

/**
 * 不同大小卡片的解析性能
 */
async function benchmarkCardSizeVariations() {
  console.log('\n=== Card Size Variations ===\n');

  const parser = new CardParser();
  const sizes = [
    { name: 'Small (1KB)', multiplier: 1 },
    { name: 'Medium (10KB)', multiplier: 10 },
    { name: 'Large (100KB)', multiplier: 100 },
    { name: 'XLarge (1MB)', multiplier: 1000 },
  ];

  const results = [];

  for (const { name, multiplier } of sizes) {
    console.log(`Testing ${name}...`);

    const card = generateTestCard(1);
    // 增加内容大小
    card.content = card.content.repeat(multiplier);
    const cardData = JSON.stringify(card);

    const result = await runBenchmark(
      `Parse ${name} Card`,
      () => {
        parser.parse(cardData);
      },
      { iterations: 100, warmup: 10 }
    );

    results.push(result);
  }

  return results;
}

/**
 * 带错误处理的解析性能
 */
async function benchmarkParsingWithErrorHandling() {
  console.log('\n=== Parsing with Error Handling ===\n');

  const parser = new CardParser();
  const validCard = JSON.stringify(generateTestCard(1));
  const invalidCard = '{"invalid": "data"}';

  const results = [];

  // 正常解析
  const validResult = await runBenchmark(
    'Parse Valid Card',
    () => {
      parser.parse(validCard);
    },
    { iterations: 1000, warmup: 50 }
  );
  results.push(validResult);

  // 错误处理
  const errorResult = await runBenchmark(
    'Parse Invalid Card (with error)',
    () => {
      try {
        parser.parse(invalidCard);
      } catch (error) {
        // 捕获错误
      }
    },
    { iterations: 1000, warmup: 50 }
  );
  results.push(errorResult);

  return results;
}

/**
 * 并发解析性能测试
 */
async function benchmarkConcurrentParsing() {
  console.log('\n=== Concurrent Parsing ===\n');

  const parser = new CardParser();
  const concurrency = [10, 50, 100];
  const results = [];

  for (const count of concurrency) {
    console.log(`Testing ${count} concurrent parses...`);

    const cards = Array.from({ length: count }, (_, i) =>
      JSON.stringify(generateTestCard(i))
    );

    const result = await runBenchmark(
      `Concurrent Parse (${count})`,
      async () => {
        const promises = cards.map((cardData) =>
          Promise.resolve(parser.parse(cardData))
        );
        await Promise.all(promises);
      },
      { iterations: 50, warmup: 10 }
    );

    results.push(result);
  }

  return results;
}

/**
 * 运行所有解析器基准测试
 */
export async function runParserBenchmarks() {
  console.log('\n' + '='.repeat(60));
  console.log('Card Parser Performance Benchmarks');
  console.log('='.repeat(60));

  const allResults = [];

  // 单个卡片解析
  const singleResults = await benchmarkSingleCardParsing();
  allResults.push(...singleResults);

  // 批量卡片解析
  const batchResults = await benchmarkBatchCardParsing();
  allResults.push(...batchResults);

  // 元数据解析
  const metadataResults = await benchmarkMetadataParsing();
  allResults.push(...metadataResults);

  // 结构解析
  const structureResults = await benchmarkStructureParsing();
  allResults.push(...structureResults);

  // 不同大小卡片
  const sizeResults = await benchmarkCardSizeVariations();
  allResults.push(...sizeResults);

  // 错误处理
  const errorResults = await benchmarkParsingWithErrorHandling();
  allResults.push(...errorResults);

  // 并发解析
  const concurrentResults = await benchmarkConcurrentParsing();
  allResults.push(...concurrentResults);

  console.log('\n' + '='.repeat(60));
  console.log('Parser Benchmarks Complete');
  console.log('='.repeat(60) + '\n');

  return allResults;
}

// 如果直接运行此文件
if (require.main === module) {
  runParserBenchmarks()
    .then((results) => {
      console.log(`\nCompleted ${results.length} benchmarks`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
