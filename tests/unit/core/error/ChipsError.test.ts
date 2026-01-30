/**
 * 错误类测试
 */

import { describe, it, expect } from 'vitest';
import {
  ChipsError,
  FileNotFoundError,
  ParseError,
  ValidationError,
  NetworkError,
  PermissionError,
} from '@/core/error';

describe('ChipsError', () => {
  describe('基础错误', () => {
    it('应该创建错误实例', () => {
      const error = new ChipsError('TEST-001', 'Test error', { key: 'value' });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ChipsError);
      expect(error.code).toBe('TEST-001');
      expect(error.message).toBe('Test error');
      expect(error.details).toEqual({ key: 'value' });
      expect(error.name).toBe('ChipsError');
    });

    it('应该包含堆栈跟踪', () => {
      const error = new ChipsError('TEST-001', 'Test error');
      expect(error.stack).toBeDefined();
    });

    it('应该转换为JSON', () => {
      const error = new ChipsError('TEST-001', 'Test error', { key: 'value' });
      const json = error.toJSON();

      expect(json.name).toBe('ChipsError');
      expect(json.code).toBe('TEST-001');
      expect(json.message).toBe('Test error');
      expect(json.details).toEqual({ key: 'value' });
    });
  });

  describe('特定错误类型', () => {
    it('FileNotFoundError', () => {
      const error = new FileNotFoundError('/path/to/file.card');

      expect(error).toBeInstanceOf(ChipsError);
      expect(error.name).toBe('FileNotFoundError');
      expect(error.code).toBe('SYS-9001');
    });

    it('ParseError', () => {
      const error = new ParseError('Invalid JSON');

      expect(error).toBeInstanceOf(ChipsError);
      expect(error.name).toBe('ParseError');
      expect(error.code).toBe('SYS-9004');
    });

    it('ValidationError', () => {
      const error = new ValidationError('Invalid card data');

      expect(error).toBeInstanceOf(ChipsError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VAL-1004');
    });

    it('NetworkError', () => {
      const error = new NetworkError('Connection failed');

      expect(error).toBeInstanceOf(ChipsError);
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('SYS-9005');
    });

    it('PermissionError', () => {
      const error = new PermissionError('Access denied');

      expect(error).toBeInstanceOf(ChipsError);
      expect(error.name).toBe('PermissionError');
      expect(error.code).toBe('PERMISSION-001');
    });
  });

  describe('错误捕获', () => {
    it('应该能被try-catch捕获', () => {
      expect(() => {
        throw new ChipsError('TEST-001', 'Test error');
      }).toThrow(ChipsError);
    });

    it('应该能通过instanceof判断', () => {
      try {
        throw new FileNotFoundError('/file.card');
      } catch (error) {
        expect(error).toBeInstanceOf(ChipsError);
        expect(error).toBeInstanceOf(FileNotFoundError);
      }
    });
  });
});
