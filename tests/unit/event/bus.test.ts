/**
 * EventBus 单元测试
 * @module tests/unit/event/bus
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../../../src/event/bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  afterEach(() => {
    bus.clear();
  });

  describe('事件订阅/取消', () => {
    it('on 方法应返回订阅 ID', () => {
      const id = bus.on('test', () => {});
      
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('应该能够订阅事件', () => {
      const handler = vi.fn();
      bus.on('test', handler);
      
      expect(bus.hasListeners('test')).toBe(true);
      expect(bus.listenerCount('test')).toBe(1);
    });

    it('应该能够订阅多个处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      bus.on('test', handler1);
      bus.on('test', handler2);
      
      expect(bus.listenerCount('test')).toBe(2);
    });

    it('off 方法应通过处理器取消订阅', async () => {
      const handler = vi.fn();
      bus.on('test', handler);
      
      bus.off('test', handler);
      await bus.emit('test', {});
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('off 方法应通过订阅 ID 取消订阅', async () => {
      const handler = vi.fn();
      const id = bus.on('test', handler);
      
      bus.off('test', id);
      await bus.emit('test', {});
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('off 不传参数时应取消该事件的所有订阅', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      bus.on('test', handler1);
      bus.on('test', handler2);
      
      bus.off('test');
      await bus.emit('test', {});
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(bus.hasListeners('test')).toBe(false);
    });

    it('取消不存在的订阅不应抛出错误', () => {
      expect(() => {
        bus.off('nonexistent');
        bus.off('nonexistent', () => {});
        bus.off('nonexistent', 'fake-id');
      }).not.toThrow();
    });

    it('removeAllListeners 应清除指定事件的所有监听器', () => {
      bus.on('event1', () => {});
      bus.on('event2', () => {});
      
      bus.removeAllListeners('event1');
      
      expect(bus.hasListeners('event1')).toBe(false);
      expect(bus.hasListeners('event2')).toBe(true);
    });

    it('removeAllListeners 不传参数应清除所有监听器', () => {
      bus.on('event1', () => {});
      bus.on('event2', () => {});
      
      bus.removeAllListeners();
      
      expect(bus.hasListeners('event1')).toBe(false);
      expect(bus.hasListeners('event2')).toBe(false);
    });

    it('clear 应清除所有订阅', () => {
      bus.on('event1', () => {});
      bus.on('event2', () => {});
      
      bus.clear();
      
      expect(bus.eventNames().length).toBe(0);
    });
  });

  describe('事件发布（同步/异步）', () => {
    it('emit 应触发所有订阅的处理器', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      bus.on('test', handler1);
      bus.on('test', handler2);
      
      await bus.emit('test', { value: 'data' });
      
      expect(handler1).toHaveBeenCalledWith({ value: 'data' });
      expect(handler2).toHaveBeenCalledWith({ value: 'data' });
    });

    it('emit 应支持异步处理器', async () => {
      const results: number[] = [];
      
      bus.on('test', async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(1);
      });
      bus.on('test', async () => {
        results.push(2);
      });
      
      await bus.emit('test', {});
      
      // 默认异步模式下，处理器按顺序等待
      expect(results).toEqual([1, 2]);
    });

    it('emitSync 应同步触发处理器', () => {
      const handler = vi.fn();
      bus.on('test', handler);
      
      bus.emitSync('test', { value: 'sync-data' });
      
      expect(handler).toHaveBeenCalledWith({ value: 'sync-data' });
    });

    it('emitSync 不应等待异步处理器完成', () => {
      let completed = false;
      bus.on('test', async () => {
        await new Promise((r) => setTimeout(r, 100));
        completed = true;
      });
      
      bus.emitSync('test', {});
      
      // 同步调用后立即检查，异步操作尚未完成
      expect(completed).toBe(false);
    });

    it('处理器错误不应影响其他处理器', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorHandler = vi.fn(() => {
        throw new Error('handler error');
      });
      const normalHandler = vi.fn();
      
      bus.on('test', errorHandler);
      bus.on('test', normalHandler);
      
      await bus.emit('test', {});
      
      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });

    it('发布到没有订阅的事件不应抛出错误', async () => {
      await expect(bus.emit('nonexistent', {})).resolves.not.toThrow();
    });

    it('通配符订阅应接收所有事件', async () => {
      const handler = vi.fn();
      bus.on('*', handler);
      
      await bus.emit('event1', { type: 1 });
      await bus.emit('event2', { type: 2 });
      
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith({ type: 1 });
      expect(handler).toHaveBeenCalledWith({ type: 2 });
    });
  });

  describe('once 一次性订阅', () => {
    it('once 订阅只应触发一次', async () => {
      const handler = vi.fn();
      bus.once('test', handler);
      
      await bus.emit('test', { value: 1 });
      await bus.emit('test', { value: 2 });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ value: 1 });
    });

    it('once 应返回订阅 ID', () => {
      const id = bus.once('test', () => {});
      
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('once 订阅可以在触发前取消', async () => {
      const handler = vi.fn();
      const id = bus.once('test', handler);
      
      bus.off('test', id);
      await bus.emit('test', {});
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('emitSync 也应正确处理 once 订阅', () => {
      const handler = vi.fn();
      bus.once('test', handler);
      
      bus.emitSync('test', { value: 1 });
      bus.emitSync('test', { value: 2 });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('多个 once 订阅应各自独立', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      bus.once('test', handler1);
      bus.once('test', handler2);
      
      await bus.emit('test', {});
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(bus.listenerCount('test')).toBe(0);
    });
  });

  describe('waitFor 等待事件', () => {
    it('waitFor 应返回事件数据', async () => {
      setTimeout(() => {
        bus.emit('test', { value: 'waited' });
      }, 10);
      
      const result = await bus.waitFor<{ value: string }>('test');
      
      expect(result).toEqual({ value: 'waited' });
    });

    it('waitFor 超时应抛出错误', async () => {
      await expect(bus.waitFor('test', 50)).rejects.toThrow('Timeout waiting for event: test');
    });

    it('waitFor 应自动清理订阅', async () => {
      const countBefore = bus.listenerCount('test');
      
      setTimeout(() => {
        bus.emit('test', {});
      }, 10);
      
      await bus.waitFor('test');
      
      // 等待 emit 方法完成 once 订阅的清理
      await new Promise((r) => setTimeout(r, 10));
      
      const countAfter = bus.listenerCount('test');
      expect(countAfter).toBe(countBefore);
    });

    it('waitFor 超时后应清理订阅', async () => {
      const countBefore = bus.listenerCount('test');
      
      try {
        await bus.waitFor('test', 10);
      } catch {
        // 预期超时
      }
      
      // 等待一小段时间确保清理完成
      await new Promise((r) => setTimeout(r, 20));
      
      const countAfter = bus.listenerCount('test');
      expect(countAfter).toBe(countBefore);
    });

    it('waitFor 不设置超时应无限等待', async () => {
      const promise = bus.waitFor('test');
      
      // 延迟发送事件
      setTimeout(() => {
        bus.emit('test', { done: true });
      }, 50);
      
      const result = await promise;
      expect(result).toEqual({ done: true });
    });
  });

  describe('辅助方法', () => {
    it('hasListeners 应正确报告是否有监听器', () => {
      expect(bus.hasListeners('test')).toBe(false);
      
      bus.on('test', () => {});
      expect(bus.hasListeners('test')).toBe(true);
      
      bus.off('test');
      expect(bus.hasListeners('test')).toBe(false);
    });

    it('listenerCount 应返回正确的监听器数量', () => {
      expect(bus.listenerCount('test')).toBe(0);
      
      bus.on('test', () => {});
      bus.on('test', () => {});
      expect(bus.listenerCount('test')).toBe(2);
    });

    it('eventNames 应返回所有注册的事件名', () => {
      bus.on('event1', () => {});
      bus.on('event2', () => {});
      bus.on('event3', () => {});
      
      const names = bus.eventNames();
      
      expect(names).toContain('event1');
      expect(names).toContain('event2');
      expect(names).toContain('event3');
      expect(names.length).toBe(3);
    });

    it('eventNames 没有订阅时应返回空数组', () => {
      expect(bus.eventNames()).toEqual([]);
    });
  });

  describe('配置选项', () => {
    it('maxListeners 应限制单个事件的监听器数量', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const limitedBus = new EventBus({ maxListeners: 2 });
      
      limitedBus.on('test', () => {});
      limitedBus.on('test', () => {});
      limitedBus.on('test', () => {}); // 应该触发警告
      
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });

    it('async: false 时 emit 应同步执行', async () => {
      const syncBus = new EventBus({ async: false });
      const results: number[] = [];
      
      syncBus.on('test', () => {
        results.push(1);
      });
      syncBus.on('test', () => {
        results.push(2);
      });
      
      await syncBus.emit('test', {});
      
      expect(results).toEqual([1, 2]);
    });
  });

  describe('类型安全', () => {
    it('应支持泛型事件数据', async () => {
      interface UserData {
        id: string;
        name: string;
      }
      
      const handler = vi.fn<[UserData], void>();
      bus.on<UserData>('user:created', handler);
      
      await bus.emit<UserData>('user:created', { id: '1', name: 'John' });
      
      expect(handler).toHaveBeenCalledWith({ id: '1', name: 'John' });
    });

    it('waitFor 应支持泛型返回类型', async () => {
      interface EventPayload {
        status: string;
      }
      
      setTimeout(() => {
        bus.emit('complete', { status: 'success' });
      }, 10);
      
      const result = await bus.waitFor<EventPayload>('complete');
      
      expect(result.status).toBe('success');
    });
  });
});
