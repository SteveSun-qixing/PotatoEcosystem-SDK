# PluginManager

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/plugin/manager.ts`

## 概述

`PluginManager` 管理插件的注册、启用/禁用、依赖检查与命令/渲染器注册. 插件通过上下文与 SDK 交互.

## 关键类型

- `PluginMetadata` / `PluginDependency`
- `PluginRegistration`
- `PluginInstance`
- `PluginContext`
- `CommandHandler`, `RendererDefinition`

### PluginMetadata 主要字段

- `id`: 插件 ID
- `name`: 插件名称
- `version`: 插件版本
- `description?`, `author?`, `homepage?`
- `chipStandardsVersion`: 协议版本
- `dependencies?`: 插件依赖
- `keywords?`, `license?`

### PluginDependency

- `id`: 依赖插件 ID
- `version`: 版本要求
- `optional?`: 是否可选

### RendererDefinition

- `name`: 渲染器名称
- `cardTypes`: 支持的卡片类型
- `render(data, container)`: 渲染函数
- `destroy?()`: 销毁函数

## 方法

### `register(registration: PluginRegistration): void`

注册插件 (状态为 `installed`).

- 若已存在抛出 `PluginError(PLUGIN_ALREADY_EXISTS)`
- 事件: `plugin:registered`

### `unregister(id: string): Promise<void>`

- 若插件已启用, 先 `disable`
- 清理命令与渲染器
- 事件: `plugin:unregistered`

### `enable(id: string): Promise<void>`

- 检查依赖并启用必需依赖
- 调用插件 `activate(context)`
- 事件: `plugin:enabled`

失败时抛出 `PluginError(PLUGIN_LOAD_FAILED)`.

### `disable(id: string): Promise<void>`

- 调用 `deactivate()`
- 清理插件资源
- 事件: `plugin:disabled`

### `updateConfig(id, config): void`

合并更新配置并触发 `plugin:config:updated`.

### `executeCommand(name: string, args?: unknown): Promise<unknown>`

执行命令, 命令名需与注册时一致.

> 注意: `PluginContext.registerCommand` 会自动拼接 `pluginId:name`. 因此外部调用时需传入完整命令名 (如 `my-plugin:open`).

### 查询与列表

- `get(id)` / `getMetadata(id)` / `getState(id)` / `isEnabled(id)`
- `list(options?: PluginQueryOptions)`
- `count` / `enabledCount`

### 渲染器相关

- `getRenderer(cardType: string): RendererDefinition | undefined`
- `getCommands(): string[]`
- `getRendererTypes(): string[]`

## 插件上下文

`PluginContext` 提供:

- `pluginId` / `sdkVersion`
- `config`
- `log(message, data?)`
- `registerCommand(name, handler)`
- `registerRenderer(type, renderer)`
- `emit(event, data)` / `on(event, handler)`

## 事件

| 事件名 | 数据 |
| --- | --- |
| `plugin:registered` | `{ id, metadata }` |
| `plugin:unregistered` | `{ id }` |
| `plugin:enabled` | `{ id }` |
| `plugin:disabled` | `{ id }` |
| `plugin:config:updated` | `{ id, config }` |

## 注意事项

- 依赖检查仅基于 `PluginMetadata.dependencies`.
- `PluginManager` 使用多组 `ErrorCodes.PLUGIN_*`, 当前未在 `ErrorCodes` 中定义, 需补充.
