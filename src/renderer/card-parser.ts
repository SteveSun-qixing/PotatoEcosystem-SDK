/**
 * CardParser - 卡片解析模块
 * @module renderer/card-parser
 *
 * 负责解析 .card 文件，提取卡片元数据、结构信息和基础卡片配置。
 *
 * 架构设计：
 * - 支持三种输入源：文件映射（编辑器场景）、ZIP 数据（标准 .card 文件）、Card 对象
 * - 解析 .card/metadata.yaml 提取元数据
 * - 解析 .card/structure.yaml 提取基础卡片 ID 和顺序
 * - 解析 content/{id}.yaml 提取各基础卡片的类型和配置数据
 * - 内置简易 YAML 解析器，避免 SDK 强依赖 Foundation
 *
 * 参考实现：CardtoHTML 转换插件的 card-parser.ts
 */

import type { Card } from '../types/card';
import type {
  CardParseSource,
  CardParseResult,
  CardParserOptions,
  ParsedCardData,
  ParsedCardMetadata,
  ParsedCardStructure,
  ParsedBaseCardConfig,
} from './types';

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<CardParserOptions> = {
  strict: false,
  keepRawFiles: false,
};

/**
 * 卡片解析器
 *
 * 将 .card 文件（ZIP 或文件夹结构）解析为渲染所需的结构化数据。
 *
 * @example
 * ```ts
 * const parser = new CardParser();
 *
 * // 从 ZIP 数据解析
 * const result = await parser.parse({ type: 'data', data: zipBuffer });
 *
 * // 从文件映射解析
 * const result = await parser.parse({ type: 'files', files: fileMap });
 *
 * // 从 Card 对象解析
 * const result = await parser.parse({ type: 'card', card: cardObj });
 * ```
 */
export class CardParser {
  private _options: Required<CardParserOptions>;

  /**
   * 创建卡片解析器实例
   *
   * @param options - 配置选项
   */
  constructor(options?: CardParserOptions) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 解析卡片
   *
   * @param source - 解析源
   * @returns 解析结果
   */
  async parse(source: CardParseSource): Promise<CardParseResult> {
    const warnings: string[] = [];

    try {
      // 1. 获取文件映射
      const files = await this._loadFiles(source);

      // 2. 解析 metadata.yaml
      const metadataResult = this._parseMetadata(files);
      if (!metadataResult.success) {
        return {
          success: false,
          error: metadataResult.error,
          warnings,
        };
      }
      const metadata = metadataResult.data!;

      // 3. 解析 structure.yaml
      const structureResult = this._parseStructure(files);
      if (!structureResult.success) {
        return {
          success: false,
          error: structureResult.error,
          warnings,
        };
      }
      const structure = structureResult.data!;

      // 4. 解析基础卡片配置
      const baseCardsResult = this._parseBaseCards(files, structure.baseCardIds);
      if (baseCardsResult.warnings) {
        warnings.push(...baseCardsResult.warnings);
      }
      if (!baseCardsResult.success && this._options.strict) {
        return {
          success: false,
          error: baseCardsResult.error,
          warnings,
        };
      }
      const baseCards = baseCardsResult.data ?? [];

      // 构建卡片数据
      const cardData: ParsedCardData = {
        metadata,
        structure,
        baseCards,
        rawFiles: this._options.keepRawFiles ? files : undefined,
      };

      return {
        success: true,
        data: cardData,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }
  }

  // ========== 私有方法 ==========

  /**
   * 加载文件映射
   */
  private async _loadFiles(source: CardParseSource): Promise<Map<string, Uint8Array>> {
    if (source.type === 'files' && source.files) {
      return source.files;
    }

    if (source.type === 'data' && source.data) {
      return this._extractZip(source.data);
    }

    if (source.type === 'card' && source.card) {
      return this._cardToFileMap(source.card);
    }

    throw new Error('CardParser: invalid source - must provide files, data, or card');
  }

  /**
   * 解压 ZIP 数据
   *
   * 使用简易 ZIP 解析实现，支持 Store（零压缩）和 Deflate 两种方式。
   * 参考卡片文件格式规范：卡片文件使用 ZIP 存储模式（零压缩率）。
   */
  private async _extractZip(data: Uint8Array): Promise<Map<string, Uint8Array>> {
    const files = new Map<string, Uint8Array>();

    // ZIP 格式解析
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // 查找 End of Central Directory Record
    let eocdOffset = -1;
    for (let i = data.length - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error('CardParser: invalid ZIP file - EOCD not found');
    }

    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const cdEntries = view.getUint16(eocdOffset + 10, true);

    let offset = cdOffset;
    for (let i = 0; i < cdEntries; i++) {
      if (view.getUint32(offset, true) !== 0x02014b50) {
        break;
      }

      const compressionMethod = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);

      const nameBytes = data.slice(offset + 46, offset + 46 + nameLength);
      const fileName = new TextDecoder().decode(nameBytes);

      // 跳过目录
      if (!fileName.endsWith('/')) {
        // 读取 Local File Header 获取实际数据偏移
        const localNameLength = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;

        if (compressionMethod === 0) {
          // Store 方式（零压缩）
          files.set(fileName, data.slice(dataStart, dataStart + uncompressedSize));
        } else if (compressionMethod === 8) {
          // Deflate 方式 - 使用 DecompressionStream API
          try {
            const compressedData = data.slice(dataStart, dataStart + compressedSize);
            const decompressed = await this._inflateRaw(compressedData);
            files.set(fileName, decompressed);
          } catch {
            // 如果解压失败，跳过此文件并记录
            files.set(fileName, new Uint8Array(0));
          }
        }
      }

      offset += 46 + nameLength + extraLength + commentLength;
    }

    return files;
  }

  /**
   * 解压 raw deflate 数据
   */
  private async _inflateRaw(data: Uint8Array): Promise<Uint8Array> {
    // 尝试使用 DecompressionStream API（现代浏览器和 Node.js 18+ 支持）
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();

      writer.write(data as unknown as BufferSource);
      writer.close();

      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const result = await reader.read();
        if (result.done) {
          done = true;
        } else {
          chunks.push(result.value);
        }
      }

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    }

    // 回退：返回原始数据（Store 模式下不需要解压）
    return data;
  }

  /**
   * 将 Card 对象转换为文件映射
   */
  private _cardToFileMap(card: Card): Map<string, Uint8Array> {
    const files = new Map<string, Uint8Array>();
    const encoder = new TextEncoder();

    // 生成 metadata.yaml
    const metadataYaml = this._objectToYaml({
      chips_standards_version: card.metadata.chip_standards_version ?? '1.0.0',
      card_id: card.metadata.card_id ?? card.id,
      name: card.metadata.name,
      created_at: card.metadata.created_at,
      modified_at: card.metadata.modified_at,
      theme_id: card.metadata.theme,
      tags: card.metadata.tags,
      description: card.metadata.description,
    });
    files.set('.card/metadata.yaml', encoder.encode(metadataYaml));

    // 生成 structure.yaml
    if (card.structure?.structure) {
      const structureYaml = this._objectToYaml({
        structure: card.structure.structure.map((item) => ({
          id: item.id,
          type: item.type,
        })),
      });
      files.set('.card/structure.yaml', encoder.encode(structureYaml));
    }

    // 资源文件
    if (card.resources) {
      for (const [path, data] of card.resources.entries()) {
        if (data instanceof ArrayBuffer) {
          files.set(path, new Uint8Array(data));
        } else if (data instanceof Blob) {
          // Blob 需要异步读取，这里标记为空
          // 实际资源路径会在渲染时通过 ResourceManager 解析
        }
      }
    }

    return files;
  }

  /**
   * 解析元数据
   */
  private _parseMetadata(
    files: Map<string, Uint8Array>
  ): { success: boolean; data?: ParsedCardMetadata; error?: string } {
    const metadataContent = files.get('.card/metadata.yaml');

    if (!metadataContent) {
      return {
        success: false,
        error: 'metadata.yaml not found in .card/ directory',
      };
    }

    try {
      const yamlString = new TextDecoder().decode(metadataContent);
      const raw = this._parseYaml(yamlString);

      // 验证必需字段（支持 card_id 和向后兼容的 id）
      const cardId = raw.card_id ?? raw.id;
      if (!cardId || !raw.name) {
        return {
          success: false,
          error: 'metadata.yaml missing required fields: card_id (or id), name',
        };
      }

      const metadata: ParsedCardMetadata = {
        id: String(cardId),
        name: String(raw.name),
        version: String(raw.version ?? '1.0.0'),
        description: raw.description ? String(raw.description) : undefined,
        createdAt: String(raw.created_at ?? new Date().toISOString()),
        modifiedAt: String(raw.modified_at ?? new Date().toISOString()),
        themeId: (raw.theme_id ?? raw.theme) ? String(raw.theme_id ?? raw.theme) : undefined,
        tags: Array.isArray(raw.tags) ? raw.tags.map(String) : undefined,
        chipsStandardsVersion: String(raw.chips_standards_version ?? raw.chip_standards_version ?? '1.0.0'),
      };

      return { success: true, data: metadata };
    } catch (error) {
      return {
        success: false,
        error: `metadata.yaml parse failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 解析结构定义
   */
  private _parseStructure(
    files: Map<string, Uint8Array>
  ): { success: boolean; data?: ParsedCardStructure; error?: string } {
    const structureContent = files.get('.card/structure.yaml');

    if (!structureContent) {
      return {
        success: false,
        error: 'structure.yaml not found in .card/ directory',
      };
    }

    try {
      const yamlString = new TextDecoder().decode(structureContent);
      const raw = this._parseYaml(yamlString);

      let baseCardIds: string[] = [];
      const cardList = raw.structure;
      if (Array.isArray(cardList)) {
        baseCardIds = cardList
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).id === 'string'
          )
          .map((item) => String(item.id));
      }

      const structure: ParsedCardStructure = {
        baseCardIds,
        layout:
          raw.layout && typeof raw.layout === 'object'
            ? {
                type: String((raw.layout as Record<string, unknown>).type ?? 'vertical'),
                params: (raw.layout as Record<string, unknown>).params as Record<string, unknown> | undefined,
              }
            : undefined,
      };

      return { success: true, data: structure };
    } catch (error) {
      return {
        success: false,
        error: `structure.yaml parse failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 解析基础卡片配置
   */
  private _parseBaseCards(
    files: Map<string, Uint8Array>,
    baseCardIds: string[]
  ): { success: boolean; data?: ParsedBaseCardConfig[]; error?: string; warnings?: string[] } {
    const baseCards: ParsedBaseCardConfig[] = [];
    const warnings: string[] = [];
    let hasError = false;
    let lastError = '';

    for (const cardId of baseCardIds) {
      const configPath = `content/${cardId}.yaml`;
      const configContent = files.get(configPath);

      if (!configContent) {
        const warning = `Base card config not found: ${configPath}`;
        warnings.push(warning);
        hasError = true;
        lastError = warning;
        continue;
      }

      try {
        const yamlString = new TextDecoder().decode(configContent);
        const raw = this._parseYaml(yamlString);
        const type = typeof raw.type === 'string' ? raw.type.trim() : '';

        if (!type) {
          const warning = `Base card config missing type field: ${configPath}`;
          warnings.push(warning);
          hasError = true;
          lastError = warning;
          continue;
        }

        // 支持标准格式 { type, data } 和简化格式 { type, ...data }
        let config: Record<string, unknown>;
        if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
          config = raw.data as Record<string, unknown>;
        } else {
          // 简化格式：除 type 和 name 外的所有字段都作为配置
          const { type: _type, name: _name, ...rest } = raw;
          config = rest;
        }

        const baseCard: ParsedBaseCardConfig = {
          id: cardId,
          type,
          name: raw.name ? String(raw.name) : undefined,
          config,
        };

        baseCards.push(baseCard);
      } catch (error) {
        const warning = `Base card config parse failed (${cardId}): ${error instanceof Error ? error.message : String(error)}`;
        warnings.push(warning);
        hasError = true;
        lastError = warning;
      }
    }

    return {
      success: !hasError,
      data: baseCards,
      error: hasError ? lastError : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 简易 YAML 解析器
   *
   * 支持卡片文件规范中使用的 YAML 子集：
   * - 键值对（key: value）
   * - 字符串、数字、布尔值、null
   * - 数组（- item 或 [item1, item2] 行内格式）
   * - 嵌套对象
   * - 引号字符串
   * - 注释（# comment）
   *
   * 不支持：多行字符串（|, >）、锚点（&, *）、标签（!!）等高级特性
   */
  private _parseYaml(yamlString: string): Record<string, unknown> {
    const lines = yamlString.split('\n');
    return this._parseYamlLines(lines, 0, 0).value as Record<string, unknown>;
  }

  /**
   * 递归解析 YAML 行
   */
  private _parseYamlLines(
    lines: string[],
    startIndex: number,
    baseIndent: number
  ): { value: unknown; endIndex: number } {
    const result: Record<string, unknown> = {};
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.replace(/\r$/, '');

      // 跳过空行和注释
      if (trimmed.trim() === '' || trimmed.trim().startsWith('#')) {
        i++;
        continue;
      }

      // 计算缩进
      const indent = trimmed.length - trimmed.trimStart().length;

      // 如果缩进小于基础缩进，返回上层
      if (indent < baseIndent) {
        return { value: result, endIndex: i };
      }

      const content = trimmed.trimStart();

      // 数组项
      if (content.startsWith('- ')) {
        const arrayResult = this._parseYamlArray(lines, i, indent);
        return arrayResult;
      }

      // 键值对
      const colonIndex = content.indexOf(':');
      if (colonIndex > 0) {
        const key = content.substring(0, colonIndex).trim();
        const valueStr = content.substring(colonIndex + 1).trim();

        if (valueStr === '' || valueStr === '|' || valueStr === '>') {
          // 嵌套对象或多行值
          const nextIndent = this._getNextIndent(lines, i + 1);
          if (nextIndent > indent) {
            // 检查下一行是否是数组项
            const nextTrimmed = (lines[i + 1] ?? '').trim();
            if (nextTrimmed.startsWith('- ')) {
              const arrayResult = this._parseYamlArray(lines, i + 1, nextIndent);
              result[key] = arrayResult.value;
              i = arrayResult.endIndex;
            } else {
              const nestedResult = this._parseYamlLines(lines, i + 1, nextIndent);
              result[key] = nestedResult.value;
              i = nestedResult.endIndex;
            }
          } else {
            result[key] = null;
            i++;
          }
        } else {
          // 简单值
          result[key] = this._parseYamlValue(valueStr);
          i++;
        }
      } else {
        i++;
      }
    }

    return { value: result, endIndex: i };
  }

  /**
   * 解析 YAML 数组
   */
  private _parseYamlArray(
    lines: string[],
    startIndex: number,
    baseIndent: number
  ): { value: unknown[]; endIndex: number } {
    const result: unknown[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.replace(/\r$/, '');

      if (trimmed.trim() === '' || trimmed.trim().startsWith('#')) {
        i++;
        continue;
      }

      const indent = trimmed.length - trimmed.trimStart().length;

      if (indent < baseIndent) {
        break;
      }

      if (indent > baseIndent) {
        i++;
        continue;
      }

      const content = trimmed.trimStart();

      if (content.startsWith('- ')) {
        const itemContent = content.substring(2).trim();

        // 检查是否是对象形式的数组项 (- key: value)
        const colonIndex = itemContent.indexOf(':');
        if (colonIndex > 0 && !itemContent.startsWith('"') && !itemContent.startsWith("'")) {
          // 对象形式的数组项
          const itemObj: Record<string, unknown> = {};
          const key = itemContent.substring(0, colonIndex).trim();
          const val = itemContent.substring(colonIndex + 1).trim();
          itemObj[key] = this._parseYamlValue(val);

          // 检查后续行是否属于同一个对象
          const nextIndent = this._getNextIndent(lines, i + 1);
          if (nextIndent > indent) {
            const nestedResult = this._parseYamlLines(lines, i + 1, nextIndent);
            Object.assign(itemObj, nestedResult.value as Record<string, unknown>);
            i = nestedResult.endIndex;
          } else {
            i++;
          }

          result.push(itemObj);
        } else {
          // 简单值数组项
          result.push(this._parseYamlValue(itemContent));
          i++;
        }
      } else {
        break;
      }
    }

    return { value: result, endIndex: i };
  }

  /**
   * 获取下一个非空行的缩进
   */
  private _getNextIndent(lines: string[], startIndex: number): number {
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].replace(/\r$/, '');
      const trimmed = line.trim();
      if (trimmed !== '' && !trimmed.startsWith('#')) {
        return line.length - line.trimStart().length;
      }
    }
    return 0;
  }

  /**
   * 解析 YAML 值
   */
  private _parseYamlValue(str: string): unknown {
    // 去除行内注释
    const commentIndex = str.indexOf(' #');
    const value = commentIndex > 0 ? str.substring(0, commentIndex).trim() : str;

    if (value === '' || value === 'null' || value === '~') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;

    // 引号字符串
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // 行内数组 [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      if (inner === '') return [];
      return inner.split(',').map((item) => this._parseYamlValue(item.trim()));
    }

    // 行内对象 {key: value}
    if (value.startsWith('{') && value.endsWith('}')) {
      const inner = value.slice(1, -1).trim();
      if (inner === '') return {};
      const obj: Record<string, unknown> = {};
      const pairs = inner.split(',');
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx > 0) {
          const k = pair.substring(0, colonIdx).trim();
          const v = pair.substring(colonIdx + 1).trim();
          obj[k] = this._parseYamlValue(v);
        }
      }
      return obj;
    }

    // 数字
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }

    // 默认为字符串
    return value;
  }

  /**
   * 简易对象转 YAML
   *
   * 用于将 Card 对象转换为文件映射中的 YAML 内容
   */
  private _objectToYaml(obj: Record<string, unknown>, indent: number = 0): string {
    const prefix = '  '.repeat(indent);
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        if (value.length === 0) {
          lines.push(`${prefix}${key}: []`);
        } else if (typeof value[0] === 'object' && value[0] !== null) {
          lines.push(`${prefix}${key}:`);
          for (const item of value) {
            const entries = Object.entries(item as Record<string, unknown>);
            if (entries.length > 0) {
              const [firstKey, firstVal] = entries[0];
              lines.push(`${prefix}  - ${firstKey}: ${this._yamlValueToString(firstVal)}`);
              for (let i = 1; i < entries.length; i++) {
                const [k, v] = entries[i];
                lines.push(`${prefix}    ${k}: ${this._yamlValueToString(v)}`);
              }
            }
          }
        } else {
          lines.push(`${prefix}${key}:`);
          for (const item of value) {
            lines.push(`${prefix}  - ${this._yamlValueToString(item)}`);
          }
        }
      } else if (typeof value === 'object') {
        lines.push(`${prefix}${key}:`);
        lines.push(this._objectToYaml(value as Record<string, unknown>, indent + 1));
      } else {
        lines.push(`${prefix}${key}: ${this._yamlValueToString(value)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 将值转换为 YAML 字符串
   */
  private _yamlValueToString(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      if (value.includes(':') || value.includes('#') || value.includes("'") || value.includes('"')) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    return String(value);
  }
}

/**
 * 创建卡片解析器实例
 */
export function createCardParser(options?: CardParserOptions): CardParser {
  return new CardParser(options);
}
