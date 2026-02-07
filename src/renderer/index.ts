/**
 * 渲染引擎模块导出
 * @module renderer
 *
 * 提供卡片和箱子的完整渲染能力，包括：
 * - RendererEngine: 渲染引擎入口
 * - CardParser: 卡片文件解析器
 * - RendererFetcher: 渲染代码获取器
 * - CardRenderManager: 基于 Shadow DOM 的实时渲染管理器
 */

// 渲染引擎
export { RendererEngine } from './engine';

// 四阶段流水线组件
export { CardParser, createCardParser } from './card-parser';
export { ResourceResolver, createResourceResolver } from './resource-resolver';
export { RendererFetcher, createRendererFetcher } from './renderer-fetcher';
export { CardRenderManager, createCardRenderManager } from './card-render-manager';

// 资源解析类型（从 resource-resolver 直接导出）
export type { ResourceResolveResult } from './resource-resolver';

// 类型导出
export type {
  // 卡片解析类型
  ParsedCardMetadata,
  ParsedCardStructure,
  ParsedBaseCardConfig,
  ParsedCardData,
  CardParseSource,
  CardParseResult,
  CardParserOptions,
  // 渲染代码类型
  RendererCode,
  RendererCodeMap,
  RendererFetcherOptions,
  // 渲染管理器类型
  IsolationMode,
  CardRenderManagerOptions,
  MountedBaseCard,
  CardMountResult,
  // 渲染引擎公开 API 类型
  RenderTargetType,
  RenderMode,
  RenderOptions,
  RenderResult,
  RenderContext,
  Renderer,
  CardRenderer,
  BoxRenderer,
  RendererEngineOptions,
  RenderEvent,
} from './types';
