/**
 * DependencyResolver 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DependencyResolver,
  VersionComparisonResult,
} from '../../../src/plugin/DependencyResolver';
import { Logger } from '../../../src/core/logger';
import type { PluginManifest } from '../../../src/types';

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    resolver = new DependencyResolver(logger);
  });

  describe('依赖解析', () => {
    it('应该解析简单的依赖链', () => {
      const manifests = new Map<string, PluginManifest>([
        [
          'test:plugin-a',
          {
            id: 'test:plugin-a',
            name: 'Plugin A',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
            dependencies: {
              plugins: [{ id: 'test:plugin-b', version: '1.0.0' }],
            },
          },
        ],
        [
          'test:plugin-b',
          {
            id: 'test:plugin-b',
            name: 'Plugin B',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
          },
        ],
      ]);

      const result = resolver.resolve(manifests);

      expect(result.hasCycles).toBe(false);
      expect(result.loadOrder).toHaveLength(2);
      // B should load before A
      expect(result.loadOrder.indexOf('test:plugin-b')).toBeLessThan(
        result.loadOrder.indexOf('test:plugin-a')
      );
    });

    it('应该检测循环依赖', () => {
      const manifests = new Map<string, PluginManifest>([
        [
          'test:plugin-a',
          {
            id: 'test:plugin-a',
            name: 'Plugin A',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
            dependencies: {
              plugins: [{ id: 'test:plugin-b', version: '1.0.0' }],
            },
          },
        ],
        [
          'test:plugin-b',
          {
            id: 'test:plugin-b',
            name: 'Plugin B',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
            dependencies: {
              plugins: [{ id: 'test:plugin-a', version: '1.0.0' }],
            },
          },
        ],
      ]);

      const result = resolver.resolve(manifests);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('应该检测缺失的依赖', () => {
      const manifests = new Map<string, PluginManifest>([
        [
          'test:plugin-a',
          {
            id: 'test:plugin-a',
            name: 'Plugin A',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
            dependencies: {
              plugins: [{ id: 'test:missing-plugin', version: '1.0.0' }],
            },
          },
        ],
      ]);

      const result = resolver.resolve(manifests);

      expect(result.missingDependencies).toContain('test:missing-plugin');
    });

    it('应该处理复杂的依赖树', () => {
      const manifests = new Map<string, PluginManifest>([
        [
          'test:plugin-a',
          {
            id: 'test:plugin-a',
            name: 'Plugin A',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
            dependencies: {
              plugins: [
                { id: 'test:plugin-b', version: '1.0.0' },
                { id: 'test:plugin-c', version: '1.0.0' },
              ],
            },
          },
        ],
        [
          'test:plugin-b',
          {
            id: 'test:plugin-b',
            name: 'Plugin B',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
            dependencies: {
              plugins: [{ id: 'test:plugin-d', version: '1.0.0' }],
            },
          },
        ],
        [
          'test:plugin-c',
          {
            id: 'test:plugin-c',
            name: 'Plugin C',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
          },
        ],
        [
          'test:plugin-d',
          {
            id: 'test:plugin-d',
            name: 'Plugin D',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
          },
        ],
      ]);

      const result = resolver.resolve(manifests);

      expect(result.hasCycles).toBe(false);
      expect(result.loadOrder).toHaveLength(4);
      // D should load before B, and B before A
      expect(result.loadOrder.indexOf('test:plugin-d')).toBeLessThan(
        result.loadOrder.indexOf('test:plugin-b')
      );
      expect(result.loadOrder.indexOf('test:plugin-b')).toBeLessThan(
        result.loadOrder.indexOf('test:plugin-a')
      );
    });
  });

  describe('版本比较', () => {
    it('应该正确比较版本号', () => {
      expect(resolver.compareVersions('1.0.0', '1.0.0')).toBe(
        VersionComparisonResult.Equal
      );
      expect(resolver.compareVersions('1.0.0', '2.0.0')).toBe(
        VersionComparisonResult.Less
      );
      expect(resolver.compareVersions('2.0.0', '1.0.0')).toBe(
        VersionComparisonResult.Greater
      );
      expect(resolver.compareVersions('1.5.0', '1.2.0')).toBe(
        VersionComparisonResult.Greater
      );
    });

    it('应该处理补丁版本号', () => {
      expect(resolver.compareVersions('1.0.1', '1.0.0')).toBe(
        VersionComparisonResult.Greater
      );
      expect(resolver.compareVersions('1.0.0', '1.0.1')).toBe(
        VersionComparisonResult.Less
      );
    });
  });

  describe('版本兼容性检查', () => {
    it('应该检查精确版本匹配', () => {
      expect(resolver.isVersionCompatible('1.0.0', '1.0.0')).toBe(true);
      expect(resolver.isVersionCompatible('1.0.1', '1.0.0')).toBe(false);
    });

    it('应该检查 Caret 范围 (^)', () => {
      expect(resolver.isVersionCompatible('1.2.3', '^1.2.3')).toBe(true);
      expect(resolver.isVersionCompatible('1.3.0', '^1.2.3')).toBe(true);
      expect(resolver.isVersionCompatible('1.9.9', '^1.2.3')).toBe(true);
      expect(resolver.isVersionCompatible('2.0.0', '^1.2.3')).toBe(false);
      expect(resolver.isVersionCompatible('1.2.2', '^1.2.3')).toBe(false);
    });

    it('应该检查 Tilde 范围 (~)', () => {
      expect(resolver.isVersionCompatible('1.2.3', '~1.2.3')).toBe(true);
      expect(resolver.isVersionCompatible('1.2.4', '~1.2.3')).toBe(true);
      expect(resolver.isVersionCompatible('1.2.9', '~1.2.3')).toBe(true);
      expect(resolver.isVersionCompatible('1.3.0', '~1.2.3')).toBe(false);
      expect(resolver.isVersionCompatible('1.2.2', '~1.2.3')).toBe(false);
    });

    it('应该检查版本范围', () => {
      expect(resolver.isVersionCompatible('1.5.0', '1.0.0-2.0.0')).toBe(true);
      expect(resolver.isVersionCompatible('1.0.0', '1.0.0-2.0.0')).toBe(true);
      expect(resolver.isVersionCompatible('2.0.0', '1.0.0-2.0.0')).toBe(true);
      expect(resolver.isVersionCompatible('0.9.0', '1.0.0-2.0.0')).toBe(false);
      expect(resolver.isVersionCompatible('2.1.0', '1.0.0-2.0.0')).toBe(false);
    });
  });

  describe('依赖检查', () => {
    it('应该检查依赖是否满足', () => {
      const dependencies = [
        { id: 'test:plugin-a', version: '1.0.0' },
        { id: 'test:plugin-b', version: '^1.0.0' },
      ];

      const availablePlugins = new Map<string, PluginManifest>([
        [
          'test:plugin-a',
          {
            id: 'test:plugin-a',
            name: 'Plugin A',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
          },
        ],
        [
          'test:plugin-b',
          {
            id: 'test:plugin-b',
            name: 'Plugin B',
            version: '1.2.0',
            type: 'base_card',
            main: 'index.js',
          },
        ],
      ]);

      expect(
        resolver.checkDependencies(dependencies, availablePlugins)
      ).toBe(true);
    });

    it('应该检测缺失的插件', () => {
      const dependencies = [{ id: 'test:missing-plugin', version: '1.0.0' }];

      const availablePlugins = new Map<string, PluginManifest>();

      expect(
        resolver.checkDependencies(dependencies, availablePlugins)
      ).toBe(false);
    });

    it('应该检测版本不匹配', () => {
      const dependencies = [{ id: 'test:plugin-a', version: '2.0.0' }];

      const availablePlugins = new Map<string, PluginManifest>([
        [
          'test:plugin-a',
          {
            id: 'test:plugin-a',
            name: 'Plugin A',
            version: '1.0.0',
            type: 'base_card',
            main: 'index.js',
          },
        ],
      ]);

      expect(
        resolver.checkDependencies(dependencies, availablePlugins)
      ).toBe(false);
    });
  });
});
