/**
 * 选区管理测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Selection, SelectionDirection } from '@/editor/Selection';
import { Logger } from '@/core/logger';
import { EventBus } from '@/core/event';

describe('Selection', () => {
  let selection: Selection;
  let logger: Logger;
  let eventBus: EventBus;

  beforeEach(() => {
    logger = new Logger({ enableConsole: false });
    eventBus = new EventBus();
    selection = new Selection(logger, eventBus, 10);
  });

  describe('setRange', () => {
    it('应该设置选区范围', () => {
      selection.setRange(2, 5);
      expect(selection.getStart()).toBe(2);
      expect(selection.getEnd()).toBe(5);
      expect(selection.getLength()).toBe(3);
    });

    it('应该自动交换start和end', () => {
      selection.setRange(5, 2);
      expect(selection.getStart()).toBe(2);
      expect(selection.getEnd()).toBe(5);
    });

    it('应该规范化超出范围的位置', () => {
      selection.setRange(-1, 100);
      expect(selection.getStart()).toBe(0);
      expect(selection.getEnd()).toBe(10);
    });
  });

  describe('setCursor', () => {
    it('应该设置光标位置', () => {
      selection.setCursor(5);
      expect(selection.getCursor()).toBe(5);
      expect(selection.isEmpty()).toBe(true);
    });
  });

  describe('getRange', () => {
    it('应该返回正确的范围', () => {
      selection.setRange(2, 5);
      const range = selection.getRange();
      expect(range.start).toBe(2);
      expect(range.end).toBe(5);
    });
  });

  describe('isEmpty', () => {
    it('应该正确判断空选区', () => {
      selection.setCursor(5);
      expect(selection.isEmpty()).toBe(true);
      expect(selection.hasSelection()).toBe(false);
    });

    it('应该正确判断非空选区', () => {
      selection.setRange(2, 5);
      expect(selection.isEmpty()).toBe(false);
      expect(selection.hasSelection()).toBe(true);
    });
  });

  describe('extendTo', () => {
    it('应该扩展选区', () => {
      selection.setRange(2, 5);
      selection.extendTo(8);
      expect(selection.getEnd()).toBe(8);
    });
  });

  describe('moveCursor', () => {
    it('应该移动光标', () => {
      selection.setCursor(5);
      selection.moveCursor(2);
      expect(selection.getCursor()).toBe(7);
    });

    it('应该限制在文档范围内', () => {
      selection.setCursor(5);
      selection.moveCursor(100);
      expect(selection.getCursor()).toBe(10);
    });
  });

  describe('selectAll', () => {
    it('应该选择全部', () => {
      selection.selectAll();
      expect(selection.getStart()).toBe(0);
      expect(selection.getEnd()).toBe(10);
    });
  });

  describe('collapse', () => {
    it('应该折叠选区', () => {
      selection.setRange(2, 5);
      selection.collapse();
      expect(selection.isEmpty()).toBe(true);
      expect(selection.getCursor()).toBe(5);
    });
  });

  describe('adjustForChange', () => {
    it('应该在插入后调整选区', () => {
      selection.setRange(5, 7);
      selection.adjustForChange(3, 0, 2);
      expect(selection.getStart()).toBe(7);
      expect(selection.getEnd()).toBe(9);
    });

    it('应该在删除后调整选区', () => {
      selection.setRange(5, 7);
      selection.adjustForChange(3, 2, 0);
      expect(selection.getStart()).toBe(3);
      expect(selection.getEnd()).toBe(5);
    });

    it('应该处理选区在变化范围内的情况', () => {
      selection.setRange(3, 5);
      selection.adjustForChange(2, 4, 2);
      // 调整后选区应该反映变化（选区被折叠到变化结束位置）
      expect(selection.getStart()).toBe(4);
      expect(selection.getEnd()).toBe(4);
    });
  });

  describe('事件', () => {
    it('应该在选区变化时触发事件', () => {
      const listener = vi.fn();
      eventBus.on('selection:change', listener);

      selection.setRange(2, 5);

      expect(listener).toHaveBeenCalled();
    });
  });
});
