/**
 * 插件模块导出
 * @module plugin
 */

export { PluginManager } from './manager';
export type {
  PluginState,
  PluginMetadata,
  PluginDependency,
  PluginConfig,
  PluginContext,
  PluginInstance,
  PluginRegistration,
  PluginQueryOptions,
  CommandHandler,
  RendererDefinition,
  EventHandlerFn,
} from './types';
