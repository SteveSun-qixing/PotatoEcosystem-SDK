import { describe, it, expect } from 'vitest';
import {
  ChipsError,
  ConnectionError,
  TimeoutError,
  FileError,
  ValidationError,
} from '../../../src/core/errors';

describe('错误类', () => {
  describe('ChipsError', () => {
    it('应该创建错误实例', () => {
      const error = new ChipsError('TEST-001', 'Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ChipsError);
      expect(error.code).toBe('TEST-001');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ChipsError');
    });

    it('应该支持详情参数', () => {
      const error = new ChipsError('TEST-001', 'Test error', { key: 'value' });
      expect(error.details).toEqual({ key: 'value' });
    });

    it('应该支持 JSON 序列化', () => {
      const error = new ChipsError('TEST-001', 'Test error', { key: 'value' });
      const json = error.toJSON();
      expect(json).toEqual({
        name: 'ChipsError',
        code: 'TEST-001',
        message: 'Test error',
        details: { key: 'value' },
      });
    });

    it('应该支持 toString', () => {
      const error = new ChipsError('TEST-001', 'Test error');
      expect(error.toString()).toBe('[TEST-001] Test error');
    });
  });

  describe('ConnectionError', () => {
    it('应该使用正确的错误码', () => {
      const error = new ConnectionError('Connection failed');
      expect(error.code).toBe('CONN-1001');
      expect(error.name).toBe('ConnectionError');
      expect(error).toBeInstanceOf(ChipsError);
    });
  });

  describe('TimeoutError', () => {
    it('应该使用正确的错误码', () => {
      const error = new TimeoutError('Operation timed out');
      expect(error.code).toBe('CONN-1002');
      expect(error.name).toBe('TimeoutError');
      expect(error).toBeInstanceOf(ChipsError);
    });
  });

  describe('FileError', () => {
    it('应该使用自定义错误码', () => {
      const error = new FileError('FILE-1001', 'File not found');
      expect(error.code).toBe('FILE-1001');
      expect(error.name).toBe('FileError');
      expect(error).toBeInstanceOf(ChipsError);
    });
  });

  describe('ValidationError', () => {
    it('应该使用正确的错误码', () => {
      const error = new ValidationError('Invalid input');
      expect(error.code).toBe('VAL-1001');
      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(ChipsError);
    });
  });
});
