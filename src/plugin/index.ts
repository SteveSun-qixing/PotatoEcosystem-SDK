/**
 * 插件系统模块导出
 */

export { PluginSystem } from './PluginSystem';
export type { PluginSystemConfig } from './PluginSystem';

export { PluginManifestLoader } from './PluginManifestLoader';
export type {
  ValidationResult,
  LoadManifestOptions,
} from './PluginManifestLoader';

export { DependencyResolver } from './DependencyResolver';
export type {
  DependencyNode,
  DependencyGraph,
  DependencyResolution,
  VersionComparisonResult,
} from './DependencyResolver';

export { PluginLoader } from './PluginLoader';
export type { LoadPluginOptions, PluginPackage } from './PluginLoader';

export { PluginLifecycleManager } from './PluginLifecycleManager';
export {
  LifecycleState,
  type LifecycleEntry,
  type LifecycleEventData,
} from './PluginLifecycleManager';
