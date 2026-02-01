/**
 * 测试工具函数
 */

import { Card, CardMetadata, CardStructure } from '../../src/types/card';
import { Box, BoxMetadata, BoxStructure, BoxContent } from '../../src/types/box';
import { generateId } from '../../src/utils/id';

/**
 * 创建测试用卡片
 */
export function createTestCard(overrides?: Partial<Card>): Card {
  const id = generateId();
  const now = new Date().toISOString();

  const metadata: CardMetadata = {
    chip_standards_version: '1.0.0',
    card_id: id,
    name: '测试卡片',
    created_at: now,
    modified_at: now,
    ...overrides?.metadata,
  };

  const structure: CardStructure = {
    structure: [],
    manifest: {
      card_count: 0,
      resource_count: 0,
      resources: [],
    },
    ...overrides?.structure,
  };

  return {
    id,
    metadata,
    structure,
    resources: new Map(),
    ...overrides,
  };
}

/**
 * 创建测试用箱子
 */
export function createTestBox(overrides?: Partial<Box>): Box {
  const id = generateId();
  const now = new Date().toISOString();

  const metadata: BoxMetadata = {
    chip_standards_version: '1.0.0',
    box_id: id,
    name: '测试箱子',
    created_at: now,
    modified_at: now,
    layout: 'grid',
    ...overrides?.metadata,
  };

  const structure: BoxStructure = {
    cards: [],
    ...overrides?.structure,
  };

  const content: BoxContent = {
    active_layout: 'grid',
    layout_configs: {},
    ...overrides?.content,
  };

  return {
    id,
    metadata,
    structure,
    content,
    ...overrides,
  };
}

/**
 * 等待一定时间
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建模拟 DOM 元素
 */
export function createMockElement(): HTMLElement {
  const element = document.createElement('div');
  element.innerHTML = '';
  return element;
}

/**
 * 断言错误
 */
export async function expectError<T>(
  fn: () => Promise<T>,
  errorName?: string,
  errorCode?: string
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (errorName && (error as Error).name !== errorName) {
      throw new Error(`Expected error name ${errorName}, got ${(error as Error).name}`);
    }
    if (errorCode && (error as { code?: string }).code !== errorCode) {
      throw new Error(`Expected error code ${errorCode}, got ${(error as { code?: string }).code}`);
    }
  }
}
