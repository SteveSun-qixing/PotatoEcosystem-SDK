/**
 * 卡片文件解析器
 *
 * 完全遵循《卡片文件格式规范》
 */

import type JSZip from 'jszip';
import type {
  Card,
  CardMetadata,
  CardStructure,
  BaseCardConfig,
} from '../types';
import { ZipHandler } from './ZipHandler';
import { YamlParser } from './YamlParser';
import {
  validateCardMetadata,
  normalizeCardMetadata,
} from './schemas/CardMetadataSchema';
import {
  validateCardStructure,
  normalizeCardStructure,
} from './schemas/CardStructureSchema';
import { ParseError, ValidationError } from '../core/error';
import { CONFIG_FILES, CONFIG_DIRS } from '../constants';

/**
 * 卡片解析器类
 */
export class CardParser {
  /**
   * 解析卡片文件
   * @param data 卡片文件数据（.card ZIP文件）
   * @returns 解析后的卡片对象
   */
  static async parse(data: ArrayBuffer | Blob): Promise<Card> {
    // 读取ZIP文件
    const zip = await ZipHandler.read(data);

    // 验证必需文件存在
    this.validateRequiredFiles(zip);

    // 解析metadata.yaml
    const metadata = await this.parseMetadata(zip);

    // 解析structure.yaml
    const structure = await this.parseStructure(zip);

    // 解析基础卡片配置
    const content = await this.parseContent(zip, structure);

    // 可选：读取资源文件
    const resources = await this.parseResources(zip);

    return {
      metadata,
      structure,
      content,
      resources,
    };
  }

  /**
   * 序列化卡片为ZIP文件
   * @param card 卡片对象
   * @returns ZIP文件数据
   */
  static async serialize(card: Card): Promise<ArrayBuffer> {
    const zip = ZipHandler.create();

    // 创建.card目录
    ZipHandler.addFolder(zip, CONFIG_DIRS.CARD);
    ZipHandler.addFolder(zip, CONFIG_DIRS.CONTENT);

    // 写入metadata.yaml
    const metadataYaml = YamlParser.stringify(card.metadata);
    ZipHandler.addFile(
      zip,
      `${CONFIG_DIRS.CARD}/${CONFIG_FILES.METADATA}`,
      metadataYaml
    );

    // 写入structure.yaml
    const structureYaml = YamlParser.stringify(card.structure);
    ZipHandler.addFile(
      zip,
      `${CONFIG_DIRS.CARD}/${CONFIG_FILES.STRUCTURE}`,
      structureYaml
    );

    // 写入cover.html（使用默认封面）
    const defaultCover = this.generateDefaultCover(card.metadata.name);
    ZipHandler.addFile(
      zip,
      `${CONFIG_DIRS.CARD}/${CONFIG_FILES.COVER}`,
      defaultCover
    );

    // 写入基础卡片配置
    for (const [id, config] of Object.entries(card.content)) {
      const configYaml = YamlParser.stringify(config);
      ZipHandler.addFile(zip, `${CONFIG_DIRS.CONTENT}/${id}.yaml`, configYaml);
    }

    // 写入资源文件
    if (card.resources) {
      for (const [path, data] of card.resources) {
        ZipHandler.addFile(zip, path, data);
      }
    }

    // 生成ZIP（零压缩率）
    return ZipHandler.generate(zip);
  }

  /**
   * 验证必需文件存在
   * @param zip JSZip实例
   */
  private static validateRequiredFiles(zip: JSZip): void {
    const requiredFiles = [
      `${CONFIG_DIRS.CARD}/${CONFIG_FILES.METADATA}`,
      `${CONFIG_DIRS.CARD}/${CONFIG_FILES.STRUCTURE}`,
      `${CONFIG_DIRS.CARD}/${CONFIG_FILES.COVER}`,
    ];

    for (const file of requiredFiles) {
      if (!ZipHandler.fileExists(zip, file)) {
        throw new ValidationError(`Required file missing: ${file}`);
      }
    }

    // 检查content目录存在
    if (!ZipHandler.folderExists(zip, CONFIG_DIRS.CONTENT)) {
      throw new ValidationError(
        `Required folder missing: ${CONFIG_DIRS.CONTENT}`
      );
    }
  }

  /**
   * 解析metadata.yaml
   * @param zip JSZip实例
   * @returns 卡片元数据
   */
  private static async parseMetadata(zip: JSZip): Promise<CardMetadata> {
    const metadataPath = `${CONFIG_DIRS.CARD}/${CONFIG_FILES.METADATA}`;
    const yamlContent = await ZipHandler.readTextFile(zip, metadataPath);

    if (!yamlContent) {
      throw new ParseError(`Failed to read ${metadataPath}`);
    }

    const metadata = YamlParser.parse<CardMetadata>(yamlContent);

    if (!validateCardMetadata(metadata)) {
      throw new ValidationError('Invalid card metadata');
    }

    return normalizeCardMetadata(metadata);
  }

  /**
   * 解析structure.yaml
   * @param zip JSZip实例
   * @returns 卡片结构
   */
  private static async parseStructure(zip: JSZip): Promise<CardStructure> {
    const structurePath = `${CONFIG_DIRS.CARD}/${CONFIG_FILES.STRUCTURE}`;
    const yamlContent = await ZipHandler.readTextFile(zip, structurePath);

    if (!yamlContent) {
      throw new ParseError(`Failed to read ${structurePath}`);
    }

    const structure = YamlParser.parse<CardStructure>(yamlContent);

    if (!validateCardStructure(structure)) {
      throw new ValidationError('Invalid card structure');
    }

    return normalizeCardStructure(structure);
  }

  /**
   * 解析基础卡片配置
   * @param zip JSZip实例
   * @param structure 卡片结构
   * @returns 基础卡片配置映射
   */
  private static async parseContent(
    zip: JSZip,
    structure: CardStructure
  ): Promise<Record<string, BaseCardConfig>> {
    const content: Record<string, BaseCardConfig> = {};

    for (const item of structure.structure) {
      const configPath = `${CONFIG_DIRS.CONTENT}/${item.id}.yaml`;
      const yamlContent = await ZipHandler.readTextFile(zip, configPath);

      if (!yamlContent) {
        throw new ParseError(`Failed to read base card config: ${configPath}`);
      }

      const config = YamlParser.parse<BaseCardConfig>(yamlContent);
      content[item.id] = config;
    }

    return content;
  }

  /**
   * 解析资源文件（可选）
   * @param zip JSZip实例
   * @returns 资源文件映射
   */
  private static async parseResources(
    zip: JSZip
  ): Promise<Map<string, ArrayBuffer>> {
    const resources = new Map<string, ArrayBuffer>();

    // 列出根目录的资源文件（排除配置目录）
    const files = ZipHandler.listFiles(zip);

    for (const file of files) {
      // 跳过配置文件
      if (
        file.startsWith(CONFIG_DIRS.CARD) ||
        file.startsWith(CONFIG_DIRS.CONTENT)
      ) {
        continue;
      }

      const data = await ZipHandler.readFile(zip, file);
      if (data) {
        resources.set(file, data);
      }
    }

    return resources;
  }

  /**
   * 生成默认封面HTML
   * @param cardName 卡片名称
   * @returns HTML字符串
   */
  private static generateDefaultCover(cardName: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Card Cover</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card-name {
      font-size: 24px;
      font-weight: 600;
      color: #333;
      text-align: center;
      word-wrap: break-word;
    }
  </style>
</head>
<body>
  <div class="card-name">${this.escapeHtml(cardName)}</div>
</body>
</html>`;
  }

  /**
   * 转义HTML特殊字符
   * @param text 文本
   * @returns 转义后的文本
   */
  private static escapeHtml(text: string): string {
    const div =
      typeof document !== 'undefined' ? document.createElement('div') : null;

    if (div) {
      div.textContent = text;
      return div.innerHTML;
    }

    // Node.js环境的简单转义
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
