/**
 * ConversionAPI 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversionAPI } from '../../../src/api/conversion-api';
import type { BridgeClient } from '../../../src/bridge';
import type { Logger } from '../../../src/logger/logger';
import type { ConfigManager } from '../../../src/config/manager';
import { createMockConnector, createMockLogger, createMockConfig } from '../../helpers';

describe('ConversionAPI', () => {
  let conversionApi: ConversionAPI;
  let mockConnector: BridgeClient;
  let mockLogger: Logger;
  let mockConfig: ConfigManager;

  beforeEach(() => {
    mockConnector = createMockConnector();
    mockLogger = createMockLogger();
    mockConfig = createMockConfig();
    conversionApi = new ConversionAPI(mockConnector, mockLogger, mockConfig);
  });

  describe('convertToHTML', () => {
    it('should convert card to HTML through CoreConnector', async () => {
      // 模拟成功响应
      vi.spyOn(mockConnector, 'request').mockResolvedValue({
        success: true,
        data: {
          success: true,
          taskId: 'test-task-123',
          outputPath: '/output/test.html',
          stats: {
            duration: 1000,
            inputSize: 1024,
            outputSize: 2048,
          },
        },
      });

      const source = {
        type: 'path' as const,
        path: '/test/card.card',
        fileType: 'card',
      };

      const result = await conversionApi.convertToHTML(source, {
        outputPath: '/output/test.html',
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/test.html');
      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'conversion',
          method: 'convert',
          payload: expect.objectContaining({
            targetType: 'html',
          }),
        })
      );
    });

    it('should handle conversion failure', async () => {
      vi.spyOn(mockConnector, 'request').mockResolvedValue({
        success: false,
        error: 'HTML conversion failed',
      });

      const source = {
        type: 'path' as const,
        path: '/test/card.card',
        fileType: 'card',
      };

      const result = await conversionApi.convertToHTML(source);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('CONV-001');
    });
  });

  describe('convertToImage', () => {
    it('should convert card to image through CoreConnector', async () => {
      vi.spyOn(mockConnector, 'request').mockResolvedValue({
        success: true,
        data: {
          success: true,
          taskId: 'test-task-456',
          outputPath: '/output/test.png',
        },
      });

      const source = {
        type: 'path' as const,
        path: '/test/card.card',
        fileType: 'card',
      };

      const result = await conversionApi.convertToImage(source, {
        format: 'png',
        scale: 2,
      });

      expect(result.success).toBe(true);
      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'conversion',
          method: 'convert',
          payload: expect.objectContaining({
            targetType: 'image',
          }),
        })
      );
    });
  });

  describe('convertToPDF', () => {
    it('should convert card to PDF through CoreConnector', async () => {
      vi.spyOn(mockConnector, 'request').mockResolvedValue({
        success: true,
        data: {
          success: true,
          taskId: 'test-task-789',
          outputPath: '/output/test.pdf',
        },
      });

      const source = {
        type: 'path' as const,
        path: '/test/card.card',
        fileType: 'card',
      };

      const result = await conversionApi.convertToPDF(source, {
        pageFormat: 'a4',
        orientation: 'portrait',
      });

      expect(result.success).toBe(true);
      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'conversion',
          method: 'convert',
          payload: expect.objectContaining({
            targetType: 'pdf',
          }),
        })
      );
    });
  });

  describe('exportAsCard', () => {
    it('should export as .card file through CoreConnector', async () => {
      vi.spyOn(mockConnector, 'request').mockResolvedValue({
        success: true,
        data: {
          success: true,
          taskId: 'test-task-abc',
          outputPath: '/output/test.card',
        },
      });

      const result = await conversionApi.exportAsCard('test-card-id', {
        outputPath: '/output/test.card',
      });

      expect(result.success).toBe(true);
      expect(mockConnector.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'card.pack',
          method: 'pack',
          payload: expect.objectContaining({
            cardId: 'test-card-id',
            outputPath: '/output/test.card',
          }),
        })
      );
    });
  });

  describe('cancelConversion', () => {
    it('should cancel active conversion', async () => {
      // 先启动一个转换（模拟）
      const taskId = 'test-task-xyz';

      vi.spyOn(mockConnector, 'request').mockResolvedValue({
        success: true,
        data: { cancelled: true },
      });

      const cancelled = await conversionApi.cancelConversion(taskId);

      expect(cancelled).toBe(false); // 因为任务不在活动列表中
    });
  });

  describe('getSupportedConversions', () => {
    it('should return supported conversion types', async () => {
      vi.spyOn(mockConnector, 'request').mockResolvedValue({
        success: true,
        data: {
          conversions: [
            { sourceType: 'card', targetType: 'html', description: 'Card to HTML' },
            { sourceType: 'card', targetType: 'pdf', description: 'Card to PDF' },
            { sourceType: 'card', targetType: 'image', description: 'Card to Image' },
          ],
        },
      });

      const conversions = await conversionApi.getSupportedConversions();

      expect(conversions).toHaveLength(3);
      expect(conversions[0].sourceType).toBe('card');
    });

    it('should return default conversions on error', async () => {
      vi.spyOn(mockConnector, 'request').mockRejectedValue(new Error('Network error'));

      const conversions = await conversionApi.getSupportedConversions();

      // 应该返回默认的转换类型
      expect(conversions.length).toBeGreaterThan(0);
    });
  });

  describe('canConvert', () => {
    it('should check if conversion is supported', async () => {
      vi.spyOn(mockConnector, 'request').mockResolvedValue({
        success: true,
        data: {
          conversions: [
            { sourceType: 'card', targetType: 'html' },
            { sourceType: 'card', targetType: 'pdf' },
          ],
        },
      });

      const canConvertHtml = await conversionApi.canConvert('card', 'html');
      const canConvertImage = await conversionApi.canConvert('card', 'image');

      expect(canConvertHtml).toBe(true);
      expect(canConvertImage).toBe(false);
    });
  });
});
