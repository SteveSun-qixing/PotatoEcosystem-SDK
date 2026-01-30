/**
 * Chips错误类
 *
 * 实现标准化的错误处理，使用错误代码和多语言错误信息
 */

import type { IChipsError } from '../../types';
import { t } from '../i18n';
import { ERROR_MESSAGES } from '../../constants/errors';

/**
 * Chips基础错误类
 */
export class ChipsError extends Error implements IChipsError {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message?: string, details?: unknown) {
    // 如果没有提供message，从ERROR_MESSAGES获取
    const errorMessage = message || t(ERROR_MESSAGES[code] || 'error.unknown');

    super(errorMessage);

    this.name = 'ChipsError';
    this.code = code;
    this.details = details;

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ChipsError);
    }
  }

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * 文件未找到错误
 */
export class FileNotFoundError extends ChipsError {
  constructor(filePath: string, details?: unknown) {
    super('SYS-9001', t('error.file_not_found'), {
      filePath,
      ...details,
    });
    this.name = 'FileNotFoundError';
  }
}

/**
 * 解析错误
 */
export class ParseError extends ChipsError {
  constructor(message?: string, details?: unknown) {
    super('SYS-9004', message || t('error.parse_error'), details);
    this.name = 'ParseError';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends ChipsError {
  constructor(message?: string, details?: unknown) {
    super('VAL-1004', message || t('error.invalid_card_data'), details);
    this.name = 'ValidationError';
  }
}

/**
 * 网络错误
 */
export class NetworkError extends ChipsError {
  constructor(message?: string, details?: unknown) {
    super('SYS-9005', message || t('error.network_error'), details);
    this.name = 'NetworkError';
  }
}

/**
 * 权限错误
 */
export class PermissionError extends ChipsError {
  constructor(message?: string, details?: unknown) {
    super('PERMISSION-001', message || t('error.permission_denied'), details);
    this.name = 'PermissionError';
  }
}

/**
 * 资源错误
 */
export class ResourceError extends ChipsError {
  constructor(code: string, message?: string, details?: unknown) {
    super(code, message || t('error.resource_not_found'), details);
    this.name = 'ResourceError';
  }
}

/**
 * 协议错误
 */
export class ProtocolError extends ChipsError {
  constructor(code: string, message?: string, details?: unknown) {
    super(code, message || t('error.protocol_invalid_format'), details);
    this.name = 'ProtocolError';
  }
}
