/**
 * 权限管理器
 *
 * 管理模块权限和权限验证
 */

import type { Permission } from '../../types/protocol';
import { PermissionError } from '../error';

/**
 * 权限级别
 */
export enum PermissionLevel {
  Basic = 'basic',
  Standard = 'standard',
  Admin = 'admin',
}

/**
 * 权限定义
 */
export interface PermissionDefinition {
  id: Permission;
  name: string;
  description: string;
  level: PermissionLevel;
}

/**
 * 模块权限
 */
interface ModulePermissions {
  moduleId: string;
  permissions: Set<Permission>;
}

/**
 * 权限管理器类
 */
export class PermissionManager {
  private modulePermissions: Map<string, ModulePermissions>;
  private permissionDefinitions: Map<Permission, PermissionDefinition>;

  constructor() {
    this.modulePermissions = new Map();
    this.permissionDefinitions = new Map();
    this.initializeDefaultPermissions();
  }

  /**
   * 初始化默认权限定义
   */
  private initializeDefaultPermissions(): void {
    const defaultPermissions: PermissionDefinition[] = [
      {
        id: 'card.read',
        name: '读取卡片',
        description: '允许读取卡片文件内容',
        level: PermissionLevel.Basic,
      },
      {
        id: 'card.write',
        name: '写入卡片',
        description: '允许修改卡片文件内容',
        level: PermissionLevel.Standard,
      },
      {
        id: 'card.delete',
        name: '删除卡片',
        description: '允许删除卡片文件',
        level: PermissionLevel.Standard,
      },
      {
        id: 'box.read',
        name: '读取箱子',
        description: '允许读取箱子文件内容',
        level: PermissionLevel.Basic,
      },
      {
        id: 'box.write',
        name: '写入箱子',
        description: '允许修改箱子文件内容',
        level: PermissionLevel.Standard,
      },
      {
        id: 'resource.read',
        name: '读取资源',
        description: '允许读取资源文件',
        level: PermissionLevel.Basic,
      },
      {
        id: 'resource.write',
        name: '写入资源',
        description: '允许写入资源文件',
        level: PermissionLevel.Standard,
      },
      {
        id: 'plugin.install',
        name: '安装插件',
        description: '允许安装插件',
        level: PermissionLevel.Standard,
      },
      {
        id: 'plugin.manage',
        name: '管理插件',
        description: '允许启用/禁用插件',
        level: PermissionLevel.Standard,
      },
      {
        id: 'config.read',
        name: '读取配置',
        description: '允许读取配置',
        level: PermissionLevel.Basic,
      },
      {
        id: 'config.write',
        name: '写入配置',
        description: '允许修改配置',
        level: PermissionLevel.Standard,
      },
      {
        id: 'system.admin',
        name: '系统管理',
        description: '允许修改系统配置',
        level: PermissionLevel.Admin,
      },
    ];

    for (const perm of defaultPermissions) {
      this.permissionDefinitions.set(perm.id, perm);
    }
  }

  /**
   * 授予权限
   * @param moduleId 模块ID
   * @param permissions 权限列表
   */
  grant(moduleId: string, permissions: Permission[]): void {
    let modulePerms = this.modulePermissions.get(moduleId);

    if (!modulePerms) {
      modulePerms = {
        moduleId,
        permissions: new Set(),
      };
      this.modulePermissions.set(moduleId, modulePerms);
    }

    for (const permission of permissions) {
      modulePerms.permissions.add(permission);
    }
  }

  /**
   * 撤销权限
   * @param moduleId 模块ID
   * @param permissions 权限列表
   */
  revoke(moduleId: string, permissions: Permission[]): void {
    const modulePerms = this.modulePermissions.get(moduleId);

    if (modulePerms) {
      for (const permission of permissions) {
        modulePerms.permissions.delete(permission);
      }
    }
  }

  /**
   * 检查权限
   * @param moduleId 模块ID
   * @param permission 权限
   * @returns 是否有权限
   */
  check(moduleId: string, permission: Permission): boolean {
    const modulePerms = this.modulePermissions.get(moduleId);

    if (!modulePerms) {
      return false;
    }

    return modulePerms.permissions.has(permission);
  }

  /**
   * 验证权限（如果没有权限则抛出错误）
   * @param moduleId 模块ID
   * @param permission 权限
   */
  verify(moduleId: string, permission: Permission): void {
    if (!this.check(moduleId, permission)) {
      throw new PermissionError(
        `Module '${moduleId}' does not have '${permission}' permission`,
        {
          moduleId,
          permission,
          hasPermissions: this.list(moduleId),
        }
      );
    }
  }

  /**
   * 列出模块的所有权限
   * @param moduleId 模块ID
   * @returns 权限数组
   */
  list(moduleId: string): Permission[] {
    const modulePerms = this.modulePermissions.get(moduleId);

    if (!modulePerms) {
      return [];
    }

    return Array.from(modulePerms.permissions);
  }

  /**
   * 注册权限定义
   * @param definition 权限定义
   */
  registerPermission(definition: PermissionDefinition): void {
    this.permissionDefinitions.set(definition.id, definition);
  }

  /**
   * 获取权限定义
   * @param permission 权限ID
   */
  getPermissionDefinition(
    permission: Permission
  ): PermissionDefinition | undefined {
    return this.permissionDefinitions.get(permission);
  }

  /**
   * 列出所有权限定义
   */
  listAllPermissions(): PermissionDefinition[] {
    return Array.from(this.permissionDefinitions.values());
  }
}
