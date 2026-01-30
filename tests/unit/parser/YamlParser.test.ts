/**
 * YAML解析器测试
 */

import { describe, it, expect } from 'vitest';
import { YamlParser } from '@/parser/YamlParser';
import { ParseError } from '@/core/error';

describe('YamlParser', () => {
  describe('parse', () => {
    it('应该解析有效的YAML', () => {
      const yamlString = `
name: Test Card
version: 1.0.0
tags:
  - tag1
  - tag2
`;

      const result = YamlParser.parse<Record<string, unknown>>(yamlString);

      expect(result.name).toBe('Test Card');
      expect(result.version).toBe('1.0.0');
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });

    it('应该解析嵌套结构', () => {
      const yamlString = `
config:
  cache:
    size: 100
    ttl: 3600
  log:
    level: debug
`;

      const result = YamlParser.parse<Record<string, unknown>>(yamlString);
      expect(result.config).toBeDefined();
      
      const config = result.config as Record<string, unknown>;
      expect(config.cache).toBeDefined();
    });

    it('应该在YAML无效时抛出错误', () => {
      const invalidYaml = `
name: Test
\tinvalid: tabs are not allowed in YAML
`;

      expect(() => YamlParser.parse(invalidYaml)).toThrow(ParseError);
    });
  });

  describe('stringify', () => {
    it('应该序列化对象为YAML', () => {
      const obj = {
        name: 'Test Card',
        version: '1.0.0',
        tags: ['tag1', 'tag2'],
      };

      const yaml = YamlParser.stringify(obj);

      expect(yaml).toContain('name: Test Card');
      expect(yaml).toContain('version: 1.0.0');
      expect(yaml).toContain('- tag1');
      expect(yaml).toContain('- tag2');
    });

    it('应该处理嵌套对象', () => {
      const obj = {
        config: {
          cache: {
            size: 100,
          },
        },
      };

      const yaml = YamlParser.stringify(obj);
      expect(yaml).toContain('config:');
      expect(yaml).toContain('cache:');
      expect(yaml).toContain('size: 100');
    });
  });

  describe('safeParse', () => {
    it('应该解析有效的YAML', () => {
      const yamlString = 'name: Test';
      const result = YamlParser.safeParse<Record<string, unknown>>(yamlString);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test');
    });

    it('应该在YAML无效时返回null', () => {
      const invalidYaml = 'invalid: yaml:\n  bad indentation';
      const result = YamlParser.safeParse(invalidYaml);

      expect(result).toBeNull();
    });
  });

  describe('validate', () => {
    it('应该验证有效的YAML', () => {
      const validYaml = 'name: Test\nvalue: 123';
      expect(YamlParser.validate(validYaml)).toBe(true);
    });

    it('应该拒绝无效的YAML', () => {
      const invalidYaml = 'name: test\n\t\tinvalid: tabs';
      expect(YamlParser.validate(invalidYaml)).toBe(false);
    });
  });

  describe('往返转换', () => {
    it('解析后序列化应该保持数据一致', () => {
      const original = {
        name: 'Test Card',
        version: '1.0.0',
        config: {
          enabled: true,
          timeout: 5000,
        },
        tags: ['tag1', 'tag2'],
      };

      const yaml = YamlParser.stringify(original);
      const parsed = YamlParser.parse<typeof original>(yaml);

      expect(parsed).toEqual(original);
    });
  });
});
