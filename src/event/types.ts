/**
 * 事件类型定义
 * @module event/types
 */

/**
 * 事件数据
 */
export interface EventData {
  /** 事件类型 */
  type: string;
  /** 事件源 */
  source: string;
  /** 时间戳 */
  timestamp: string;
  /** 数据 */
  data: Record<string, unknown>;
}

/**
 * 事件处理器
 */
export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

/**
 * 事件订阅
 */
export interface EventSubscription {
  /** 订阅 ID */
  id: string;
  /** 事件类型 */
  eventType: string;
  /** 处理器 */
  handler: EventHandler;
  /** 是否一次性 */
  once: boolean;
}

/**
 * 事件总线选项
 */
export interface EventBusOptions {
  /** 最大监听器数量 */
  maxListeners?: number;
  /** 是否异步执行 */
  async?: boolean;
}
