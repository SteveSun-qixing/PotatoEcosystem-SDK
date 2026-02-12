/**
 * 核心模块导出
 * @module core
 */

// Bridge 客户端
export { BridgeClient, BridgeClient as CoreConnector } from '../bridge';

// 错误类
export {
  ChipsError,
  ConnectionError,
  TimeoutError,
  ProtocolError,
  RouteError,
  FileError,
  ValidationError,
  PluginError,
  RenderError,
  ResourceError,
} from './errors';

// 错误码
export { ErrorCodes } from './error-codes';
export type { ErrorCode } from './error-codes';

// 类型
export type {
  MessageType,
  IpcRequest,
  IpcResponse,
  EventMessage,
  RequestParams,
  ResponseData,
  BridgeClientOptions,
  ConnectorOptions,
} from './types';
