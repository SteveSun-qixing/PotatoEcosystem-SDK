/**
 * 编辑器引擎
 *
 * 管理编辑器实例的创建和生命周期
 */

import { Editor, type EditorOptions } from './Editor';
import { EditorDocument } from './EditorDocument';
import { Selection } from './Selection';
import { History } from './History';
import { Keyboard } from './Keyboard';
import { Logger } from '../core/logger';
import type { EventBus } from '../core/event';

/**
 * 编辑器引擎配置
 */
export interface EditorEngineConfig {
  enableHistory?: boolean;
  maxHistorySize?: number;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

/**
 * 编辑器引擎类
 */
export class EditorEngine {
  private logger: Logger;
  private eventBus?: EventBus;
  private editors: Map<string, Editor>;
  private config: Required<EditorEngineConfig>;
  private nextId: number = 0;

  constructor(logger: Logger, eventBus?: EventBus) {
    this.logger = logger;
    this.eventBus = eventBus;
    this.editors = new Map();
    this.config = {
      enableHistory: true,
      maxHistorySize: 100,
      autoSave: false,
      autoSaveDelay: 1000,
    };
  }

  /**
   * 创建编辑器
   * @param container 容器元素
   * @param card 卡片数据（可选，如果未提供则创建空白文档）
   * @param options 编辑器选项
   * @returns 编辑器ID
   */
  createEditor(
    container: HTMLElement,
    card?: import('../types').Card,
    options: EditorOptions = {}
  ): string {
    // 如果没有提供卡片，创建一个空白卡片
    const defaultCard: import('../types').Card = card ?? ({
      id: `card-${Date.now()}`,
      version: '1.0.0',
      metadata: {
        chip_standards_version: '1.0.0',
        card_id: `card-${Date.now()}` as any,
        name: 'Untitled',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
        theme: '',
        tags: [],
      },
      structure: {
        structure: [],
        manifest: {
          card_count: 0,
          resource_count: 0,
          resources: [],
        },
      },
      content: {},
      resources: new Map(),
    } as any);

    // 创建编辑器组件
    const document = new EditorDocument(
      defaultCard,
      this.logger,
      this.eventBus
    );
    const selection = new Selection(
      this.logger,
      this.eventBus,
      document.getLength()
    );
    const history = new History(
      this.logger,
      this.eventBus,
      this.config.maxHistorySize
    );
    const keyboard = new Keyboard(this.logger, this.eventBus);

    // 创建编辑器实例
    const editor = new Editor(
      container,
      document,
      selection,
      history,
      keyboard,
      this.logger,
      options,
      this.eventBus
    );

    // 生成编辑器ID并存储
    const editorId = `editor-${this.nextId++}`;
    this.editors.set(editorId, editor);

    this.logger.info('Editor created', { editorId });

    return editorId;
  }

  /**
   * 通过ID获取编辑器
   * @param id 编辑器ID
   * @returns 编辑器实例，如果不存在则返回undefined
   */
  getEditor(id: string): Editor | undefined {
    return this.editors.get(id);
  }

  /**
   * 销毁编辑器
   * @param id 编辑器ID
   * @returns 是否成功销毁
   */
  destroyEditor(id: string): boolean {
    const editor = this.editors.get(id);
    if (editor) {
      editor.destroy();
      this.editors.delete(id);
      this.logger.info('Editor destroyed', { editorId: id });
      return true;
    }
    return false;
  }

  /**
   * 销毁所有编辑器
   */
  destroyAllEditors(): void {
    for (const [id, editor] of this.editors) {
      editor.destroy();
      this.logger.info('Editor destroyed', { editorId: id });
    }
    this.editors.clear();
  }

  /**
   * 获取所有编辑器ID
   * @returns 编辑器ID数组
   */
  getEditorIds(): string[] {
    return Array.from(this.editors.keys());
  }

  /**
   * 获取所有编辑器
   * @returns 编辑器数组
   */
  getEditors(): Editor[] {
    return Array.from(this.editors.values());
  }

  /**
   * 获取编辑器数量
   * @returns 编辑器数量
   */
  getEditorCount(): number {
    return this.editors.size;
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<EditorEngineConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
    this.logger.debug('EditorEngine config updated', this.config);
  }

  /**
   * 获取配置
   * @returns 当前配置
   */
  getConfig(): EditorEngineConfig {
    return { ...this.config };
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats() {
    return {
      editorCount: this.editors.size,
      instances: this.getEditorIds().map((id) => ({
        id,
        modified: this.editors.get(id)?.isModified() ?? false,
        readOnly: this.editors.get(id)?.isReadOnly() ?? false,
      })),
    };
  }
}
