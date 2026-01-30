/**
 * 解析引擎
 *
 * 统一的解析入口，自动识别文件类型并调用对应的解析器
 */

import type { Card, Box } from '../types';
import { CardParser } from './CardParser';
import { BoxParser } from './BoxParser';
import { ParseError } from '../core/error';
import { getFileExtension } from '../utils/file';
import { FILE_EXTENSIONS } from '../constants';

/**
 * 文件类型
 */
export enum FileType {
  Card = 'card',
  Box = 'box',
  Unknown = 'unknown',
}

/**
 * 解析引擎类
 */
export class ParserEngine {
  /**
   * 解析卡片文件
   * @param data 文件数据
   * @returns 卡片对象
   */
  static async parseCard(data: ArrayBuffer | Blob): Promise<Card> {
    return CardParser.parse(data);
  }

  /**
   * 解析箱子文件
   * @param data 文件数据
   * @returns 箱子对象
   */
  static async parseBox(data: ArrayBuffer | Blob): Promise<Box> {
    return BoxParser.parse(data);
  }

  /**
   * 自动解析文件（根据文件名判断类型）
   * @param data 文件数据
   * @param filename 文件名
   * @returns 卡片或箱子对象
   */
  static async parseAuto(
    data: ArrayBuffer | Blob,
    filename: string
  ): Promise<Card | Box> {
    const fileType = this.detectFileType(filename);

    switch (fileType) {
      case FileType.Card:
        return this.parseCard(data);
      case FileType.Box:
        return this.parseBox(data);
      default:
        throw new ParseError(`Unknown file type: ${filename}`);
    }
  }

  /**
   * 检测文件类型
   * @param filename 文件名
   * @returns 文件类型
   */
  static detectFileType(filename: string): FileType {
    const ext = getFileExtension(filename).toLowerCase();

    switch (ext) {
      case FILE_EXTENSIONS.CARD:
        return FileType.Card;
      case FILE_EXTENSIONS.BOX:
        return FileType.Box;
      default:
        return FileType.Unknown;
    }
  }

  /**
   * 序列化卡片
   * @param card 卡片对象
   * @returns ZIP文件数据
   */
  static async serializeCard(card: Card): Promise<ArrayBuffer> {
    return CardParser.serialize(card);
  }

  /**
   * 序列化箱子
   * @param box 箱子对象
   * @returns ZIP文件数据
   */
  static async serializeBox(box: Box): Promise<ArrayBuffer> {
    return BoxParser.serialize(box);
  }
}
