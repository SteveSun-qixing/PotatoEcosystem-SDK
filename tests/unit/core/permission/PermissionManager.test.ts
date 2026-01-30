/**
 * 权限管理器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionManager, PermissionLevel } from '@/core/permission';
import { PermissionError } from '@/core/error';

describe('PermissionManager', () => {
  let permissionManager: PermissionManager;

  beforeEach(() => {
    permissionManager = new PermissionManager();
  });

  describe('grant', () => {
    it('应该授予权限', () => {
      permissionManager.grant('module1', ['card.read', 'card.write']);

      expect(permissionManager.check('module1', 'card.read')).toBe(true);
      expect(permissionManager.check('module1', 'card.write')).toBe(true);
    });

    it('应该累加授予的权限', () => {
      permissionManager.grant('module1', ['card.read']);
      permissionManager.grant('module1', ['card.write']);

      const permissions = permissionManager.list('module1');
      expect(permissions).toContain('card.read');
      expect(permissions).toContain('card.write');
    });
  });

  describe('revoke', () => {
    it('应该撤销权限', () => {
      permissionManager.grant('module1', ['card.read', 'card.write']);
      permissionManager.revoke('module1', ['card.write']);

      expect(permissionManager.check('module1', 'card.read')).toBe(true);
      expect(permissionManager.check('module1', 'card.write')).toBe(false);
    });
  });

  describe('check', () => {
    it('应该检查权限', () => {
      permissionManager.grant('module1', ['card.read']);

      expect(permissionManager.check('module1', 'card.read')).toBe(true);
      expect(permissionManager.check('module1', 'card.write')).toBe(false);
      expect(permissionManager.check('module2', 'card.read')).toBe(false);
    });
  });

  describe('verify', () => {
    it('应该验证权限（有权限时不抛出错误）', () => {
      permissionManager.grant('module1', ['card.read']);

      expect(() => {
        permissionManager.verify('module1', 'card.read');
      }).not.toThrow();
    });

    it('应该验证权限（无权限时抛出错误）', () => {
      expect(() => {
        permissionManager.verify('module1', 'card.write');
      }).toThrow(PermissionError);
    });
  });

  describe('list', () => {
    it('应该列出模块的所有权限', () => {
      permissionManager.grant('module1', ['card.read', 'card.write', 'box.read']);

      const permissions = permissionManager.list('module1');
      expect(permissions).toHaveLength(3);
      expect(permissions).toContain('card.read');
      expect(permissions).toContain('card.write');
      expect(permissions).toContain('box.read');
    });

    it('应该返回空数组（模块无权限）', () => {
      const permissions = permissionManager.list('nonexistent');
      expect(permissions).toEqual([]);
    });
  });

  describe('权限定义', () => {
    it('应该包含默认权限定义', () => {
      const allPermissions = permissionManager.listAllPermissions();
      expect(allPermissions.length).toBeGreaterThan(0);

      const cardRead = permissionManager.getPermissionDefinition('card.read');
      expect(cardRead).toBeDefined();
      expect(cardRead?.name).toBe('读取卡片');
      expect(cardRead?.level).toBe(PermissionLevel.Basic);
    });

    it('应该注册自定义权限定义', () => {
      permissionManager.registerPermission({
        id: 'custom.permission',
        name: 'Custom Permission',
        description: 'A custom permission',
        level: PermissionLevel.Standard,
      });

      const customPerm = permissionManager.getPermissionDefinition('custom.permission');
      expect(customPerm).toBeDefined();
      expect(customPerm?.name).toBe('Custom Permission');
    });
  });
});
