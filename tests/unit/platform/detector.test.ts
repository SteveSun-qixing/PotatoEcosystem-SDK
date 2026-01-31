/**
 * Platform Detector 测试
 */

import { describe, it, expect } from 'vitest';
import { detectPlatform, supportsFeature, getPlatformInfo } from '../../../src/platform/detector';
import { createPlatformAdapter } from '../../../src/platform';
import { Platform } from '../../../src/types';

describe('Platform Detector', () => {
  describe('detectPlatform', () => {
    it('应该检测到Node.js环境', () => {
      // 在测试环境中，通常是Node.js
      const platform = detectPlatform();

      expect(platform).toBe(Platform.Node);
    });
  });

  describe('supportsFeature', () => {
    it('应该检测文件系统支持', () => {
      const result = supportsFeature('filesystem');
      expect(typeof result).toBe('boolean');
    });

    it('应该检测crypto支持', () => {
      const result = supportsFeature('crypto');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getPlatformInfo', () => {
    it('应该返回平台信息', () => {
      const info = getPlatformInfo();
      
      expect(info).toBeDefined();
      expect(info.platform).toBeDefined();
      expect(info.features).toBeDefined();
      expect(typeof info.features.filesystem).toBe('boolean');
      expect(typeof info.features.crypto).toBe('boolean');
    });
  });

  describe('createPlatformAdapter', () => {
    it('应该创建Node.js适配器', () => {
      const adapter = createPlatformAdapter();

      expect(adapter).toBeDefined();
      expect(adapter.platform).toBe(Platform.Node);
      expect(typeof adapter.readFile).toBe('function');
      expect(typeof adapter.writeFile).toBe('function');
    });

    it('应该提供文件系统接口', () => {
      const adapter = createPlatformAdapter();
      const fs = adapter.getFileSystem();

      expect(fs).toBeDefined();
      expect(typeof fs.readFile).toBe('function');
      expect(typeof fs.writeFile).toBe('function');
    });

    it('应该根据参数创建指定平台的适配器', () => {
      const nodeAdapter = createPlatformAdapter(Platform.Node);
      expect(nodeAdapter.platform).toBe(Platform.Node);
    });
  });
});
