/**
 * 日志系统
 * @module logger/logger
 */

import { LogLevel } from '../types/base';
import { LogEntry, LoggerOptions, LogHandler, LogTransport } from './types';

/**
 * 日志级别优先级
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<LoggerOptions> = {
  level: 'info',
  prefix: 'ChipsSDK',
  enableConsole: true,
  enableRemote: false,
  maxHistory: 1000,
};

/**
 * 日志系统
 *
 * @example
 * ```ts
 * const logger = new Logger('MyModule');
 * logger.info('Hello, world!');
 * logger.error('Something went wrong', { error: 'details' });
 * ```
 */
export class Logger {
  private _options: Required<LoggerOptions>;
  private _history: LogEntry[] = [];
  private _handlers: Set<LogHandler> = new Set();
  private _transports: Map<string, LogTransport> = new Map();
  private _module: string;

  /**
   * 创建 Logger 实例
   * @param module - 模块名称
   * @param options - 配置选项
   */
  constructor(module: string, options?: LoggerOptions) {
    this._module = module;
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this._options.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this._options.level;
  }

  /**
   * Debug 级别日志
   * @param message - 日志消息
   * @param data - 附加数据
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this._log('debug', message, data);
  }

  /**
   * Info 级别日志
   * @param message - 日志消息
   * @param data - 附加数据
   */
  info(message: string, data?: Record<string, unknown>): void {
    this._log('info', message, data);
  }

  /**
   * Warn 级别日志
   * @param message - 日志消息
   * @param data - 附加数据
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this._log('warn', message, data);
  }

  /**
   * Error 级别日志
   * @param message - 日志消息
   * @param data - 附加数据
   */
  error(message: string, data?: Record<string, unknown>): void {
    this._log('error', message, data);
  }

  /**
   * 添加日志处理器
   * @param handler - 处理器函数
   */
  addHandler(handler: LogHandler): void {
    this._handlers.add(handler);
  }

  /**
   * 移除日志处理器
   * @param handler - 处理器函数
   */
  removeHandler(handler: LogHandler): void {
    this._handlers.delete(handler);
  }

  /**
   * 添加传输器
   * @param transport - 传输器
   */
  addTransport(transport: LogTransport): void {
    this._transports.set(transport.name, transport);
  }

  /**
   * 移除传输器
   * @param name - 传输器名称
   */
  removeTransport(name: string): void {
    this._transports.delete(name);
  }

  /**
   * 获取日志历史
   * @param level - 过滤级别
   * @param limit - 数量限制
   */
  getHistory(level?: LogLevel, limit?: number): LogEntry[] {
    let entries = this._history;

    if (level) {
      entries = entries.filter((e) => e.level === level);
    }

    if (limit) {
      entries = entries.slice(-limit);
    }

    return [...entries];
  }

  /**
   * 清空日志历史
   */
  clearHistory(): void {
    this._history = [];
  }

  /**
   * 创建子 Logger
   * @param subModule - 子模块名称
   */
  createChild(subModule: string): Logger {
    const child = new Logger(`${this._module}:${subModule}`, this._options);
    // 共享处理器和传输器
    for (const handler of this._handlers) {
      child.addHandler(handler);
    }
    for (const transport of this._transports.values()) {
      child.addTransport(transport);
    }
    return child;
  }

  /**
   * 获取模块名称
   */
  get module(): string {
    return this._module;
  }

  /**
   * 记录日志
   */
  private _log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    // 检查日志级别
    if (LOG_LEVELS[level] < LOG_LEVELS[this._options.level]) {
      return;
    }

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      module: this._module,
      message,
      data,
    };

    // 添加到历史
    this._history.push(entry);
    if (this._history.length > this._options.maxHistory) {
      this._history.shift();
    }

    // 控制台输出
    if (this._options.enableConsole) {
      this._logToConsole(entry);
    }

    // 调用处理器
    for (const handler of this._handlers) {
      try {
        handler(entry);
      } catch (error) {
        console.error('[Logger] Handler error:', error);
      }
    }

    // 调用传输器
    for (const transport of this._transports.values()) {
      try {
        transport.log(entry);
      } catch (error) {
        console.error(`[Logger] Transport error:`, error);
      }
    }
  }

  /**
   * 输出到控制台
   */
  private _logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${this._options.prefix}] [${entry.module}]`;
    const msg = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        if (entry.data) {
          console.debug(msg, entry.data);
        } else {
          console.debug(msg);
        }
        break;
      case 'info':
        if (entry.data) {
          console.info(msg, entry.data);
        } else {
          console.info(msg);
        }
        break;
      case 'warn':
        if (entry.data) {
          console.warn(msg, entry.data);
        } else {
          console.warn(msg);
        }
        break;
      case 'error':
        if (entry.data) {
          console.error(msg, entry.data);
        } else {
          console.error(msg);
        }
        break;
    }
  }
}
