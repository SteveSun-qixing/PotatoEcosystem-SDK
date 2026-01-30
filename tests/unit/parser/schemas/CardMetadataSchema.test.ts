/**
 * 卡片元数据Schema测试
 */

import { describe, it, expect } from 'vitest';
import {
  validateCardMetadata,
  normalizeCardMetadata,
} from '@/parser/schemas/CardMetadataSchema';
import type { CardMetadata } from '@/types';

describe('CardMetadataSchema', () => {
  describe('validateCardMetadata', () => {
    it('应该验证有效的元数据', () => {
      const validMetadata: CardMetadata = {
        chip_standards_version: '1.0.0',
        card_id: 'a1B2c3D4e5',
        name: '测试卡片',
        created_at: '2026-01-30T10:00:00.000Z',
        modified_at: '2026-01-30T10:30:00.000Z',
      };

      expect(validateCardMetadata(validMetadata)).toBe(true);
    });

    it('应该验证包含可选字段的元数据', () => {
      const metadata: CardMetadata = {
        chip_standards_version: '1.0.0',
        card_id: 'a1B2c3D4e5',
        name: '测试卡片',
        created_at: '2026-01-30T10:00:00.000Z',
        modified_at: '2026-01-30T10:30:00.000Z',
        theme: '薯片官方:默认主题',
        tags: ['旅行', ['地点', '日本']],
        visibility: 'public',
      };

      expect(validateCardMetadata(metadata)).toBe(true);
    });

    it('应该拒绝缺少必需字段的元数据', () => {
      const invalidMetadata = {
        chip_standards_version: '1.0.0',
        // 缺少card_id
        name: '测试卡片',
      };

      expect(validateCardMetadata(invalidMetadata)).toBe(false);
    });

    it('应该拒绝无效的版本号', () => {
      const invalidMetadata = {
        chip_standards_version: 'invalid',
        card_id: 'a1B2c3D4e5',
        name: '测试卡片',
        created_at: '2026-01-30T10:00:00.000Z',
        modified_at: '2026-01-30T10:30:00.000Z',
      };

      expect(validateCardMetadata(invalidMetadata)).toBe(false);
    });

    it('应该拒绝无效的ID', () => {
      const invalidMetadata = {
        chip_standards_version: '1.0.0',
        card_id: 'invalid-id',
        name: '测试卡片',
        created_at: '2026-01-30T10:00:00.000Z',
        modified_at: '2026-01-30T10:30:00.000Z',
      };

      expect(validateCardMetadata(invalidMetadata)).toBe(false);
    });

    it('应该拒绝超长名称', () => {
      const invalidMetadata = {
        chip_standards_version: '1.0.0',
        card_id: 'a1B2c3D4e5',
        name: 'a'.repeat(501), // 超过500字符
        created_at: '2026-01-30T10:00:00.000Z',
        modified_at: '2026-01-30T10:30:00.000Z',
      };

      expect(validateCardMetadata(invalidMetadata)).toBe(false);
    });

    it('应该拒绝无效的主题ID', () => {
      const invalidMetadata = {
        chip_standards_version: '1.0.0',
        card_id: 'a1B2c3D4e5',
        name: '测试卡片',
        created_at: '2026-01-30T10:00:00.000Z',
        modified_at: '2026-01-30T10:30:00.000Z',
        theme: 'invalid-theme-format',
      };

      expect(validateCardMetadata(invalidMetadata)).toBe(false);
    });

    it('应该拒绝无效的可见性值', () => {
      const invalidMetadata = {
        chip_standards_version: '1.0.0',
        card_id: 'a1B2c3D4e5',
        name: '测试卡片',
        created_at: '2026-01-30T10:00:00.000Z',
        modified_at: '2026-01-30T10:30:00.000Z',
        visibility: 'invalid',
      };

      expect(validateCardMetadata(invalidMetadata)).toBe(false);
    });
  });

  describe('normalizeCardMetadata', () => {
    it('应该填充默认值', () => {
      const partial = {
        card_id: 'a1B2c3D4e5',
        name: '测试卡片',
      };

      const normalized = normalizeCardMetadata(partial);

      expect(normalized.chip_standards_version).toBe('1.0.0');
      expect(normalized.created_at).toBeDefined();
      expect(normalized.modified_at).toBeDefined();
    });

    it('应该保留已有值', () => {
      const metadata: CardMetadata = {
        chip_standards_version: '1.0.0',
        card_id: 'a1B2c3D4e5',
        name: '测试卡片',
        created_at: '2026-01-30T10:00:00.000Z',
        modified_at: '2026-01-30T10:30:00.000Z',
        theme: '薯片官方:默认主题',
      };

      const normalized = normalizeCardMetadata(metadata);

      expect(normalized.theme).toBe('薯片官方:默认主题');
      expect(normalized.created_at).toBe('2026-01-30T10:00:00.000Z');
    });
  });
});
