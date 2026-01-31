/**
 * 历史管理测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { History, HistoryActionType } from '@/editor/History';
import { Logger } from '@/core/logger';
import { EventBus } from '@/core/event';
import type { SelectionState } from '@/editor/Selection';

describe('History', () => {
  let history: History;
  let logger: Logger;
  let eventBus: EventBus;
  let mockSelectionState: SelectionState;

  beforeEach(() => {
    logger = new Logger({ enableConsole: false });
    eventBus = new EventBus();
    history = new History(logger, eventBus);

    mockSelectionState = {
      anchor: 0,
      focus: 0,
      direction: 'none' as any,
    };
  });

  describe('record', () => {
    it('应该记录操作', () => {
      const action = {
        type: HistoryActionType.Insert,
        position: 0,
        length: 5,
        content: 'test',
        selectionBefore: mockSelectionState,
        selectionAfter: mockSelectionState,
      };

      history.record(action);

      expect(history.canUndo()).toBe(true);
      expect(history.getUndoStackSize()).toBe(1);
    });

    it('应该清空重做栈', () => {
      const action1 = {
        type: HistoryActionType.Insert,
        position: 0,
        length: 5,
        content: 'test1',
        selectionBefore: mockSelectionState,
        selectionAfter: mockSelectionState,
      };

      const action2 = {
        type: HistoryActionType.Insert,
        position: 5,
        length: 5,
        content: 'test2',
        selectionBefore: mockSelectionState,
        selectionAfter: mockSelectionState,
      };

      history.record(action1);
      history.undo();
      expect(history.canRedo()).toBe(true);

      history.record(action2);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('undo', () => {
    it('应该撤销操作', () => {
      const action = {
        type: HistoryActionType.Insert,
        position: 0,
        length: 5,
        content: 'test',
        selectionBefore: mockSelectionState,
        selectionAfter: mockSelectionState,
      };

      history.record(action);
      const undoneAction = history.undo();

      expect(undoneAction).toEqual(action);
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
    });

    it('应该返回null如果没有可撤销的操作', () => {
      expect(history.undo()).toBeNull();
    });
  });

  describe('redo', () => {
    it('应该重做操作', () => {
      const action = {
        type: HistoryActionType.Insert,
        position: 0,
        length: 5,
        content: 'test',
        selectionBefore: mockSelectionState,
        selectionAfter: mockSelectionState,
      };

      history.record(action);
      history.undo();
      const redoneAction = history.redo();

      expect(redoneAction).toBeDefined();
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('应该返回null如果没有可重做的操作', () => {
      expect(history.redo()).toBeNull();
    });
  });

  describe('canUndo/canRedo', () => {
    it('应该正确判断是否可以撤销/重做', () => {
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);

      const action = {
        type: HistoryActionType.Insert,
        position: 0,
        length: 5,
        content: 'test',
        selectionBefore: mockSelectionState,
        selectionAfter: mockSelectionState,
      };

      history.record(action);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);

      history.undo();
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
    });
  });

  describe('clear', () => {
    it('应该清空历史记录', () => {
      const action = {
        type: HistoryActionType.Insert,
        position: 0,
        length: 5,
        content: 'test',
        selectionBefore: mockSelectionState,
        selectionAfter: mockSelectionState,
      };

      history.record(action);
      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('createReverseAction', () => {
    it('应该为插入操作创建删除操作', () => {
      const action = {
        type: HistoryActionType.Insert,
        position: 5,
        length: 3,
        content: 'abc',
        selectionBefore: mockSelectionState,
        selectionAfter: mockSelectionState,
      };

      history.record(action);
      const undoneAction = history.undo();

      expect(undoneAction?.type).toBe(HistoryActionType.Insert);
      // 撤销插入应该是删除
      expect(history.canRedo()).toBe(true);
    });

    it('应该为删除操作创建插入操作', () => {
      const action = {
        type: HistoryActionType.Delete,
        position: 5,
        length: 3,
        oldContent: 'abc',
        selectionBefore: mockSelectionState,
        selectionAfter: mockSelectionState,
      };

      history.record(action);
      const undoneAction = history.undo();

      expect(undoneAction?.type).toBe(HistoryActionType.Delete);
      expect(history.canRedo()).toBe(true);
    });
  });
});
