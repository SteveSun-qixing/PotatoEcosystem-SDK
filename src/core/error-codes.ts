/**
 * 错误码常量
 * @module core/error-codes
 */

export const ErrorCodes = {
  // ========== 连接错误 CONN-1xxx ==========
  /** 连接失败 */
  CONN_FAILED: 'CONN-1001',
  /** 连接超时 */
  CONN_TIMEOUT: 'CONN-1002',
  /** 连接已关闭 */
  CONN_CLOSED: 'CONN-1003',
  /** 连接被拒绝 */
  CONN_REFUSED: 'CONN-1004',

  // ========== 协议错误 PROTOCOL-1xxx ==========
  /** 协议版本不匹配 */
  PROTOCOL_VERSION_MISMATCH: 'PROTOCOL-1001',
  /** 消息格式无效 */
  PROTOCOL_INVALID_MESSAGE: 'PROTOCOL-1002',
  /** 响应格式无效 */
  PROTOCOL_INVALID_RESPONSE: 'PROTOCOL-1003',

  // ========== 路由错误 ROUTE-1xxx ==========
  /** 路由未找到 */
  ROUTE_NOT_FOUND: 'ROUTE-1001',
  /** 路由超时 */
  ROUTE_TIMEOUT: 'ROUTE-1002',
  /** 路由失败 */
  ROUTE_FAILED: 'ROUTE-1003',

  // ========== 文件错误 FILE-1xxx ==========
  /** 文件未找到 */
  FILE_NOT_FOUND: 'FILE-1001',
  /** 路径无效 */
  FILE_INVALID_PATH: 'FILE-1002',
  /** 读取失败 */
  FILE_READ_FAILED: 'FILE-1003',
  /** 写入失败 */
  FILE_WRITE_FAILED: 'FILE-1004',
  /** 格式无效 */
  FILE_FORMAT_INVALID: 'FILE-1005',
  /** 文件损坏 */
  FILE_CORRUPTED: 'FILE-1006',
  /** 文件已存在 */
  FILE_ALREADY_EXISTS: 'FILE-1007',
  /** 权限不足 */
  FILE_PERMISSION_DENIED: 'FILE-1008',

  // ========== 验证错误 VAL-1xxx ==========
  /** 输入无效 */
  VAL_INVALID_INPUT: 'VAL-1001',
  /** 必填字段缺失 */
  VAL_REQUIRED_FIELD: 'VAL-1002',
  /** 类型无效 */
  VAL_INVALID_TYPE: 'VAL-1003',
  /** 格式无效 */
  VAL_INVALID_FORMAT: 'VAL-1004',
  /** 值超出范围 */
  VAL_OUT_OF_RANGE: 'VAL-1005',

  // ========== 资源错误 RES-1xxx ==========
  /** 资源未找到 */
  RES_NOT_FOUND: 'RES-1001',
  /** 资源加载失败 */
  RES_LOAD_FAILED: 'RES-1002',
  /** URI 无效 */
  RES_INVALID_URI: 'RES-1003',
  /** 资源过大 */
  RES_TOO_LARGE: 'RES-1004',

  // ========== 插件错误 PLUGIN-1xxx ==========
  /** 插件未找到 */
  PLUGIN_NOT_FOUND: 'PLUGIN-1001',
  /** 插件加载失败 */
  PLUGIN_LOAD_FAILED: 'PLUGIN-1002',
  /** 插件无效 */
  PLUGIN_INVALID: 'PLUGIN-1003',
  /** 插件冲突 */
  PLUGIN_CONFLICT: 'PLUGIN-1004',
  /** 插件依赖缺失 */
  PLUGIN_DEPENDENCY_MISSING: 'PLUGIN-1005',

  // ========== 渲染错误 RENDER-1xxx ==========
  /** 渲染失败 */
  RENDER_FAILED: 'RENDER-1001',
  /** 容器无效 */
  RENDER_CONTAINER_INVALID: 'RENDER-1002',
  /** 实例未找到 */
  RENDER_INSTANCE_NOT_FOUND: 'RENDER-1003',
  /** 渲染超时 */
  RENDER_TIMEOUT: 'RENDER-1004',

  // ========== 主题错误 THEME-1xxx ==========
  /** 主题未找到 */
  THEME_NOT_FOUND: 'THEME-1001',
  /** 主题无效 */
  THEME_INVALID: 'THEME-1002',
  /** 主题应用失败 */
  THEME_APPLY_FAILED: 'THEME-1003',

  // ========== SDK 错误 SDK-1xxx ==========
  /** SDK 未初始化 */
  SDK_NOT_INITIALIZED: 'SDK-1001',
  /** SDK 正在初始化 */
  SDK_INITIALIZING: 'SDK-1002',
  /** SDK 已销毁 */
  SDK_DESTROYED: 'SDK-1003',
} as const;

/**
 * 错误码类型
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
