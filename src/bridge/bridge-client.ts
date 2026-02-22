/**
 * Bridge 客户端
 * @module bridge/bridge-client
 */

import { ConnectionError, TimeoutError } from '../core/errors';
import { ErrorCodes } from '../core/error-codes';
import {
  BridgeClientOptions,
  RequestParams,
  ResponseData,
} from '../core/types';
import {
  BridgeEventCallback,
  BridgeUnsubscribe,
  ChipsBridgeAPI,
  ChipsBridgeError,
} from './types';

const DEFAULT_OPTIONS: Required<Pick<BridgeClientOptions, 'timeout' | 'enforceBridge'>> = {
  timeout: 30_000,
  enforceBridge: true,
};

interface EventSubscription {
  event: string;
  callback: BridgeEventCallback;
  unsubscribe: BridgeUnsubscribe;
}

/**
 * Bridge 客户端（SDK 与 window.chips 的适配层）
 */
export class BridgeClient {
  private readonly _options: BridgeClientOptions;
  private _bridge: ChipsBridgeAPI | null;
  private _connected = false;
  private _eventSubscriptions = new Map<string, EventSubscription>();

  constructor(options: BridgeClientOptions = {}) {
    this._options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    this._bridge = options.bridge ?? null;
  }

  /**
   * 建立 Bridge 连接
   */
  async connect(): Promise<void> {
    if (this._connected) {
      return;
    }

    const bridge = this._resolveBridge();
    if (!bridge) {
      throw new ConnectionError('window.chips Bridge API is not available', {
        code: ErrorCodes.CONNECTION_FAILED,
      });
    }

    this._bridge = bridge;
    this._connected = true;
  }

  /**
   * 断开连接并清理事件订阅
   */
  disconnect(): void {
    for (const subscription of this._eventSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this._eventSubscriptions.clear();
    this._connected = false;
  }

  /**
   * 是否已连接
   */
  get isConnected(): boolean {
    return this._connected;
  }

  /**
   * 通用 invoke
   */
  async invoke<T = unknown>(
    namespace: string,
    action: string,
    params?: unknown,
    timeout = this._options.timeout ?? DEFAULT_OPTIONS.timeout
  ): Promise<T> {
    const bridge = this._ensureBridge();

    try {
      return await this._withTimeout(
        bridge.invoke<T>(namespace, action, params),
        timeout,
        `${namespace}.${action}`
      );
    } catch (error) {
      throw this._normalizeError(error);
    }
  }

  /**
   * 兼容旧 SDK 的 request 形态
   */
  async request<T = unknown>(params: RequestParams): Promise<ResponseData<T>> {
    try {
      const data = await this.invoke<T>(
        params.service,
        params.method,
        params.payload,
        params.timeout
      );
      return {
        success: true,
        data,
      };
    } catch (error) {
      const normalized = this._normalizeError(error);
      return {
        success: false,
        error: normalized.message,
      };
    }
  }

  /**
   * 订阅事件
   */
  on(event: string, callback: BridgeEventCallback): BridgeUnsubscribe {
    const bridge = this._ensureBridge();
    const unsubscribe = bridge.on(event, callback);
    const id = this._createSubscriptionId(event);

    this._eventSubscriptions.set(id, {
      event,
      callback,
      unsubscribe,
    });

    return (): void => {
      const stored = this._eventSubscriptions.get(id);
      if (!stored) {
        return;
      }
      stored.unsubscribe();
      this._eventSubscriptions.delete(id);
    };
  }

  /**
   * 一次性订阅事件
   */
  once(event: string, callback: BridgeEventCallback): BridgeUnsubscribe {
    const bridge = this._ensureBridge();

    if (bridge.once) {
      return bridge.once(event, callback);
    }

    let unsubscribe: BridgeUnsubscribe = () => {
      return;
    };

    unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      callback(payload);
    });

    return unsubscribe;
  }

  /**
   * 取消订阅
   */
  off(event: string, callback?: BridgeEventCallback): void {
    for (const [id, subscription] of this._eventSubscriptions.entries()) {
      if (subscription.event !== event) {
        continue;
      }

      if (callback && subscription.callback !== callback) {
        continue;
      }

      subscription.unsubscribe();
      this._eventSubscriptions.delete(id);
    }
  }

  /**
   * 发送事件
   */
  emit(event: string, data?: unknown): void {
    const bridge = this._ensureBridge();
    bridge.emit(event, data);
  }

  /**
   * 兼容旧 publish API
   */
  publish(eventType: string, data: Record<string, unknown>): void {
    this.emit(eventType, data);
  }

  private _resolveBridge(): ChipsBridgeAPI | null {
    if (this._bridge) {
      return this._bridge;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    return window.chips ?? null;
  }

  private _ensureBridge(): ChipsBridgeAPI {
    if (!this._connected) {
      throw new ConnectionError('Bridge client is disconnected', {
        code: ErrorCodes.INVALID_STATE,
      });
    }

    if (!this._bridge) {
      this._bridge = this._resolveBridge();
    }

    if (!this._bridge) {
      throw new ConnectionError('window.chips Bridge API is not available', {
        code: ErrorCodes.CONNECTION_FAILED,
      });
    }

    return this._bridge;
  }

  private _normalizeError(error: unknown): ChipsBridgeError {
    if (this._isBridgeError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return {
        code: ErrorCodes.OPERATION_FAILED,
        message: error.message,
        details: {
          name: error.name,
        },
      };
    }

    return {
      code: ErrorCodes.OPERATION_FAILED,
      message: 'Bridge request failed',
      details: {
        cause: error,
      },
    };
  }

  private _isBridgeError(error: unknown): error is ChipsBridgeError {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const maybeBridgeError = error as Partial<ChipsBridgeError>;
    return (
      typeof maybeBridgeError.code === 'string' &&
      typeof maybeBridgeError.message === 'string'
    );
  }

  private async _withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    actionName: string
  ): Promise<T> {
    if (timeoutMs <= 0) {
      return promise;
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new TimeoutError(`Bridge request timeout: ${actionName}`, {
            timeoutMs,
            actionName,
          })
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private _createSubscriptionId(event: string): string {
    return `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
