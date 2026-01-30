/**
 * YAML解析器
 *
 * 封装js-yaml，提供类型安全的YAML解析
 */

import * as yaml from 'js-yaml';
import { ParseError } from '../core/error';

/**
 * YAML解析器类
 */
export class YamlParser {
  /**
   * 解析YAML字符串
   * @param yamlString YAML字符串
   * @returns 解析后的对象
   */
  static parse<T = unknown>(yamlString: string): T {
    try {
      const result = yaml.load(yamlString);
      return result as T;
    } catch (error) {
      throw new ParseError('Failed to parse YAML', {
        originalError: error,
      });
    }
  }

  /**
   * 序列化对象为YAML
   * @param obj 对象
   * @returns YAML字符串
   */
  static stringify(obj: unknown): string {
    try {
      return yaml.dump(obj, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
        sortKeys: false,
      });
    } catch (error) {
      throw new ParseError('Failed to stringify to YAML', {
        originalError: error,
      });
    }
  }

  /**
   * 安全解析YAML（不抛出异常）
   * @param yamlString YAML字符串
   * @returns 解析结果或null
   */
  static safeParse<T = unknown>(yamlString: string): T | null {
    try {
      return this.parse<T>(yamlString);
    } catch {
      return null;
    }
  }

  /**
   * 验证YAML字符串
   * @param yamlString YAML字符串
   * @returns 是否有效
   */
  static validate(yamlString: string): boolean {
    try {
      yaml.load(yamlString);
      return true;
    } catch {
      return false;
    }
  }
}
