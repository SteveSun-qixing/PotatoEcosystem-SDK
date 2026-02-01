/**
 * 核心类型定义
 * @module core/types
 */

import { ProtocolVersion, Timestamp } from '../types/base';

/**
 * IPC 消息类型
 */
export type MessageType =
  | 'Route'
  | 'Publish'
  | 'Subscribe'
  | 'Unsubscribe'
  | 'ConfigGet'
  | 'ConfigSet'
  | 'Status'
  | 'Heartbeat';

/**
 * IPC 请求消息
 */
export interface IpcRequest {
  /** 请求 ID */
  id: string;
  /** 消息类型 */
  message_type: MessageType;
  /** 载荷 */
  payload: RoutePayload | PublishPayload | SubscribePayload | ConfigPayload;
  /** 时间戳 */
  timestamp: Timestamp;
  /** 协议版本 */
  protocol_version?: ProtocolVersion;
}

/**
 * 路由请求载荷
 */
export interface RoutePayload {
  /** 发送者 ID */
  sender: string;
  /** 操作（service.method 格式） */
  action: string;
  /** 参数 */
  params: Record<string, unknown>;
  /** 超时时间（毫秒） */
  timeout_ms?: number;
}

/**
 * 发布事件载荷
 */
export interface PublishPayload {
  /** 事件类型 */
  event_type: string;
  /** 发送者 ID */
  sender: string;
  /** 数据 */
  data: Record<string, unknown>;
}

/**
 * 订阅事件载荷
 */
export interface SubscribePayload {
  /** 订阅者 ID */
  subscriber_id: string;
  /** 事件类型 */
  event_type: string;
  /** 过滤条件 */
  filter?: Record<string, unknown>;
}

/**
 * 配置操作载荷
 */
export interface ConfigPayload {
  /** 配置键 */
  key: string;
  /** 配置值 */
  value?: unknown;
}

/**
 * IPC 响应消息
 */
export interface IpcResponse {
  /** 请求 ID */
  request_id: string;
  /** 是否成功 */
  success: boolean;
  /** 数据 */
  data?: unknown;
  /** 错误信息 */
  error?: string;
  /** 时间戳 */
  timestamp: Timestamp;
}

/**
 * 事件推送消息
 */
export interface EventMessage {
  /** 消息类型 */
  type: 'event';
  /** 事件类型 */
  event_type: string;
  /** 发送者 */
  sender: string;
  /** 数据 */
  data: Record<string, unknown>;
  /** 时间戳 */
  timestamp: Timestamp;
}

/**
 * 请求参数
 */
export interface RequestParams {
  /** 服务名 */
  service: string;
  /** 方法名 */
  method: string;
  /** 载荷 */
  payload: Record<string, unknown>;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 响应数据
 */
export interface ResponseData<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
}

/**
 * 连接选项
 */
export interface ConnectorOptions {
  /** 连接地址 */
  url?: string;
  /** 默认超时（毫秒） */
  timeout?: number;
  /** 是否自动重连 */
  reconnect?: boolean;
  /** 重连延迟（毫秒） */
  reconnectDelay?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
}
