/**
 * 渲染性能基准测试
 * 目标: 60 FPS (16.67ms per frame)
 */

import { runBenchmark } from '../utils/metrics';
import { performanceTargets } from '../config';

/**
 * 模拟DOM元素
 */
class MockElement {
  tagName: string;
  className: string;
  id: string;
  children: MockElement[] = [];
  attributes: Map<string, string> = new Map();
  style: Map<string, string> = new Map();
  textContent: string = '';

  constructor(tagName: string) {
    this.tagName = tagName;
    this.className = '';
    this.id = '';
  }

  appendChild(child: MockElement): void {
    this.children.push(child);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  setStyle(property: string, value: string): void {
    this.style.set(property, value);
  }

  remove(): void {
    this.children = [];
  }
}

/**
 * 模拟渲染器
 */
class MockRenderer {
  private root: MockElement;
  private renderCount: number = 0;

  constructor() {
    this.root = new MockElement('div');
    this.root.id = 'root';
  }

  renderCard(card: any): MockElement {
    const container = new MockElement('div');
    container.className = 'card-container';
    container.setAttribute('data-id', card.id);

    // 渲染标题
    const title = new MockElement('h2');
    title.className = 'card-title';
    title.textContent = card.title;
    container.appendChild(title);

    // 渲染内容
    const content = new MockElement('div');
    content.className = 'card-content';
    content.textContent = card.content;
    container.appendChild(content);

    // 渲染标签
    if (card.tags && card.tags.length > 0) {
      const tagsContainer = new MockElement('div');
      tagsContainer.className = 'card-tags';

      for (const tag of card.tags) {
        const tagElement = new MockElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
      }

      container.appendChild(tagsContainer);
    }

    this.renderCount++;
    return container;
  }

  renderBatch(cards: any[]): MockElement[] {
    const elements: MockElement[] = [];
    for (const card of cards) {
      elements.push(this.renderCard(card));
    }
    return elements;
  }

  updateCard(element: MockElement, card: any): void {
    // 更新标题
    const title = element.children.find((el) =>
      el.className.includes('card-title')
    );
    if (title) {
      title.textContent = card.title;
    }

    // 更新内容
    const content = element.children.find((el) =>
      el.className.includes('card-content')
    );
    if (content) {
      content.textContent = card.content;
    }

    this.renderCount++;
  }

  clear(): void {
    this.root.remove();
    this.root = new MockElement('div');
    this.root.id = 'root';
    this.renderCount = 0;
  }

  getRenderCount(): number {
    return this.renderCount;
  }
}

/**
 * 生成测试卡片
 */
function generateRenderCard(index: number): any {
  return {
    id: `card_${index}`,
    type: 'text',
    title: `Card ${index}`,
    content: `Content for card ${index}. `.repeat(20),
    tags: [`tag${index % 5}`, `category${index % 3}`],
  };
}

/**
 * 单个卡片渲染性能测试
 */
async function benchmarkSingleCardRender() {
  console.log('\n=== Single Card Rendering ===\n');

  const renderer = new MockRenderer();
  const card = generateRenderCard(1);

  const result = await runBenchmark(
    'Render Single Card',
    () => {
      renderer.renderCard(card);
    },
    { iterations: 1000, warmup: 50 }
  );

  // 检查是否达到目标（单帧时间）
  const target = performanceTargets.renderer.frameTime;
  const passed = result.averageTime <= target;
  console.log(
    `Target: ${target.toFixed(2)}ms, Actual: ${result.averageTime.toFixed(4)}ms, ${passed ? '✅ PASS' : '❌ FAIL'}`
  );

  return [result];
}

/**
 * 批量卡片渲染性能测试
 */
async function benchmarkBatchRender() {
  console.log('\n=== Batch Card Rendering ===\n');

  const renderer = new MockRenderer();
  const counts = [10, 100, 1000];
  const results = [];

  for (const count of counts) {
    console.log(`Testing batch size: ${count}...`);

    const cards = Array.from({ length: count }, (_, i) =>
      generateRenderCard(i)
    );

    const result = await runBenchmark(
      `Render ${count} Cards`,
      () => {
        renderer.renderBatch(cards);
        renderer.clear();
      },
      { iterations: count >= 1000 ? 10 : 100, warmup: count >= 1000 ? 2 : 10 }
    );

    results.push(result);

    // 对于1000个卡片，检查是否达到目标
    if (count === 1000) {
      const target = performanceTargets.renderer.batch1000;
      const passed = result.averageTime <= target;
      console.log(
        `Target: ${target}ms, Actual: ${result.averageTime.toFixed(2)}ms, ${passed ? '✅ PASS' : '❌ FAIL'}`
      );
    }

    // 计算理论FPS
    const fps = 1000 / result.averageTime;
    console.log(`  Theoretical FPS: ${fps.toFixed(2)}`);
  }

  return results;
}

/**
 * 帧率测试
 */
async function benchmarkFrameRate() {
  console.log('\n=== Frame Rate Test ===\n');

  const renderer = new MockRenderer();
  const targetFPS = performanceTargets.renderer.targetFPS;
  const frameDuration = 1000 / targetFPS; // 16.67ms for 60fps

  // 测试在目标帧时间内能渲染多少卡片
  const cardCounts = [1, 5, 10, 20, 50];
  const results = [];

  for (const count of cardCounts) {
    console.log(`Testing ${count} cards per frame...`);

    const cards = Array.from({ length: count }, (_, i) =>
      generateRenderCard(i)
    );

    const result = await runBenchmark(
      `Render ${count} cards/frame`,
      () => {
        renderer.renderBatch(cards);
        renderer.clear();
      },
      { iterations: 100, warmup: 10 }
    );

    results.push(result);

    // 检查是否能保持目标FPS
    const canMaintainFPS = result.averageTime <= frameDuration;
    const actualFPS = 1000 / result.averageTime;

    console.log(
      `  Frame time: ${result.averageTime.toFixed(2)}ms, ` +
        `FPS: ${actualFPS.toFixed(1)}, ` +
        `Target: ${targetFPS} FPS ${canMaintainFPS ? '✅' : '❌'}`
    );
  }

  return results;
}

/**
 * 更新性能测试
 */
async function benchmarkUpdate() {
  console.log('\n=== Card Update Performance ===\n');

  const renderer = new MockRenderer();
  const card = generateRenderCard(1);
  const element = renderer.renderCard(card);

  const updatedCard = {
    ...card,
    title: 'Updated Title',
    content: 'Updated content',
  };

  const result = await runBenchmark(
    'Update Card',
    () => {
      renderer.updateCard(element, updatedCard);
    },
    { iterations: 1000, warmup: 50 }
  );

  return [result];
}

/**
 * 复杂卡片渲染性能
 */
async function benchmarkComplexCards() {
  console.log('\n=== Complex Card Rendering ===\n');

  const renderer = new MockRenderer();
  const results = [];

  const complexities = [
    {
      name: 'Simple',
      card: generateRenderCard(1),
    },
    {
      name: 'Medium',
      card: {
        ...generateRenderCard(1),
        tags: Array(10).fill('tag'),
        metadata: { author: 'test', date: '2024-01-01' },
      },
    },
    {
      name: 'Complex',
      card: {
        ...generateRenderCard(1),
        content: 'Content '.repeat(100),
        tags: Array(20).fill('tag'),
        sections: Array(10)
          .fill(null)
          .map((_, i) => ({ id: i, content: 'Section' })),
      },
    },
  ];

  for (const { name, card } of complexities) {
    console.log(`Testing ${name} card...`);

    const result = await runBenchmark(
      `Render ${name} Card`,
      () => {
        renderer.renderCard(card);
      },
      { iterations: 1000, warmup: 50 }
    );

    results.push(result);
  }

  return results;
}

/**
 * 滚动渲染性能（虚拟列表）
 */
async function benchmarkVirtualScrolling() {
  console.log('\n=== Virtual Scrolling Performance ===\n');

  const renderer = new MockRenderer();
  const totalCards = 10000;
  const visibleCards = 20;
  const cards = Array.from({ length: totalCards }, (_, i) =>
    generateRenderCard(i)
  );

  let scrollPosition = 0;

  const result = await runBenchmark(
    'Virtual Scroll Render',
    () => {
      // 计算可见范围
      const startIndex = scrollPosition;
      const endIndex = Math.min(startIndex + visibleCards, totalCards);
      const visibleSlice = cards.slice(startIndex, endIndex);

      // 渲染可见卡片
      renderer.renderBatch(visibleSlice);
      renderer.clear();

      // 模拟滚动
      scrollPosition = (scrollPosition + 1) % (totalCards - visibleCards);
    },
    { iterations: 1000, warmup: 50 }
  );

  // 检查是否能保持60fps
  const target = performanceTargets.renderer.frameTime;
  const passed = result.averageTime <= target;
  console.log(
    `Target: ${target.toFixed(2)}ms/frame, Actual: ${result.averageTime.toFixed(2)}ms/frame, ${passed ? '✅ PASS' : '❌ FAIL'}`
  );

  return [result];
}

/**
 * 动画性能测试
 */
async function benchmarkAnimation() {
  console.log('\n=== Animation Performance ===\n');

  const renderer = new MockRenderer();
  const card = generateRenderCard(1);
  const element = renderer.renderCard(card);

  let frame = 0;
  const totalFrames = 60; // 1秒动画

  const result = await runBenchmark(
    'Animation Frame',
    () => {
      // 模拟动画更新
      const progress = frame / totalFrames;
      element.setStyle('opacity', String(progress));
      element.setStyle('transform', `translateY(${progress * 100}px)`);

      frame = (frame + 1) % totalFrames;
    },
    { iterations: 1000, warmup: 50 }
  );

  // 检查是否能保持60fps
  const target = performanceTargets.renderer.frameTime;
  const passed = result.averageTime <= target;
  console.log(
    `Target: ${target.toFixed(2)}ms/frame, Actual: ${result.averageTime.toFixed(2)}ms/frame, ${passed ? '✅ PASS' : '❌ FAIL'}`
  );

  return [result];
}

/**
 * 运行所有渲染器基准测试
 */
export async function runRendererBenchmarks() {
  console.log('\n' + '='.repeat(60));
  console.log('Renderer Performance Benchmarks');
  console.log('='.repeat(60));

  const allResults = [];

  // 单卡片渲染
  const singleResults = await benchmarkSingleCardRender();
  allResults.push(...singleResults);

  // 批量渲染
  const batchResults = await benchmarkBatchRender();
  allResults.push(...batchResults);

  // 帧率测试
  const fpsResults = await benchmarkFrameRate();
  allResults.push(...fpsResults);

  // 更新性能
  const updateResults = await benchmarkUpdate();
  allResults.push(...updateResults);

  // 复杂卡片
  const complexResults = await benchmarkComplexCards();
  allResults.push(...complexResults);

  // 虚拟滚动
  const scrollResults = await benchmarkVirtualScrolling();
  allResults.push(...scrollResults);

  // 动画性能
  const animationResults = await benchmarkAnimation();
  allResults.push(...animationResults);

  console.log('\n' + '='.repeat(60));
  console.log('Renderer Benchmarks Complete');
  console.log('='.repeat(60) + '\n');

  return allResults;
}

// 如果直接运行此文件
if (require.main === module) {
  runRendererBenchmarks()
    .then((results) => {
      console.log(`\nCompleted ${results.length} benchmarks`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
