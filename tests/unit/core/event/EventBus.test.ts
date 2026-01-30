/**
 * 事件总线测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '@/core/event/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on', () => {
    it('应该注册事件监听器', () => {
      const listener = vi.fn();
      const subId = eventBus.on('test', listener);

      expect(subId).toMatch(/^sub-\d+$/);
      expect(eventBus.listenerCount('test')).toBe(1);
    });

    it('应该触发监听器', () => {
      const listener = vi.fn();
      eventBus.on('test', listener);

      eventBus.emit('test', 'data1', 'data2');

      expect(listener).toHaveBeenCalledWith('data1', 'data2');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该支持多个监听器', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      eventBus.on('test', listener1);
      eventBus.on('test', listener2);

      eventBus.emit('test', 'data');

      expect(listener1).toHaveBeenCalledWith('data');
      expect(listener2).toHaveBeenCalledWith('data');
    });
  });

  describe('once', () => {
    it('应该只触发一次', () => {
      const listener = vi.fn();
      eventBus.once('test', listener);

      eventBus.emit('test', 'data1');
      eventBus.emit('test', 'data2');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('data1');
    });
  });

  describe('off', () => {
    it('应该取消订阅', () => {
      const listener = vi.fn();
      const subId = eventBus.on('test', listener);

      eventBus.off(subId);
      eventBus.emit('test', 'data');

      expect(listener).not.toHaveBeenCalled();
      expect(eventBus.listenerCount('test')).toBe(0);
    });
  });

  describe('offAll', () => {
    it('应该取消所有订阅', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      eventBus.on('test', listener1);
      eventBus.on('test', listener2);

      eventBus.offAll('test');
      eventBus.emit('test', 'data');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('应该返回是否有监听器', () => {
      expect(eventBus.emit('nonexistent')).toBe(false);

      eventBus.on('test', () => {});
      expect(eventBus.emit('test')).toBe(true);
    });
  });

  describe('eventNames', () => {
    it('应该返回所有事件名称', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});

      const names = eventBus.eventNames();
      expect(names).toContain('event1');
      expect(names).toContain('event2');
    });
  });

  describe('clear', () => {
    it('应该清除所有监听器', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});

      eventBus.clear();

      expect(eventBus.listenerCount()).toBe(0);
      expect(eventBus.eventNames()).toHaveLength(0);
    });
  });

  describe('getSubscriptions', () => {
    it('应该获取所有订阅', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});

      const subs = eventBus.getSubscriptions();
      expect(subs).toHaveLength(2);
    });

    it('应该按事件名过滤订阅', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});

      const subs = eventBus.getSubscriptions('event1');
      expect(subs).toHaveLength(2);
      expect(subs.every((s) => s.event === 'event1')).toBe(true);
    });
  });
});
