/**
 * 编辑器文档模型
 *
 * 管理编辑器的文档状态和内容
 */

import type { Card } from '../types';
import { Logger } from '../core/logger';
import type { EventBus } from '../core/event';

/**
 * 文档变更类型
 */
export enum DocumentChangeType {
  Insert = 'insert',
  Delete = 'delete',
  Update = 'update',
  Replace = 'replace',
}

/**
 * 文档变更
 */
export interface DocumentChange {
  type: DocumentChangeType;
  position: number;
  length: number;
  content?: string;
  oldContent?: string;
  timestamp: number;
}

/**
 * 文档状态
 */
export interface DocumentState {
  content: string;
  version: number;
  modified: boolean;
  lastModified: number;
}

/**
 * 编辑器文档类
 */
export class EditorDocument {
  private card: Card;
  private state: DocumentState;
  private changes: DocumentChange[];
  private logger: Logger;
  private eventBus?: EventBus;
  private maxHistorySize: number;

  constructor(
    card: Card,
    logger: Logger,
    eventBus?: EventBus,
    maxHistorySize = 100
  ) {
    this.card = card;
    this.logger = logger;
    this.eventBus = eventBus;
    this.maxHistorySize = maxHistorySize;
    this.changes = [];

    // 初始化文档状态
    const initialContent = this.extractContent(card);
    this.state = {
      content: initialContent,
      version: 0,
      modified: false,
      lastModified: Date.now(),
    };
  }

  /**
   * 获取文档内容
   */
  getContent(): string {
    return this.state.content;
  }

  /**
   * 获取文档版本
   */
  getVersion(): number {
    return this.state.version;
  }

  /**
   * 检查是否已修改
   */
  isModified(): boolean {
    return this.state.modified;
  }

  /**
   * 获取最后修改时间
   */
  getLastModified(): number {
    return this.state.lastModified;
  }

  /**
   * 获取变更历史
   */
  getChanges(): readonly DocumentChange[] {
    return [...this.changes];
  }

  /**
   * 获取卡片数据
   */
  getCard(): Card {
    return { ...this.card };
  }

  /**
   * 插入文本
   * @param position 插入位置
   * @param text 要插入的文本
   */
  insert(position: number, text: string): void {
    if (position < 0 || position > this.state.content.length) {
      throw new Error(`Invalid position: ${position}`);
    }

    const oldContent = this.state.content;
    const newContent =
      oldContent.slice(0, position) + text + oldContent.slice(position);

    this.applyChange({
      type: DocumentChangeType.Insert,
      position,
      length: text.length,
      content: text,
      timestamp: Date.now(),
    });

    this.state.content = newContent;
    this.state.version++;
    this.state.modified = true;
    this.state.lastModified = Date.now();

    this.logger.debug('Document insert', { position, length: text.length });
    this.eventBus?.emit('document:change', {
      type: DocumentChangeType.Insert,
      position,
      length: text.length,
    });
  }

  /**
   * 删除文本
   * @param position 删除起始位置
   * @param length 删除长度
   */
  delete(position: number, length: number): void {
    if (position < 0 || position + length > this.state.content.length) {
      throw new Error(`Invalid delete range: ${position}-${position + length}`);
    }

    const oldContent = this.state.content;
    const deletedText = oldContent.slice(position, position + length);
    const newContent =
      oldContent.slice(0, position) + oldContent.slice(position + length);

    this.applyChange({
      type: DocumentChangeType.Delete,
      position,
      length,
      oldContent: deletedText,
      timestamp: Date.now(),
    });

    this.state.content = newContent;
    this.state.version++;
    this.state.modified = true;
    this.state.lastModified = Date.now();

    this.logger.debug('Document delete', { position, length });
    this.eventBus?.emit('document:change', {
      type: DocumentChangeType.Delete,
      position,
      length,
    });
  }

  /**
   * 替换文本
   * @param position 替换起始位置
   * @param length 替换长度
   * @param text 新文本
   */
  replace(position: number, length: number, text: string): void {
    if (position < 0 || position + length > this.state.content.length) {
      throw new Error(
        `Invalid replace range: ${position}-${position + length}`
      );
    }

    const oldContent = this.state.content;
    const replacedText = oldContent.slice(position, position + length);
    const newContent =
      oldContent.slice(0, position) +
      text +
      oldContent.slice(position + length);

    this.applyChange({
      type: DocumentChangeType.Replace,
      position,
      length,
      content: text,
      oldContent: replacedText,
      timestamp: Date.now(),
    });

    this.state.content = newContent;
    this.state.version++;
    this.state.modified = true;
    this.state.lastModified = Date.now();

    this.logger.debug('Document replace', {
      position,
      length,
      newLength: text.length,
    });
    this.eventBus?.emit('document:change', {
      type: DocumentChangeType.Replace,
      position,
      length,
      newLength: text.length,
    });
  }

  /**
   * 更新整个内容
   * @param content 新内容
   */
  setContent(content: string): void {
    const oldContent = this.state.content;

    this.applyChange({
      type: DocumentChangeType.Update,
      position: 0,
      length: oldContent.length,
      content,
      oldContent,
      timestamp: Date.now(),
    });

    this.state.content = content;
    this.state.version++;
    this.state.modified = true;
    this.state.lastModified = Date.now();

    this.logger.debug('Document content updated', { length: content.length });
    this.eventBus?.emit('document:change', {
      type: DocumentChangeType.Update,
      length: content.length,
    });
  }

  /**
   * 获取全部文本内容
   */
  getText(): string;
  /**
   * 获取指定范围的文本
   * @param start 起始位置
   * @param end 结束位置
   */
  getText(start: number, end: number): string;
  getText(start?: number, end?: number): string {
    // 如果没有参数，返回全部内容
    if (start === undefined && end === undefined) {
      return this.state.content;
    }

    // 验证参数
    if (
      start === undefined ||
      end === undefined ||
      start < 0 ||
      end > this.state.content.length ||
      start > end
    ) {
      throw new Error(`Invalid range: ${start}-${end}`);
    }

    return this.state.content.slice(start, end);
  }

  /**
   * 获取文档长度
   */
  getLength(): number {
    return this.state.content.length;
  }

  /**
   * 标记为未修改
   */
  markAsSaved(): void {
    this.state.modified = false;
    this.logger.debug('Document marked as saved');
    this.eventBus?.emit('document:saved', { version: this.state.version });
  }

  /**
   * 重置文档
   */
  reset(): void {
    const initialContent = this.extractContent(this.card);
    this.state = {
      content: initialContent,
      version: 0,
      modified: false,
      lastModified: Date.now(),
    };
    this.changes = [];
    this.logger.debug('Document reset');
    this.eventBus?.emit('document:reset');
  }

  /**
   * 应用变更到历史记录
   */
  private applyChange(change: DocumentChange): void {
    this.changes.push(change);

    // 限制历史记录大小
    if (this.changes.length > this.maxHistorySize) {
      this.changes.shift();
    }
  }

  /**
   * 从卡片中提取内容
   */
  private extractContent(card: Card): string {
    // 尝试从第一个基础卡片中提取文本内容
    if (card.structure.structure.length === 0) {
      return '';
    }

    const firstBaseCard = card.structure.structure[0];
    if (!firstBaseCard) {
      return '';
    }

    const firstBaseCardId = firstBaseCard.id;
    const baseCardConfig = card.content[firstBaseCardId];

    if (!baseCardConfig) {
      return '';
    }

    // 根据卡片类型提取内容
    if ('content_text' in baseCardConfig && baseCardConfig.content_text) {
      return String(baseCardConfig.content_text);
    }

    if ('content_file' in baseCardConfig && baseCardConfig.content_file) {
      return `[File: ${baseCardConfig.content_file}]`;
    }

    return '';
  }

  /**
   * 更新卡片数据
   */
  updateCard(card: Card): void {
    this.card = card;
    this.logger.debug('Card data updated');
    this.eventBus?.emit('document:card-updated', card);
  }

  /**
   * 获取文档状态快照
   */
  getSnapshot(): DocumentState {
    return { ...this.state };
  }

  /**
   * 恢复文档状态
   */
  restoreSnapshot(snapshot: DocumentState): void {
    this.state = { ...snapshot };
    this.logger.debug('Document state restored', { version: snapshot.version });
    this.eventBus?.emit('document:restored', { version: snapshot.version });
  }
}
