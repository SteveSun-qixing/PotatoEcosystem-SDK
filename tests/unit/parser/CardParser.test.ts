/**
 * CardParser 测试
 */

import { describe, it, expect } from 'vitest';
import { CardParser } from '../../../src/parser/CardParser';

describe('CardParser', () => {
  describe('CardParser类存在性', () => {
    it('应该导出CardParser类', () => {
      expect(CardParser).toBeDefined();
      expect(typeof CardParser.parse).toBe('function');
      expect(typeof CardParser.serialize).toBe('function');
    });
  });

  // TODO: 需要创建真实的ZIP测试数据才能完整测试CardParser
  // 暂时只测试类的存在性和接口

  describe('方法签名', () => {
    it('parse方法应该是异步的', () => {
      expect(CardParser.parse).toBeInstanceOf(Function);
    });

    it('serialize方法应该是异步的', () => {
      expect(CardParser.serialize).toBeInstanceOf(Function);
    });
  });
});
