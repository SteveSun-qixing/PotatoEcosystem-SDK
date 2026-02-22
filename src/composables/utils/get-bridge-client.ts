/**
 * 获取可用的 Bridge 客户端
 * @module composables/utils/get-bridge-client
 */

import { BridgeClient } from '../../bridge';

/**
 * 确保 Bridge 客户端已连接
 */
export async function getBridgeClient(client?: BridgeClient): Promise<BridgeClient> {
  const bridge = client ?? new BridgeClient();

  if (!bridge.isConnected) {
    await bridge.connect();
  }

  return bridge;
}
