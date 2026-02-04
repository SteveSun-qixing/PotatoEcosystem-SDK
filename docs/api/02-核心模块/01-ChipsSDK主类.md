# ChipsSDK 主类

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/sdk.ts`

## 概述

`ChipsSDK` 是 SDK 的统一入口, 负责初始化 Core 连接、基础支撑模块与功能模块, 并提供统一的访问入口与快捷方法.

## 类型

### SDKState

- `idle`: 未初始化
- `initializing`: 正在初始化
- `ready`: 已就绪
- `error`: 初始化失败
- `destroyed`: 已销毁

### ChipsSDKOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `connector` | `ConnectorOptions` | - | Core 连接配置 |
| `logger` | `LoggerOptions` | - | 日志配置 |
| `config` | `ConfigManagerOptions` | - | 配置管理器选项 |
| `eventBus` | `EventBusOptions` | - | 事件总线选项 |
| `i18n` | `I18nManagerOptions` | - | 多语言选项 |
| `theme` | `ThemeManagerOptions` | - | 主题管理器选项 |
| `renderer` | `RendererEngineOptions` | - | 渲染引擎选项 |
| `resource` | `ResourceManagerOptions` | - | 资源管理器选项 |
| `autoConnect` | `boolean` | `true` | 初始化时是否自动连接 Core |
| `debug` | `boolean` | `false` | 调试模式, 会将日志级别设为 `debug`, 并写入 `sdk.debug` 配置 |

### SDKVersion

- `sdk`: SDK 版本号
- `protocol`: 协议版本号
- `buildTime`: 构建时间 (运行时 `new Date().toISOString()`)

## 静态属性

### `ChipsSDK.VERSION`

SDK 版本信息.

## 构造函数

```ts
const sdk = new ChipsSDK(options?: ChipsSDKOptions);
```

初始化时会创建 `Logger`、`ConfigManager`、`EventBus`、`I18nManager`、`CoreConnector`.

## 生命周期方法

### `initialize(): Promise<void>`

初始化 SDK:

- 可选地自动连接 Core (`autoConnect` 默认 true)
- `ConfigManager.initialize()`
- 创建 File/Card/Box API、插件/主题/渲染/资源模块
- 事件: 成功后 `sdk:ready`, 失败后 `sdk:error`

错误:
- `ErrorCodes.SDK_INITIALIZING` (初始化中)
- `ErrorCodes.SDK_DESTROYED` (已销毁)
- 其余错误会透传抛出

### `destroy(): void`

销毁 SDK:

- 断开 Core 连接
- 销毁资源管理器
- 清理 FileAPI 与 RendererEngine 缓存
- 事件: `sdk:destroyed` (同步)

### `connect(): Promise<void>` / `disconnect(): void`

显式连接或断开 Core. 事件:

- `sdk:connected`
- `sdk:disconnected`

## 访问器

> `file` / `card` / `box` / `plugins` / `themes` / `renderer` / `resources` 在 SDK 未就绪时会抛出 `ChipsError(ErrorCodes.SDK_NOT_INITIALIZED)`.

- `state`: `SDKState`
- `isReady`: 是否 `ready`
- `isConnected`: `CoreConnector.isConnected`
- `connector`: CoreConnector 实例
- `logger`: Logger 实例
- `config`: ConfigManager 实例
- `events`: EventBus 实例
- `i18n`: I18nManager 实例
- `file`: FileAPI
- `card`: CardAPI
- `box`: BoxAPI
- `plugins`: PluginManager
- `themes`: ThemeManager
- `renderer`: RendererEngine
- `resources`: ResourceManager

## 便捷方法

- `registerPlugin(registration: PluginRegistration): void`
- `registerTheme(theme: Theme): void`
- `setTheme(themeId: string): void`
- `setLocale(locale: string): void`
- `t(key: string, params?: Record<string, string | number>): string`
- `on<T>(event: string, handler: (data: T) => void): string`
- `off(event: string, handlerId?: string): void`

## 事件

| 事件名 | 触发时机 | 数据 |
| --- | --- | --- |
| `sdk:ready` | 初始化成功 | `{ version: SDKVersion }` |
| `sdk:error` | 初始化失败 | `{ error: string }` |
| `sdk:connected` | `connect()` 成功 | `{}` |
| `sdk:disconnected` | `disconnect()` | `{}` |
| `sdk:destroyed` | `destroy()` | `{}` |

## 使用示例

```ts
import { ChipsSDK } from '@chips/sdk';

const sdk = new ChipsSDK({
  connector: { url: 'ws://localhost:9527' },
  autoConnect: true,
  debug: true,
});

await sdk.initialize();

const card = await sdk.card.create({ name: 'My Card' });
await sdk.card.save('cards/my.card', card);

sdk.destroy();
```

## 注意事项

- `VERSION.buildTime` 是运行时值, 并非构建产物中的固定时间.
- `autoConnect` 为 `false` 时需手动调用 `connect()`.
- SDK 内部事件总线为独立实现, 并非 Core 的 IPC 事件. 若需 Core 事件, 应使用 `CoreConnector.on`.
