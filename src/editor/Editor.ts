/**
 * 编辑器类
 *
 * 提供卡片内容编辑功能
 */

import type { EditorDocument } from './EditorDocument';
import type { Selection } from './Selection';
import type { History } from './History';
import { HistoryActionType } from './History';
import type { Keyboard } from './Keyboard';
import type { BaseCardConfig } from '../types';
import { Logger } from '../core/logger';
import type { EventBus } from '../core/event';

/**
 * 编辑器选项
 */
export interface EditorOptions {
  mode?: 'wysiwyg' | 'markdown' | 'split';
  toolbar?: boolean;
  sidebar?: boolean;
  autoSave?: boolean;
  readOnly?: boolean;
}

/**
 * 编辑器类
 */
export class Editor {
  private document: EditorDocument;
  private selection: Selection;
  private history: History;
  private keyboard: Keyboard;
  private container: HTMLElement;
  private options: Required<EditorOptions>;
  private logger: Logger;
  private eventBus?: EventBus;

  constructor(
    container: HTMLElement,
    document: EditorDocument,
    selection: Selection,
    history: History,
    keyboard: Keyboard,
    logger: Logger,
    options: EditorOptions = {},
    eventBus?: EventBus
  ) {
    this.container = container;
    this.document = document;
    this.selection = selection;
    this.history = history;
    this.keyboard = keyboard;
    this.logger = logger;
    this.eventBus = eventBus;

    this.options = {
      mode: options.mode ?? 'wysiwyg',
      toolbar: options.toolbar ?? true,
      sidebar: options.sidebar ?? false,
      autoSave: options.autoSave ?? false,
      readOnly: options.readOnly ?? false,
    };

    this.initialize();
  }

  /**
   * 初始化编辑器
   */
  private initialize(): void {
    // 设置容器
    this.container.className = 'chips-editor';
    this.container.dataset['mode'] = this.options.mode;

    // 设置只读模式
    if (this.options.readOnly) {
      this.container.setAttribute('contenteditable', 'false');
    } else {
      this.container.setAttribute('contenteditable', 'true');
    }

    // 绑定快捷键
    this.keyboard.attach(this.container);

    this.logger.debug('Editor initialized', {
      mode: this.options.mode,
      readOnly: this.options.readOnly,
    });
  }

  /**
   * 插入文本
   * @param text 文本内容
   */
  insertText(text: string): void {
    if (this.options.readOnly) {
      return;
    }
    // 如果有选区，先删除选区内容
    if (this.selection.hasSelection()) {
      const start = this.selection.getStart();
      const end = this.selection.getEnd();
      this.document.delete(start, end);
      this.selection.setCursor(start);
    }
    const position = this.selection.getCursor();
    const selectionBefore = this.selection.getState();

    this.document.insert(position, text);
    this.selection.setCursor(position + text.length);

    // 记录到历史
    this.history.record({
      type: HistoryActionType.Insert,
      position,
      length: text.length,
      content: text,
      selectionBefore,
      selectionAfter: this.selection.getState(),
    });

    this.eventBus?.emit('editor:change', { type: 'insert', text, position });
  }

  /**
   * 删除文本
   * @param start 开始位置
   * @param end 结束位置
   */
  deleteText(start: number, end: number): void {
    const selectionBefore = this.selection.getState();
    const oldContent = this.document.getText().substring(start, end);

    this.document.delete(start, end);
    this.selection.setCursor(start);

    // 记录到历史
    this.history.record({
      type: HistoryActionType.Delete,
      position: start,
      length: end - start,
      oldContent,
      selectionBefore,
      selectionAfter: this.selection.getState(),
    });

    this.eventBus?.emit('editor:change', { type: 'delete', start, end });
  }

  /**
   * 替换文本
   * @param start 开始位置
   * @param end 结束位置
   * @param text 新文本
   */
  replaceText(start: number, end: number, text: string): void {
    const selectionBefore = this.selection.getState();
    const oldContent = this.document.getText().substring(start, end);

    this.document.replace(start, end, text);
    this.selection.setCursor(start + text.length);

    // 记录到历史
    this.history.record({
      type: HistoryActionType.Replace,
      position: start,
      length: text.length,
      content: text,
      oldContent,
      selectionBefore,
      selectionAfter: this.selection.getState(),
    });

    this.eventBus?.emit('editor:change', {
      type: 'replace',
      start,
      end,
      text,
    });
  }

  /**
   * 获取文本
   * @returns 文本内容
   */
  getText(): string {
    return this.document.getText();
  }

  /**
   * 撤销
   */
  undo(): boolean {
    if (this.options.readOnly) {
      return false;
    }
    if (this.history.canUndo()) {
      this.history.undo();
      this.eventBus?.emit('editor:undo');
      return true;
    }
    return false;
  }

  /**
   * 重做
   */
  redo(): boolean {
    if (this.options.readOnly) {
      return false;
    }
    if (this.history.canRedo()) {
      this.history.redo();
      this.eventBus?.emit('editor:redo');
      return true;
    }
    return false;
  }

  /**
   * 获取卡片配置
   * @returns 卡片配置
   */
  getCardConfig(): BaseCardConfig {
    return {
      card_type: 'RichTextCard',
      content_source: 'inline',
      content_text: this.document.getText(),
    } as BaseCardConfig;
  }

  /**
   * 销毁编辑器
   */
  destroy(): void {
    this.keyboard.detach();
    this.logger.debug('Editor destroyed');
  }

  /**
   * 获取文档实例
   */
  getDocument(): EditorDocument {
    return this.document;
  }

  /**
   * 获取选区实例
   */
  getSelection(): Selection {
    return this.selection;
  }

  /**
   * 获取历史记录实例
   */
  getHistory(): History {
    return this.history;
  }

  /**
   * 获取键盘实例
   */
  getKeyboard(): Keyboard {
    return this.keyboard;
  }

  /**
   * 检查是否已修改
   */
  isModified(): boolean {
    return this.history.canUndo();
  }

  /**
   * 设置只读模式
   */
  setReadOnly(readOnly: boolean): void {
    this.options.readOnly = readOnly;
    if (readOnly) {
      this.container.setAttribute('contenteditable', 'false');
    } else {
      this.container.setAttribute('contenteditable', 'true');
    }
  }

  /**
   * 检查是否为只读模式
   */
  isReadOnly(): boolean {
    return this.options.readOnly;
  }

  /**
   * 聚焦编辑器
   */
  focus(): void {
    this.container.focus?.();
  }

  /**
   * 失焦编辑器
   */
  blur(): void {
    this.container.blur?.();
  }

  /**
   * 保存文档
   */
  save(): void {
    this.history.clear();
    this.eventBus?.emit('editor:save');
  }

  /**
   * 删除选中的文本
   */
  deleteSelection(): void {
    if (this.options.readOnly) {
      return;
    }
    const start = this.selection.getStart();
    const end = this.selection.getEnd();
    const selectionBefore = this.selection.getState();
    const oldContent = this.document.getText().substring(start, end);

    this.document.delete(start, end);
    this.selection.setCursor(start);

    // 记录到历史
    this.history.record({
      type: HistoryActionType.Delete,
      position: start,
      length: end - start,
      oldContent,
      selectionBefore,
      selectionAfter: this.selection.getState(),
    });

    this.eventBus?.emit('editor:change', { type: 'delete', start, end });
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.history.canUndo();
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.history.canRedo();
  }
}
