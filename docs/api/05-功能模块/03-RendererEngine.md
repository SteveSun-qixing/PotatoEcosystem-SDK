# RendererEngine

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/renderer/engine.ts`

## 概述

`RendererEngine` 提供卡片/箱子渲染能力, 内置基础卡片渲染器与 grid/list 箱子渲染器, 支持缓存与超时控制.

## RendererEngineOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `defaultTheme` | `string` | `default-light` | 默认主题 |
| `enableCache` | `boolean` | `true` | 是否缓存渲染结果 |
| `cacheSize` | `number` | `50` | 缓存最大条目数 |
| `defaultMode` | `RenderMode` | `full` | 默认渲染模式 |
| `timeout` | `number` | `10000` | 渲染超时 (ms) |

## RenderOptions

- `targetType?: 'card' | 'box' | 'cover' | 'preview'`
- `mode?: 'full' | 'lazy' | 'partial'`
- `theme?: string`
- `animations?: boolean`
- `lazyLoad?: boolean`
- `customStyles?: Record<string, string>` (当前未使用)
- `timeout?: number`

### Renderer 接口摘要

- `Renderer`: `{ name; render(context); update?; destroy? }`
- `CardRenderer`: `Renderer` + `supportedTypes: string[]`
- `BoxRenderer`: `Renderer` + `supportedLayouts: string[]`

### RenderContext

- `container: HTMLElement`
- `data: Card | Box`
- `options: RenderOptions`
- `themeVars: Record<string, string>`

## 方法

### `registerCardRenderer(renderer: CardRenderer): void`

按 `supportedTypes` 注册渲染器.

### `registerBoxRenderer(renderer: BoxRenderer): void`

按 `supportedLayouts` 注册渲染器.

### `renderCard(card, container, options?): Promise<RenderResult>`

- 自动选择卡片类型渲染器
- 渲染成功时填充容器
- 触发事件: `render:start`, `render:complete`, `render:error`

### `renderBox(box, container, options?): Promise<RenderResult>`

逻辑同 `renderCard`, 以布局类型选择渲染器.

### `renderCover(card, container): Promise<RenderResult>`

对 `targetType='cover'` 的快捷调用.

### `renderPreview(data, container): Promise<RenderResult>`

根据数据类型选择 `renderCard` 或 `renderBox`.

### 缓存

- `clearCache(): void`
- `cacheSize: number`

### 注册信息

- `getRegisteredCardTypes(): string[]`
- `getRegisteredLayouts(): string[]`

## RenderResult

- `success: boolean`
- `html?: string`
- `css?: string`
- `error?: string`
- `duration?: number`

## 事件

| 事件名 | 数据 |
| --- | --- |
| `render:start` | `{ type: 'card' | 'box', targetId }` |
| `render:complete` | `{ type, targetId, duration }` |
| `render:error` | `{ type, targetId, error }` |

## 默认渲染器

- 卡片: `basic` (支持 `basic`, `text`, `image`, `link`)
- 箱子: `grid` (支持 `grid`, `masonry`)
- 箱子: `list` (支持 `list`, `compact`)

## 注意事项

- `RenderError` 使用 `ErrorCodes.RENDER_FAILED` (当前需补充到错误码集合).
- `customStyles` 选项暂未在默认渲染器中使用.
