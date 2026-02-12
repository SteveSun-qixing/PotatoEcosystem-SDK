/**
 * Bridge 类型定义
 * @module bridge/types
 */

/**
 * Bridge 标准错误
 */
export interface ChipsBridgeError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * 事件回调
 */
export type BridgeEventCallback<T = unknown> = (payload: T) => void;

/**
 * 取消订阅函数
 */
export type BridgeUnsubscribe = () => void;

/**
 * 插件信息
 */
export interface BridgePluginInfo {
  id: string;
  name: string;
  version: string;
  type: 'app' | 'card' | 'layout' | 'module' | 'theme';
  publisher?: string;
  description?: string;
  installPath: string;
  enabled: boolean;
}

/**
 * 插件自身信息
 */
export interface BridgePluginSelfInfo {
  id: string;
  version: string;
  type: 'app' | 'card' | 'layout' | 'module' | 'theme';
  installPath: string;
}

/**
 * Bridge 插件 API
 */
export interface BridgePluginAPI {
  getSelf(): Promise<BridgePluginSelfInfo>;
  list(filter?: { type?: 'app' | 'card' | 'layout' | 'module' | 'theme'; capability?: string }): Promise<BridgePluginInfo[]>;
  get(pluginId: string): Promise<BridgePluginInfo | null>;
  getCardPlugin(cardType: string): Promise<{ pluginId: string; rendererPath: string; editorPath: string } | null>;
  getLayoutPlugin(layoutType: string): Promise<{ pluginId: string; rendererPath: string; editorPath: string } | null>;
}

/**
 * Bridge 主题 API
 */
export interface BridgeThemeAPI {
  getCSS(params?: { componentType?: string }): Promise<string>;
  getCurrent(params?: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/**
 * Bridge 多语言 API
 */
export interface BridgeI18nAPI {
  translate(params: { key: string; params?: Record<string, string | number> }): Promise<string>;
}

/**
 * window.chips 顶层接口
 */
export interface ChipsBridgeAPI {
  invoke<T = unknown>(namespace: string, action: string, params?: unknown): Promise<T>;
  on(event: string, callback: BridgeEventCallback): BridgeUnsubscribe;
  once?(event: string, callback: BridgeEventCallback): BridgeUnsubscribe;
  emit(event: string, data?: unknown): void;
  plugin?: BridgePluginAPI;
}

declare global {
  interface Window {
    chips?: ChipsBridgeAPI;
  }
}

export {};
