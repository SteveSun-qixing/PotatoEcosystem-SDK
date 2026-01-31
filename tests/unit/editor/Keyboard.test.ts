/**
 * 快捷键系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Keyboard, ModifierKey } from '@/editor/Keyboard';
import { Logger } from '@/core/logger';
import { EventBus } from '@/core/event';

describe('Keyboard', () => {
  let keyboard: Keyboard;
  let logger: Logger;
  let eventBus: EventBus;

  beforeEach(() => {
    logger = new Logger({ enableConsole: false });
    eventBus = new EventBus();
    keyboard = new Keyboard(logger, eventBus);
  });

  describe('registerCommand', () => {
    it('应该注册命令', () => {
      const handler = vi.fn();
      keyboard.registerCommand({
        id: 'test',
        name: '测试命令',
        handler,
      });

      expect(keyboard.getCommand('test')).toBeDefined();
    });

    it('应该注册带快捷键的命令', () => {
      const handler = vi.fn();
      keyboard.registerCommand({
        id: 'test',
        name: '测试命令',
        handler,
        keyBinding: {
          key: 'a',
          modifiers: [ModifierKey.Ctrl],
        },
      });

      const command = keyboard.getCommand('test');
      expect(command).toBeDefined();
      expect(command?.keyBinding?.key).toBe('a');
    });
  });

  describe('executeCommand', () => {
    it('应该执行命令', () => {
      const handler = vi.fn();
      keyboard.registerCommand({
        id: 'test',
        name: '测试命令',
        handler,
      });

      keyboard.executeCommand('test');

      expect(handler).toHaveBeenCalled();
    });

    it('应该返回false如果命令不存在', () => {
      expect(keyboard.executeCommand('nonexistent')).toBe(false);
    });

    it('应该不执行禁用的命令', () => {
      const handler = vi.fn();
      keyboard.registerCommand({
        id: 'test',
        name: '测试命令',
        handler,
        enabled: false,
      });

      keyboard.executeCommand('test');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('handleKeyEvent', () => {
    it('应该处理键盘事件', () => {
      const handler = vi.fn();
      keyboard.registerCommand({
        id: 'test',
        name: '测试命令',
        handler,
        keyBinding: {
          key: 'a',
          modifiers: [ModifierKey.Ctrl],
        },
      });

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      keyboard.handleKeyEvent(event);

      expect(handler).toHaveBeenCalled();
    });

    it('应该preventDefault如果配置了', () => {
      const handler = vi.fn();
      keyboard.registerCommand({
        id: 'test',
        name: '测试命令',
        handler,
        keyBinding: {
          key: 'a',
          modifiers: [ModifierKey.Ctrl],
          preventDefault: true,
        },
      });

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      keyboard.handleKeyEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('应该返回false如果没有匹配的命令', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'x',
        bubbles: true,
        cancelable: true,
      });

      expect(keyboard.handleKeyEvent(event)).toBe(false);
    });
  });

  describe('enable/disable', () => {
    it('应该启用/禁用快捷键系统', () => {
      const handler = vi.fn();
      keyboard.registerCommand({
        id: 'test',
        name: '测试命令',
        handler,
        keyBinding: {
          key: 'a',
          modifiers: [ModifierKey.Ctrl],
        },
      });

      keyboard.disable();
      expect(keyboard.isEnabled()).toBe(false);

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      keyboard.handleKeyEvent(event);
      expect(handler).not.toHaveBeenCalled();

      keyboard.enable();
      expect(keyboard.isEnabled()).toBe(true);
    });
  });

  describe('attach/detach', () => {
    it('应该绑定到DOM元素', () => {
      const element = document.createElement('div');
      const handler = vi.fn();
      keyboard.registerCommand({
        id: 'test',
        name: '测试命令',
        handler,
        keyBinding: {
          key: 'a',
          modifiers: [ModifierKey.Ctrl],
        },
      });

      keyboard.attach(element);

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      element.dispatchEvent(event);
      expect(handler).toHaveBeenCalled();

      keyboard.detach();
    });
  });

  describe('getCommands', () => {
    it('应该返回所有命令', () => {
      keyboard.registerCommand({
        id: 'test1',
        name: '测试命令1',
        handler: () => {},
      });

      keyboard.registerCommand({
        id: 'test2',
        name: '测试命令2',
        handler: () => {},
      });

      const commands = keyboard.getCommands();
      expect(commands).toHaveLength(2);
    });
  });
});
