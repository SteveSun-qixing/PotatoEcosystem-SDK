/**
 * 选区管理
 *
 * 管理编辑器的文本选区状态和操作
 */

import { Logger } from '../core/logger';
import type { EventBus } from '../core/event';

/**
 * 选区范围
 */
export interface SelectionRange {
  start: number;
  end: number;
}

/**
 * 选区方向
 */
export enum SelectionDirection {
  Forward = 'forward',
  Backward = 'backward',
  None = 'none',
}

/**
 * 选区状态
 */
export interface SelectionState {
  anchor: number;
  focus: number;
  direction: SelectionDirection;
}

/**
 * 选区类
 */
export class Selection {
  private anchor: number;
  private focus: number;
  private direction: SelectionDirection;
  private logger: Logger;
  private eventBus?: EventBus;
  private documentLength: number;

  constructor(logger: Logger, eventBus?: EventBus, documentLength = 0) {
    this.anchor = 0;
    this.focus = 0;
    this.direction = SelectionDirection.None;
    this.logger = logger;
    this.eventBus = eventBus;
    this.documentLength = documentLength;
  }

  /**
   * 设置文档长度（用于验证选区范围）
   */
  setDocumentLength(length: number): void {
    this.documentLength = length;
    // 如果当前选区超出文档长度，调整选区
    if (this.anchor > length) {
      this.anchor = length;
    }
    if (this.focus > length) {
      this.focus = length;
    }
  }

  /**
   * 设置选区
   * @param start 起始位置
   * @param end 结束位置
   * @param direction 方向（可选）
   */
  setRange(start: number, end: number, direction?: SelectionDirection): void {
    const normalizedStart = this.normalizePosition(start);
    const normalizedEnd = this.normalizePosition(end);

    this.anchor = normalizedStart;
    this.focus = normalizedEnd;
    this.direction =
      direction ?? this.calculateDirection(normalizedStart, normalizedEnd);

    this.logger.debug('Selection set', {
      start: normalizedStart,
      end: normalizedEnd,
      direction: this.direction,
    });
    this.eventBus?.emit('selection:change', this.getState());
  }

  /**
   * 设置锚点和焦点
   * @param anchor 锚点位置
   * @param focus 焦点位置
   */
  setAnchorFocus(anchor: number, focus: number): void {
    const normalizedAnchor = this.normalizePosition(anchor);
    const normalizedFocus = this.normalizePosition(focus);

    this.anchor = normalizedAnchor;
    this.focus = normalizedFocus;
    this.direction = this.calculateDirection(normalizedAnchor, normalizedFocus);

    this.logger.debug('Selection anchor/focus set', {
      anchor: normalizedAnchor,
      focus: normalizedFocus,
      direction: this.direction,
    });
    this.eventBus?.emit('selection:change', this.getState());
  }

  /**
   * 设置光标位置（折叠选区）
   * @param position 光标位置
   */
  setCursor(position: number): void {
    const normalizedPosition = this.normalizePosition(position);
    this.anchor = normalizedPosition;
    this.focus = normalizedPosition;
    this.direction = SelectionDirection.None;

    this.logger.debug('Cursor set', { position: normalizedPosition });
    this.eventBus?.emit('selection:change', this.getState());
  }

  /**
   * 获取选区范围
   */
  getRange(): SelectionRange {
    const start = Math.min(this.anchor, this.focus);
    const end = Math.max(this.anchor, this.focus);

    return { start, end };
  }

  /**
   * 获取起始位置
   */
  getStart(): number {
    return Math.min(this.anchor, this.focus);
  }

  /**
   * 获取结束位置
   */
  getEnd(): number {
    return Math.max(this.anchor, this.focus);
  }

  /**
   * 获取锚点位置
   */
  getAnchor(): number {
    return this.anchor;
  }

  /**
   * 获取焦点位置
   */
  getFocus(): number {
    return this.focus;
  }

  /**
   * 获取光标位置（折叠选区的位置）
   */
  getCursor(): number {
    return this.focus;
  }

  /**
   * 获取选区长度
   */
  getLength(): number {
    return Math.abs(this.focus - this.anchor);
  }

  /**
   * 检查是否为空选区（光标）
   */
  isEmpty(): boolean {
    return this.anchor === this.focus;
  }

  /**
   * 检查是否有选中文本
   */
  hasSelection(): boolean {
    return this.anchor !== this.focus;
  }

  /**
   * 获取选区方向
   */
  getDirection(): SelectionDirection {
    return this.direction;
  }

  /**
   * 获取选区状态
   */
  getState(): SelectionState {
    return {
      anchor: this.anchor,
      focus: this.focus,
      direction: this.direction,
    };
  }

  /**
   * 恢复选区状态
   */
  restoreState(state: SelectionState): void {
    this.anchor = this.normalizePosition(state.anchor);
    this.focus = this.normalizePosition(state.focus);
    this.direction = state.direction;

    this.logger.debug('Selection state restored', state as any);
    this.eventBus?.emit('selection:change', this.getState());
  }

  /**
   * 扩展选区
   * @param position 扩展到的位置
   */
  extendTo(position: number): void {
    const normalizedPosition = this.normalizePosition(position);
    this.focus = normalizedPosition;
    this.direction = this.calculateDirection(this.anchor, normalizedPosition);

    this.logger.debug('Selection extended', {
      anchor: this.anchor,
      focus: normalizedPosition,
      direction: this.direction,
    });
    this.eventBus?.emit('selection:change', this.getState());
  }

  /**
   * 移动光标
   * @param offset 偏移量（正数向右，负数向左）
   */
  moveCursor(offset: number): void {
    const newPosition = this.normalizePosition(this.focus + offset);
    this.setCursor(newPosition);
  }

  /**
   * 移动光标到文档开始
   */
  moveToStart(): void {
    this.setCursor(0);
  }

  /**
   * 移动光标到文档结束
   */
  moveToEnd(): void {
    this.setCursor(this.documentLength);
  }

  /**
   * 选择全部
   */
  selectAll(): void {
    this.setRange(0, this.documentLength);
  }

  /**
   * 清除选区（折叠到光标）
   */
  collapse(): void {
    this.setCursor(this.focus);
  }

  /**
   * 折叠到开始位置
   */
  collapseToStart(): void {
    const start = this.getStart();
    this.setCursor(start);
  }

  /**
   * 折叠到结束位置
   */
  collapseToEnd(): void {
    const end = this.getEnd();
    this.setCursor(end);
  }

  /**
   * 调整选区（当文档内容变化时）
   * @param position 变化位置
   * @param deletedLength 删除的长度
   * @param insertedLength 插入的长度
   */
  adjustForChange(
    position: number,
    deletedLength: number,
    insertedLength: number
  ): void {
    const delta = insertedLength - deletedLength;

    // 调整锚点
    if (this.anchor > position + deletedLength) {
      // 锚点在删除范围之后，需要前移
      this.anchor = this.anchor - deletedLength + insertedLength;
    } else if (this.anchor > position) {
      // 锚点在删除范围内，移动到删除起始位置
      this.anchor = position + insertedLength;
    }

    // 调整焦点
    if (this.focus > position + deletedLength) {
      // 焦点在删除范围之后，需要前移
      this.focus = this.focus - deletedLength + insertedLength;
    } else if (this.focus > position) {
      // 焦点在删除范围内，移动到删除起始位置
      this.focus = position + insertedLength;
    }

    // 确保不超出文档范围
    this.anchor = Math.max(
      0,
      Math.min(this.anchor, this.documentLength + delta)
    );
    this.focus = Math.max(0, Math.min(this.focus, this.documentLength + delta));

    this.documentLength += delta;
    this.direction = this.calculateDirection(this.anchor, this.focus);

    this.logger.debug('Selection adjusted for change', {
      position,
      deletedLength,
      insertedLength,
      newAnchor: this.anchor,
      newFocus: this.focus,
    });
  }

  /**
   * 计算选区方向
   */
  private calculateDirection(
    anchor: number,
    focus: number
  ): SelectionDirection {
    if (anchor === focus) {
      return SelectionDirection.None;
    }
    return focus > anchor
      ? SelectionDirection.Forward
      : SelectionDirection.Backward;
  }

  /**
   * 规范化位置（确保在有效范围内）
   */
  private normalizePosition(position: number): number {
    return Math.max(0, Math.min(position, this.documentLength));
  }
}
