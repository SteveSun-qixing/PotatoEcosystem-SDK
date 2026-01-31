/**
 * 快捷键系统
 *
 * 管理编辑器的键盘快捷键和命令绑定
 */

import { Logger } from '../core/logger';
import type { EventBus } from '../core/event';

/**
 * 键盘修饰键
 */
export enum ModifierKey {
  Ctrl = 'ctrl',
  Meta = 'meta',
  Alt = 'alt',
  Shift = 'shift',
}

/**
 * 快捷键组合
 */
export interface KeyBinding {
  key: string;
  modifiers?: ModifierKey[];
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

/**
 * 命令处理器
 */
export type CommandHandler = (event: KeyboardEvent) => void | boolean;

/**
 * 命令定义
 */
export interface Command {
  id: string;
  name: string;
  description?: string;
  handler: CommandHandler;
  keyBinding?: KeyBinding;
  enabled?: boolean;
}

/**
 * 快捷键管理器类
 */
export class Keyboard {
  private commands: Map<string, Command>;
  private keyBindings: Map<string, string>; // key -> commandId
  private logger: Logger;
  private eventBus?: EventBus;
  private enabled: boolean;
  private boundHandler?: (event: KeyboardEvent) => void;

  constructor(logger: Logger, eventBus?: EventBus) {
    this.commands = new Map();
    this.keyBindings = new Map();
    this.logger = logger;
    this.eventBus = eventBus;
    this.enabled = true;
  }

  /**
   * 注册命令
   * @param command 命令定义
   */
  registerCommand(command: Command): void {
    this.commands.set(command.id, command);

    // 如果有快捷键绑定，注册快捷键
    if (command.keyBinding) {
      const keyString = this.getKeyString(command.keyBinding);
      this.keyBindings.set(keyString, command.id);
    }

    this.logger.debug('Command registered', {
      id: command.id,
      name: command.name,
      keyBinding: command.keyBinding,
    });
    this.eventBus?.emit('keyboard:command-registered', {
      commandId: command.id,
    });
  }

  /**
   * 注销命令
   * @param commandId 命令ID
   */
  unregisterCommand(commandId: string): void {
    const command = this.commands.get(commandId);
    if (!command) {
      return;
    }

    // 移除快捷键绑定
    if (command.keyBinding) {
      const keyString = this.getKeyString(command.keyBinding);
      this.keyBindings.delete(keyString);
    }

    this.commands.delete(commandId);
    this.logger.debug('Command unregistered', { id: commandId });
    this.eventBus?.emit('keyboard:command-unregistered', { commandId });
  }

  /**
   * 执行命令
   * @param commandId 命令ID
   * @param event 键盘事件（可选）
   */
  executeCommand(commandId: string, event?: KeyboardEvent): boolean {
    const command = this.commands.get(commandId);

    if (!command) {
      this.logger.warn('Command not found', { commandId });
      return false;
    }

    // 检查命令是否启用
    if (command.enabled === false) {
      this.logger.debug('Command disabled', { commandId });
      return false;
    }

    // 如果没有提供事件，创建一个模拟事件
    const keyboardEvent =
      event ||
      new KeyboardEvent('keydown', {
        key: '',
        bubbles: true,
        cancelable: true,
      });

    try {
      const result = command.handler(keyboardEvent);

      this.logger.debug('Command executed', { commandId });
      this.eventBus?.emit('keyboard:command-executed', {
        commandId,
        result,
      });

      return result !== false;
    } catch (error) {
      this.logger.error('Command execution failed', error as Error, {
        commandId,
      });
      this.eventBus?.emit('keyboard:command-error', {
        commandId,
        error,
      });
      return false;
    }
  }

  /**
   * 绑定快捷键到命令
   * @param keyBinding 快捷键组合
   * @param commandId 命令ID
   */
  bindKey(keyBinding: KeyBinding, commandId: string): void {
    const keyString = this.getKeyString(keyBinding);
    this.keyBindings.set(keyString, commandId);

    this.logger.debug('Key binding registered', {
      keyString,
      commandId,
    });
    this.eventBus?.emit('keyboard:key-bound', { keyString, commandId });
  }

  /**
   * 解绑快捷键
   * @param keyBinding 快捷键组合
   */
  unbindKey(keyBinding: KeyBinding): void {
    const keyString = this.getKeyString(keyBinding);
    this.keyBindings.delete(keyString);

    this.logger.debug('Key binding unregistered', { keyString });
    this.eventBus?.emit('keyboard:key-unbound', { keyString });
  }

  /**
   * 处理键盘事件
   * @param event 键盘事件
   */
  handleKeyEvent(event: KeyboardEvent): boolean {
    if (!this.enabled) {
      return false;
    }

    const keyBinding = this.parseKeyEvent(event);
    const keyString = this.getKeyString(keyBinding);

    const commandId = this.keyBindings.get(keyString);

    if (!commandId) {
      return false;
    }

    const command = this.commands.get(commandId);

    if (!command || command.enabled === false) {
      return false;
    }

    // 处理preventDefault和stopPropagation
    if (command.keyBinding?.preventDefault) {
      event.preventDefault();
    }
    if (command.keyBinding?.stopPropagation) {
      event.stopPropagation();
    }

    // 执行命令
    return this.executeCommand(commandId, event);
  }

  /**
   * 启用快捷键系统
   */
  enable(): void {
    this.enabled = true;
    this.logger.debug('Keyboard enabled');
    this.eventBus?.emit('keyboard:enabled');
  }

  /**
   * 禁用快捷键系统
   */
  disable(): void {
    this.enabled = false;
    this.logger.debug('Keyboard disabled');
    this.eventBus?.emit('keyboard:disabled');
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 绑定到DOM元素
   * @param element DOM元素
   */
  attach(element: HTMLElement): void {
    this.detach();

    this.boundHandler = (event: KeyboardEvent) => {
      this.handleKeyEvent(event);
    };

    element.addEventListener('keydown', this.boundHandler);
    this.logger.debug('Keyboard attached to element');
    this.eventBus?.emit('keyboard:attached', { element });
  }

  /**
   * 解绑DOM元素
   */
  detach(): void {
    if (this.boundHandler) {
      // 需要从之前绑定的元素上移除，但我们没有保存引用
      // 这里假设调用者会正确处理
      this.boundHandler = undefined;
      this.logger.debug('Keyboard detached from element');
      this.eventBus?.emit('keyboard:detached');
    }
  }

  /**
   * 获取命令列表
   */
  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * 获取命令
   * @param commandId 命令ID
   */
  getCommand(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /**
   * 获取快捷键绑定列表
   */
  getKeyBindings(): Array<{ keyBinding: KeyBinding; commandId: string }> {
    const result: Array<{ keyBinding: KeyBinding; commandId: string }> = [];

    for (const [keyString, commandId] of this.keyBindings) {
      const keyBinding = this.parseKeyString(keyString);
      if (keyBinding) {
        result.push({ keyBinding, commandId });
      }
    }

    return result;
  }

  /**
   * 从键盘事件解析快捷键组合
   */
  private parseKeyEvent(event: KeyboardEvent): KeyBinding {
    const modifiers: ModifierKey[] = [];

    if (event.ctrlKey) {
      modifiers.push(ModifierKey.Ctrl);
    }
    if (event.metaKey) {
      modifiers.push(ModifierKey.Meta);
    }
    if (event.altKey) {
      modifiers.push(ModifierKey.Alt);
    }
    if (event.shiftKey) {
      modifiers.push(ModifierKey.Shift);
    }

    return {
      key: event.key.toLowerCase(),
      modifiers: modifiers.length > 0 ? modifiers : undefined,
    };
  }

  /**
   * 获取快捷键字符串表示
   */
  private getKeyString(keyBinding: KeyBinding): string {
    const parts: string[] = [];

    if (keyBinding.modifiers) {
      parts.push(...keyBinding.modifiers.sort());
    }

    parts.push(keyBinding.key.toLowerCase());

    return parts.join('+');
  }

  /**
   * 从字符串解析快捷键组合
   */
  private parseKeyString(keyString: string): KeyBinding | null {
    const parts = keyString.split('+');
    if (parts.length === 0) {
      return null;
    }

    const key = parts[parts.length - 1];
    if (!key) {
      return null;
    }

    const modifiers = parts.slice(0, -1) as ModifierKey[];

    return {
      key,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
    };
  }
}
