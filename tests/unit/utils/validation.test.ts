/**
 * 验证工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  validateId,
  validateSemanticVersion,
  validateURL,
  validateThemeId,
  validateCardName,
  validateTag,
} from '@/utils/validation';

describe('validation utils', () => {
  describe('validateId', () => {
    it('应该验证正确的ID', () => {
      expect(validateId('a1B2c3D4e5')).toBe(true);
      expect(validateId('Xy9Zw8Vt7U')).toBe(true);
      expect(validateId('0123456789')).toBe(true);
    });

    it('应该拒绝长度错误的ID', () => {
      expect(validateId('short')).toBe(false);
      expect(validateId('toolongid123')).toBe(false);
    });

    it('应该拒绝包含无效字符的ID', () => {
      expect(validateId('invalid-id')).toBe(false);
      expect(validateId('bad@id#123')).toBe(false);
    });

    it('应该拒绝全0的ID', () => {
      expect(validateId('0000000000')).toBe(false);
    });
  });

  describe('validateSemanticVersion', () => {
    it('应该验证正确的版本号', () => {
      expect(validateSemanticVersion('1.0.0')).toBe(true);
      expect(validateSemanticVersion('2.1.5')).toBe(true);
      expect(validateSemanticVersion('10.20.30')).toBe(true);
    });

    it('应该拒绝错误格式的版本号', () => {
      expect(validateSemanticVersion('1.0')).toBe(false);
      expect(validateSemanticVersion('v1.0.0')).toBe(false);
      expect(validateSemanticVersion('1.0.0-beta')).toBe(false);
    });
  });

  describe('validateURL', () => {
    it('应该验证正确的URL', () => {
      expect(validateURL('https://example.com')).toBe(true);
      expect(validateURL('http://localhost:3000')).toBe(true);
      expect(validateURL('https://example.com/path/to/file.card')).toBe(true);
    });

    it('应该拒绝无效的URL', () => {
      expect(validateURL('not a url')).toBe(false);
      expect(validateURL('example.com')).toBe(false);
    });
  });

  describe('validateThemeId', () => {
    it('应该验证正确的主题ID', () => {
      expect(validateThemeId('薯片官方:默认主题')).toBe(true);
      expect(validateThemeId('publisher:theme-name')).toBe(true);
    });

    it('应该允许空主题ID', () => {
      expect(validateThemeId('')).toBe(true);
    });

    it('应该拒绝错误格式的主题ID', () => {
      expect(validateThemeId('nocolon')).toBe(false);
      expect(validateThemeId(':nopublisher')).toBe(false);
      expect(validateThemeId('noname:')).toBe(false);
    });
  });

  describe('validateCardName', () => {
    it('应该验证正确的卡片名称', () => {
      expect(validateCardName('我的卡片')).toBe(true);
      expect(validateCardName('My Card')).toBe(true);
    });

    it('应该拒绝空名称', () => {
      expect(validateCardName('')).toBe(false);
    });

    it('应该拒绝超长名称', () => {
      const longName = 'a'.repeat(501);
      expect(validateCardName(longName)).toBe(false);
    });

    it('应该接受最大长度的名称', () => {
      const maxName = 'a'.repeat(500);
      expect(validateCardName(maxName)).toBe(true);
    });
  });

  describe('validateTag', () => {
    it('应该验证简单标签', () => {
      expect(validateTag('旅行')).toBe(true);
      expect(validateTag('travel')).toBe(true);
    });

    it('应该验证结构化标签', () => {
      expect(validateTag(['地点', '日本'])).toBe(true);
      expect(validateTag(['时间', '2026年', '一月'])).toBe(true);
    });

    it('应该拒绝空标签', () => {
      expect(validateTag('')).toBe(false);
    });

    it('应该拒绝长度不足的数组标签', () => {
      expect(validateTag(['single'])).toBe(false);
    });
  });
});
