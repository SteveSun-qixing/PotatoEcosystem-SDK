/**
 * 事件常量定义
 */

/**
 * SDK事件类型
 */
export const SDK_EVENTS = {
  // 卡片事件
  CARD_LOAD: 'card:load',
  CARD_SAVE: 'card:save',
  CARD_UPDATE: 'card:update',
  CARD_DELETE: 'card:delete',
  CARD_CREATE: 'card:create',

  // 箱子事件
  BOX_LOAD: 'box:load',
  BOX_SAVE: 'box:save',
  BOX_UPDATE: 'box:update',
  BOX_DELETE: 'box:delete',

  // 渲染事件
  RENDER_START: 'render:start',
  RENDER_COMPLETE: 'render:complete',
  RENDER_ERROR: 'render:error',

  // 编辑事件
  EDITOR_CHANGE: 'editor:change',
  EDITOR_SAVE: 'editor:save',
  EDITOR_SELECTION_CHANGE: 'editor:selection-change',

  // 资源事件
  RESOURCE_LOAD: 'resource:load',
  RESOURCE_ERROR: 'resource:error',

  // 主题事件
  THEME_CHANGE: 'theme:change',
  SYSTEM_THEME_CHANGE: 'system-theme-change',

  // 语言事件
  LANGUAGE_CHANGE: 'language:change',

  // 插件事件
  PLUGIN_INSTALL: 'plugin:install',
  PLUGIN_UNINSTALL: 'plugin:uninstall',
  PLUGIN_ENABLE: 'plugin:enable',
  PLUGIN_DISABLE: 'plugin:disable',

  // 系统事件
  ERROR: 'error',
  WARNING: 'warning',
  READY: 'ready',
} as const;

/**
 * 核心事件类型（用于与内核通信）
 */
export const CORE_EVENTS = {
  CARD_CREATED: 'card.created',
  CARD_UPDATED: 'card.updated',
  CARD_DELETED: 'card.deleted',
  BOX_CREATED: 'box.created',
  BOX_UPDATED: 'box.updated',
  BOX_DELETED: 'box.deleted',
  PLUGIN_LOADED: 'plugin.loaded',
  PLUGIN_UNLOADED: 'plugin.unloaded',
  ERROR_OCCURRED: 'error.occurred',
} as const;
