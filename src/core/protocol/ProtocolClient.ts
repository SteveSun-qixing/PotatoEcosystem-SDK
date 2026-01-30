/**
 * 薯片协议客户端
 *
 * 实现与薯片内核的通信协议
 */

import type {
  ChipsRequestMessage,
  ChipsResponseMessage,
  ChipsEventMessage,
  MessagePriority,
} from '../../types';
import { DEFAULT_PROTOCOL_VERSION, DEFAULT_TIMEOUT } from '../../constants';
import { toISODateTime } from '../../utils/format';
import { ProtocolError } from '../error';
import type { EventBus } from '../event/EventBus';

/**
 * 协议客户端配置
 */
export interface ProtocolClientConfig {
  protocolVersion?: string;
  defaultTimeout?: number;
  eventBus?: EventBus;
}

/**
 * 请求选项
 */
export interface RequestOptions {
  timeout?: number;
  priority?: MessagePriority;
  trace?: boolean;
}

/**
 * 协议客户端类
 */
export class ProtocolClient {
  private protocolVersion: string;
  private defaultTimeout: number;
  private messageCounter: number;
  private eventBus?: EventBus;
  private pendingRequests: Map<
    string,
    {
      resolve: (response: ChipsResponseMessage) => void;
      reject: (error: Error) => void;
      timeoutId?: ReturnType<typeof setTimeout>;
    }
  >;

  constructor(config: ProtocolClientConfig = {}) {
    this.protocolVersion = config.protocolVersion ?? DEFAULT_PROTOCOL_VERSION;
    this.defaultTimeout = config.defaultTimeout ?? DEFAULT_TIMEOUT;
    this.eventBus = config.eventBus;
    this.messageCounter = 0;
    this.pendingRequests = new Map();
  }

  /**
   * 发送请求
   * @param service 服务名称
   * @param payload 请求参数
   * @param options 请求选项
   * @returns 响应数据
   */
  async request(
    service: string,
    payload: Record<string, unknown>,
    options: RequestOptions = {}
  ): Promise<unknown> {
    const messageId = this.generateMessageId();

    const requestMessage: ChipsRequestMessage = {
      protocol_version: this.protocolVersion,
      message_id: messageId,
      timestamp: toISODateTime(),
      service,
      payload,
      options: {
        timeout: options.timeout ?? this.defaultTimeout,
        priority: options.priority ?? MessagePriority.Normal,
        trace: options.trace ?? false,
      },
    };

    // 创建Promise等待响应
    const responsePromise = new Promise<ChipsResponseMessage>(
      (resolve, reject) => {
        const timeout = requestMessage.options?.timeout ?? this.defaultTimeout;

        const timeoutId = setTimeout(() => {
          this.pendingRequests.delete(messageId);
          reject(
            new ProtocolError(
              'PROTOCOL-003',
              `Request timeout after ${timeout}ms`,
              { service, messageId }
            )
          );
        }, timeout);

        this.pendingRequests.set(messageId, {
          resolve,
          reject,
          timeoutId,
        });
      }
    );

    // 发送请求到Core（这里需要实际的Core连接，暂时模拟）
    this.sendToCore(requestMessage);

    // 等待响应
    const response = await responsePromise;

    // 检查响应状态
    if (response.status === 'error') {
      throw new ProtocolError(
        response.error?.code ?? 'PROTOCOL-004',
        response.error?.message ?? 'Unknown error',
        response.error?.details
      );
    }

    return response.data;
  }

  /**
   * 处理收到的响应
   * @param response 响应消息
   */
  handleResponse(response: ChipsResponseMessage): void {
    const pending = this.pendingRequests.get(response.request_id);

    if (pending) {
      // 清除超时定时器
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }

      // 解析Promise
      pending.resolve(response);

      // 删除pending请求
      this.pendingRequests.delete(response.request_id);
    }
  }

  /**
   * 处理收到的事件
   * @param event 事件消息
   */
  handleEvent(event: ChipsEventMessage): void {
    if (this.eventBus) {
      this.eventBus.emit(event.event_type, event.payload);
    }
  }

  /**
   * 发布事件
   * @param eventType 事件类型
   * @param payload 事件数据
   */
  publishEvent(eventType: string, payload: Record<string, unknown>): void {
    const eventMessage: ChipsEventMessage = {
      protocol_version: this.protocolVersion,
      event_id: this.generateMessageId(),
      timestamp: toISODateTime(),
      event_type: eventType,
      payload,
      propagate: true,
    };

    // 发送事件到Core
    this.sendEventToCore(eventMessage);
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${++this.messageCounter}`;
  }

  /**
   * 发送请求到Core（需要具体实现）
   * @param message 请求消息
   */
  private sendToCore(message: ChipsRequestMessage): void {
    // TODO: 实际的Core通信实现
    // 这里需要根据平台选择不同的通信方式：
    // - Web: postMessage或WebSocket
    // - Node: IPC或本地Socket
    // - Electron: ipcRenderer

    // eslint-disable-next-line no-console
    console.debug('[ProtocolClient] Sending request to Core:', message);

    // 暂时模拟响应（仅用于开发阶段）
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        this.handleResponse({
          protocol_version: this.protocolVersion,
          message_id: this.generateMessageId(),
          request_id: message.message_id,
          timestamp: toISODateTime(),
          status: 'success',
          data: { mock: true, service: message.service },
        });
      }, 10);
    }
  }

  /**
   * 发送事件到Core（需要具体实现）
   * @param event 事件消息
   */
  private sendEventToCore(event: ChipsEventMessage): void {
    // TODO: 实际的Core通信实现
    // eslint-disable-next-line no-console
    console.debug('[ProtocolClient] Sending event to Core:', event);
  }

  /**
   * 获取pending请求数量
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * 取消所有pending请求
   */
  cancelAllRequests(): void {
    for (const [messageId, pending] of this.pendingRequests) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }

      pending.reject(new Error('Request cancelled'));
      this.pendingRequests.delete(messageId);
    }
  }
}
