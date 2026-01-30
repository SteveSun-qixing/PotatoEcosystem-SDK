/**
 * Chips SDK - 主入口文件
 *
 * @packageDocumentation
 */

// 导出核心类型
export * from './types';

// 导出常量
export * from './constants';

// 导出工具函数
export * from './utils';

// 导出平台相关
export * from './platform';

// 导出核心模块
export * from './core/id';
export * from './core/i18n';
export * from './core/event';
export * from './core/error';
export * from './core/logger';
export * from './core/cache';
export * from './core/config';
export * from './core/protocol';
export * from './core/permission';

// SDK版本
export { SDK_VERSION } from './constants';
