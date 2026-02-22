/**
 * 核心类型定义
 * @module core/types
 */

/**
 * Bridge 通信消息类型
 */
export type MessageType = 'invoke' | 'emit' | 'event';

/**
 * Bridge 调用请求
 */
export interface IpcRequest {
  requestId: string;
  namespace: string;
  action: string;
  params?: unknown;
  timestamp: number;
}

/**
 * Bridge 调用响应
 */
export interface IpcResponse<T = unknown> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: number;
  durationMs?: number;
}

/**
 * 事件消息
 */
export interface EventMessage {
  event: string;
  data?: unknown;
  source?: string;
  timestamp: number;
}

/**
 * 兼容旧 SDK 的请求参数
 */
export interface RequestParams {
  service: string;
  method: string;
  payload: Record<string, unknown>;
  timeout?: number;
}

/**
 * 兼容旧 SDK 的响应结构
 */
export interface ResponseData<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Bridge 客户端配置
 */
export interface BridgeClientOptions {
  timeout?: number;
  enforceBridge?: boolean;
  bridge?: {
    invoke<T = unknown>(namespace: string, action: string, params?: unknown): Promise<T>;
    on(event: string, callback: (payload: unknown) => void): () => void;
    once?(event: string, callback: (payload: unknown) => void): () => void;
    emit(event: string, data?: unknown): void;
  };
}

/**
 * 兼容旧命名（ConnectorOptions -> BridgeClientOptions）
 */
export type ConnectorOptions = BridgeClientOptions;
