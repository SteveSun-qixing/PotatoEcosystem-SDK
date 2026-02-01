import { describe, it, expect } from 'vitest';
import {
  generateId,
  isValidId,
  generateUuid,
  isValidUuid,
  generateShortId,
} from '../../../src/utils/id';

describe('ID 工具', () => {
  describe('generateId', () => {
    it('应该生成 10 位字符串', () => {
      const id = generateId();
      expect(id).toHaveLength(10);
    });

    it('应该只包含 62 进制字符', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-zA-Z]{10}$/);
    });

    it('应该生成不同的 ID', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('isValidId', () => {
    it('应该验证有效 ID', () => {
      expect(isValidId('a1B2c3D4e5')).toBe(true);
      expect(isValidId('0123456789')).toBe(true);
      expect(isValidId('abcdefghij')).toBe(true);
      expect(isValidId('ABCDEFGHIJ')).toBe(true);
    });

    it('应该拒绝无效 ID', () => {
      expect(isValidId('')).toBe(false);
      expect(isValidId('short')).toBe(false);
      expect(isValidId('toolongstring')).toBe(false);
      expect(isValidId('has-dash-!')).toBe(false);
      expect(isValidId(null as unknown as string)).toBe(false);
      expect(isValidId(undefined as unknown as string)).toBe(false);
    });
  });

  describe('generateUuid', () => {
    it('应该生成有效的 UUID v4 格式', () => {
      const uuid = generateUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('应该生成不同的 UUID', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUuid());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('isValidUuid', () => {
    it('应该验证有效 UUID', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUuid(generateUuid())).toBe(true);
    });

    it('应该拒绝无效 UUID', () => {
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid('invalid')).toBe(false);
      expect(isValidUuid('550e8400-e29b-11d4-a716-446655440000')).toBe(false); // v1 不是 v4
    });
  });

  describe('generateShortId', () => {
    it('应该生成 8 位字符串', () => {
      const id = generateShortId();
      expect(id).toHaveLength(8);
    });

    it('应该只包含 62 进制字符', () => {
      const id = generateShortId();
      expect(id).toMatch(/^[0-9a-zA-Z]{8}$/);
    });
  });
});
