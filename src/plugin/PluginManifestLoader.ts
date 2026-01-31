/**
 * 插件清单加载器
 *
 * 负责加载、解析和验证插件清单文件(manifest.yaml/json)
 */

import * as yaml from 'js-yaml';
import { Logger } from '../core/logger';
import type { PluginManifest, PluginType } from '../types';

/**
 * 将 unknown 错误转换为 Error
 */
function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * 清单验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 清单加载选项
 */
export interface LoadManifestOptions {
  /** 是否进行严格验证 */
  strict?: boolean;
  /** 是否自动补充默认值 */
  fillDefaults?: boolean;
}

/**
 * 插件清单加载器类
 */
export class PluginManifestLoader {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 从YAML字符串加载清单
   * @param yamlContent YAML字符串
   * @param options 加载选项
   * @returns 插件清单对象
   */
  loadFromYaml(
    yamlContent: string,
    options: LoadManifestOptions = {}
  ): PluginManifest {
    try {
      const manifest = yaml.load(yamlContent) as PluginManifest;
      return this.processManifest(manifest, options);
    } catch (error) {
      const err = toError(error);
      this.logger.error('Failed to parse YAML manifest', err);
      throw new Error(`YAML parsing error: ${err.message}`);
    }
  }

  /**
   * 从JSON字符串加载清单
   * @param jsonContent JSON字符串
   * @param options 加载选项
   * @returns 插件清单对象
   */
  loadFromJson(
    jsonContent: string,
    options: LoadManifestOptions = {}
  ): PluginManifest {
    try {
      const manifest = JSON.parse(jsonContent) as PluginManifest;
      return this.processManifest(manifest, options);
    } catch (error) {
      const err = toError(error);
      this.logger.error('Failed to parse JSON manifest', err);
      throw new Error(`JSON parsing error: ${err.message}`);
    }
  }

  /**
   * 从对象加载清单
   * @param manifestObj 清单对象
   * @param options 加载选项
   * @returns 处理后的插件清单
   */
  loadFromObject(
    manifestObj: unknown,
    options: LoadManifestOptions = {}
  ): PluginManifest {
    return this.processManifest(manifestObj as PluginManifest, options);
  }

  /**
   * 验证插件清单
   * @param manifest 插件清单
   * @param strict 是否严格验证
   * @returns 验证结果
   */
  validateManifest(manifest: PluginManifest, strict = false): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证必需字段
    if (!manifest.id) {
      errors.push('Missing required field: id');
    } else if (!this.validatePluginId(manifest.id)) {
      errors.push(
        'Invalid plugin ID format. Expected: "publisher:plugin-name"'
      );
    }

    if (!manifest.name) {
      errors.push('Missing required field: name');
    }

    if (!manifest.version) {
      errors.push('Missing required field: version');
    } else if (!this.validateVersion(manifest.version)) {
      errors.push('Invalid version format. Expected semantic version (x.y.z)');
    }

    if (!manifest.type) {
      errors.push('Missing required field: type');
    } else if (!this.validatePluginType(manifest.type)) {
      errors.push(`Invalid plugin type: ${manifest.type}`);
    }

    if (!manifest.main) {
      errors.push('Missing required field: main');
    }

    // 验证依赖
    if (manifest.dependencies) {
      const depResult = this.validateDependencies(manifest.dependencies);
      errors.push(...depResult.errors);
      warnings.push(...depResult.warnings);
    }

    // 验证权限
    if (manifest.permissions) {
      const permResult = this.validatePermissions(manifest.permissions);
      errors.push(...permResult.errors);
      warnings.push(...permResult.warnings);
    }

    // 验证协议版本
    if (manifest.protocol_version) {
      if (!this.validateVersionRange(manifest.protocol_version)) {
        errors.push('Invalid protocol_version format');
      }
    }

    // 严格模式的额外验证
    if (strict) {
      if (!manifest.description) {
        warnings.push('Recommended field missing: description');
      }
      if (!manifest.author) {
        warnings.push('Recommended field missing: author');
      }
      if (!manifest.publisher) {
        warnings.push('Recommended field missing: publisher');
      }
      if (!manifest.license) {
        warnings.push('Recommended field missing: license');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 处理清单
   * @param manifest 原始清单
   * @param options 处理选项
   * @returns 处理后的清单
   */
  private processManifest(
    manifest: PluginManifest,
    options: LoadManifestOptions
  ): PluginManifest {
    // 验证清单
    const validation = this.validateManifest(manifest, options.strict);

    if (!validation.valid) {
      const errorMsg = `Manifest validation failed:\n${validation.errors.join('\n')}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // 输出警告
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((warning) => {
        this.logger.warn(`Manifest warning: ${warning}`);
      });
    }

    // 补充默认值
    if (options.fillDefaults) {
      return this.fillDefaults(manifest);
    }

    return manifest;
  }

  /**
   * 补充默认值
   * @param manifest 清单
   * @returns 补充后的清单
   */
  private fillDefaults(manifest: PluginManifest): PluginManifest {
    return {
      ...manifest,
      description: manifest.description ?? '',
      author: manifest.author ?? '',
      publisher: manifest.publisher ?? '',
      license: manifest.license ?? 'MIT',
      icon: manifest.icon ?? '',
      screenshots: manifest.screenshots ?? [],
      tags: manifest.tags ?? [],
      category: manifest.category ?? 'other',
      dependencies: manifest.dependencies ?? {
        plugins: [],
        libs: [],
      },
      permissions: manifest.permissions ?? [],
      protocol_version: manifest.protocol_version ?? {
        min: '1.0.0',
        max: '1.0.0',
      },
      compatibility: manifest.compatibility ?? {},
      config_schema: manifest.config_schema ?? {},
      services: manifest.services ?? [],
      i18n: manifest.i18n ?? {},
    };
  }

  /**
   * 验证插件ID格式
   * @param id 插件ID
   * @returns 是否有效
   */
  private validatePluginId(id: string): boolean {
    // 格式: publisher:plugin-name
    const pattern = /^[a-z0-9-]+:[a-z0-9-]+$/;
    return pattern.test(id);
  }

  /**
   * 验证语义化版本号
   * @param version 版本号
   * @returns 是否有效
   */
  private validateVersion(version: string): boolean {
    const pattern = /^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/;
    return pattern.test(version);
  }

  /**
   * 验证插件类型
   * @param type 插件类型
   * @returns 是否有效
   */
  private validatePluginType(type: PluginType): boolean {
    const validTypes: PluginType[] = [
      'base_card',
      'layout',
      'theme',
      'tool',
      'module',
    ];
    return validTypes.includes(type);
  }

  /**
   * 验证版本范围
   * @param range 版本范围
   * @returns 是否有效
   */
  private validateVersionRange(range: { min: string; max: string }): boolean {
    return this.validateVersion(range.min) && this.validateVersion(range.max);
  }

  /**
   * 验证版本号或版本范围字符串
   * @param version 版本号或范围（如 "1.0.0" 或 "^1.0.0" 或 "~1.0.0"）
   * @returns 是否有效
   */
  private validateVersionOrRange(version: string): boolean {
    // 移除前缀符号
    const cleanVersion = version.replace(/^[\^~]/, '');

    // 检查是否是版本范围（如 "1.0.0-2.0.0"）
    if (cleanVersion.includes('-')) {
      const parts = cleanVersion.split('-');
      return parts.every((part) => this.validateVersion(part.trim()));
    }

    return this.validateVersion(cleanVersion);
  }

  /**
   * 验证依赖项
   * @param dependencies 依赖项
   * @returns 验证结果
   */
  private validateDependencies(dependencies: {
    plugins?: Array<{ id: string; version: string }>;
    libs?: Array<{ name: string; version: string }>;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证插件依赖
    if (dependencies.plugins) {
      dependencies.plugins.forEach((dep, index) => {
        if (!dep.id) {
          errors.push(`Plugin dependency ${index}: missing id`);
        } else if (!this.validatePluginId(dep.id)) {
          errors.push(`Plugin dependency ${index}: invalid id format`);
        }

        if (!dep.version) {
          errors.push(`Plugin dependency ${index}: missing version`);
        } else if (!this.validateVersionOrRange(dep.version)) {
          errors.push(`Plugin dependency ${index}: invalid version format`);
        }
      });
    }

    // 验证库依赖
    if (dependencies.libs) {
      dependencies.libs.forEach((dep, index) => {
        if (!dep.name) {
          errors.push(`Library dependency ${index}: missing name`);
        }

        if (!dep.version) {
          errors.push(`Library dependency ${index}: missing version`);
        }
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证权限
   * @param permissions 权限列表
   * @returns 验证结果
   */
  private validatePermissions(permissions: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validPermissions = [
      'file.read',
      'file.write',
      'file.delete',
      'network.http',
      'network.websocket',
      'storage.local',
      'storage.session',
      'clipboard.read',
      'clipboard.write',
      'notification.show',
      'dialog.open',
      'dialog.save',
      'system.exec',
      'camera.access',
      'microphone.access',
    ];

    permissions.forEach((permission) => {
      if (!validPermissions.includes(permission)) {
        warnings.push(`Unknown permission: ${permission}`);
      }
    });

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 序列化清单为YAML
   * @param manifest 插件清单
   * @returns YAML字符串
   */
  toYaml(manifest: PluginManifest): string {
    try {
      return yaml.dump(manifest, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
      });
    } catch (error) {
      const err = toError(error);
      this.logger.error('Failed to serialize manifest to YAML', err);
      throw new Error(`YAML serialization error: ${err.message}`);
    }
  }

  /**
   * 序列化清单为JSON
   * @param manifest 插件清单
   * @returns JSON字符串
   */
  toJson(manifest: PluginManifest, pretty = true): string {
    try {
      return pretty
        ? JSON.stringify(manifest, null, 2)
        : JSON.stringify(manifest);
    } catch (error) {
      const err = toError(error);
      this.logger.error('Failed to serialize manifest to JSON', err);
      throw new Error(`JSON serialization error: ${err.message}`);
    }
  }
}
