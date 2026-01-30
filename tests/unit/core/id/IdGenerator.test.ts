/**
 * ID生成器单元测试
 */

import { describe, it, expect } from 'vitest';
import { IdGenerator, IdPool } from '@/core/id/IdGenerator';

describe('IdGenerator', () => {
  describe('generate', () => {
    it('应该生成10位字符的ID', () => {
      const id = IdGenerator.generate();
      expect(id).toHaveLength(10);
    });

    it('应该只包含62进制字符', () => {
      const id = IdGenerator.generate();
      expect(id).toMatch(/^[0-9a-zA-Z]{10}$/);
    });

    it('应该生成唯一ID', () => {
      const ids = new Set<string>();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        ids.add(IdGenerator.generate());
      }

      expect(ids.size).toBe(count);
    });

    it('应该不生成全0的ID', () => {
      // 生成大量ID，确保不会出现全0
      for (let i = 0; i < 1000; i++) {
        const id = IdGenerator.generate();
        expect(id).not.toBe('0000000000');
      }
    });
  });

  describe('generateBatch', () => {
    it('应该生成指定数量的ID', () => {
      const count = 100;
      const ids = IdGenerator.generateBatch(count);
      expect(ids).toHaveLength(count);
    });

    it('应该生成唯一的ID', () => {
      const ids = IdGenerator.generateBatch(1000);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('generateUnique', () => {
    it('应该生成不在已存在集合中的ID', () => {
      const existingIds = new Set(['a1B2c3D4e5', 'f6G7h8I9j0']);
      const newId = IdGenerator.generateUnique(existingIds);

      expect(existingIds.has(newId)).toBe(false);
      expect(newId).toHaveLength(10);
    });

    it('应该在多次尝试失败后抛出错误', () => {
      // 创建一个包含所有可能ID的模拟集合（实际不可能）
      const mockGenerate = IdGenerator.generate;
      let callCount = 0;
      
      IdGenerator.generate = () => {
        callCount++;
        return 'sameId1234'; // 总是返回相同的ID
      };

      const existingIds = new Set(['sameId1234']);

      expect(() => IdGenerator.generateUnique(existingIds)).toThrow(
        'Failed to generate unique ID'
      );

      // 恢复原函数
      IdGenerator.generate = mockGenerate;
    });
  });

  describe('validate', () => {
    it('应该验证正确的ID', () => {
      const validIds = ['a1B2c3D4e5', 'Xy9Zw8Vt7U', '0123456789'];
      validIds.forEach((id) => {
        expect(IdGenerator.validate(id)).toBe(true);
      });
    });

    it('应该拒绝长度不正确的ID', () => {
      const invalidIds = ['short', 'toolongid123'];
      invalidIds.forEach((id) => {
        expect(IdGenerator.validate(id)).toBe(false);
      });
    });

    it('应该拒绝包含无效字符的ID', () => {
      const invalidIds = ['invalid-id!', 'bad@id#123', 'id with spa'];
      invalidIds.forEach((id) => {
        expect(IdGenerator.validate(id)).toBe(false);
      });
    });

    it('应该拒绝全0的ID', () => {
      expect(IdGenerator.validate('0000000000')).toBe(false);
    });
  });

  describe('encodeBase62', () => {
    it('应该正确编码数值', () => {
      const testCases: Array<[bigint, number, string]> = [
        [0n, 10, '0000000000'],
        [1n, 10, '0000000001'],
        [61n, 10, '000000000Z'],
        [62n, 10, '0000000010'],
        [123n, 10, '000000001Z'],
      ];

      testCases.forEach(([value, length, expected]) => {
        const result = IdGenerator.encodeBase62(value, length);
        expect(result).toBe(expected);
      });
    });

    it('应该处理大数值', () => {
      const largeValue = 123456789n;
      const encoded = IdGenerator.encodeBase62(largeValue, 10);
      expect(encoded).toHaveLength(10);
      expect(encoded).toMatch(/^[0-9a-zA-Z]{10}$/);
    });

    it('应该截断超长结果', () => {
      // 测试超过长度限制的值
      const veryLargeValue = 62n ** 15n; // 远超10位62进制能表示的范围
      const encoded = IdGenerator.encodeBase62(veryLargeValue, 10);
      expect(encoded).toHaveLength(10);
    });
  });

  describe('decodeBase62', () => {
    it('应该正确解码62进制字符串', () => {
      const testCases: Array<[string, bigint]> = [
        ['0000000000', 0n],
        ['0000000001', 1n],
        ['000000000Z', 61n],
        ['0000000010', 62n],
      ];

      testCases.forEach(([str, expected]) => {
        expect(IdGenerator.decodeBase62(str)).toBe(expected);
      });
    });

    it('应该在遇到无效字符时抛出错误', () => {
      expect(() => IdGenerator.decodeBase62('invalid!')).toThrow(
        'Invalid character'
      );
    });
  });

  describe('编码解码往返', () => {
    it('编码后解码应该得到原值', () => {
      const testValues = [0n, 1n, 100n, 123456n, 999999999n];

      testValues.forEach((value) => {
        const encoded = IdGenerator.encodeBase62(value, 10);
        const decoded = IdGenerator.decodeBase62(encoded);
        expect(decoded).toBe(value);
      });
    });
  });
});

describe('IdPool', () => {
  it('应该能从池中获取ID', async () => {
    const pool = new IdPool(10, 20);
    const id = await pool.getId();
    expect(id).toHaveLength(10);
  });

  it('应该自动重填ID池', async () => {
    const pool = new IdPool(5, 10);
    const ids: string[] = [];

    // 获取超过最小大小的ID
    for (let i = 0; i < 8; i++) {
      ids.push(await pool.getId());
    }

    // 所有ID应该是唯一的
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('应该返回正确的池统计信息', () => {
    const pool = new IdPool(50, 100);
    const stats = pool.getStats();

    expect(stats.minSize).toBe(50);
    expect(stats.maxSize).toBe(100);
    expect(stats.size).toBeGreaterThan(0);
  });
});
