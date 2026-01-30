/**
 * 异步工具函数测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, delay, withTimeout, retry } from '@/utils/async';

describe('async utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debounce', () => {
    it('应该延迟执行函数', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该取消之前的调用', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('应该限制函数执行频率', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('delay', () => {
    it('应该延迟指定时间', async () => {
      vi.useRealTimers();
      const start = Date.now();
      await delay(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(90);
      expect(duration).toBeLessThan(150);
    });
  });

  describe('withTimeout', () => {
    it('应该在超时前返回结果', async () => {
      vi.useRealTimers();
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('应该在超时后抛出错误', async () => {
      vi.useRealTimers();
      const promise = new Promise((resolve) => setTimeout(resolve, 200));
      
      await expect(withTimeout(promise, 100, 'Timeout!')).rejects.toThrow(
        'Timeout!'
      );
    });
  });

  describe('retry', () => {
    it('应该在第一次成功时返回结果', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该重试失败的操作', async () => {
      vi.useRealTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retry(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大尝试次数后抛出错误', async () => {
      vi.useRealTimers();
      const error = new Error('Always fails');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(retry(fn, 3, 10)).rejects.toThrow('Always fails');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
