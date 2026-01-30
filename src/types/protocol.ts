/**
 * 薯片协议相关类型定义
 */

import type { ISODateTime, SemanticVersion } from './index';

/**
 * 服务命名空间
 */
export enum ServiceNamespace {
  Card = 'card',
  Box = 'box',
  Resource = 'resource',
  Plugin = 'plugin',
  FileSystem = 'file-system',
  Auth = 'auth',
  Config = 'config',
  Event = 'event',
  Log = 'log',
  Tag = 'tag',
  Id = 'id',
  Batch = 'batch',
  System = 'system',
  Debug = 'debug',
}

/**
 * 服务操作
 */
export enum ServiceAction {
  Read = 'read',
  Write = 'write',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  List = 'list',
  Install = 'install',
  Uninstall = 'uninstall',
  Enable = 'enable',
  Disable = 'disable',
  Fetch = 'fetch',
  Subscribe = 'subscribe',
  Unsubscribe = 'unsubscribe',
  Publish = 'publish',
  Register = 'register',
  Unregister = 'unregister',
  Get = 'get',
  Set = 'set',
  Query = 'query',
  Generate = 'generate',
  Validate = 'validate',
  Request = 'request',
  Version = 'version',
  Status = 'status',
  Health = 'health',
}

/**
 * 权限标识符
 */
export type Permission = string;

/**
 * 服务定义
 */
export interface ServiceDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  permissions: Permission[];
}

/**
 * 模块注册信息
 */
export interface ModuleRegistration {
  module_id: string;
  module_name: string;
  version: SemanticVersion;
  services: ServiceDefinition[];
}

/**
 * 路由表项
 */
export interface RouteEntry {
  service: string;
  version: SemanticVersion;
  handler: string;
  method: string;
  permissions: Permission[];
}

/**
 * 协议版本信息
 */
export interface ProtocolVersion {
  min: SemanticVersion;
  max: SemanticVersion;
}

// 导出
export type { ISODateTime, SemanticVersion };
