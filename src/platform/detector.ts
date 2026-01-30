/**
 * 平台检测工具
 */

import { Platform } from '../types';

/**
 * 检测当前运行平台
 * @returns 平台类型
 */
export function detectPlatform(): Platform {
  // 检测Node.js环境
  if (
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.node
  ) {
    // 检测Electron环境
    if (process.versions.electron) {
      return Platform.Electron;
    }
    return Platform.Node;
  }

  // 检测浏览器环境
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // 检测移动设备
    const userAgent = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod/i.test(userAgent)) {
      return Platform.Mobile;
    }
    return Platform.Web;
  }

  // 默认为Node环境
  return Platform.Node;
}

/**
 * 检查平台功能支持
 * @param feature 功能名称
 * @returns 是否支持
 */
export function supportsFeature(feature: string): boolean {
  switch (feature) {
    case 'filesystem':
      return typeof process !== 'undefined' && !!process.versions?.node;

    case 'indexeddb':
      return typeof indexedDB !== 'undefined';

    case 'localstorage':
      return typeof localStorage !== 'undefined';

    case 'webgl': {
      if (typeof document === 'undefined') return false;
      const canvas = document.createElement('canvas');
      return !!(
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      );
    }

    case 'webworker':
      return typeof Worker !== 'undefined';

    case 'serviceworker':
      return 'serviceWorker' in navigator;

    case 'crypto':
      return typeof crypto !== 'undefined' && !!crypto.getRandomValues;

    default:
      return false;
  }
}

/**
 * 获取平台信息
 * @returns 平台信息对象
 */
export function getPlatformInfo() {
  const platform = detectPlatform();

  return {
    platform,
    features: {
      filesystem: supportsFeature('filesystem'),
      indexeddb: supportsFeature('indexeddb'),
      localstorage: supportsFeature('localstorage'),
      webgl: supportsFeature('webgl'),
      webworker: supportsFeature('webworker'),
      serviceworker: supportsFeature('serviceworker'),
      crypto: supportsFeature('crypto'),
    },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    nodeVersion:
      typeof process !== 'undefined' ? process.versions?.node : undefined,
  };
}
