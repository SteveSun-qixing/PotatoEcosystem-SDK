/**
 * 日志系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '@/core/logger/Logger';
import { LogLevel } from '@/types';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({
      enableConsole: false, // 测试时禁用控制台输出
    });
  });

  describe('日志级别', () => {
    it('应该设置和获取日志级别', () => {
      logger.setLevel(LogLevel.Debug);
      expect(logger.getLevel()).toBe(LogLevel.Debug);

      logger.setLevel(LogLevel.Error);
      expect(logger.getLevel()).toBe(LogLevel.Error);
    });

    it('应该只记录大于等于当前级别的日志', async () => {
      logger.setLevel(LogLevel.Warn);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      const logs = await logger.query();
      expect(logs).toHaveLength(2); // 只有warn和error
      expect(logs[0]?.level).toBe(LogLevel.Warn);
      expect(logs[1]?.level).toBe(LogLevel.Error);
    });
  });

  describe('日志记录', () => {
    it('应该记录debug日志', async () => {
      logger.setLevel(LogLevel.Debug);
      logger.debug('test debug', { key: 'value' });

      const logs = await logger.query();
      expect(logs).toHaveLength(1);
      expect(logs[0]?.level).toBe(LogLevel.Debug);
      expect(logs[0]?.message).toBe('test debug');
      expect(logs[0]?.context).toEqual({ key: 'value' });
    });

    it('应该记录info日志', async () => {
      logger.info('test info');

      const logs = await logger.query();
      expect(logs).toHaveLength(1);
      expect(logs[0]?.level).toBe(LogLevel.Info);
    });

    it('应该记录warn日志', async () => {
      logger.warn('test warn');

      const logs = await logger.query();
      expect(logs).toHaveLength(1);
      expect(logs[0]?.level).toBe(LogLevel.Warn);
    });

    it('应该记录error日志', async () => {
      const error = new Error('test error');
      logger.error('error occurred', error, { action: 'test' });

      const logs = await logger.query();
      expect(logs).toHaveLength(1);
      expect(logs[0]?.level).toBe(LogLevel.Error);
      expect(logs[0]?.error).toBe(error);
    });
  });

  describe('日志查询', () => {
    beforeEach(() => {
      logger.setLevel(LogLevel.Debug);
      logger.debug('debug 1');
      logger.info('info 1');
      logger.warn('warn 1');
      logger.error('error 1');
    });

    it('应该按级别过滤', async () => {
      const logs = await logger.query({ level: LogLevel.Error });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.level).toBe(LogLevel.Error);
    });

    it('应该按关键词搜索', async () => {
      const logs = await logger.query({ search: 'warn' });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.message).toContain('warn');
    });

    it('应该限制返回数量', async () => {
      const logs = await logger.query({ limit: 2 });
      expect(logs).toHaveLength(2);
    });
  });

  describe('日志统计', () => {
    it('应该返回正确的统计信息', () => {
      logger.setLevel(LogLevel.Debug);
      logger.debug('debug');
      logger.info('info');
      logger.info('info 2');
      logger.warn('warn');
      logger.error('error');

      const stats = logger.getStats();
      expect(stats.total).toBe(5);
      expect(stats.debug).toBe(1);
      expect(stats.info).toBe(2);
      expect(stats.warn).toBe(1);
      expect(stats.error).toBe(1);
    });
  });

  describe('清除日志', () => {
    it('应该清除所有日志', async () => {
      logger.info('test 1');
      logger.info('test 2');

      await logger.clear();

      const logs = await logger.query();
      expect(logs).toHaveLength(0);
    });
  });
});
