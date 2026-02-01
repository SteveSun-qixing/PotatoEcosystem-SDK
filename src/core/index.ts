/**
 * 核心模块导出
 * @module core
 */

// 连接器
export { CoreConnector } from './connector';

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
  RoutePayload,
  PublishPayload,
  SubscribePayload,
  ConfigPayload,
  EventMessage,
  RequestParams,
  ResponseData,
  ConnectorOptions,
} from './types';
