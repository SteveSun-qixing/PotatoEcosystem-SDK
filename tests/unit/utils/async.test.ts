import { describe, it, expect, vi } from 'vitest';
import {
  delay,
  withTimeout,
  retry,
  concurrent,
  debounce,
  throttle,
} from '../../../src/utils/async';

describe('异步工具', () => {
  describe('delay', () => {
    it('应该延迟指定时间', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(95);
    });
  });

  describe('withTimeout', () => {
    it('应该在超时前返回结果', async () => {
      const result = await withTimeout(Promise.resolve('success'), 1000);
      expect(result).toBe('success');
    });

    it('应该在超时后抛出错误', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(() => resolve('done'), 200));
      await expect(withTimeout(slowPromise, 50)).rejects.toThrow('timed out');
    });

    it('应该使用自定义错误', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(() => resolve('done'), 200));
      const customError = new Error('Custom timeout');
      await expect(withTimeout(slowPromise, 50, customError)).rejects.toThrow('Custom timeout');
    });
  });

  describe('retry', () => {
    it('应该在成功时返回结果', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn, { maxRetries: 3 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该重试失败的操作', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await retry(fn, { maxRetries: 3, delayMs: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fail'));

      await expect(retry(fn, { maxRetries: 3, delayMs: 10 })).rejects.toThrow('always fail');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('应该调用 onRetry 回调', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');
      const onRetry = vi.fn();

      await retry(fn, { maxRetries: 3, delayMs: 10, onRetry });
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent', () => {
    it('应该并发执行任务', async () => {
      const tasks = [
        () => Promise.resolve(1),
        () => Promise.resolve(2),
        () => Promise.resolve(3),
      ];

      const results = await concurrent(tasks, 2);
      expect(results).toEqual([1, 2, 3]);
    });

    it('应该限制并发数', async () => {
      let running = 0;
      let maxRunning = 0;

      const tasks = Array(5)
        .fill(null)
        .map(
          () => async () => {
            running++;
            maxRunning = Math.max(maxRunning, running);
            await delay(10);
            running--;
            return true;
          }
        );

      await concurrent(tasks, 2);
      expect(maxRunning).toBeLessThanOrEqual(2);
    });
  });

  describe('debounce', () => {
    it('应该防抖函数调用', async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 50);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      await delay(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('应该节流函数调用 - 首次立即执行', async () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      // 第一次调用立即执行
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      // 在节流时间内的调用会被延迟
      throttled();
      throttled();
      
      // 立即检查，应该仍然是 1 次
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该在节流时间后允许再次调用', async () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 50);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
      
      // 等待节流时间过去
      await delay(100);
      
      throttled();
      // 应该允许再次执行
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
