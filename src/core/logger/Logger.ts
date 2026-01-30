/**
 * 日志系统
 *
 * 提供分级日志记录功能，支持结构化日志
 */

import { LogLevel, type LogEntry } from '../../types';
import { toISODateTime } from '../../utils/format';
import type { EventBus } from '../event/EventBus';

/**
 * 日志配置
 */
export interface LoggerConfig {
  level?: LogLevel;
  enableConsole?: boolean;
  enableStorage?: boolean;
  maxLogs?: number;
  eventBus?: EventBus;
}

/**
 * 日志存储接口
 */
export interface LogStorage {
  save(entry: LogEntry): Promise<void>;
  query(filter: LogFilter): Promise<LogEntry[]>;
  clear(before?: string): Promise<void>;
}

/**
 * 日志过滤器
 */
export interface LogFilter {
  level?: LogLevel;
  startTime?: string;
  endTime?: string;
  search?: string;
  limit?: number;
}

/**
 * 日志系统类
 */
export class Logger {
  private config: Required<LoggerConfig>;
  private logs: LogEntry[];
  private storage?: LogStorage;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level ?? LogLevel.Info,
      enableConsole: config.enableConsole ?? true,
      enableStorage: config.enableStorage ?? false,
      maxLogs: config.maxLogs ?? 1000,
      eventBus: config.eventBus ?? undefined!,
    };

    this.logs = [];
  }

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * 设置日志存储
   * @param storage 日志存储实现
   */
  setStorage(storage: LogStorage): void {
    this.storage = storage;
    this.config.enableStorage = true;
  }

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param context 上下文数据
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Debug, message, context);
  }

  /**
   * 记录信息日志
   * @param message 日志消息
   * @param context 上下文数据
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Info, message, context);
  }

  /**
   * 记录警告日志
   * @param message 日志消息
   * @param context 上下文数据
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Warn, message, context);
  }

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param error 错误对象
   * @param context 上下文数据
   */
  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    this.log(LogLevel.Error, message, context, error);
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param context 上下文数据
   * @param error 错误对象
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    // 检查日志级别
    if (!this.shouldLog(level)) {
      return;
    }

    // 创建日志条目
    const entry: LogEntry = {
      timestamp: toISODateTime(),
      level,
      message,
      context,
      error,
    };

    // 输出到控制台
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // 保存到内存
    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.config.maxLogs) {
      this.logs.shift();
    }

    // 保存到存储
    if (this.config.enableStorage && this.storage) {
      void this.storage.save(entry);
    }

    // 触发日志事件
    if (this.config.eventBus) {
      this.config.eventBus.emit('log', entry);
    }
  }

  /**
   * 判断是否应该记录该级别的日志
   * @param level 日志级别
   * @returns 是否应该记录
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.Debug,
      LogLevel.Info,
      LogLevel.Warn,
      LogLevel.Error,
    ];

    const currentLevelIndex = levels.indexOf(this.config.level);
    const targetLevelIndex = levels.indexOf(level);

    return targetLevelIndex >= currentLevelIndex;
  }

  /**
   * 输出到控制台
   * @param entry 日志条目
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;

    switch (entry.level) {
      case LogLevel.Debug:
        // eslint-disable-next-line no-console
        console.debug(prefix, entry.message, entry.context);
        break;
      case LogLevel.Info:
        // eslint-disable-next-line no-console
        console.info(prefix, entry.message, entry.context);
        break;
      case LogLevel.Warn:
        console.warn(prefix, entry.message, entry.context);
        break;
      case LogLevel.Error:
        console.error(prefix, entry.message, entry.context, entry.error);
        break;
    }
  }

  /**
   * 查询日志
   * @param filter 过滤器
   * @returns 日志条目数组
   */
  query(filter: LogFilter = {}): LogEntry[] {
    let results = [...this.logs];

    // 按级别过滤
    if (filter.level) {
      results = results.filter((entry) => entry.level === filter.level);
    }

    // 按时间范围过滤
    if (filter.startTime) {
      results = results.filter((entry) => entry.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      results = results.filter((entry) => entry.timestamp <= filter.endTime!);
    }

    // 按关键词搜索
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter((entry) => {
        const messageMatch = entry.message.toLowerCase().includes(searchLower);
        const contextMatch = entry.context
          ? JSON.stringify(entry.context).toLowerCase().includes(searchLower)
          : false;
        return messageMatch || contextMatch;
      });
    }

    // 限制数量
    if (filter.limit && filter.limit > 0) {
      results = results.slice(-filter.limit);
    }

    return results;
  }

  /**
   * 清除日志
   * @param before 清除此时间之前的日志（可选）
   */
  async clear(before?: string): Promise<void> {
    if (before) {
      this.logs = this.logs.filter((entry) => entry.timestamp >= before);
    } else {
      this.logs = [];
    }

    if (this.storage) {
      await this.storage.clear(before);
    }
  }

  /**
   * 获取日志统计
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    for (const entry of this.logs) {
      switch (entry.level) {
        case LogLevel.Debug:
          stats.debug++;
          break;
        case LogLevel.Info:
          stats.info++;
          break;
        case LogLevel.Warn:
          stats.warn++;
          break;
        case LogLevel.Error:
          stats.error++;
          break;
      }
    }

    return stats;
  }
}

/**
 * 全局日志实例
 */
let globalLogger: Logger | null = null;

/**
 * 获取全局日志实例
 */
export function getGlobalLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

/**
 * 设置全局日志实例
 */
export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}
