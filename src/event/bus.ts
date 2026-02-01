/**
 * 事件总线
 * @module event/bus
 */

import { EventHandler, EventSubscription, EventBusOptions } from './types';
import { generateUuid } from '../utils/id';

/**
 * 默认选项
 */
const DEFAULT_OPTIONS: Required<EventBusOptions> = {
  maxListeners: 100,
  async: true,
};

/**
 * 事件总线
 *
 * @example
 * ```ts
 * const bus = new EventBus();
 *
 * bus.on('user:login', (data) => {
 *   console.log('User logged in:', data);
 * });
 *
 * await bus.emit('user:login', { userId: '123' });
 * ```
 */
export class EventBus {
  private _subscriptions = new Map<string, Set<EventSubscription>>();
  private _options: Required<EventBusOptions>;

  /**
   * 创建事件总线
   * @param options - 配置选项
   */
  constructor(options?: EventBusOptions) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 订阅事件
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @returns 订阅 ID
   */
  on<T = unknown>(eventType: string, handler: EventHandler<T>): string {
    return this._subscribe(eventType, handler as EventHandler, false);
  }

  /**
   * 一次性订阅
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @returns 订阅 ID
   */
  once<T = unknown>(eventType: string, handler: EventHandler<T>): string {
    return this._subscribe(eventType, handler as EventHandler, true);
  }

  /**
   * 取消订阅
   * @param eventType - 事件类型
   * @param handlerOrId - 处理器或订阅 ID
   */
  off(eventType: string, handlerOrId?: EventHandler | string): void {
    const subs = this._subscriptions.get(eventType);
    if (!subs) return;

    if (!handlerOrId) {
      this._subscriptions.delete(eventType);
      return;
    }

    for (const sub of subs) {
      if (
        (typeof handlerOrId === 'string' && sub.id === handlerOrId) ||
        (typeof handlerOrId === 'function' && sub.handler === handlerOrId)
      ) {
        subs.delete(sub);
        break;
      }
    }

    // 如果没有订阅了，删除整个事件类型
    if (subs.size === 0) {
      this._subscriptions.delete(eventType);
    }
  }

  /**
   * 发布事件（异步）
   * @param eventType - 事件类型
   * @param data - 事件数据
   */
  async emit<T = unknown>(eventType: string, data: T): Promise<void> {
    const subs = this._subscriptions.get(eventType);
    const wildcardSubs = this._subscriptions.get('*');
    const toRemove: EventSubscription[] = [];

    // 处理订阅
    const processSubscriptions = async (
      subscriptions: Set<EventSubscription> | undefined
    ): Promise<void> => {
      if (!subscriptions) return;

      for (const sub of subscriptions) {
        try {
          if (this._options.async) {
            await sub.handler(data);
          } else {
            sub.handler(data);
          }

          if (sub.once) {
            toRemove.push(sub);
          }
        } catch (error) {
          console.error(`[EventBus] Handler error for ${eventType}:`, error);
        }
      }
    };

    await processSubscriptions(subs);
    await processSubscriptions(wildcardSubs);

    // 移除一次性订阅
    for (const sub of toRemove) {
      this._subscriptions.get(sub.eventType)?.delete(sub);
    }
  }

  /**
   * 同步发布事件
   * @param eventType - 事件类型
   * @param data - 事件数据
   */
  emitSync<T = unknown>(eventType: string, data: T): void {
    const subs = this._subscriptions.get(eventType);
    const wildcardSubs = this._subscriptions.get('*');
    const toRemove: EventSubscription[] = [];

    const processSubscriptions = (subscriptions: Set<EventSubscription> | undefined): void => {
      if (!subscriptions) return;

      for (const sub of subscriptions) {
        try {
          sub.handler(data);
          if (sub.once) {
            toRemove.push(sub);
          }
        } catch (error) {
          console.error(`[EventBus] Handler error for ${eventType}:`, error);
        }
      }
    };

    processSubscriptions(subs);
    processSubscriptions(wildcardSubs);

    for (const sub of toRemove) {
      this._subscriptions.get(sub.eventType)?.delete(sub);
    }
  }

  /**
   * 检查是否有订阅
   * @param eventType - 事件类型
   */
  hasListeners(eventType: string): boolean {
    return (this._subscriptions.get(eventType)?.size ?? 0) > 0;
  }

  /**
   * 获取订阅数量
   * @param eventType - 事件类型
   */
  listenerCount(eventType: string): number {
    return this._subscriptions.get(eventType)?.size ?? 0;
  }

  /**
   * 获取所有事件类型
   */
  eventNames(): string[] {
    return Array.from(this._subscriptions.keys());
  }

  /**
   * 清除所有订阅
   */
  clear(): void {
    this._subscriptions.clear();
  }

  /**
   * 清除指定事件的所有订阅
   * @param eventType - 事件类型
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this._subscriptions.delete(eventType);
    } else {
      this._subscriptions.clear();
    }
  }

  /**
   * 等待事件发生
   * @param eventType - 事件类型
   * @param timeout - 超时时间（毫秒）
   */
  waitFor<T = unknown>(eventType: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      let subscriptionId: string | undefined;

      const handler = (data: unknown): void => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(data as T);
      };

      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      if (timeout) {
        timeoutId = setTimeout(() => {
          if (subscriptionId) {
            this.off(eventType, subscriptionId);
          }
          reject(new Error(`Timeout waiting for event: ${eventType}`));
        }, timeout);
      }

      subscriptionId = this.once(eventType, handler);
    });
  }

  /**
   * 内部订阅方法
   */
  private _subscribe(eventType: string, handler: EventHandler, once: boolean): string {
    if (!this._subscriptions.has(eventType)) {
      this._subscriptions.set(eventType, new Set());
    }

    const subs = this._subscriptions.get(eventType)!;

    if (subs.size >= this._options.maxListeners) {
      console.warn(`[EventBus] Max listeners (${this._options.maxListeners}) reached for: ${eventType}`);
    }

    const subscription: EventSubscription = {
      id: generateUuid(),
      eventType,
      handler,
      once,
    };

    subs.add(subscription);
    return subscription.id;
  }
}
