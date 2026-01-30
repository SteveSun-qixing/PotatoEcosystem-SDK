/**
 * 箱子文件解析器
 *
 * 完全遵循《箱子文件格式规范》
 */

import type JSZip from 'jszip';
import type { Box, BoxMetadata, BoxStructure, BoxType } from '../types';
import { ZipHandler } from './ZipHandler';
import { YamlParser } from './YamlParser';
import { ParseError, ValidationError } from '../core/error';
import { CONFIG_FILES, CONFIG_DIRS } from '../constants';
import { validateSemanticVersion, validateId } from '../utils/validation';

/**
 * 箱子解析器类
 */
export class BoxParser {
  /**
   * 解析箱子文件
   * @param data 箱子文件数据（.box ZIP文件）
   * @returns 解析后的箱子对象
   */
  static async parse(data: ArrayBuffer | Blob): Promise<Box> {
    // 读取ZIP文件
    const zip = await ZipHandler.read(data);

    // 验证必需文件
    this.validateRequiredFiles(zip);

    // 解析metadata.yaml
    const metadata = await this.parseMetadata(zip);

    // 解析structure.yaml
    const structure = await this.parseStructure(zip);

    // 解析content.yaml（布局配置）
    const content = await this.parseContent(zip);

    // 确定箱子类型
    const type = this.determineBoxType(structure);

    return {
      metadata,
      structure,
      content,
      type,
    };
  }

  /**
   * 序列化箱子为ZIP文件
   * @param box 箱子对象
   * @returns ZIP文件数据
   */
  static async serialize(box: Box): Promise<ArrayBuffer> {
    const zip = ZipHandler.create();

    // 创建.box目录
    ZipHandler.addFolder(zip, CONFIG_DIRS.BOX);

    // 写入metadata.yaml
    const metadataYaml = YamlParser.stringify(box.metadata);
    ZipHandler.addFile(
      zip,
      `${CONFIG_DIRS.BOX}/${CONFIG_FILES.METADATA}`,
      metadataYaml
    );

    // 写入structure.yaml
    const structureYaml = YamlParser.stringify(box.structure);
    ZipHandler.addFile(
      zip,
      `${CONFIG_DIRS.BOX}/${CONFIG_FILES.STRUCTURE}`,
      structureYaml
    );

    // 写入content.yaml
    const contentYaml = YamlParser.stringify(box.content);
    ZipHandler.addFile(
      zip,
      `${CONFIG_DIRS.BOX}/${CONFIG_FILES.CONTENT}`,
      contentYaml
    );

    // 生成ZIP（零压缩率）
    return ZipHandler.generate(zip);
  }

  /**
   * 验证必需文件
   * @param zip JSZip实例
   */
  private static validateRequiredFiles(zip: JSZip): void {
    const requiredFiles = [
      `${CONFIG_DIRS.BOX}/${CONFIG_FILES.METADATA}`,
      `${CONFIG_DIRS.BOX}/${CONFIG_FILES.STRUCTURE}`,
      `${CONFIG_DIRS.BOX}/${CONFIG_FILES.CONTENT}`,
    ];

    for (const file of requiredFiles) {
      if (!ZipHandler.fileExists(zip, file)) {
        throw new ValidationError(`Required file missing: ${file}`);
      }
    }
  }

  /**
   * 解析metadata.yaml
   * @param zip JSZip实例
   * @returns 箱子元数据
   */
  private static async parseMetadata(zip: JSZip): Promise<BoxMetadata> {
    const metadataPath = `${CONFIG_DIRS.BOX}/${CONFIG_FILES.METADATA}`;
    const yamlContent = await ZipHandler.readTextFile(zip, metadataPath);

    if (!yamlContent) {
      throw new ParseError(`Failed to read ${metadataPath}`);
    }

    const metadata = YamlParser.parse<BoxMetadata>(yamlContent);

    // 验证必需字段
    if (!this.validateBoxMetadata(metadata)) {
      throw new ValidationError('Invalid box metadata');
    }

    return metadata;
  }

  /**
   * 验证箱子元数据
   * @param metadata 元数据
   * @returns 是否有效
   */
  private static validateBoxMetadata(
    metadata: unknown
  ): metadata is BoxMetadata {
    if (!metadata || typeof metadata !== 'object') {
      return false;
    }

    const meta = metadata as Record<string, unknown>;

    return (
      typeof meta.chip_standards_version === 'string' &&
      validateSemanticVersion(meta.chip_standards_version) &&
      typeof meta.box_id === 'string' &&
      validateId(meta.box_id) &&
      typeof meta.name === 'string' &&
      typeof meta.created_at === 'string' &&
      typeof meta.modified_at === 'string' &&
      typeof meta.layout === 'string'
    );
  }

  /**
   * 解析structure.yaml
   * @param zip JSZip实例
   * @returns 箱子结构
   */
  private static async parseStructure(zip: JSZip): Promise<BoxStructure> {
    const structurePath = `${CONFIG_DIRS.BOX}/${CONFIG_FILES.STRUCTURE}`;
    const yamlContent = await ZipHandler.readTextFile(zip, structurePath);

    if (!yamlContent) {
      throw new ParseError(`Failed to read ${structurePath}`);
    }

    const structure = YamlParser.parse<BoxStructure>(yamlContent);

    // 验证结构
    if (!Array.isArray(structure.cards)) {
      throw new ValidationError(
        'Invalid box structure: cards must be an array'
      );
    }

    return structure;
  }

  /**
   * 解析content.yaml
   * @param zip JSZip实例
   * @returns 布局配置
   */
  private static async parseContent(
    zip: JSZip
  ): Promise<Record<string, unknown>> {
    const contentPath = `${CONFIG_DIRS.BOX}/${CONFIG_FILES.CONTENT}`;
    const yamlContent = await ZipHandler.readTextFile(zip, contentPath);

    if (!yamlContent) {
      throw new ParseError(`Failed to read ${contentPath}`);
    }

    return YamlParser.parse<Record<string, unknown>>(yamlContent);
  }

  /**
   * 确定箱子类型
   * @param structure 箱子结构
   * @returns 箱子类型
   */
  private static determineBoxType(structure: BoxStructure): BoxType {
    if (!structure.cards || structure.cards.length === 0) {
      return 'empty' as BoxType;
    }

    let internalCount = 0;
    let externalCount = 0;

    for (const card of structure.cards) {
      if (card.location === 'internal') {
        internalCount++;
      } else {
        externalCount++;
      }
    }

    if (externalCount === 0) {
      return 'full' as BoxType;
    } else if (internalCount === 0) {
      return 'empty' as BoxType;
    } else {
      return 'partial' as BoxType;
    }
  }
}
