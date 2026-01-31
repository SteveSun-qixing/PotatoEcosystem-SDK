/**
 * 平台适配模块入口
 */

export { detectPlatform, supportsFeature, getPlatformInfo } from './detector';
export { WebAdapter } from './web/WebAdapter';
export { NodeAdapter } from './node/NodeAdapter';
export { ElectronAdapter } from './electron/ElectronAdapter';

import type { IPlatformAdapter } from '../types';
import { Platform } from '../types';
import { detectPlatform } from './detector';
import { WebAdapter } from './web/WebAdapter';
import { NodeAdapter } from './node/NodeAdapter';
import { ElectronAdapter } from './electron/ElectronAdapter';

/**
 * 创建平台适配器
 * @param platform 指定平台（可选，默认自动检测）
 * @returns 平台适配器实例
 */
export function createPlatformAdapter(platform?: Platform): IPlatformAdapter {
  const targetPlatform = platform ?? detectPlatform();

  switch (targetPlatform) {
    case Platform.Web:
    case Platform.Mobile:
      return new WebAdapter();

    case Platform.Node:
      return new NodeAdapter();

    case Platform.Electron:
      return new ElectronAdapter();

    default:
      throw new Error(`Unsupported platform: ${String(targetPlatform)}`);
  }
}
