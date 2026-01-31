/**
 * 历史管理（撤销/重做）
 *
 * 管理编辑器的操作历史，支持撤销和重做功能
 */

import { Logger } from '../core/logger';
import type { EventBus } from '../core/event';
import type { DocumentChange } from './EditorDocument';
import type { SelectionState } from './Selection';

/**
 * 历史记录项
 */
export interface HistoryEntry {
  id: string;
  type: 'undo' | 'redo';
  change: DocumentChange;
  selectionBefore: SelectionState;
  selectionAfter: SelectionState;
  timestamp: number;
}

/**
 * 历史操作类型
 */
export enum HistoryActionType {
  Insert = 'insert',
  Delete = 'delete',
  Replace = 'replace',
  Update = 'update',
}

/**
 * 历史操作
 */
export interface HistoryAction {
  type: HistoryActionType;
  position: number;
  length: number;
  content?: string;
  oldContent?: string;
  selectionBefore: SelectionState;
  selectionAfter: SelectionState;
}

/**
 * 历史管理器类
 */
export class History {
  private undoStack: HistoryAction[];
  private redoStack: HistoryAction[];
  private maxSize: number;
  private logger: Logger;
  private eventBus?: EventBus;
  private isUndoing: boolean;
  private isRedoing: boolean;

  constructor(logger: Logger, eventBus?: EventBus, maxSize = 100) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize = maxSize;
    this.logger = logger;
    this.eventBus = eventBus;
    this.isUndoing = false;
    this.isRedoing = false;
  }

  /**
   * 记录操作
   * @param action 操作
   */
  record(action: HistoryAction): void {
    // 如果正在撤销或重做，不记录
    if (this.isUndoing || this.isRedoing) {
      return;
    }

    // 添加到撤销栈
    this.undoStack.push(action);

    // 限制栈大小
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    // 清空重做栈（新操作会清除重做历史）
    this.redoStack = [];

    this.logger.debug('History recorded', {
      type: action.type,
      position: action.position,
      length: action.length,
    });
    this.eventBus?.emit('history:recorded', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  /**
   * 撤销操作
   * @returns 撤销的操作，如果没有可撤销的操作则返回null
   */
  undo(): HistoryAction | null {
    if (!this.canUndo()) {
      return null;
    }

    this.isUndoing = true;

    try {
      const action = this.undoStack.pop()!;

      // 创建反向操作
      const reverseAction = this.createReverseAction(action);

      // 添加到重做栈
      this.redoStack.push(reverseAction);

      // 限制栈大小
      if (this.redoStack.length > this.maxSize) {
        this.redoStack.shift();
      }

      this.logger.debug('History undo', {
        type: action.type,
        position: action.position,
        length: action.length,
      });
      this.eventBus?.emit('history:undo', {
        action,
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
      });

      return action;
    } finally {
      this.isUndoing = false;
    }
  }

  /**
   * 重做操作
   * @returns 重做的操作，如果没有可重做的操作则返回null
   */
  redo(): HistoryAction | null {
    if (!this.canRedo()) {
      return null;
    }

    this.isRedoing = true;

    try {
      const action = this.redoStack.pop()!;

      // 创建反向操作（用于撤销）
      const reverseAction = this.createReverseAction(action);

      // 添加到撤销栈
      this.undoStack.push(reverseAction);

      // 限制栈大小
      if (this.undoStack.length > this.maxSize) {
        this.undoStack.shift();
      }

      this.logger.debug('History redo', {
        type: action.type,
        position: action.position,
        length: action.length,
      });
      this.eventBus?.emit('history:redo', {
        action,
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
      });

      return action;
    } finally {
      this.isRedoing = false;
    }
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 获取撤销栈大小
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取重做栈大小
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.logger.debug('History cleared');
    this.eventBus?.emit('history:cleared');
  }

  /**
   * 获取历史状态
   */
  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoStackSize: this.getUndoStackSize(),
      redoStackSize: this.getRedoStackSize(),
    };
  }

  /**
   * 创建反向操作（用于撤销/重做）
   */
  private createReverseAction(action: HistoryAction): HistoryAction {
    switch (action.type) {
      case HistoryActionType.Insert: {
        // 插入的反向操作是删除
        return {
          type: HistoryActionType.Delete,
          position: action.position,
          length: action.length,
          selectionBefore: action.selectionAfter,
          selectionAfter: action.selectionBefore,
        };
      }

      case HistoryActionType.Delete: {
        // 删除的反向操作是插入
        return {
          type: HistoryActionType.Insert,
          position: action.position,
          length: action.length,
          content: action.oldContent,
          selectionBefore: action.selectionAfter,
          selectionAfter: action.selectionBefore,
        };
      }

      case HistoryActionType.Replace: {
        // 替换的反向操作是替换回原内容
        return {
          type: HistoryActionType.Replace,
          position: action.position,
          length: action.length,
          content: action.oldContent,
          oldContent: action.content,
          selectionBefore: action.selectionAfter,
          selectionAfter: action.selectionBefore,
        };
      }

      case HistoryActionType.Update: {
        // 更新的反向操作是更新回原内容
        return {
          type: HistoryActionType.Update,
          position: 0,
          length: action.length,
          content: action.oldContent,
          oldContent: action.content,
          selectionBefore: action.selectionAfter,
          selectionAfter: action.selectionBefore,
        };
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * 批量记录操作（作为一个单元）
   * @param actions 操作数组
   */
  recordBatch(actions: HistoryAction[]): void {
    if (actions.length === 0) {
      return;
    }

    // 如果只有一个操作，直接记录
    if (actions.length === 1 && actions[0]) {
      this.record(actions[0]);
      return;
    }

    // 多个操作合并为一个复合操作
    const firstAction = actions[0];
    const lastAction = actions[actions.length - 1];

    if (!firstAction || !lastAction) {
      return;
    }

    const batchAction: HistoryAction = {
      type: firstAction.type, // 使用第一个操作的类型
      position: firstAction.position,
      length: lastAction.position + lastAction.length - firstAction.position,
      selectionBefore: firstAction.selectionBefore,
      selectionAfter: lastAction.selectionAfter,
    };

    this.record(batchAction);
  }
}
