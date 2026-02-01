import { describe, it, expect } from 'vitest';
import {
  validateCardMetadata,
  validateBoxMetadata,
  validateProtocolVersion,
  validateTimestamp,
  validateTag,
  validateTags,
  validateResourcePath,
  validateFileSize,
  validateMimeType,
  validateUrl,
  validateEmail,
} from '../../../src/utils/validation';
import { generateId } from '../../../src/utils/id';

describe('验证工具', () => {
  describe('validateCardMetadata', () => {
    it('应该验证有效的卡片元数据', () => {
      const metadata = {
        chip_standards_version: '1.0.0',
        card_id: generateId(),
        name: '测试卡片',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      };
      expect(validateCardMetadata(metadata)).toBe(true);
    });

    it('应该拒绝无效的卡片元数据', () => {
      expect(validateCardMetadata(null)).toBe(false);
      expect(validateCardMetadata({})).toBe(false);
      expect(validateCardMetadata({ card_id: 'invalid' })).toBe(false);
    });
  });

  describe('validateBoxMetadata', () => {
    it('应该验证有效的箱子元数据', () => {
      const metadata = {
        chip_standards_version: '1.0.0',
        box_id: generateId(),
        name: '测试箱子',
        layout: 'grid',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      };
      expect(validateBoxMetadata(metadata)).toBe(true);
    });

    it('应该拒绝无效的箱子元数据', () => {
      expect(validateBoxMetadata(null)).toBe(false);
      expect(validateBoxMetadata({})).toBe(false);
    });
  });

  describe('validateProtocolVersion', () => {
    it('应该验证有效的版本号', () => {
      expect(validateProtocolVersion('1.0.0')).toBe(true);
      expect(validateProtocolVersion('10.20.30')).toBe(true);
    });

    it('应该拒绝无效的版本号', () => {
      expect(validateProtocolVersion('')).toBe(false);
      expect(validateProtocolVersion('1.0')).toBe(false);
      expect(validateProtocolVersion('v1.0.0')).toBe(false);
    });
  });

  describe('validateTimestamp', () => {
    it('应该验证有效的时间戳', () => {
      expect(validateTimestamp(new Date().toISOString())).toBe(true);
      expect(validateTimestamp('2026-02-01T12:00:00.000Z')).toBe(true);
    });

    it('应该拒绝无效的时间戳', () => {
      expect(validateTimestamp('')).toBe(false);
      expect(validateTimestamp('invalid')).toBe(false);
    });
  });

  describe('validateTag', () => {
    it('应该验证字符串标签', () => {
      expect(validateTag('tag')).toBe(true);
      expect(validateTag('')).toBe(false);
      expect(validateTag('  ')).toBe(false);
    });

    it('应该验证数组标签', () => {
      expect(validateTag(['key', 'value'])).toBe(true);
      expect(validateTag([])).toBe(false);
    });
  });

  describe('validateTags', () => {
    it('应该验证标签列表', () => {
      expect(validateTags(['tag1', 'tag2'])).toBe(true);
      expect(validateTags([['key', 'value']])).toBe(true);
      expect(validateTags('not array' as unknown as unknown[])).toBe(false);
    });
  });

  describe('validateResourcePath', () => {
    it('应该验证有效的资源路径', () => {
      expect(validateResourcePath('resources/image.png')).toBe(true);
    });

    it('应该拒绝无效的资源路径', () => {
      expect(validateResourcePath('')).toBe(false);
      expect(validateResourcePath('../outside')).toBe(false);
      expect(validateResourcePath('other/path')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('应该验证文件大小', () => {
      expect(validateFileSize(1000, 10000)).toBe(true);
      expect(validateFileSize(0, 10000)).toBe(true);
      expect(validateFileSize(20000, 10000)).toBe(false);
      expect(validateFileSize(-1, 10000)).toBe(false);
    });
  });

  describe('validateMimeType', () => {
    it('应该验证有效的 MIME 类型', () => {
      expect(validateMimeType('image/png')).toBe(true);
      expect(validateMimeType('application/json')).toBe(true);
    });

    it('应该拒绝无效的 MIME 类型', () => {
      expect(validateMimeType('')).toBe(false);
      expect(validateMimeType('invalid')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('应该验证有效的 URL', () => {
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('https://example.com/path')).toBe(true);
    });

    it('应该拒绝无效的 URL', () => {
      expect(validateUrl('')).toBe(false);
      expect(validateUrl('not a url')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('应该验证有效的邮箱', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('应该拒绝无效的邮箱', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });
});
