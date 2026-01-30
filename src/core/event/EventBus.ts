/**
 * 事件总线
 *
 * 提供发布-订阅模式的事件系统，用于模块间通信
 */

import EventEmitter from 'eventemitter3';
import type { EventListener } from '../../types';

/**
 * 事件订阅项
 */
interface Subscription {
  id: string;
  event: string;
  listener: EventListener;
  once: boolean;
}

/**
 * 事件总线类
 */
export class EventBus {
  private emitter: EventEmitter;
  private subscriptions: Map<string, Subscription>;
  private subscriptionCounter: number;

  constructor() {
    this.emitter = new EventEmitter();
    this.subscriptions = new Map();
    this.subscriptionCounter = 0;
  }

  /**
   * 订阅事件
   * @param event 事件名称
   * @param listener 监听器函数
   * @returns 订阅ID
   */
  on(event: string, listener: EventListener): string {
    const subscriptionId = `sub-${++this.subscriptionCounter}`;

    this.emitter.on(event, listener);

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      event,
      listener,
      once: false,
    });

    return subscriptionId;
  }

  /**
   * 订阅事件（仅触发一次）
   * @param event 事件名称
   * @param listener 监听器函数
   * @returns 订阅ID
   */
  once(event: string, listener: EventListener): string {
    const subscriptionId = `sub-${++this.subscriptionCounter}`;

    const wrappedListener = (...args: unknown[]) => {
      listener(...args);
      this.subscriptions.delete(subscriptionId);
    };

    this.emitter.once(event, wrappedListener);

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      event,
      listener: wrappedListener,
      once: true,
    });

    return subscriptionId;
  }

  /**
   * 取消订阅（通过订阅ID）
   * @param subscriptionId 订阅ID
   */
  off(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      this.emitter.off(subscription.event, subscription.listener);
      this.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * 取消所有订阅某事件的监听器
   * @param event 事件名称
   */
  offAll(event: string): void {
    // 找到所有订阅该事件的订阅项
    const toDelete: string[] = [];

    for (const [id, subscription] of this.subscriptions) {
      if (subscription.event === event) {
        toDelete.push(id);
      }
    }

    // 删除订阅
    for (const id of toDelete) {
      this.off(id);
    }
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param args 事件参数
   * @returns 是否有监听器
   */
  emit(event: string, ...args: unknown[]): boolean {
    return this.emitter.emit(event, ...args);
  }

  /**
   * 获取事件监听器数量
   * @param event 事件名称（可选）
   * @returns 监听器数量
   */
  listenerCount(event?: string): number {
    if (event) {
      return this.emitter.listenerCount(event);
    }

    // 返回所有事件的监听器总数
    return this.subscriptions.size;
  }

  /**
   * 获取所有事件名称
   * @returns 事件名称数组
   */
  eventNames(): string[] {
    return this.emitter.eventNames() as string[];
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.emitter.removeAllListeners();
    this.subscriptions.clear();
  }

  /**
   * 获取订阅列表
   * @param event 事件名称（可选，不提供则返回所有订阅）
   * @returns 订阅信息数组
   */
  getSubscriptions(event?: string): Array<{ id: string; event: string }> {
    const result: Array<{ id: string; event: string }> = [];

    for (const subscription of this.subscriptions.values()) {
      if (!event || subscription.event === event) {
        result.push({
          id: subscription.id,
          event: subscription.event,
        });
      }
    }

    return result;
  }
}

/**
 * 全局事件总线实例
 */
let globalEventBus: EventBus | null = null;

/**
 * 获取全局事件总线
 * @returns 事件总线实例
 */
export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

/**
 * 设置全局事件总线
 * @param eventBus 事件总线实例
 */
export function setGlobalEventBus(eventBus: EventBus): void {
  globalEventBus = eventBus;
}
