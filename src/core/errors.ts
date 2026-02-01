/**
 * 错误类定义
 * @module core/errors
 */

/**
 * SDK 基础错误类
 */
export class ChipsError extends Error {
  /**
   * 创建 ChipsError 实例
   * @param code - 错误码
   * @param message - 错误消息
   * @param details - 错误详情
   */
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ChipsError';

    // 确保原型链正确
    Object.setPrototypeOf(this, ChipsError.prototype);
  }

  /**
   * 序列化为 JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  /**
   * 转换为字符串
   */
  override toString(): string {
    return `[${this.code}] ${this.message}`;
  }
}

/**
 * 连接错误
 */
export class ConnectionError extends ChipsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONN-1001', message, details);
    this.name = 'ConnectionError';
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

/**
 * 超时错误
 */
export class TimeoutError extends ChipsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONN-1002', message, details);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * 协议错误
 */
export class ProtocolError extends ChipsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PROTOCOL-1001', message, details);
    this.name = 'ProtocolError';
    Object.setPrototypeOf(this, ProtocolError.prototype);
  }
}

/**
 * 路由错误
 */
export class RouteError extends ChipsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('ROUTE-1001', message, details);
    this.name = 'RouteError';
    Object.setPrototypeOf(this, RouteError.prototype);
  }
}

/**
 * 文件错误
 */
export class FileError extends ChipsError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.name = 'FileError';
    Object.setPrototypeOf(this, FileError.prototype);
  }
}

/**
 * 验证错误
 */
export class ValidationError extends ChipsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VAL-1001', message, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 插件错误
 */
export class PluginError extends ChipsError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.name = 'PluginError';
    Object.setPrototypeOf(this, PluginError.prototype);
  }
}

/**
 * 渲染错误
 */
export class RenderError extends ChipsError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.name = 'RenderError';
    Object.setPrototypeOf(this, RenderError.prototype);
  }
}

/**
 * 资源错误
 */
export class ResourceError extends ChipsError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.name = 'ResourceError';
    Object.setPrototypeOf(this, ResourceError.prototype);
  }
}
