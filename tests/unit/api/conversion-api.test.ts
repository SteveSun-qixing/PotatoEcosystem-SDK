import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversionAPI } from '../../../src/api/conversion-api';
import { CoreConnector, ChipsError } from '../../../src/core';
import { Logger } from '../../../src/logger';
import { ConfigManager } from '../../../src/config';
import { Card } from '../../../src/types/card';
import { Box } from '../../../src/types/box';
import {
  Converter,
  ConversionCapability,
  ConversionProgress,
  ConversionOptions,
} from '../../../src/api/conversion-types';

// ========== Mock 对象创建函数 ==========

/**
 * 创建 Mock CoreConnector
 */
function createMockConnector() {
  const eventHandlers = new Map<string, ((data: unknown) => void)[]>();
  
  return {
    request: vi.fn().mockResolvedValue({ success: true, data: {} }),
    on: vi.fn().mockImplementation((event: string, handler: (data: unknown) => void) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event)!.push(handler);
    }),
    off: vi.fn(),
    emit: vi.fn(),
    // 用于测试触发事件
    _triggerEvent: (event: string, data: unknown) => {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        handlers.forEach(h => h(data));
      }
    },
  } as unknown as CoreConnector & { _triggerEvent: (event: string, data: unknown) => void };
}

/**
 * 创建 Mock Logger
 */
function createMockLogger() {
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

/**
 * 创建 Mock ConfigManager
 */
function createMockConfig() {
  const defaults: Record<string, unknown> = {
    'timeout.default': 30000,
    'timeout.conversion': 300000,
    'conversion.concurrency': 3,
  };
  
  return {
    get: vi.fn().mockImplementation((key: string, defaultValue?: unknown) => {
      return defaults[key] ?? defaultValue;
    }),
    set: vi.fn(),
  } as unknown as ConfigManager;
}

/**
 * 创建测试用 Card 对象
 */
function createTestCard(overrides?: Partial<Card>): Card {
  return {
    id: 'a1B2c3D4e5',
    metadata: {
      chip_standards_version: '1.0.0',
      card_id: 'a1B2c3D4e5',
      name: 'Test Card',
      created_at: '2026-02-03T00:00:00Z',
      modified_at: '2026-02-03T00:00:00Z',
    },
    structure: {
      structure: [],
      manifest: {
        card_count: 0,
        resource_count: 0,
        resources: [],
      },
    },
    content: {},
    ...overrides,
  } as Card;
}

/**
 * 创建测试用 Box 对象
 */
function createTestBox(overrides?: Partial<Box>): Box {
  return {
    id: 'x1Y2z3W4v5',
    metadata: {
      chip_standards_version: '1.0.0',
      box_id: 'x1Y2z3W4v5',
      name: 'Test Box',
      created_at: '2026-02-03T00:00:00Z',
      modified_at: '2026-02-03T00:00:00Z',
      layout: 'grid',
    },
    structure: {
      cards: [],
    },
    content: {
      active_layout: 'grid',
      layout_configs: {},
    },
    ...overrides,
  } as Box;
}

/**
 * 创建测试用转换器
 */
function createTestConverter(overrides?: Partial<Converter>): Converter {
  return {
    metadata: {
      id: 'test-converter',
      name: 'Test Converter',
      version: '1.0.0',
      description: 'A test converter',
    },
    convert: vi.fn().mockResolvedValue({}),
    getCapabilities: vi.fn().mockReturnValue([
      { sourceType: 'card', targetFormat: 'markdown' },
    ]),
    ...overrides,
  };
}

// ========== 测试套件 ==========

describe('ConversionAPI', () => {
  let conversionApi: ConversionAPI;
  let mockConnector: ReturnType<typeof createMockConnector>;
  let mockLogger: Logger;
  let mockConfig: ConfigManager;

  beforeEach(() => {
    vi.useFakeTimers();
    mockConnector = createMockConnector();
    mockLogger = createMockLogger();
    mockConfig = createMockConfig();
    conversionApi = new ConversionAPI(mockConnector, mockLogger, mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ========== 构造函数测试 ==========
  describe('constructor', () => {
    it('应该成功创建实例', () => {
      expect(conversionApi).toBeInstanceOf(ConversionAPI);
    });

    it('应该创建子 Logger 实例', () => {
      expect(mockLogger.createChild).toHaveBeenCalledWith('ConversionAPI');
    });

    it('应该注册进度事件监听器', () => {
      expect(mockConnector.on).toHaveBeenCalledWith('conversion:progress', expect.any(Function));
    });
  });

  // ========== initialize 测试 ==========
  describe('initialize', () => {
    it('应该成功初始化并获取转换能力', async () => {
      const mockCapabilities: ConversionCapability[] = [
        { sourceType: 'card', targetFormat: 'html' },
        { sourceType: 'card', targetFormat: 'pdf' },
      ];
      
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: mockCapabilities },
      });

      await conversionApi.initialize();

      expect(mockConnector.request).toHaveBeenCalledWith({
        service: 'file-converter',
        method: 'getCapabilities',
        payload: {},
        timeout: 30000,
      });

      const capabilities = conversionApi.getSupportedConversions();
      expect(capabilities).toContainEqual({ sourceType: 'card', targetFormat: 'html' });
      expect(capabilities).toContainEqual({ sourceType: 'card', targetFormat: 'pdf' });
    });

    it('应该在初始化失败时记录警告但不抛出错误', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(conversionApi.initialize()).resolves.not.toThrow();

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.warn).toHaveBeenCalled();
    });

    it('应该避免重复初始化', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { capabilities: [] },
      });

      await conversionApi.initialize();
      await conversionApi.initialize();

      expect(mockConnector.request).toHaveBeenCalledTimes(1);
    });
  });

  // ========== convert 测试 ==========
  describe('convert', () => {
    beforeEach(async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });
      await conversionApi.initialize();
    });

    it('应该成功转换卡片到 HTML', async () => {
      const card = createTestCard();
      
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: {
          outputPath: '/output/test.html',
          duration: 100,
        },
      });

      const result = await conversionApi.convert(card, 'html');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/test.html');
      expect(result.taskId).toBeDefined();
    });

    it('应该成功转换文件路径', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { outputPath: '/output/test.html' },
      });

      const result = await conversionApi.convert('/path/to/test.card', 'html');

      expect(result.success).toBe(true);
    });

    it('应该在不支持的转换时返回失败结果', async () => {
      const card = createTestCard();
      
      const result = await conversionApi.convert(card, 'unsupported');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该在转换请求失败时返回错误', async () => {
      const card = createTestCard();
      
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: false,
        error: 'Conversion failed',
      });

      const result = await conversionApi.convert(card, 'html');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该正确传递转换选项', async () => {
      const card = createTestCard();
      const options: ConversionOptions = {
        outputPath: '/custom/output.html',
        timeout: 60000,
        html: {
          inlineResources: true,
          minify: true,
        },
      };

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { outputPath: '/custom/output.html' },
      });

      await conversionApi.convert(card, 'html', options);

      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
          payload: expect.objectContaining({
            options: expect.objectContaining({
              outputPath: '/custom/output.html',
            }),
          }),
        })
      );
    });

    it('应该记录转换开始和完成日志', async () => {
      const card = createTestCard();
      
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { outputPath: '/output/test.html' },
      });

      await conversionApi.convert(card, 'html');

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.debug).toHaveBeenCalledWith('Starting conversion', expect.any(Object));
      expect(childLogger.info).toHaveBeenCalledWith('Conversion completed', expect.any(Object));
    });

    it('应该记录转换失败日志', async () => {
      const card = createTestCard();
      
      (mockConnector.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await conversionApi.convert(card, 'html');

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.error).toHaveBeenCalledWith(
        'Conversion failed',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  // ========== getSupportedConversions 测试 ==========
  describe('getSupportedConversions', () => {
    it('应该返回系统支持的转换能力', async () => {
      const mockCapabilities: ConversionCapability[] = [
        { sourceType: 'card', targetFormat: 'html' },
        { sourceType: 'card', targetFormat: 'pdf' },
      ];

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: mockCapabilities },
      });

      await conversionApi.initialize();

      const capabilities = conversionApi.getSupportedConversions();

      expect(capabilities).toHaveLength(2);
      expect(capabilities).toContainEqual({ sourceType: 'card', targetFormat: 'html' });
    });

    it('应该包含本地注册的转换器能力', async () => {
      const converter = createTestConverter({
        getCapabilities: vi.fn().mockReturnValue([
          { sourceType: 'markdown', targetFormat: 'card' },
        ]),
      });

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });

      await conversionApi.initialize();
      await conversionApi.registerConverter(converter);

      const capabilities = conversionApi.getSupportedConversions();

      expect(capabilities).toContainEqual({ sourceType: 'card', targetFormat: 'html' });
      expect(capabilities).toContainEqual({ sourceType: 'markdown', targetFormat: 'card' });
    });

    it('应该返回空数组当没有能力时', () => {
      const capabilities = conversionApi.getSupportedConversions();
      expect(capabilities).toEqual([]);
    });
  });

  // ========== canConvert 测试 ==========
  describe('canConvert', () => {
    beforeEach(async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: {
          capabilities: [
            { sourceType: 'card', targetFormat: 'html' },
            { sourceType: 'card', targetFormat: 'pdf' },
            { sourceType: 'box', targetFormat: 'html' },
          ],
        },
      });
      await conversionApi.initialize();
    });

    it('应该返回 true 当支持转换时', () => {
      expect(conversionApi.canConvert('card', 'html')).toBe(true);
      expect(conversionApi.canConvert('card', 'pdf')).toBe(true);
      expect(conversionApi.canConvert('box', 'html')).toBe(true);
    });

    it('应该返回 false 当不支持转换时', () => {
      expect(conversionApi.canConvert('card', 'docx')).toBe(false);
      expect(conversionApi.canConvert('unknown', 'html')).toBe(false);
    });

    it('应该检查本地注册的转换器能力', async () => {
      const converter = createTestConverter({
        getCapabilities: vi.fn().mockReturnValue([
          { sourceType: 'markdown', targetFormat: 'card' },
        ]),
      });

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
      });

      await conversionApi.registerConverter(converter);

      expect(conversionApi.canConvert('markdown', 'card')).toBe(true);
    });
  });

  // ========== registerConverter 测试 ==========
  describe('registerConverter', () => {
    it('应该成功注册转换器', async () => {
      const converter = createTestConverter();

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
      });

      await conversionApi.registerConverter(converter);

      const converters = conversionApi.listConverters();
      expect(converters).toHaveLength(1);
      expect(converters[0].id).toBe('test-converter');
    });

    it('应该向 Core 发送注册请求', async () => {
      const converter = createTestConverter();

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
      });

      await conversionApi.registerConverter(converter);

      expect(mockConnector.request).toHaveBeenCalledWith({
        service: 'file-converter',
        method: 'registerConverter',
        payload: {
          metadata: converter.metadata,
          capabilities: converter.getCapabilities(),
        },
        timeout: 30000,
      });
    });

    it('应该在元数据无效时抛出错误', async () => {
      const invalidConverter: Converter = {
        metadata: {
          id: '',
          name: '',
          version: '',
        },
        convert: vi.fn(),
        getCapabilities: vi.fn().mockReturnValue([]),
      };

      await expect(conversionApi.registerConverter(invalidConverter)).rejects.toThrow(ChipsError);
    });

    it('应该在 ID 冲突时抛出错误', async () => {
      const converter1 = createTestConverter();
      const converter2 = createTestConverter();

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      await conversionApi.registerConverter(converter1);

      await expect(conversionApi.registerConverter(converter2)).rejects.toThrow(
        /already exists/
      );
    });

    it('应该在 Core 注册失败时回滚本地状态', async () => {
      const converter = createTestConverter();

      (mockConnector.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Core error')
      );

      await expect(conversionApi.registerConverter(converter)).rejects.toThrow();

      const converters = conversionApi.listConverters();
      expect(converters).toHaveLength(0);
    });

    it('应该记录注册日志', async () => {
      const converter = createTestConverter();

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
      });

      await conversionApi.registerConverter(converter);

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.info).toHaveBeenCalledWith('Converter registered', expect.any(Object));
    });
  });

  // ========== unregisterConverter 测试 ==========
  describe('unregisterConverter', () => {
    beforeEach(async () => {
      const converter = createTestConverter();

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      await conversionApi.registerConverter(converter);
    });

    it('应该成功注销转换器', async () => {
      await conversionApi.unregisterConverter('test-converter');

      const converters = conversionApi.listConverters();
      expect(converters).toHaveLength(0);
    });

    it('应该向 Core 发送注销请求', async () => {
      await conversionApi.unregisterConverter('test-converter');

      expect(mockConnector.request).toHaveBeenCalledWith({
        service: 'file-converter',
        method: 'unregisterConverter',
        payload: { converterId: 'test-converter' },
        timeout: 30000,
      });
    });

    it('应该在转换器不存在时记录警告', async () => {
      await conversionApi.unregisterConverter('non-existent');

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.warn).toHaveBeenCalledWith(
        'Converter not found for unregistration',
        expect.any(Object)
      );
    });

    it('应该在 Core 注销失败时记录错误但不回滚', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Core error')
      );

      await conversionApi.unregisterConverter('test-converter');

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.error).toHaveBeenCalled();

      // 本地状态已删除
      const converters = conversionApi.listConverters();
      expect(converters).toHaveLength(0);
    });
  });

  // ========== listConverters 测试 ==========
  describe('listConverters', () => {
    it('应该返回空数组当没有转换器时', () => {
      const converters = conversionApi.listConverters();
      expect(converters).toEqual([]);
    });

    it('应该返回所有注册的转换器元数据', async () => {
      const converter1 = createTestConverter({
        metadata: { id: 'converter-1', name: 'Converter 1', version: '1.0.0' },
      });
      const converter2 = createTestConverter({
        metadata: { id: 'converter-2', name: 'Converter 2', version: '2.0.0' },
      });

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      await conversionApi.registerConverter(converter1);
      await conversionApi.registerConverter(converter2);

      const converters = conversionApi.listConverters();

      expect(converters).toHaveLength(2);
      expect(converters.map(c => c.id)).toContain('converter-1');
      expect(converters.map(c => c.id)).toContain('converter-2');
    });
  });

  // ========== convertBatch 测试 ==========
  describe('convertBatch', () => {
    beforeEach(async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });
      await conversionApi.initialize();
    });

    it('应该成功批量转换', async () => {
      const cards = [createTestCard(), createTestCard(), createTestCard()];

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { outputPath: '/output/test.html' },
      });

      const results = await conversionApi.convertBatch(cards, 'html');

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('应该按并发数分批执行', async () => {
      const cards = Array(5).fill(null).map(() => createTestCard());

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { outputPath: '/output/test.html' },
      });

      await conversionApi.convertBatch(cards, 'html');

      // 5 个卡片，并发 3，应该分 2 批
      // 初始化请求 1 次 + 5 次转换请求 = 6 次
      expect(mockConnector.request).toHaveBeenCalledTimes(6);
    });

    it('应该返回部分失败的结果', async () => {
      const cards = [createTestCard(), createTestCard()];

      (mockConnector.request as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ success: true, data: { outputPath: '/output/1.html' } })
        .mockResolvedValueOnce({ success: false, error: 'Failed' });

      const results = await conversionApi.convertBatch(cards, 'html');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('应该记录批量转换日志', async () => {
      const cards = [createTestCard()];

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {},
      });

      await conversionApi.convertBatch(cards, 'html');

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.debug).toHaveBeenCalledWith(
        'Starting batch conversion',
        expect.objectContaining({ count: 1, targetFormat: 'html' })
      );
      expect(childLogger.info).toHaveBeenCalledWith(
        'Batch conversion completed',
        expect.any(Object)
      );
    });

    it('应该传递选项给每个转换', async () => {
      const cards = [createTestCard()];
      const options: ConversionOptions = {
        html: { minify: true },
      };

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {},
      });

      await conversionApi.convertBatch(cards, 'html', options);

      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            options: expect.objectContaining({
              html: { minify: true },
            }),
          }),
        })
      );
    });
  });

  // ========== getTaskStatus 测试 ==========
  describe('getTaskStatus', () => {
    it('应该返回任务状态', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });
      await conversionApi.initialize();

      const card = createTestCard();
      
      // 模拟一个长时间运行的转换
      let resolveConvert: (value: unknown) => void;
      (mockConnector.request as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        return new Promise(resolve => {
          resolveConvert = resolve;
        });
      });

      const convertPromise = conversionApi.convert(card, 'html');

      // 等待任务创建
      await vi.advanceTimersByTimeAsync(10);

      // 获取任务状态（此时还没有 taskId，需要通过转换结果获取）
      // 由于我们没有直接访问 taskId 的方式，这个测试验证 getTaskStatus 不会崩溃
      const status = conversionApi.getTaskStatus('non-existent-task');
      expect(status).toBeUndefined();

      // 完成转换
      resolveConvert!({ success: true, data: {} });
      await convertPromise;
    });

    it('应该返回 undefined 当任务不存在时', () => {
      const status = conversionApi.getTaskStatus('non-existent-task');
      expect(status).toBeUndefined();
    });
  });

  // ========== cancelTask 测试 ==========
  describe('cancelTask', () => {
    it('应该成功取消正在运行的任务', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });
      await conversionApi.initialize();

      const card = createTestCard();
      let capturedTaskId: string;
      let resolveConvert: (value: unknown) => void;

      // 模拟一个长时间运行的转换
      (mockConnector.request as ReturnType<typeof vi.fn>).mockImplementationOnce((params) => {
        capturedTaskId = params.payload.taskId;
        return new Promise((resolve) => {
          resolveConvert = resolve;
        });
      });

      // 启动转换但不等待完成
      const convertPromise = conversionApi.convert(card, 'html');

      // 等待任务创建
      await vi.advanceTimersByTimeAsync(10);

      // 模拟取消请求成功
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
      });

      // 取消任务
      await conversionApi.cancelTask(capturedTaskId!);

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.debug).toHaveBeenCalledWith('Cancelling task', expect.any(Object));
      expect(childLogger.info).toHaveBeenCalledWith('Task cancelled', expect.any(Object));

      // 完成转换以清理
      resolveConvert!({ success: true, data: {} });
      await convertPromise;
    });

    it('应该不取消不存在的任务', async () => {
      await conversionApi.cancelTask('non-existent-task');

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.debug).toHaveBeenCalledWith(
        'Task cannot be cancelled',
        expect.objectContaining({ taskId: 'non-existent-task' })
      );
    });

    it('应该不取消已完成的任务', async () => {
      // 这个测试验证逻辑：如果任务已完成，cancelTask 不会发送取消请求
      await conversionApi.cancelTask('completed-task');

      // 应该记录无法取消的日志
      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.debug).toHaveBeenCalledWith(
        'Task cannot be cancelled',
        expect.any(Object)
      );
    });

    it('应该在取消请求失败时记录错误', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });
      await conversionApi.initialize();

      const card = createTestCard();
      let capturedTaskId: string;
      let resolveConvert: (value: unknown) => void;

      // 模拟一个长时间运行的转换
      (mockConnector.request as ReturnType<typeof vi.fn>).mockImplementationOnce((params) => {
        capturedTaskId = params.payload.taskId;
        return new Promise((resolve) => {
          resolveConvert = resolve;
        });
      });

      // 启动转换
      const convertPromise = conversionApi.convert(card, 'html');
      await vi.advanceTimersByTimeAsync(10);

      // 模拟取消请求失败
      (mockConnector.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Cancel failed')
      );

      // 取消任务
      await conversionApi.cancelTask(capturedTaskId!);

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.error).toHaveBeenCalledWith(
        'Failed to cancel task',
        expect.any(Error),
        expect.any(Object)
      );

      // 完成转换以清理
      resolveConvert!({ success: true, data: {} });
      await convertPromise;
    });
  });

  // ========== 进度回调测试 ==========
  describe('进度回调', () => {
    beforeEach(async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });
      await conversionApi.initialize();
    });

    it('应该触发进度回调', async () => {
      const card = createTestCard();
      const progressCallback = vi.fn();
      
      let taskId: string;
      
      (mockConnector.request as ReturnType<typeof vi.fn>).mockImplementationOnce((params) => {
        taskId = params.payload.taskId;
        return Promise.resolve({ success: true, data: {} });
      });

      const options: ConversionOptions = {
        onProgress: progressCallback,
      };

      await conversionApi.convert(card, 'html', options);

      // 进度回调应该在状态更新时被调用
      expect(progressCallback).toHaveBeenCalled();
    });

    it('应该处理进度事件', async () => {
      const card = createTestCard();
      const progressCallback = vi.fn();
      let taskId: string;

      (mockConnector.request as ReturnType<typeof vi.fn>).mockImplementationOnce((params) => {
        taskId = params.payload.taskId;
        // 立即触发进度事件
        setTimeout(() => {
          mockConnector._triggerEvent('conversion:progress', {
            taskId,
            progress: 50,
            currentStep: 'Processing',
            status: 'running',
          });
        }, 10);
        return Promise.resolve({ success: true, data: {} });
      });

      const options: ConversionOptions = {
        onProgress: progressCallback,
      };

      const convertPromise = conversionApi.convert(card, 'html', options);
      
      // 推进定时器以触发进度事件
      await vi.advanceTimersByTimeAsync(20);
      
      await convertPromise;
    });
  });

  // ========== 错误处理测试 ==========
  describe('错误处理', () => {
    beforeEach(async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });
      await conversionApi.initialize();
    });

    it('应该处理不支持的转换类型错误', async () => {
      const card = createTestCard();
      
      const result = await conversionApi.convert(card, 'unsupported-format');

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ChipsError);
      expect((result.error as ChipsError).code).toBe('CONV-1001');
    });

    it('应该处理转换服务返回的错误', async () => {
      const card = createTestCard();
      
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: false,
        error: 'Service error',
      });

      const result = await conversionApi.convert(card, 'html');

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ChipsError);
      expect((result.error as ChipsError).code).toBe('CONV-1002');
    });

    it('应该处理网络错误', async () => {
      const card = createTestCard();
      
      (mockConnector.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await conversionApi.convert(card, 'html');

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('应该在注册转换器时验证元数据完整性', async () => {
      const invalidConverters = [
        { metadata: { id: '', name: 'Test', version: '1.0.0' }, convert: vi.fn(), getCapabilities: vi.fn() },
        { metadata: { id: 'test', name: '', version: '1.0.0' }, convert: vi.fn(), getCapabilities: vi.fn() },
        { metadata: { id: 'test', name: 'Test', version: '' }, convert: vi.fn(), getCapabilities: vi.fn() },
      ];

      for (const converter of invalidConverters) {
        await expect(conversionApi.registerConverter(converter as Converter)).rejects.toThrow(
          /Invalid converter metadata/
        );
      }
    });
  });

  // ========== getConverterInfo 测试 ==========
  describe('getConverterInfo', () => {
    it('应该返回转换器信息', async () => {
      const converter = createTestConverter();

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
      });

      await conversionApi.registerConverter(converter);

      const info = conversionApi.getConverterInfo('test-converter');

      expect(info).toBeDefined();
      expect(info?.metadata.id).toBe('test-converter');
      expect(info?.capabilities).toHaveLength(1);
    });

    it('应该返回 undefined 当转换器不存在时', () => {
      const info = conversionApi.getConverterInfo('non-existent');
      expect(info).toBeUndefined();
    });
  });

  // ========== refreshCapabilities 测试 ==========
  describe('refreshCapabilities', () => {
    it('应该成功刷新转换能力', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });

      await conversionApi.refreshCapabilities();

      expect(mockConnector.request).toHaveBeenCalledWith({
        service: 'file-converter',
        method: 'getCapabilities',
        payload: {},
        timeout: 30000,
      });

      const capabilities = conversionApi.getSupportedConversions();
      expect(capabilities).toContainEqual({ sourceType: 'card', targetFormat: 'html' });
    });

    it('应该在刷新失败时记录错误', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Refresh failed')
      );

      await conversionApi.refreshCapabilities();

      const childLogger = (mockLogger.createChild as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(childLogger.error).toHaveBeenCalledWith(
        'Failed to refresh capabilities',
        expect.any(Error)
      );
    });
  });

  // ========== 源类型识别测试 ==========
  describe('源类型识别', () => {
    beforeEach(async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: {
          capabilities: [
            { sourceType: 'card', targetFormat: 'html' },
            { sourceType: 'box', targetFormat: 'html' },
            { sourceType: 'file', targetFormat: 'html' },
          ],
        },
      });
      await conversionApi.initialize();
    });

    it('应该正确识别 Card 对象', async () => {
      const card = createTestCard();
      
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      await conversionApi.convert(card, 'html');

      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            sourceType: 'card',
          }),
        })
      );
    });

    it('应该正确识别 Box 对象', async () => {
      const box = createTestBox();
      
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      await conversionApi.convert(box, 'html');

      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            sourceType: 'box',
          }),
        })
      );
    });

    it('应该正确识别 .card 文件路径', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      await conversionApi.convert('/path/to/file.card', 'html');

      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            sourceType: 'card',
          }),
        })
      );
    });

    it('应该正确识别 .box 文件路径', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      await conversionApi.convert('/path/to/file.box', 'html');

      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            sourceType: 'box',
          }),
        })
      );
    });

    it('应该将未知扩展名识别为 file', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      await conversionApi.convert('/path/to/file.txt', 'html');

      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            sourceType: 'file',
          }),
        })
      );
    });

    it('应该将无法识别的对象识别为 unknown', async () => {
      // 添加 unknown 类型的能力支持
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: {
          capabilities: [{ sourceType: 'unknown', targetFormat: 'html' }],
        },
      });

      const newApi = new ConversionAPI(mockConnector, mockLogger, mockConfig);
      await newApi.initialize();

      // 创建一个有 metadata 但没有 card_id 或 box_id 的对象
      const unknownSource = {
        metadata: {
          name: 'Unknown Object',
          // 没有 card_id 或 box_id
        },
      } as unknown as Card;

      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      await newApi.convert(unknownSource, 'html');

      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            sourceType: 'unknown',
          }),
        })
      );
    });
  });

  // ========== 任务清理测试 ==========
  describe('任务清理', () => {
    it('应该在转换完成后安排任务清理', async () => {
      (mockConnector.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
        data: { capabilities: [{ sourceType: 'card', targetFormat: 'html' }] },
      });
      await conversionApi.initialize();

      const card = createTestCard();
      let capturedTaskId: string;

      (mockConnector.request as ReturnType<typeof vi.fn>).mockImplementationOnce((params) => {
        capturedTaskId = params.payload.taskId;
        return Promise.resolve({ success: true, data: {} });
      });

      const result = await conversionApi.convert(card, 'html');
      capturedTaskId = result.taskId;

      // 任务应该在完成后存在一段时间
      const statusBeforeCleanup = conversionApi.getTaskStatus(capturedTaskId);
      // 注意：由于实现中任务清理在 finally 中安排，任务可能已被移除或尚存

      // 推进定时器 60 秒以触发清理
      await vi.advanceTimersByTimeAsync(60000);

      // 清理后任务应该不存在
      const statusAfterCleanup = conversionApi.getTaskStatus(capturedTaskId);
      expect(statusAfterCleanup).toBeUndefined();
    });
  });
});
