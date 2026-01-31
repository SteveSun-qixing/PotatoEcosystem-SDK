/**
 * PluginManifestLoader 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PluginManifestLoader } from '../../../src/plugin/PluginManifestLoader';
import { Logger } from '../../../src/core/logger';
import type { PluginManifest } from '../../../src/types';

describe('PluginManifestLoader', () => {
  let loader: PluginManifestLoader;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    loader = new PluginManifestLoader(logger);
  });

  describe('从YAML加载清单', () => {
    it('应该能够加载有效的YAML清单', () => {
      const yaml = `
id: "test:my-plugin"
name: "My Test Plugin"
version: "1.0.0"
type: "base_card"
main: "dist/index.js"
description: "A test plugin"
      `;

      const manifest = loader.loadFromYaml(yaml);

      expect(manifest.id).toBe('test:my-plugin');
      expect(manifest.name).toBe('My Test Plugin');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.type).toBe('base_card');
      expect(manifest.main).toBe('dist/index.js');
    });

    it('应该能够加载带有依赖的清单', () => {
      const yaml = `
id: "test:plugin-with-deps"
name: "Plugin With Dependencies"
version: "1.0.0"
type: "tool"
main: "index.js"
dependencies:
  plugins:
    - id: "core:base"
      version: "^1.0.0"
  libs:
    - name: "lodash"
      version: "^4.17.0"
      `;

      const manifest = loader.loadFromYaml(yaml);

      expect(manifest.dependencies?.plugins).toHaveLength(1);
      expect(manifest.dependencies?.plugins?.[0].id).toBe('core:base');
      expect(manifest.dependencies?.libs).toHaveLength(1);
      expect(manifest.dependencies?.libs?.[0].name).toBe('lodash');
    });

    it('应该拒绝无效的YAML', () => {
      const invalidYaml = '{invalid yaml content';

      expect(() => loader.loadFromYaml(invalidYaml)).toThrow();
    });
  });

  describe('从JSON加载清单', () => {
    it('应该能够加载有效的JSON清单', () => {
      const json = JSON.stringify({
        id: 'test:json-plugin',
        name: 'JSON Plugin',
        version: '2.0.0',
        type: 'layout',
        main: 'index.js',
      });

      const manifest = loader.loadFromJson(json);

      expect(manifest.id).toBe('test:json-plugin');
      expect(manifest.version).toBe('2.0.0');
      expect(manifest.type).toBe('layout');
    });

    it('应该拒绝无效的JSON', () => {
      const invalidJson = '{invalid json}';

      expect(() => loader.loadFromJson(invalidJson)).toThrow();
    });
  });

  describe('验证清单', () => {
    it('应该验证通过有效的清单', () => {
      const validManifest: PluginManifest = {
        id: 'test:valid-plugin',
        name: 'Valid Plugin',
        version: '1.0.0',
        type: 'base_card',
        main: 'index.js',
      };

      const result = loader.validateManifest(validManifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测缺少必需字段', () => {
      const invalidManifest = {
        name: 'No ID Plugin',
      } as unknown as PluginManifest;

      const result = loader.validateManifest(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('id'))).toBe(true);
    });

    it('应该检测无效的插件ID格式', () => {
      const manifest: PluginManifest = {
        id: 'invalid_id_format',
        name: 'Plugin',
        version: '1.0.0',
        type: 'base_card',
        main: 'index.js',
      };

      const result = loader.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid plugin ID'))).toBe(
        true
      );
    });

    it('应该检测无效的版本号格式', () => {
      const manifest: PluginManifest = {
        id: 'test:plugin',
        name: 'Plugin',
        version: 'invalid-version',
        type: 'base_card',
        main: 'index.js',
      };

      const result = loader.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid version'))).toBe(
        true
      );
    });

    it('应该检测无效的插件类型', () => {
      const manifest = {
        id: 'test:plugin',
        name: 'Plugin',
        version: '1.0.0',
        type: 'invalid_type',
        main: 'index.js',
      } as unknown as PluginManifest;

      const result = loader.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid plugin type'))).toBe(
        true
      );
    });

    it('应该在严格模式下产生警告', () => {
      const manifest: PluginManifest = {
        id: 'test:plugin',
        name: 'Plugin',
        version: '1.0.0',
        type: 'base_card',
        main: 'index.js',
        // 缺少推荐字段
      };

      const result = loader.validateManifest(manifest, true);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('序列化清单', () => {
    it('应该能够序列化为YAML', () => {
      const manifest: PluginManifest = {
        id: 'test:plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        type: 'base_card',
        main: 'index.js',
      };

      const yaml = loader.toYaml(manifest);

      expect(yaml).toContain('id: test:plugin');
      expect(yaml).toContain('name: Test Plugin');
      expect(yaml).toContain('version: 1.0.0');
    });

    it('应该能够序列化为JSON', () => {
      const manifest: PluginManifest = {
        id: 'test:plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        type: 'base_card',
        main: 'index.js',
      };

      const json = loader.toJson(manifest);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('test:plugin');
      expect(parsed.name).toBe('Test Plugin');
    });
  });

  describe('补充默认值', () => {
    it('应该补充默认值', () => {
      const yaml = `
id: "test:minimal"
name: "Minimal Plugin"
version: "1.0.0"
type: "base_card"
main: "index.js"
      `;

      const manifest = loader.loadFromYaml(yaml, { fillDefaults: true });

      expect(manifest.description).toBe('');
      expect(manifest.author).toBe('');
      expect(manifest.license).toBe('MIT');
      expect(manifest.tags).toEqual([]);
      expect(manifest.dependencies).toBeDefined();
      expect(manifest.permissions).toEqual([]);
    });
  });
});
