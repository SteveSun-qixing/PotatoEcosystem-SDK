# Chips SDK 架构文档

> 薯片生态前端开发工具包架构设计

## 目录

- [概述](#概述)
- [模块结构](#模块结构)
- [依赖关系](#依赖关系)
- [数据流](#数据流)
- [核心组件详解](#核心组件详解)
- [扩展点](#扩展点)
- [设计原则](#设计原则)
- [技术选型](#技术选型)

---

## 概述

### 架构目标

Chips SDK 的架构设计遵循以下目标：

1. **模块化** - 各功能模块独立，低耦合高内聚
2. **可扩展** - 支持插件和自定义渲染器
3. **易用性** - 统一的 API 设计，简洁的使用方式
4. **性能** - 高效的缓存策略和异步处理
5. **可靠性** - 完善的错误处理和日志系统

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                          ChipsSDK                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    API Layer                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ CardAPI  │  │  BoxAPI  │  │ FileAPI  │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Functional Modules                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │   │
│  │  │ Plugin   │  │  Theme   │  │ Renderer │  │Resource │ │   │
│  │  │ Manager  │  │ Manager  │  │  Engine  │  │ Manager │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Support Modules                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │   │
│  │  │  Logger  │  │  Config  │  │ EventBus │  │  I18n   │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Core Layer                            │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │              CoreConnector (IPC)                  │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Chips-Core    │
                    │   (Rust/Tauri)  │
                    └─────────────────┘
```

---

## 模块结构

### 目录结构

```
src/
├── index.ts              # 入口文件，导出所有公开 API
├── sdk.ts                # SDK 主类
├── core/                 # 核心层
│   ├── index.ts          # 模块导出
│   ├── connector.ts      # Core 连接器
│   ├── types.ts          # 类型定义
│   ├── errors.ts         # 错误类定义
│   └── error-codes.ts    # 错误码常量
├── api/                  # API 层
│   ├── index.ts          # 模块导出
│   ├── file-api.ts       # 文件操作 API
│   ├── card-api.ts       # 卡片管理 API
│   ├── box-api.ts        # 箱子管理 API
│   └── file-types.ts     # 文件相关类型
├── logger/               # 日志模块
│   ├── index.ts          # 模块导出
│   ├── logger.ts         # 日志实现
│   └── types.ts          # 类型定义
├── config/               # 配置模块
│   ├── index.ts          # 模块导出
│   ├── manager.ts        # 配置管理器
│   └── types.ts          # 类型定义
├── event/                # 事件模块
│   ├── index.ts          # 模块导出
│   ├── bus.ts            # 事件总线
│   └── types.ts          # 类型定义
├── i18n/                 # 多语言模块
│   ├── index.ts          # 模块导出
│   ├── manager.ts        # 多语言管理器
│   └── types.ts          # 类型定义
├── plugin/               # 插件模块
│   ├── index.ts          # 模块导出
│   ├── manager.ts        # 插件管理器
│   └── types.ts          # 类型定义
├── theme/                # 主题模块
│   ├── index.ts          # 模块导出
│   ├── manager.ts        # 主题管理器
│   └── types.ts          # 类型定义
├── renderer/             # 渲染模块
│   ├── index.ts          # 模块导出
│   ├── engine.ts         # 渲染引擎
│   └── types.ts          # 类型定义
├── resource/             # 资源模块
│   ├── index.ts          # 模块导出
│   ├── manager.ts        # 资源管理器
│   └── types.ts          # 类型定义
├── types/                # 公共类型
│   ├── index.ts          # 类型导出
│   ├── base.ts           # 基础类型
│   ├── card.ts           # 卡片类型
│   ├── box.ts            # 箱子类型
│   └── api.ts            # API 类型
└── utils/                # 工具函数
    ├── index.ts          # 工具导出
    ├── id.ts             # ID 生成
    ├── path.ts           # 路径处理
    ├── validation.ts     # 数据验证
    └── async.ts          # 异步工具
```

### 模块职责

| 模块 | 职责 | 依赖 |
|------|------|------|
| `core` | 与 Chips-Core 通信 | `utils` |
| `api` | 业务 API（文件/卡片/箱子） | `core`, `utils` |
| `logger` | 日志记录和管理 | `types` |
| `config` | 配置管理 | `types` |
| `event` | 事件发布订阅 | `utils` |
| `i18n` | 多语言支持 | `types` |
| `plugin` | 插件生命周期管理 | `core`, `logger`, `event`, `config` |
| `theme` | 主题定义和切换 | `logger`, `event` |
| `renderer` | 内容渲染 | `core`, `logger`, `event`, `theme` |
| `resource` | 资源加载和缓存 | `core`, `logger`, `event` |
| `utils` | 通用工具函数 | 无 |
| `types` | 类型定义 | 无 |

---

## 依赖关系

### 模块依赖图

```
                    ┌─────────┐
                    │  utils  │
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐     ┌─────────┐     ┌─────────┐
   │  types  │     │  core   │     │  event  │
   └────┬────┘     └────┬────┘     └────┬────┘
        │               │               │
        │    ┌──────────┴──────────┐    │
        │    │                     │    │
        ▼    ▼                     ▼    ▼
   ┌─────────────┐           ┌─────────────┐
   │   logger    │           │   config    │
   └──────┬──────┘           └──────┬──────┘
          │                         │
          └────────────┬────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │   i18n   │ │  plugin  │ │  theme   │
    └──────────┘ └────┬─────┘ └────┬─────┘
                      │            │
                      └──────┬─────┘
                             │
                      ┌──────┴──────┐
                      │             │
                      ▼             ▼
                ┌──────────┐  ┌──────────┐
                │ renderer │  │ resource │
                └──────────┘  └──────────┘
                      │             │
                      └──────┬──────┘
                             │
                             ▼
                       ┌──────────┐
                       │   api    │
                       └──────────┘
                             │
                             ▼
                       ┌──────────┐
                       │   sdk    │
                       └──────────┘
```

### 依赖原则

1. **单向依赖** - 上层模块可以依赖下层模块，反之不可
2. **接口隔离** - 模块间通过接口通信，不直接访问内部实现
3. **事件解耦** - 跨模块通信优先使用事件总线

---

## 数据流

### 请求响应流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ 1. API 调用
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          ChipsSDK                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      API Layer                           │   │
│  │  1. 参数验证                                            │   │
│  │  2. 缓存检查                                            │   │
│  │  3. 调用 Connector                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ 2. IPC 请求
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CoreConnector                              │
│  1. 序列化请求                                                   │
│  2. 发送 WebSocket 消息                                          │
│  3. 等待响应                                                     │
│  4. 反序列化响应                                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ 3. WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Chips-Core                               │
│  1. 路由请求到对应服务                                           │
│  2. 执行业务逻辑                                                 │
│  3. 返回响应                                                     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ 4. 响应
                               ▼
                        (反向传递)
```

### 事件流程

```
┌─────────────────┐
│    Publisher    │
│  (Any Module)   │
└────────┬────────┘
         │
         │ emit('event:type', data)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                          EventBus                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Subscriptions                         │   │
│  │  event:type → [handler1, handler2, ...]                 │   │
│  │  *          → [wildcardHandler1, ...]                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 遍历执行处理器
         ▼
┌────────┴────────┐     ┌────────────────┐     ┌────────────────┐
│   Subscriber 1  │     │  Subscriber 2  │     │  Subscriber N  │
└─────────────────┘     └────────────────┘     └────────────────┘
```

### 渲染流程

```
┌─────────────────┐
│   Card/Box      │
│     Data        │
└────────┬────────┘
         │
         │ renderCard/renderBox
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RendererEngine                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. 检查缓存                                            │   │
│  │  2. 获取渲染器 (内置/插件)                              │   │
│  │  3. 创建渲染上下文                                      │   │
│  │  4. 获取主题变量                                        │   │
│  │  5. 执行渲染                                            │   │
│  │  6. 缓存结果                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ RenderResult (html, css)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DOM Container                              │
│  innerHTML = result.html                                         │
│  <style> = result.css                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心组件详解

### ChipsSDK 主类

SDK 的入口点，整合所有功能模块。

```typescript
class ChipsSDK {
  // 状态管理
  private _state: SDKState;
  
  // 核心组件（立即创建）
  private _connector: CoreConnector;
  private _logger: Logger;
  private _config: ConfigManager;
  private _eventBus: EventBus;
  private _i18n: I18nManager;
  
  // 功能模块（延迟创建，需要 initialize 后）
  private _fileApi: FileAPI;
  private _cardApi: CardAPI;
  private _boxApi: BoxAPI;
  private _pluginManager: PluginManager;
  private _themeManager: ThemeManager;
  private _rendererEngine: RendererEngine;
  private _resourceManager: ResourceManager;
  
  // 生命周期
  async initialize(): Promise<void>;
  destroy(): void;
}
```

**设计要点：**

1. **两阶段初始化** - 构造函数创建基础组件，`initialize()` 完成完整初始化
2. **延迟创建** - 功能模块在 `initialize()` 后才创建
3. **状态机** - 使用状态机管理 SDK 生命周期

### CoreConnector

负责与 Chips-Core 的 IPC 通信。

```typescript
class CoreConnector {
  // WebSocket 连接
  private _socket: WebSocket | null;
  
  // 请求管理
  private _pendingRequests: Map<string, PendingRequest>;
  
  // 事件订阅
  private _eventHandlers: Map<string, Set<EventHandler>>;
  
  // 重连管理
  private _reconnectAttempts: number;
  private _reconnectTimer: Timer | null;
  
  // 心跳管理
  private _heartbeatTimer: Timer | null;
  
  // 核心方法
  async connect(): Promise<void>;
  disconnect(): void;
  async request<T>(params: RequestParams): Promise<ResponseData<T>>;
  publish(eventType: string, data: unknown): void;
  on(eventType: string, handler: EventHandler): void;
}
```

**设计要点：**

1. **消息格式** - 使用 NDJSON (newline-delimited JSON)
2. **请求追踪** - 使用 UUID 追踪请求-响应对
3. **自动重连** - 支持指数退避重连策略
4. **心跳机制** - 定期发送心跳保持连接

### EventBus

发布-订阅模式的事件总线。

```typescript
class EventBus {
  // 订阅管理
  private _subscriptions: Map<string, Set<EventSubscription>>;
  
  // 核心方法
  on<T>(eventType: string, handler: EventHandler<T>): string;
  once<T>(eventType: string, handler: EventHandler<T>): string;
  off(eventType: string, handlerOrId?: EventHandler | string): void;
  async emit<T>(eventType: string, data: T): Promise<void>;
  emitSync<T>(eventType: string, data: T): void;
  waitFor<T>(eventType: string, timeout?: number): Promise<T>;
}
```

**设计要点：**

1. **通配符支持** - 使用 `*` 订阅所有事件
2. **一次性订阅** - `once()` 方法自动在触发后取消
3. **异步/同步** - 支持异步 `emit()` 和同步 `emitSync()`
4. **等待事件** - `waitFor()` 将事件转换为 Promise

### PluginManager

插件生命周期管理。

```typescript
class PluginManager {
  // 插件存储
  private _plugins: Map<string, PluginInstance>;
  
  // 扩展点
  private _commands: Map<string, CommandInfo>;
  private _renderers: Map<string, RendererInfo>;
  
  // 生命周期管理
  register(registration: PluginRegistration): void;
  async unregister(id: string): Promise<void>;
  async enable(id: string): Promise<void>;
  async disable(id: string): Promise<void>;
  
  // 扩展点执行
  async executeCommand(name: string, args?: unknown): Promise<unknown>;
  getRenderer(cardType: string): RendererDefinition | undefined;
}
```

**设计要点：**

1. **状态机** - 插件有 `installed`, `loading`, `enabled`, `disabled`, `error` 状态
2. **依赖管理** - 支持插件依赖，自动启用依赖插件
3. **上下文隔离** - 每个插件有独立的 PluginContext
4. **扩展点** - 支持命令和渲染器两种扩展方式

### RendererEngine

内容渲染引擎。

```typescript
class RendererEngine {
  // 渲染器注册
  private _cardRenderers: Map<string, CardRenderer>;
  private _boxRenderers: Map<string, BoxRenderer>;
  
  // 渲染缓存
  private _cache: Map<string, RenderResult>;
  
  // 核心方法
  registerCardRenderer(renderer: CardRenderer): void;
  registerBoxRenderer(renderer: BoxRenderer): void;
  async renderCard(card: Card, container: HTMLElement, options?: RenderOptions): Promise<RenderResult>;
  async renderBox(box: Box, container: HTMLElement, options?: RenderOptions): Promise<RenderResult>;
}
```

**设计要点：**

1. **渲染器模式** - 通过注册不同渲染器支持不同类型
2. **LRU 缓存** - 使用 LRU 策略缓存渲染结果
3. **超时控制** - 渲染操作有超时限制
4. **主题集成** - 渲染时自动应用当前主题变量

---

## 扩展点

### 1. 插件系统

插件可以扩展 SDK 的功能。

```typescript
// 插件结构
interface PluginRegistration {
  id: string;
  metadata: PluginMetadata;
  activate?: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
  defaultConfig?: PluginConfig;
}

// 插件上下文
interface PluginContext {
  pluginId: string;
  sdkVersion: string;
  config: PluginConfig;
  log: (message: string, data?: unknown) => void;
  registerCommand: (name: string, handler: CommandHandler) => void;
  registerRenderer: (type: string, renderer: RendererDefinition) => void;
  emit: (event: string, data: unknown) => void;
  on: (event: string, handler: EventHandlerFn) => void;
}
```

**扩展能力：**

- 注册命令
- 注册自定义渲染器
- 发布/订阅事件

### 2. 渲染器扩展

自定义渲染器支持新的卡片/箱子类型。

```typescript
// 卡片渲染器
interface CardRenderer {
  name: string;
  supportedTypes: string[];
  render: (context: RenderContext) => Promise<RenderResult>;
}

// 箱子渲染器
interface BoxRenderer {
  name: string;
  supportedLayouts: string[];
  render: (context: RenderContext) => Promise<RenderResult>;
}
```

### 3. 主题扩展

自定义主题定义视觉样式。

```typescript
interface Theme {
  metadata: ThemeMetadata;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  shadow: ThemeShadow;
  typography: ThemeTypography;
  animation: ThemeAnimation;
  customVariables?: CSSVariables;
}
```

**扩展能力：**

- 继承现有主题
- 定义颜色、间距、圆角等
- 添加自定义 CSS 变量

### 4. 日志传输器

自定义日志输出目标。

```typescript
interface LogTransport {
  name: string;
  log: (entry: LogEntry) => void;
}

// 示例：远程日志传输器
const remoteTransport: LogTransport = {
  name: 'remote',
  log: (entry) => {
    fetch('/api/logs', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },
};

sdk.logger.addTransport(remoteTransport);
```

---

## 设计原则

### 1. 单一职责

每个模块只负责一个功能领域。

```
Logger      → 日志记录
Config      → 配置管理
EventBus    → 事件通信
FileAPI     → 文件操作
CardAPI     → 卡片管理
BoxAPI      → 箱子管理
...
```

### 2. 依赖倒置

高层模块不依赖低层模块，都依赖抽象。

```typescript
// ❌ 错误：直接依赖具体实现
class CardAPI {
  private _connector = new CoreConnector();
}

// ✅ 正确：依赖注入
class CardAPI {
  constructor(
    private _connector: CoreConnector,
    private _fileApi: FileAPI,
    // ...
  ) {}
}
```

### 3. 接口隔离

客户端不应该依赖它不需要的接口。

```typescript
// SDK 主类只暴露必要的公开 API
class ChipsSDK {
  // 公开属性（getter）
  get card(): CardAPI;
  get box(): BoxAPI;
  
  // 公开方法
  async initialize(): Promise<void>;
  destroy(): void;
  
  // 私有方法
  private _initializeModules(): void;
  private _ensureReady(): void;
}
```

### 4. 开闭原则

对扩展开放，对修改关闭。

```typescript
// 通过插件系统扩展功能，而不是修改核心代码
sdk.registerPlugin({
  id: 'new-feature',
  activate: (ctx) => {
    // 添加新功能
  },
});
```

---

## 技术选型

### 语言和工具

| 类别 | 选择 | 理由 |
|------|------|------|
| 语言 | TypeScript | 类型安全，IDE 支持好 |
| 构建 | tsup | 快速，支持多种输出格式 |
| 测试 | Vitest | 快速，与 Vite 生态兼容 |
| 格式化 | Prettier | 统一代码风格 |
| 检查 | ESLint | 代码质量保障 |

### 输出格式

```javascript
// tsup.config.ts
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
});
```

输出文件：

- `dist/index.cjs` - CommonJS 格式
- `dist/index.js` - ESM 格式
- `dist/index.d.ts` - 类型声明

### 浏览器兼容性

SDK 面向现代浏览器：

- Chrome 80+
- Firefox 78+
- Safari 14+
- Edge 80+

依赖的 API：

- `WebSocket`
- `Promise`
- `Map/Set`
- `URL.createObjectURL`

---

## 附录

### 状态图

#### SDK 状态

```
         ┌──────────┐
         │   idle   │
         └────┬─────┘
              │ initialize()
              ▼
      ┌──────────────┐
      │ initializing │
      └──────┬───────┘
             │
    ┌────────┴────────┐
    │ success         │ failure
    ▼                 ▼
┌───────┐        ┌─────────┐
│ ready │        │  error  │
└───┬───┘        └─────────┘
    │ destroy()
    ▼
┌───────────┐
│ destroyed │
└───────────┘
```

#### 插件状态

```
         ┌───────────┐
         │ installed │
         └─────┬─────┘
               │ enable()
               ▼
         ┌───────────┐
         │  loading  │
         └─────┬─────┘
               │
      ┌────────┴────────┐
      │ success         │ failure
      ▼                 ▼
  ┌─────────┐       ┌─────────┐
  │ enabled │       │  error  │
  └────┬────┘       └─────────┘
       │ disable()
       ▼
  ┌──────────┐
  │ disabled │
  └──────────┘
```

### 相关文档

- [API 参考文档](./API.md)
- [使用指南](./GUIDE.md)
