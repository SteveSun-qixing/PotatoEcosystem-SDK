/**
 * Core 连接器
 * 负责与 Chips-Core 的 IPC 通信
 * @module core/connector
 */

import {
  ConnectorOptions,
  IpcRequest,
  IpcResponse,
  RequestParams,
  ResponseData,
  RoutePayload,
} from './types';
import { ConnectionError, TimeoutError } from './errors';
import { generateUuid } from '../utils/id';

/**
 * 连接器配置默认值
 */
const DEFAULT_OPTIONS: Required<ConnectorOptions> = {
  url: 'tcp://127.0.0.1:9527',
  timeout: 30000,
  reconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
};

/**
 * 待处理请求信息
 */
interface PendingRequest {
  resolve: (value: ResponseData) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * 事件处理器类型
 */
type EventHandler = (data: unknown) => void;

interface ChipsBridgeApi {
  invoke: (namespace: string, action: string, params?: unknown) => Promise<unknown>;
  on?: (event: string, handler: (payload: unknown) => void) => (() => void) | void;
  once?: (event: string, handler: (payload: unknown) => void) => (() => void) | void;
  emit?: (event: string, data?: unknown) => void;
}

/**
 * Core 连接器
 * 负责与 Chips-Core 的 IPC 通信
 *
 * @example
 * ```ts
 * const connector = new CoreConnector({ url: 'ws://localhost:9527' });
 * await connector.connect();
 *
 * const response = await connector.request({
 *   service: 'file',
 *   method: 'read',
 *   payload: { path: '/path/to/file' }
 * });
 * ```
 */
export class CoreConnector {
  private _options: Required<ConnectorOptions>;
  private _socket: WebSocket | null = null;
  private _pendingRequests = new Map<string, PendingRequest>();
  private _eventHandlers = new Map<string, Set<EventHandler>>();
  private _connected = false;
  private _connecting = false;
  private _reconnectAttempts = 0;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _clientId: string;
  private _bridgeUnsubscribers = new Map<string, Map<EventHandler, () => void>>();

  /**
   * 创建连接器实例
   * @param options - 连接选项
   */
  constructor(options?: ConnectorOptions) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._clientId = `sdk-${generateUuid().slice(0, 8)}`;
  }

  /**
   * 连接到 Core
   * @throws {ConnectionError} 连接失败时抛出
   */
  async connect(): Promise<void> {
    if (this._connected) {
      return;
    }

    if (this._connecting) {
      throw new ConnectionError('Connection already in progress');
    }

    this._connecting = true;

    const bridge = this._getChipsBridge();
    if (bridge) {
      this._connected = true;
      this._connecting = false;
      this._reconnectAttempts = 0;
      return;
    }

    const electronIpcInvoke = this._getElectronIpcInvoke();
    if (electronIpcInvoke) {
      // 旧版 Electron 环境：通过 IPC 桥接器连接
      try {
        const connected = await electronIpcInvoke('core:is-connected');
        if (connected !== true) {
          this._connecting = false;
          throw new ConnectionError('IPC bridge not connected to Core');
        }
        this._connected = true;
        this._connecting = false;
        this._reconnectAttempts = 0;
        this._startHeartbeat();
        return;
      } catch (error) {
        this._connecting = false;
        throw new ConnectionError('Failed to connect via IPC bridge', {
          error: String(error),
        });
      }
    }

    // Web 环境：使用 WebSocket
    return new Promise((resolve, reject) => {
        try {
          // 检查 WebSocket 是否可用
          if (typeof WebSocket === 'undefined') {
            this._connecting = false;
            reject(new ConnectionError('WebSocket is not available'));
            return;
          }

          this._socket = new WebSocket(this._options.url);

          this._socket.onopen = (): void => {
            this._connected = true;
            this._connecting = false;
            this._reconnectAttempts = 0;
            this._startHeartbeat();
            resolve();
          };

          this._socket.onmessage = (event: MessageEvent): void => {
            this._handleMessage(event.data as string);
          };

          this._socket.onerror = (): void => {
            this._connecting = false;
            reject(new ConnectionError('WebSocket connection failed'));
          };

          this._socket.onclose = (): void => {
            this._connected = false;
            this._connecting = false;
            this._stopHeartbeat();
            this._handleDisconnect();
          };
        } catch (error) {
          this._connecting = false;
          reject(
            new ConnectionError('Failed to create WebSocket connection', {
              error: String(error),
            })
          );
        }
      });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this._stopHeartbeat();
    this._stopReconnect();
    this._clearBridgeSubscriptions();

    if (this._socket) {
      this._socket.onclose = null; // 防止触发重连
      this._socket.close();
      this._socket = null;
    }

    this._connected = false;
    this._connecting = false;

    // 清理所有待处理请求
    for (const pending of this._pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new ConnectionError('Connection closed'));
    }
    this._pendingRequests.clear();
  }

  /**
   * 发送请求并等待响应
   * @param params - 请求参数
   * @returns 响应数据
   * @throws {ConnectionError} 未连接时抛出
   * @throws {TimeoutError} 请求超时时抛出
   */
  async request<T = unknown>(params: RequestParams): Promise<ResponseData<T>> {
    if (!this._connected) {
      throw new ConnectionError('Not connected to Core');
    }

    const bridge = this._getChipsBridge();
    if (bridge) {
      try {
        const data = await bridge.invoke(params.service, params.method, params.payload);
        return {
          success: true,
          data: data as T,
        };
      } catch (error) {
        return {
          success: false,
          error: this._stringifyBridgeError(error),
        };
      }
    }

    const id = generateUuid();
    const timeout = params.timeout ?? this._options.timeout;

    const request: IpcRequest = {
      id,
      message_type: 'Route',
      payload: {
        sender: this._clientId,
        action: `${params.service}.${params.method}`,
        params: params.payload,
        timeout_ms: timeout,
      } as RoutePayload,
      timestamp: new Date().toISOString(),
    };

    const electronIpcInvoke = this._getElectronIpcInvoke();
    if (electronIpcInvoke) {
      // 旧版 Electron 环境：通过 IPC 发送请求
      try {
        const response = (await electronIpcInvoke('core:request', request)) as {
          success: boolean;
          data?: unknown;
          error?: string;
        };
        return {
          success: response.success,
          data: response.data as T,
          error: response.error,
        };
      } catch (error) {
        throw new ConnectionError('Failed to send request via IPC', {
          error: String(error),
        });
      }
    }

    // Web 环境：使用 WebSocket
    if (!this._socket) {
      throw new ConnectionError('WebSocket not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this._pendingRequests.delete(id);
        reject(
          new TimeoutError(`Request timed out after ${timeout}ms`, {
            service: params.service,
            method: params.method,
          })
        );
      }, timeout);

      this._pendingRequests.set(id, {
        resolve: resolve as (value: ResponseData) => void,
        reject,
        timeout: timeoutHandle,
      });

      try {
        this._socket!.send(JSON.stringify(request) + '\n');
      } catch (error) {
        this._pendingRequests.delete(id);
        clearTimeout(timeoutHandle);
        reject(
          new ConnectionError('Failed to send request', {
            error: String(error),
          })
        );
      }
    });
  }

  /**
   * 发布事件（不等待响应）
   * @param eventType - 事件类型
   * @param data - 事件数据
   */
  publish(eventType: string, data: Record<string, unknown>): void {
    if (!this._connected) {
      throw new ConnectionError('Not connected to Core');
    }

    const bridge = this._getChipsBridge();
    if (bridge) {
      if (!bridge.emit) {
        throw new ConnectionError('Bridge emit API is not available');
      }
      bridge.emit(eventType, data);
      return;
    }

    if (!this._socket) {
      throw new ConnectionError('Not connected to Core');
    }

    const request: IpcRequest = {
      id: generateUuid(),
      message_type: 'Publish',
      payload: {
        event_type: eventType,
        sender: this._clientId,
        data,
      },
      timestamp: new Date().toISOString(),
    };

    this._socket.send(JSON.stringify(request) + '\n');
  }

  /**
   * 订阅事件
   * @param eventType - 事件类型，支持通配符 '*'
   * @param handler - 事件处理器
   */
  on(eventType: string, handler: EventHandler): void {
    const bridge = this._getChipsBridge();
    if (this._connected && bridge) {
      if (!bridge.on) {
        throw new ConnectionError('Bridge on API is not available');
      }
      const unsubscribe = bridge.on(eventType, handler as (payload: unknown) => void);
      this._storeBridgeUnsubscriber(eventType, handler, unsubscribe);
      return;
    }

    if (!this._eventHandlers.has(eventType)) {
      this._eventHandlers.set(eventType, new Set());
    }
    this._eventHandlers.get(eventType)!.add(handler);

    // 向 Core 发送订阅请求
    if (this._connected && this._socket) {
      const request: IpcRequest = {
        id: generateUuid(),
        message_type: 'Subscribe',
        payload: {
          subscriber_id: this._clientId,
          event_type: eventType,
        },
        timestamp: new Date().toISOString(),
      };
      this._socket.send(JSON.stringify(request) + '\n');
    }
  }

  /**
   * 取消订阅事件
   * @param eventType - 事件类型
   * @param handler - 事件处理器（可选，不传则取消该类型所有订阅）
   */
  off(eventType: string, handler?: EventHandler): void {
    const bridge = this._getChipsBridge();
    if (this._connected && bridge) {
      this._removeBridgeSubscription(eventType, handler);
      return;
    }

    if (!handler) {
      this._eventHandlers.delete(eventType);
    } else {
      this._eventHandlers.get(eventType)?.delete(handler);
    }

    // 向 Core 发送取消订阅请求
    if (this._connected && this._socket) {
      const request: IpcRequest = {
        id: generateUuid(),
        message_type: 'Unsubscribe',
        payload: {
          subscriber_id: this._clientId,
          event_type: eventType,
        },
        timestamp: new Date().toISOString(),
      };
      this._socket.send(JSON.stringify(request) + '\n');
    }
  }

  /**
   * 一次性订阅事件
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   */
  once(eventType: string, handler: EventHandler): void {
    const bridge = this._getChipsBridge();
    if (this._connected && bridge?.once) {
      const unsubscribe = bridge.once(eventType, handler as (payload: unknown) => void);
      this._storeBridgeUnsubscriber(eventType, handler, unsubscribe);
      return;
    }

    const wrappedHandler: EventHandler = (data) => {
      this.off(eventType, wrappedHandler);
      handler(data);
    };
    this.on(eventType, wrappedHandler);
  }

  /**
   * 检查是否已连接
   */
  get isConnected(): boolean {
    return this._connected;
  }

  /**
   * 检查是否正在连接
   */
  get isConnecting(): boolean {
    return this._connecting;
  }

  /**
   * 获取客户端 ID
   */
  get clientId(): string {
    return this._clientId;
  }

  /**
   * 获取待处理请求数量
   */
  get pendingCount(): number {
    return this._pendingRequests.size;
  }

  private _getChipsBridge(): ChipsBridgeApi | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const chipsBridge = (window as { chips?: unknown }).chips;
    if (
      chipsBridge &&
      typeof chipsBridge === 'object' &&
      typeof (chipsBridge as ChipsBridgeApi).invoke === 'function'
    ) {
      return chipsBridge as ChipsBridgeApi;
    }

    return undefined;
  }

  private _getElectronIpcInvoke():
    | ((channel: string, ...args: unknown[]) => Promise<unknown>)
    | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const electronBridge = (window as { electron?: unknown }).electron;
    if (
      electronBridge &&
      typeof electronBridge === 'object' &&
      'ipcRenderer' in electronBridge
    ) {
      const ipcRenderer = (electronBridge as { ipcRenderer?: { invoke?: unknown } }).ipcRenderer;
      if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
        return ipcRenderer.invoke as (channel: string, ...args: unknown[]) => Promise<unknown>;
      }
    }

    return undefined;
  }

  private _stringifyBridgeError(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
    }

    return String(error);
  }

  private _storeBridgeUnsubscriber(
    eventType: string,
    handler: EventHandler,
    unsubscribe: (() => void) | void
  ): void {
    if (typeof unsubscribe !== 'function') {
      return;
    }

    const eventMap = this._bridgeUnsubscribers.get(eventType) ?? new Map<EventHandler, () => void>();
    eventMap.set(handler, unsubscribe);
    this._bridgeUnsubscribers.set(eventType, eventMap);
  }

  private _removeBridgeSubscription(eventType: string, handler?: EventHandler): void {
    if (!handler) {
      const eventMap = this._bridgeUnsubscribers.get(eventType);
      if (!eventMap) {
        return;
      }
      for (const unsubscribe of eventMap.values()) {
        unsubscribe();
      }
      this._bridgeUnsubscribers.delete(eventType);
      return;
    }

    const eventMap = this._bridgeUnsubscribers.get(eventType);
    if (!eventMap) {
      return;
    }

    const unsubscribe = eventMap.get(handler);
    if (unsubscribe) {
      unsubscribe();
    }
    eventMap.delete(handler);
    if (eventMap.size === 0) {
      this._bridgeUnsubscribers.delete(eventType);
    }
  }

  private _clearBridgeSubscriptions(): void {
    for (const eventMap of this._bridgeUnsubscribers.values()) {
      for (const unsubscribe of eventMap.values()) {
        unsubscribe();
      }
    }
    this._bridgeUnsubscribers.clear();
  }

  /**
   * 处理收到的消息
   */
  private _handleMessage(data: string): void {
    try {
      // 处理 NDJSON（可能有多条消息）
      const lines = data.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        const message = JSON.parse(line) as IpcResponse | { type: string; event_type?: string; data?: unknown };

        // 检查是否是事件推送
        if ('type' in message && message.type === 'event' && message.event_type) {
          this._handleEvent({ event_type: message.event_type, data: message.data });
          continue;
        }

        // 处理响应
        const response = message as IpcResponse;
        const pending = this._pendingRequests.get(response.request_id);

        if (pending) {
          clearTimeout(pending.timeout);
          this._pendingRequests.delete(response.request_id);

          pending.resolve({
            success: response.success,
            data: response.data,
            error: response.error,
          });
        }
      }
    } catch (error) {
      // 解析错误，记录但不抛出
      console.error('[CoreConnector] Failed to parse message:', error);
    }
  }

  /**
   * 处理事件推送
   */
  private _handleEvent(event: { event_type: string; data: unknown }): void {
    // 精确匹配
    const handlers = this._eventHandlers.get(event.event_type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event.data);
        } catch (error) {
          console.error('[CoreConnector] Event handler error:', error);
        }
      }
    }

    // 通配符匹配
    const wildcardHandlers = this._eventHandlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(event);
        } catch (error) {
          console.error('[CoreConnector] Wildcard event handler error:', error);
        }
      }
    }
  }

  /**
   * 处理断开连接
   */
  private _handleDisconnect(): void {
    // 拒绝所有待处理请求
    for (const pending of this._pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new ConnectionError('Connection lost'));
    }
    this._pendingRequests.clear();

    // 自动重连
    if (
      this._options.reconnect &&
      this._reconnectAttempts < this._options.maxReconnectAttempts
    ) {
      this._reconnectAttempts++;
      const delay = this._options.reconnectDelay * this._reconnectAttempts;

      this._reconnectTimer = setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[CoreConnector] Reconnect failed:', error);
        });
      }, delay);
    }
  }

  /**
   * 启动心跳
   */
  private _startHeartbeat(): void {
    if (this._options.heartbeatInterval <= 0) {
      return;
    }

    this._heartbeatTimer = setInterval(() => {
      if (this._connected && this._socket) {
        const heartbeat: IpcRequest = {
          id: generateUuid(),
          message_type: 'Heartbeat',
          payload: {
            sender: this._clientId,
            action: '',
            params: {},
          },
          timestamp: new Date().toISOString(),
        };

        try {
          this._socket.send(JSON.stringify(heartbeat) + '\n');
        } catch (error) {
          console.error('[CoreConnector] Heartbeat failed:', error);
        }
      }
    }, this._options.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private _stopHeartbeat(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  /**
   * 停止重连
   */
  private _stopReconnect(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectAttempts = 0;
  }
}
