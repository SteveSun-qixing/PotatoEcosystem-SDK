/**
 * Mock BridgeClient 用于测试
 */

import { RequestParams, ResponseData } from '../../src/core';

type EventHandler = (payload: unknown) => void;

/**
 * Mock 连接器类
 */
export class MockBridgeClient {
  private _responses = new Map<string, unknown>();
  private _errors = new Map<string, { code: string; message: string }>();
  private _connected = false;
  private _requests: RequestParams[] = [];
  private _eventHandlers = new Map<string, Set<EventHandler>>();

  /**
   * 模拟连接
   */
  async connect(): Promise<void> {
    this._connected = true;
  }

  /**
   * 模拟断开连接
   */
  disconnect(): void {
    this._connected = false;
  }

  /**
   * 是否已连接
   */
  get isConnected(): boolean {
    return this._connected;
  }

  /**
   * 设置模拟响应
   */
  mockResponse(service: string, method: string, data: unknown): void {
    this._responses.set(`${service}.${method}`, data);
  }

  /**
   * 设置模拟错误
   */
  mockError(service: string, method: string, code: string, message: string): void {
    this._errors.set(`${service}.${method}`, { code, message });
  }

  /**
   * 发送请求
   */
  async request<T = unknown>(params: RequestParams): Promise<ResponseData<T>> {
    const key = `${params.service}.${params.method}`;
    this._requests.push(params);

    if (this._errors.has(key)) {
      const error = this._errors.get(key)!;
      return { success: false, error: error.message };
    }

    if (this._responses.has(key)) {
      return { success: true, data: this._responses.get(key) as T };
    }

    return { success: false, error: `No mock for ${key}` };
  }

  /**
   * Bridge invoke（与 request 同源）
   */
  async invoke<T = unknown>(namespace: string, action: string, params?: unknown): Promise<T> {
    const payload =
      typeof params === 'object' && params !== null
        ? (params as Record<string, unknown>)
        : {};

    const response = await this.request<T>({
      service: namespace,
      method: action,
      payload,
    });

    if (!response.success || typeof response.data === 'undefined') {
      const mockedError = this._errors.get(`${namespace}.${action}`);
      throw {
        code: mockedError?.code ?? 'MOCK_ERROR',
        message: response.error ?? `No mock for ${namespace}.${action}`,
      };
    }

    return response.data;
  }

  /**
   * 事件订阅
   */
  on(event: string, callback: EventHandler): () => void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(callback);

    return () => {
      this._eventHandlers.get(event)?.delete(callback);
    };
  }

  /**
   * 一次性事件订阅
   */
  once(event: string, callback: EventHandler): () => void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      callback(payload);
    });
    return unsubscribe;
  }

  /**
   * 发送事件
   */
  emit(event: string, payload?: unknown): void {
    const handlers = this._eventHandlers.get(event);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(payload);
    }
  }

  /**
   * 获取所有请求记录
   */
  getRequests(): RequestParams[] {
    return this._requests;
  }

  /**
   * 获取最后一个请求
   */
  getLastRequest(): RequestParams | undefined {
    return this._requests[this._requests.length - 1];
  }

  /**
   * 重置所有模拟数据
   */
  reset(): void {
    this._responses.clear();
    this._errors.clear();
    this._requests = [];
    this._eventHandlers.clear();
  }
}
