/**
 * 日志类型定义
 * @module logger/types
 */

import { LogLevel } from '../types/base';

/**
 * 日志条目
 */
export interface LogEntry {
  /** 日志级别 */
  level: LogLevel;
  /** 时间戳 */
  timestamp: string;
  /** 模块名称 */
  module: string;
  /** 日志消息 */
  message: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

/**
 * 日志配置选项
 */
export interface LoggerOptions {
  /** 日志级别 */
  level?: LogLevel;
  /** 日志前缀 */
  prefix?: string;
  /** 是否启用控制台输出 */
  enableConsole?: boolean;
  /** 是否启用远程日志 */
  enableRemote?: boolean;
  /** 最大历史记录数 */
  maxHistory?: number;
}

/**
 * 日志处理器
 */
export type LogHandler = (entry: LogEntry) => void;

/**
 * 日志传输器
 */
export interface LogTransport {
  /** 传输名称 */
  name: string;
  /** 处理日志 */
  log(entry: LogEntry): void;
}
