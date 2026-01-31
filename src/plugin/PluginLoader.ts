/**
 * 插件加载器
 *
 * 负责从文件系统加载插件代码和资源
 */

import { Logger } from '../core/logger';
import type { Plugin, PluginManifest } from '../types';
import { PluginManifestLoader } from './PluginManifestLoader';

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
 * 插件加载选项
 */
export interface LoadPluginOptions {
  /** 是否验证清单 */
  validateManifest?: boolean;
  /** 是否检查依赖 */
  checkDependencies?: boolean;
  /** 是否在沙箱中运行 */
  sandbox?: boolean;
}

/**
 * 插件包结构
 */
export interface PluginPackage {
  /** 插件清单 */
  manifest: PluginManifest;
  /** 插件实例 */
  plugin: Plugin;
  /** 插件路径 */
  path: string;
}

/**
 * 插件加载器类
 */
export class PluginLoader {
  private logger: Logger;
  private manifestLoader: PluginManifestLoader;

  constructor(logger: Logger) {
    this.logger = logger;
    this.manifestLoader = new PluginManifestLoader(logger);
  }

  /**
   * 从路径加载插件
   * @param pluginPath 插件目录路径
   * @param options 加载选项
   * @returns 插件包
   */
  async loadFromPath(
    pluginPath: string,
    options: LoadPluginOptions = {}
  ): Promise<PluginPackage> {
    this.logger.info(`Loading plugin from path: ${pluginPath}`);

    // 1. 加载清单文件
    const manifest = await this.loadManifestFromPath(pluginPath);

    // 2. 验证清单
    if (options.validateManifest !== false) {
      const validation = this.manifestLoader.validateManifest(manifest, true);
      if (!validation.valid) {
        throw new Error(
          `Plugin manifest validation failed:\n${validation.errors.join('\n')}`
        );
      }
    }

    // 3. 加载插件代码
    const plugin = await this.loadPluginCode(pluginPath, manifest, options);

    this.logger.info(`Plugin loaded successfully: ${manifest.id}`);

    return {
      manifest,
      plugin,
      path: pluginPath,
    };
  }

  /**
   * 从清单加载插件
   * @param manifest 插件清单
   * @param basePath 基础路径
   * @param options 加载选项
   * @returns 插件包
   */
  async loadFromManifest(
    manifest: PluginManifest,
    basePath: string,
    options: LoadPluginOptions = {}
  ): Promise<PluginPackage> {
    this.logger.info(`Loading plugin from manifest: ${manifest.id}`);

    // 验证清单
    if (options.validateManifest !== false) {
      const validation = this.manifestLoader.validateManifest(manifest, true);
      if (!validation.valid) {
        throw new Error(
          `Plugin manifest validation failed:\n${validation.errors.join('\n')}`
        );
      }
    }

    // 加载插件代码
    const plugin = await this.loadPluginCode(basePath, manifest, options);

    return {
      manifest,
      plugin,
      path: basePath,
    };
  }

  /**
   * 从目录加载清单文件
   * @param pluginPath 插件目录路径
   * @returns 插件清单
   */
  private async loadManifestFromPath(
    pluginPath: string
  ): Promise<PluginManifest> {
    // 尝试加载 manifest.yaml
    try {
      const yamlPath = this.joinPath(pluginPath, 'manifest.yaml');
      const yamlContent = await this.readTextFile(yamlPath);
      return this.manifestLoader.loadFromYaml(yamlContent);
    } catch (yamlError) {
      this.logger.debug('manifest.yaml not found, trying manifest.json');

      // 尝试加载 manifest.json
      try {
        const jsonPath = this.joinPath(pluginPath, 'manifest.json');
        const jsonContent = await this.readTextFile(jsonPath);
        return this.manifestLoader.loadFromJson(jsonContent);
      } catch (jsonError) {
        throw new Error(`Failed to load manifest: ${yamlError}; ${jsonError}`);
      }
    }
  }

  /**
   * 加载插件代码
   * @param basePath 基础路径
   * @param manifest 插件清单
   * @param options 加载选项
   * @returns 插件实例
   */
  private async loadPluginCode(
    basePath: string,
    manifest: PluginManifest,
    options: LoadPluginOptions
  ): Promise<Plugin> {
    const mainPath = this.joinPath(basePath, manifest.main);

    this.logger.debug(`Loading plugin code from: ${mainPath}`);

    try {
      // 根据环境选择加载方式
      if (typeof window !== 'undefined') {
        // 浏览器环境
        return await this.loadInBrowser(mainPath, manifest, options);
      } else {
        // Node.js环境
        return await this.loadInNode(mainPath, manifest, options);
      }
    } catch (error) {
      const err = toError(error);
      this.logger.error(`Failed to load plugin code from ${mainPath}`, err);
      throw new Error(`Plugin code loading failed: ${err.message}`);
    }
  }

  /**
   * 在浏览器环境中加载插件
   * @param mainPath 主文件路径
   * @param manifest 清单
   * @param options 选项
   * @returns 插件实例
   */
  private async loadInBrowser(
    mainPath: string,
    manifest: PluginManifest,
    options: LoadPluginOptions
  ): Promise<Plugin> {
    // 如果需要沙箱，使用 iframe
    if (options.sandbox) {
      return this.loadInSandbox(mainPath, manifest);
    }

    // 动态导入
    try {
      const module = await import(/* @vite-ignore */ mainPath);
      const PluginClass = module.default || module[manifest.id];

      if (!PluginClass) {
        throw new Error(`Plugin export not found: ${manifest.id}`);
      }

      // 如果是类，实例化
      if (typeof PluginClass === 'function') {
        return new PluginClass();
      }

      // 如果是对象，直接返回
      return PluginClass as Plugin;
    } catch (error) {
      const err = toError(error);
      this.logger.error('Dynamic import failed', err);
      throw err;
    }
  }

  /**
   * 在Node.js环境中加载插件
   * @param mainPath 主文件路径
   * @param manifest 清单
   * @param options 选项
   * @returns 插件实例
   */
  private async loadInNode(
    mainPath: string,
    manifest: PluginManifest,
    _options: LoadPluginOptions
  ): Promise<Plugin> {
    // Node.js 动态导入
    try {
      // 使用 require 或 import (根据文件类型)
      const module = await import(mainPath);
      const PluginClass = module.default || module[manifest.id];

      if (!PluginClass) {
        throw new Error(`Plugin export not found: ${manifest.id}`);
      }

      // 如果是类，实例化
      if (typeof PluginClass === 'function') {
        return new PluginClass();
      }

      // 如果是对象，直接返回
      return PluginClass as Plugin;
    } catch (error) {
      const err = toError(error);
      this.logger.error('Module import failed', err);
      throw err;
    }
  }

  /**
   * 在沙箱中加载插件（iframe方式）
   * @param mainPath 主文件路径
   * @param manifest 清单
   * @returns 插件实例
   */
  private async loadInSandbox(
    mainPath: string,
    manifest: PluginManifest
  ): Promise<Plugin> {
    this.logger.warn(
      'Sandbox loading is not fully implemented yet, using standard loading'
    );

    // TODO: 实现完整的沙箱加载
    // 1. 创建 iframe
    // 2. 加载插件代码到 iframe
    // 3. 创建代理对象进行跨框架通信

    // 目前使用标准加载
    return this.loadInBrowser(mainPath, manifest, { sandbox: false });
  }

  /**
   * 读取文本文件
   * @param path 文件路径
   * @returns 文件内容
   */
  private async readTextFile(path: string): Promise<string> {
    if (typeof window !== 'undefined') {
      // 浏览器环境 - 使用 fetch
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
      }
      return response.text();
    } else {
      // Node.js 环境 - 使用 fs
      const fs = await import('fs/promises');
      return fs.readFile(path, 'utf-8');
    }
  }

  /**
   * 路径拼接
   * @param parts 路径部分
   * @returns 完整路径
   */
  private joinPath(...parts: string[]): string {
    if (typeof window !== 'undefined') {
      // 浏览器环境 - 使用 URL
      return parts.join('/').replace(/\/+/g, '/');
    } else {
      // Node.js 环境 - 使用 path
      const path = require('path');
      return path.join(...parts);
    }
  }

  /**
   * 卸载插件
   * @param plugin 插件实例
   */
  async unload(plugin: Plugin): Promise<void> {
    this.logger.info(`Unloading plugin: ${plugin.id}`);

    try {
      if (plugin.uninstall) {
        await plugin.uninstall();
      }

      this.logger.info(`Plugin unloaded: ${plugin.id}`);
    } catch (error) {
      const err = toError(error);
      this.logger.error(`Failed to unload plugin ${plugin.id}`, err);
      throw err;
    }
  }
}
