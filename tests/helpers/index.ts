/**
 * 测试辅助工具导出
 */

import { vi } from 'vitest';
import type { CoreConnector } from '../../src/core/connector';
import type { Logger } from '../../src/logger';
import type { ConfigManager } from '../../src/config';
import { MockCoreConnector } from './mock-connector';

export function createMockConnector(): CoreConnector {
  return new MockCoreConnector() as unknown as CoreConnector;
}

export function createMockLogger(): Logger {
  const mockChild = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createChild: vi.fn().mockReturnThis(),
  };

  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    createChild: vi.fn().mockReturnValue(mockChild),
  } as unknown as Logger;
}

export function createMockConfig(): ConfigManager {
  return {
    get: vi.fn().mockImplementation((_key: string, defaultValue?: unknown) => defaultValue),
    set: vi.fn(),
    setMany: vi.fn(),
    has: vi.fn().mockReturnValue(true),
    delete: vi.fn(),
    getAll: vi.fn().mockReturnValue({}),
    getByPrefix: vi.fn().mockReturnValue({}),
    onChange: vi.fn(),
    offChange: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
  } as unknown as ConfigManager;
}

export { MockCoreConnector };
export { createTestCard, createTestBox, wait, createMockElement, expectError } from './test-utils';
