# Chips SDK API 参考文档

> 版本: 1.0.0

## 目录

- [概述](#概述)
- [安装与引入](#安装与引入)
- [ChipsSDK 主类](#chipssdk-主类)
- [核心模块](#核心模块)
  - [CoreConnector](#coreconnector)
  - [错误处理](#错误处理)
- [API 模块](#api-模块)
  - [FileAPI](#fileapi)
  - [CardAPI](#cardapi)
  - [BoxAPI](#boxapi)
- [支撑模块](#支撑模块)
  - [Logger](#logger)
  - [ConfigManager](#configmanager)
  - [EventBus](#eventbus)
  - [I18nManager](#i18nmanager)
- [功能模块](#功能模块)
  - [PluginManager](#pluginmanager)
  - [ThemeManager](#thememanager)
  - [RendererEngine](#rendererengine)
  - [ResourceManager](#resourcemanager)
- [工具函数](#工具函数)
- [类型定义](#类型定义)

---

## 概述

Chips SDK 是薯片生态的前端开发工具包，提供了与 Chips-Core 通信、文件操作、卡片/箱子管理、插件系统、主题系统、渲染引擎等完整功能。

## 安装与引入

```typescript
// 完整引入
import { ChipsSDK } from '@chips/sdk';

// 按需引入
import { 
  ChipsSDK, 
  CardAPI, 
  BoxAPI,
  FileAPI,
  Logger,
  EventBus 
} from '@chips/sdk';
```

---

## ChipsSDK 主类

SDK 的入口类，整合所有功能模块。

### 构造函数

```typescript
constructor(options?: ChipsSDKOptions)
```

#### ChipsSDKOptions

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `connector` | `ConnectorOptions` | - | Core 连接配置 |
| `logger` | `LoggerOptions` | - | 日志配置 |
| `config` | `ConfigManagerOptions` | - | 配置管理器选项 |
| `eventBus` | `EventBusOptions` | - | 事件总线选项 |
| `i18n` | `I18nManagerOptions` | - | 多语言选项 |
| `theme` | `ThemeManagerOptions` | - | 主题选项 |
| `renderer` | `RendererEngineOptions` | - | 渲染引擎选项 |
| `resource` | `ResourceManagerOptions` | - | 资源管理选项 |
| `autoConnect` | `boolean` | `true` | 自动连接 Core |
| `debug` | `boolean` | `false` | 调试模式 |

### 静态属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `VERSION` | `SDKVersion` | SDK 版本信息 |

### 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `state` | `SDKState` | SDK 当前状态 |
| `isReady` | `boolean` | SDK 是否已就绪 |
| `isConnected` | `boolean` | 是否已连接 Core |
| `connector` | `CoreConnector` | Core 连接器实例 |
| `logger` | `Logger` | 日志实例 |
| `config` | `ConfigManager` | 配置管理器 |
| `events` | `EventBus` | 事件总线 |
| `i18n` | `I18nManager` | 多语言管理器 |
| `file` | `FileAPI` | 文件 API（需 ready） |
| `card` | `CardAPI` | 卡片 API（需 ready） |
| `box` | `BoxAPI` | 箱子 API（需 ready） |
| `plugins` | `PluginManager` | 插件管理器（需 ready） |
| `themes` | `ThemeManager` | 主题管理器（需 ready） |
| `renderer` | `RendererEngine` | 渲染引擎（需 ready） |
| `resources` | `ResourceManager` | 资源管理器（需 ready） |

### 核心方法

#### initialize()

初始化 SDK，连接 Core 并初始化所有模块。

```typescript
async initialize(): Promise<void>
```

**示例：**

```typescript
const sdk = new ChipsSDK({
  connector: { url: 'ws://localhost:9527' }
});

await sdk.initialize();
console.log('SDK 已就绪:', sdk.isReady);
```

#### destroy()

销毁 SDK，断开连接并清理资源。

```typescript
destroy(): void
```

#### connect()

连接到 Core。

```typescript
async connect(): Promise<void>
```

#### disconnect()

断开与 Core 的连接。

```typescript
disconnect(): void
```

### 便捷方法

#### registerPlugin(registration)

注册插件。

```typescript
registerPlugin(registration: PluginRegistration): void
```

#### registerTheme(theme)

注册主题。

```typescript
registerTheme(theme: Theme): void
```

#### setTheme(themeId)

设置当前主题。

```typescript
setTheme(themeId: string): void
```

#### setLocale(locale)

设置当前语言。

```typescript
setLocale(locale: string): void
```

#### t(key, params?)

翻译文本。

```typescript
t(key: string, params?: Record<string, string | number>): string
```

#### on(event, handler)

订阅事件。

```typescript
on<T = unknown>(event: string, handler: (data: T) => void): string
```

#### off(event, handlerId?)

取消订阅事件。

```typescript
off(event: string, handlerId?: string): void
```

### SDK 状态

```typescript
type SDKState = 'idle' | 'initializing' | 'ready' | 'error' | 'destroyed';
```

### 使用示例

```typescript
// 创建并初始化 SDK
const sdk = new ChipsSDK({
  connector: { url: 'ws://localhost:9527' },
  autoConnect: true,
  debug: true,
});

await sdk.initialize();

// 使用卡片 API
const card = await sdk.card.create({ name: '我的卡片' });

// 订阅事件
sdk.on('card:created', (data) => {
  console.log('卡片已创建:', data);
});

// 设置主题
sdk.setTheme('default-dark');

// 销毁 SDK
sdk.destroy();
```

---

## 核心模块

### CoreConnector

负责与 Chips-Core 的 WebSocket/IPC 通信。

#### 构造函数

```typescript
constructor(options?: ConnectorOptions)
```

#### ConnectorOptions

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | `string` | `'ws://127.0.0.1:9527'` | 连接地址 |
| `timeout` | `number` | `30000` | 默认超时（毫秒） |
| `reconnect` | `boolean` | `true` | 是否自动重连 |
| `reconnectDelay` | `number` | `1000` | 重连延迟（毫秒） |
| `maxReconnectAttempts` | `number` | `5` | 最大重连次数 |
| `heartbeatInterval` | `number` | `30000` | 心跳间隔（毫秒） |

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `connect` | `() => Promise<void>` | 连接到 Core |
| `disconnect` | `() => void` | 断开连接 |
| `request` | `<T>(params: RequestParams) => Promise<ResponseData<T>>` | 发送请求 |
| `publish` | `(eventType: string, data: Record<string, unknown>) => void` | 发布事件 |
| `on` | `(eventType: string, handler: EventHandler) => void` | 订阅事件 |
| `off` | `(eventType: string, handler?: EventHandler) => void` | 取消订阅 |
| `once` | `(eventType: string, handler: EventHandler) => void` | 一次性订阅 |

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `isConnected` | `boolean` | 是否已连接 |
| `isConnecting` | `boolean` | 是否正在连接 |
| `clientId` | `string` | 客户端 ID |
| `pendingCount` | `number` | 待处理请求数 |

#### 使用示例

```typescript
const connector = new CoreConnector({
  url: 'ws://localhost:9527',
  timeout: 30000,
});

await connector.connect();

// 发送请求
const response = await connector.request({
  service: 'file',
  method: 'read',
  payload: { path: '/path/to/file.card' }
});

// 订阅事件
connector.on('file:changed', (data) => {
  console.log('文件已变更:', data);
});
```

### 错误处理

#### ChipsError

SDK 基础错误类。

```typescript
class ChipsError extends Error {
  code: string;
  details?: Record<string, unknown>;
  
  toJSON(): Record<string, unknown>;
  toString(): string;
}
```

#### 错误类型

| 类名 | 错误码前缀 | 说明 |
|------|-----------|------|
| `ConnectionError` | `CONN-` | 连接错误 |
| `TimeoutError` | `CONN-` | 超时错误 |
| `ProtocolError` | `PROTOCOL-` | 协议错误 |
| `RouteError` | `ROUTE-` | 路由错误 |
| `FileError` | `FILE-` | 文件错误 |
| `ValidationError` | `VAL-` | 验证错误 |
| `PluginError` | `PLUGIN-` | 插件错误 |
| `RenderError` | `RENDER-` | 渲染错误 |
| `ResourceError` | `RES-` | 资源错误 |

#### ErrorCodes

```typescript
const ErrorCodes = {
  // 连接错误
  CONN_FAILED: 'CONN-1001',
  CONN_TIMEOUT: 'CONN-1002',
  CONN_CLOSED: 'CONN-1003',
  
  // 文件错误
  FILE_NOT_FOUND: 'FILE-1001',
  FILE_INVALID_PATH: 'FILE-1002',
  FILE_READ_FAILED: 'FILE-1003',
  FILE_WRITE_FAILED: 'FILE-1004',
  FILE_FORMAT_INVALID: 'FILE-1005',
  
  // 插件错误
  PLUGIN_NOT_FOUND: 'PLUGIN-1001',
  PLUGIN_LOAD_FAILED: 'PLUGIN-1002',
  PLUGIN_ALREADY_EXISTS: 'PLUGIN-1006',
  
  // SDK 错误
  SDK_NOT_INITIALIZED: 'SDK-1001',
  SDK_INITIALIZING: 'SDK-1002',
  SDK_DESTROYED: 'SDK-1003',
  // ... 更多错误码
};
```

---

## API 模块

### FileAPI

文件操作 API，支持卡片和箱子文件的加载、保存、验证。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `loadCard` | `(path: string, options?: LoadOptions) => Promise<Card>` | 加载卡片文件 |
| `saveCard` | `(path: string, card: Card, options?: SaveOptions) => Promise<void>` | 保存卡片文件 |
| `loadBox` | `(path: string, options?: LoadOptions) => Promise<Box>` | 加载箱子文件 |
| `saveBox` | `(path: string, box: Box, options?: SaveOptions) => Promise<void>` | 保存箱子文件 |
| `validateCard` | `(card: Card) => FileValidationResult` | 验证卡片 |
| `validateBox` | `(box: Box) => FileValidationResult` | 验证箱子 |
| `validateFile` | `(path: string, options?: ValidateOptions) => Promise<FileValidationResult>` | 验证文件 |
| `getFileInfo` | `(path: string) => Promise<FileInfo>` | 获取文件信息 |
| `exists` | `(path: string) => Promise<boolean>` | 检查文件是否存在 |
| `copy` | `(sourcePath: string, destPath: string, overwrite?: boolean) => Promise<void>` | 复制文件 |
| `move` | `(sourcePath: string, destPath: string, overwrite?: boolean) => Promise<void>` | 移动文件 |
| `delete` | `(path: string) => Promise<void>` | 删除文件 |
| `clearCache` | `() => void` | 清除缓存 |
| `removeFromCache` | `(path: string) => void` | 从缓存移除 |

#### LoadOptions

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `cache` | `boolean` | `true` | 是否使用缓存 |
| `verify` | `boolean` | `true` | 是否验证文件 |
| `loadResources` | `boolean` | `true` | 是否加载资源 |
| `maxResourceCount` | `number` | `1000` | 最大资源数 |

#### SaveOptions

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `overwrite` | `boolean` | `false` | 是否覆盖 |
| `compress` | `boolean` | `false` | 是否压缩 |
| `verify` | `boolean` | `true` | 是否验证 |
| `backup` | `boolean` | `true` | 是否备份 |

#### 使用示例

```typescript
// 加载卡片
const card = await sdk.file.loadCard('/path/to/my.card', {
  cache: true,
  verify: true,
});

// 修改并保存
card.metadata.name = '新名称';
await sdk.file.saveCard('/path/to/my.card', card, {
  overwrite: true,
  backup: true,
});

// 验证文件
const result = sdk.file.validateCard(card);
if (!result.valid) {
  console.error('验证失败:', result.errors);
}
```

### CardAPI

卡片管理 API。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `create` | `(options: CreateCardOptions) => Promise<Card>` | 创建卡片 |
| `get` | `(idOrPath: string, options?: LoadOptions) => Promise<Card>` | 获取卡片 |
| `save` | `(path: string, card: Card, options?: SaveOptions) => Promise<void>` | 保存卡片 |
| `update` | `(idOrPath: string, updates: UpdateCardOptions) => Promise<Card>` | 更新卡片 |
| `delete` | `(idOrPath: string) => Promise<void>` | 删除卡片 |
| `query` | `(options?: CardQueryOptions) => Promise<Card[]>` | 查询卡片 |
| `copy` | `(idOrPath: string, destPath: string) => Promise<Card>` | 复制卡片 |
| `addTags` | `(idOrPath: string, tags: Tag[]) => Promise<Card>` | 添加标签 |
| `removeTags` | `(idOrPath: string, tags: Tag[]) => Promise<Card>` | 移除标签 |
| `validate` | `(card: Card) => boolean` | 验证卡片 |
| `getCachedIds` | `() => ChipsId[]` | 获取缓存的 ID |
| `clearCache` | `() => void` | 清除缓存 |
| `export` | `(cardId: ChipsId, format: ExportFormat, options: ExportOptions) => Promise<ConversionResult>` | **导出卡片** |

#### CreateCardOptions

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 卡片名称 |
| `type` | `string` | 否 | 卡片类型 |
| `tags` | `Tag[]` | 否 | 标签列表 |
| `theme` | `string` | 否 | 主题 ID |
| `description` | `string` | 否 | 描述 |

#### CardQueryOptions

| 属性 | 类型 | 说明 |
|------|------|------|
| `tags` | `Tag[]` | 标签过滤 |
| `type` | `string` | 类型过滤 |
| `name` | `string` | 名称搜索 |
| `createdAfter` | `Timestamp` | 创建时间起始 |
| `createdBefore` | `Timestamp` | 创建时间截止 |
| `modifiedAfter` | `Timestamp` | 修改时间起始 |
| `modifiedBefore` | `Timestamp` | 修改时间截止 |
| `sortBy` | `'name' \| 'created' \| 'modified'` | 排序字段 |
| `sortOrder` | `'asc' \| 'desc'` | 排序顺序 |
| `limit` | `number` | 数量限制 |
| `offset` | `number` | 偏移量 |

#### 使用示例

```typescript
// 创建卡片
const card = await sdk.card.create({
  name: '我的新卡片',
  type: 'text',
  tags: ['笔记', '工作'],
  description: '这是一张测试卡片',
});

// 保存到文件
await sdk.card.save('/cards/my-card.card', card);

// 查询卡片
const cards = await sdk.card.query({
  tags: ['工作'],
  sortBy: 'modified',
  sortOrder: 'desc',
  limit: 10,
});

// 更新卡片
const updated = await sdk.card.update(card.id, {
  name: '更新后的名称',
  tags: ['笔记', '重要'],
});

// 添加标签
await sdk.card.addTags(card.id, ['紧急']);

// 删除卡片
await sdk.card.delete(card.id);

// 导出卡片为 .card 文件
const cardResult = await sdk.card.export(card.id, 'card', {
  outputPath: '/exports/my-card.card',
  includeResources: true,
});

// 导出为 HTML 网页
const htmlResult = await sdk.card.export(card.id, 'html', {
  outputPath: '/exports/my-card-html',
  includeAssets: true,
});

// 导出为 PDF 文档
const pdfResult = await sdk.card.export(card.id, 'pdf', {
  outputPath: '/exports/my-card.pdf',
  pageFormat: 'a4',
  orientation: 'portrait',
});

// 导出为图片
const imageResult = await sdk.card.export(card.id, 'image', {
  outputPath: '/exports/my-card.png',
  format: 'png',
  scale: 2,
});

// 监控导出进度
await sdk.card.export(card.id, 'html', {
  outputPath: '/exports/my-card',
  onProgress: (progress) => {
    console.log(`${progress.percent}%: ${progress.currentStep}`);
  },
});
```

#### export() 方法详解

**统一的导出接口，支持4种格式**

```typescript
async export(
  cardId: ChipsId,
  format: 'card' | 'html' | 'pdf' | 'image',
  options: ExportOptions
): Promise<ConversionResult>
```

**参数**:
- `cardId`: 卡片ID（10位62进制）
- `format`: 导出格式
  - `'card'`: 导出为 .card 文件（标准卡片格式）
  - `'html'`: 导出为 HTML 网页（可离线浏览）
  - `'pdf'`: 导出为 PDF 文档（适合打印）
  - `'image'`: 导出为图片（PNG/JPG）
- `options`: 导出选项（根据格式不同）

**通用选项**:
```typescript
interface ExportOptions {
  outputPath: string;        // 输出路径（必填）
  themeId?: string;          // 主题ID（覆盖卡片默认主题）
  onProgress?: (progress: ConversionProgress) => void;  // 进度回调
  // ... 格式特定选项
}
```

**格式特定选项**:

`.card` 格式:
- `includeResources?: boolean` - 是否包含资源文件（默认true）
- `compress?: boolean` - 是否压缩（默认false，使用存储模式）

`html` 格式:
- `includeAssets?: boolean` - 是否包含资源（默认true）
- `assetStrategy?: 'copy-all' | 'copy-local' | 'embed' | 'reference-only'`

`pdf` 格式:
- `pageFormat?: 'a4' | 'a5' | 'letter'` - 页面格式（默认a4）
- `orientation?: 'portrait' | 'landscape'` - 页面方向（默认portrait）
- `margin?: { top?, right?, bottom?, left? }` - 页边距

`image` 格式:
- `format?: 'png' | 'jpg'` - 图片格式（默认png）
- `quality?: number` - JPG质量1-100（默认90）
- `scale?: number` - 缩放比例（默认1）
- `transparent?: boolean` - 透明背景，仅PNG（默认false）

**返回值**:
```typescript
interface ConversionResult {
  success: boolean;         // 是否成功
  taskId: string;           // 任务ID
  outputPath?: string;      // 输出路径
  error?: {
    code: string;           // 错误代码
    message: string;        // 错误消息
  };
  warnings?: string[];      // 警告列表
  stats?: {
    duration: number;       // 耗时（毫秒）
    fileSize?: number;      // 文件大小（字节）
  };
}
```

**错误代码**:
- `EXPORT-0001`: 通用导出失败
- `EXPORT-1001`: 卡片打包失败
- `EXPORT-2001`: HTML转换失败
- `EXPORT-3001`: PDF转换失败
- `EXPORT-4001`: 图片转换失败
- `EXPORT-5001`: 文件写入失败

详见 [错误代码完整列表](#错误代码完整列表)

```

### BoxAPI

箱子管理 API。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `create` | `(options: CreateBoxOptions) => Promise<Box>` | 创建箱子 |
| `get` | `(idOrPath: string, options?: LoadOptions) => Promise<Box>` | 获取箱子 |
| `save` | `(path: string, box: Box, options?: SaveOptions) => Promise<void>` | 保存箱子 |
| `update` | `(idOrPath: string, updates: Partial<BoxMetadata>) => Promise<Box>` | 更新箱子 |
| `delete` | `(idOrPath: string) => Promise<void>` | 删除箱子 |
| `query` | `(options?: BoxQueryOptions) => Promise<Box[]>` | 查询箱子 |
| `addCard` | `(idOrPath: string, cardPath: string, position?: CardPosition) => Promise<Box>` | 添加卡片 |
| `removeCard` | `(idOrPath: string, cardPath: string) => Promise<Box>` | 移除卡片 |
| `reorderCards` | `(idOrPath: string, cardPaths: string[]) => Promise<Box>` | 重排卡片 |
| `getCardCount` | `(idOrPath: string) => Promise<number>` | 获取卡片数 |
| `setLayout` | `(idOrPath: string, layout: string) => Promise<Box>` | 设置布局 |
| `getLayoutConfig` | `(idOrPath: string) => Promise<Record<string, unknown>>` | 获取布局配置 |
| `setLayoutConfig` | `(idOrPath: string, config: Record<string, unknown>) => Promise<Box>` | 设置布局配置 |
| `copy` | `(idOrPath: string, destPath: string, includeCards?: boolean) => Promise<Box>` | 复制箱子 |
| `validate` | `(box: Box) => boolean` | 验证箱子 |

#### CreateBoxOptions

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 箱子名称 |
| `layout` | `string` | 否 | 布局类型 |
| `tags` | `Tag[]` | 否 | 标签列表 |
| `description` | `string` | 否 | 描述 |

#### 使用示例

```typescript
// 创建箱子
const box = await sdk.box.create({
  name: '工作项目',
  layout: 'grid',
  tags: ['工作'],
});

// 添加卡片
await sdk.box.addCard(box.id, '/cards/task-1.card');
await sdk.box.addCard(box.id, '/cards/task-2.card');

// 重排卡片
await sdk.box.reorderCards(box.id, [
  '/cards/task-2.card',
  '/cards/task-1.card',
]);

// 设置布局
await sdk.box.setLayout(box.id, 'list');

// 设置布局配置
await sdk.box.setLayoutConfig(box.id, {
  columns: 3,
  gap: 16,
});

// 保存箱子
await sdk.box.save('/boxes/work.box', box);
```

### ConversionAPI

**文件转换和卡片导出 API**

提供卡片文件转换功能，支持转换为 HTML、PDF、图片等格式，以及导出为 .card 文件。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `convertToHTML` | `(source: ConversionSource, options?: HTMLConversionOptions) => Promise<ConversionResult>` | 转换为 HTML |
| `convertToImage` | `(source: ConversionSource, options?: ImageConversionOptions) => Promise<ConversionResult>` | 转换为图片 |
| `convertToPDF` | `(source: ConversionSource, options?: PDFConversionOptions) => Promise<ConversionResult>` | 转换为 PDF |
| `exportAsCard` | `(cardId: ChipsId, options: CardExportOptions) => Promise<ConversionResult>` | 导出为 .card 文件 |
| `getSupportedConversions` | `() => Promise<SupportedConversion[]>` | 获取支持的转换类型 |
| `canConvert` | `(sourceType: string, targetType: string) => Promise<boolean>` | 检查是否支持转换 |
| `cancelConversion` | `(taskId: string) => Promise<boolean>` | 取消转换任务 |
| `getActiveTaskCount` | `() => number` | 获取活动任务数 |

#### ConversionSource

转换源，支持文件路径或二进制数据：

```typescript
interface ConversionSource {
  type: 'path' | 'data';
  path?: string;           // type为path时必填
  data?: Uint8Array;       // type为data时必填
  fileType: string;        // 文件类型，如'card'
}
```

#### HTMLConversionOptions

```typescript
interface HTMLConversionOptions {
  outputPath?: string;                    // 输出目录路径
  includeAssets?: boolean;                // 是否包含资源（默认true）
  themeId?: string;                       // 主题ID
  assetStrategy?: AssetStrategy;          // 资源处理策略
  onProgress?: (progress: ConversionProgress) => void;  // 进度回调
}

type AssetStrategy = 
  | 'copy-all'        // 复制所有资源
  | 'copy-local'      // 只复制本地资源
  | 'embed'           // 嵌入为Base64
  | 'reference-only'; // 只保留引用
```

#### ImageConversionOptions

```typescript
interface ImageConversionOptions {
  outputPath?: string;                    // 输出文件路径
  format?: 'png' | 'jpg';                 // 图片格式（默认png）
  quality?: number;                       // JPG质量1-100（默认90）
  scale?: number;                         // 缩放比例（默认1）
  width?: number;                         // 固定宽度（像素）
  height?: number;                        // 固定高度（像素）
  transparent?: boolean;                  // 透明背景，仅PNG（默认false）
  backgroundColor?: string;               // 背景颜色（默认#ffffff）
  themeId?: string;                       // 主题ID
  onProgress?: (progress: ConversionProgress) => void;
}
```

#### PDFConversionOptions

```typescript
interface PDFConversionOptions {
  outputPath?: string;                    // 输出文件路径
  pageFormat?: PageFormat;                // 页面格式（默认a4）
  orientation?: 'portrait' | 'landscape'; // 页面方向（默认portrait）
  margin?: PageMargin;                    // 页边距
  printBackground?: boolean;              // 是否打印背景（默认true）
  displayHeaderFooter?: boolean;          // 是否显示页眉页脚（默认false）
  headerTemplate?: string;                // 页眉HTML模板
  footerTemplate?: string;                // 页脚HTML模板
  themeId?: string;                       // 主题ID
  onProgress?: (progress: ConversionProgress) => void;
}

type PageFormat = 'a4' | 'a5' | 'a3' | 'letter' | 'legal' | 'tabloid';

interface PageMargin {
  top?: string;      // 如'15mm'
  right?: string;
  bottom?: string;
  left?: string;
}
```

#### CardExportOptions

```typescript
interface CardExportOptions {
  outputPath: string;                     // 输出文件路径（必填）
  compress?: boolean;                     // 是否压缩（默认false）
  includeResources?: boolean;             // 是否包含资源（默认true）
  onProgress?: (progress: ConversionProgress) => void;
}
```

#### ConversionResult

```typescript
interface ConversionResult {
  success: boolean;                       // 是否成功
  taskId: string;                         // 任务ID
  outputPath?: string;                    // 输出路径
  data?: Uint8Array;                      // 输出数据（未指定路径时）
  error?: {
    code: string;                         // 错误代码
    message: string;                      // 错误消息
  };
  warnings?: string[];                    // 警告列表
  stats?: {
    duration: number;                     // 耗时（毫秒）
    fileSize?: number;                    // 文件大小（字节）
    fileCount?: number;                   // 文件数量
  };
}
```

#### ConversionProgress

```typescript
interface ConversionProgress {
  taskId: string;                         // 任务ID
  status: ConversionStatus;               // 当前状态
  percent: number;                        // 完成百分比(0-100)
  currentStep?: string;                   // 当前步骤描述
}

type ConversionStatus = 
  | 'pending'      // 等待中
  | 'parsing'      // 解析中
  | 'rendering'    // 渲染中
  | 'processing'   // 处理中
  | 'writing'      // 写入中
  | 'completed'    // 已完成
  | 'failed'       // 失败
  | 'cancelled';   // 已取消
```

#### 使用示例

```typescript
// 转换为 HTML
const htmlResult = await sdk.conversion.convertToHTML(
  {
    type: 'path',
    path: '/path/to/card.card',
    fileType: 'card',
  },
  {
    outputPath: '/exports/html-output',
    includeAssets: true,
    assetStrategy: 'copy-local',
    onProgress: (progress) => {
      console.log(`${progress.percent}%: ${progress.currentStep}`);
    },
  }
);

// 转换为高清PNG图片
const imageResult = await sdk.conversion.convertToImage(
  { type: 'path', path: '/path/to/card.card', fileType: 'card' },
  {
    outputPath: '/exports/card.png',
    format: 'png',
    scale: 2,              // 2x Retina高清
    transparent: false,
  }
);

// 转换为PDF文档
const pdfResult = await sdk.conversion.convertToPDF(
  { type: 'path', path: '/path/to/card.card', fileType: 'card' },
  {
    outputPath: '/exports/card.pdf',
    pageFormat: 'a4',
    orientation: 'portrait',
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm',
    },
    printBackground: true,
  }
);

// 导出为 .card 文件
const cardResult = await sdk.conversion.exportAsCard('abc123', {
  outputPath: '/exports/my-card.card',
  compress: false,
  includeResources: true,
});

// 取消转换
const cancelled = await sdk.conversion.cancelConversion(taskId);
```

#### 两阶段转换架构

**PDF和Image转换采用两阶段架构**：

```
阶段1: 卡片 → HTML (CardtoHTMLPlugin)
  ↓
阶段2: HTML → PDF/Image (Puppeteer渲染)
```

**优势**:
1. **代码复用**: HTML转换逻辑只需实现一次
2. **视觉一致**: 保证不同格式的视觉效果完全一致
3. **维护简单**: 只需维护一套HTML生成逻辑
4. **灵活扩展**: 可以独立优化每个阶段

**实现示例**:
```typescript
// CardtoImagePlugin 内部实现
async convert(source, options) {
  // 第一阶段：生成HTML
  const htmlResult = await this._htmlPlugin.convert(source, {
    themeId: options.themeId,
    includeAssets: true,
  });
  
  // 第二阶段：使用Puppeteer渲染并截图
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlResult.data);
  const screenshot = await page.screenshot({ type: 'png' });
  await browser.close();
  
  return { imageData: screenshot };
}
```

---

## 支撑模块

### Logger

日志系统。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `setLevel` | `(level: LogLevel) => void` | 设置日志级别 |
| `getLevel` | `() => LogLevel` | 获取日志级别 |
| `debug` | `(message: string, data?: Record<string, unknown>) => void` | Debug 日志 |
| `info` | `(message: string, data?: Record<string, unknown>) => void` | Info 日志 |
| `warn` | `(message: string, data?: Record<string, unknown>) => void` | Warn 日志 |
| `error` | `(message: string, data?: Record<string, unknown>) => void` | Error 日志 |
| `addHandler` | `(handler: LogHandler) => void` | 添加处理器 |
| `removeHandler` | `(handler: LogHandler) => void` | 移除处理器 |
| `addTransport` | `(transport: LogTransport) => void` | 添加传输器 |
| `removeTransport` | `(name: string) => void` | 移除传输器 |
| `getHistory` | `(level?: LogLevel, limit?: number) => LogEntry[]` | 获取历史 |
| `clearHistory` | `() => void` | 清空历史 |
| `createChild` | `(subModule: string) => Logger` | 创建子 Logger |

#### LogLevel

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

#### 使用示例

```typescript
const logger = sdk.logger;

// 设置日志级别
logger.setLevel('debug');

// 记录日志
logger.debug('调试信息', { key: 'value' });
logger.info('操作完成');
logger.warn('警告信息');
logger.error('发生错误', { error: '详情' });

// 添加自定义处理器
logger.addHandler((entry) => {
  // 发送到远程服务
  sendToServer(entry);
});

// 获取历史日志
const errors = logger.getHistory('error', 10);
```

### ConfigManager

配置管理器。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `initialize` | `() => Promise<void>` | 初始化 |
| `get` | `<T>(key: string, defaultValue?: T) => T` | 获取配置 |
| `set` | `(key: string, value: unknown) => void` | 设置配置 |
| `setMany` | `(values: Record<string, unknown>) => void` | 批量设置 |
| `has` | `(key: string) => boolean` | 检查是否存在 |
| `delete` | `(key: string) => void` | 删除配置 |
| `getAll` | `() => Record<string, unknown>` | 获取所有配置 |
| `getByPrefix` | `(prefix: string) => Record<string, unknown>` | 按前缀获取 |
| `onChange` | `(key: string, handler: ConfigChangeHandler) => void` | 监听变更 |
| `offChange` | `(key: string, handler?: ConfigChangeHandler) => void` | 取消监听 |
| `reset` | `() => void` | 重置配置 |

#### 默认配置项

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `sdk.version` | `string` | `'1.0.0'` | SDK 版本 |
| `sdk.debug` | `boolean` | `false` | 调试模式 |
| `timeout.default` | `number` | `30000` | 默认超时 |
| `timeout.file` | `number` | `60000` | 文件超时 |
| `cache.enabled` | `boolean` | `true` | 启用缓存 |
| `cache.maxSize` | `number` | `100` | 最大缓存数 |
| `i18n.defaultLocale` | `string` | `'zh-CN'` | 默认语言 |
| `logger.level` | `string` | `'info'` | 日志级别 |

#### 使用示例

```typescript
const config = sdk.config;

// 获取配置
const timeout = config.get('timeout.default', 30000);

// 设置配置
config.set('cache.maxSize', 200);

// 批量设置
config.setMany({
  'sdk.debug': true,
  'logger.level': 'debug',
});

// 监听变更
config.onChange('theme.*', (key, newValue, oldValue) => {
  console.log(`配置 ${key} 从 ${oldValue} 变更为 ${newValue}`);
});

// 获取特定前缀的配置
const cacheConfig = config.getByPrefix('cache');
```

### EventBus

事件总线。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `on` | `<T>(eventType: string, handler: EventHandler<T>) => string` | 订阅事件 |
| `once` | `<T>(eventType: string, handler: EventHandler<T>) => string` | 一次性订阅 |
| `off` | `(eventType: string, handlerOrId?: EventHandler \| string) => void` | 取消订阅 |
| `emit` | `<T>(eventType: string, data: T) => Promise<void>` | 异步发布 |
| `emitSync` | `<T>(eventType: string, data: T) => void` | 同步发布 |
| `hasListeners` | `(eventType: string) => boolean` | 检查是否有订阅 |
| `listenerCount` | `(eventType: string) => number` | 获取订阅数 |
| `eventNames` | `() => string[]` | 获取所有事件类型 |
| `clear` | `() => void` | 清除所有订阅 |
| `removeAllListeners` | `(eventType?: string) => void` | 移除所有监听器 |
| `waitFor` | `<T>(eventType: string, timeout?: number) => Promise<T>` | 等待事件 |

#### SDK 内置事件

| 事件 | 数据类型 | 说明 |
|------|----------|------|
| `sdk:ready` | `{ version: SDKVersion }` | SDK 就绪 |
| `sdk:error` | `{ error: string }` | SDK 错误 |
| `sdk:destroyed` | `{}` | SDK 已销毁 |
| `sdk:connected` | `{}` | 已连接 |
| `sdk:disconnected` | `{}` | 已断开 |
| `card:created` | `{ card: Card }` | 卡片已创建 |
| `card:saved` | `{ id: string, path: string }` | 卡片已保存 |
| `card:updated` | `{ id: string, updates: object }` | 卡片已更新 |
| `card:deleted` | `{ id: string, path: string }` | 卡片已删除 |
| `box:created` | `{ box: Box }` | 箱子已创建 |
| `box:card:added` | `{ boxId: string, cardPath: string }` | 卡片已添加到箱子 |
| `theme:changed` | `{ previousTheme: string, currentTheme: string }` | 主题已变更 |
| `plugin:enabled` | `{ id: string }` | 插件已启用 |

#### 使用示例

```typescript
const events = sdk.events;

// 订阅事件
const subId = events.on('card:created', (data) => {
  console.log('新卡片:', data.card.metadata.name);
});

// 一次性订阅
events.once('sdk:ready', () => {
  console.log('SDK 已就绪');
});

// 通配符订阅
events.on('*', (data) => {
  console.log('收到事件:', data);
});

// 等待事件
const result = await events.waitFor('card:saved', 5000);

// 取消订阅
events.off('card:created', subId);
```

### I18nManager

多语言管理器。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `setLocale` | `(locale: string) => void` | 设置语言 |
| `t` | `(key: string, params?: Record<string, string \| number>) => string` | 翻译文本 |
| `plural` | `(key: string, count: number, params?: Record<string, string \| number>) => string` | 复数翻译 |
| `addTranslation` | `(locale: string, translation: Translation) => void` | 添加翻译 |
| `getAvailableLocales` | `() => string[]` | 获取可用语言 |
| `hasLocale` | `(locale: string) => boolean` | 检查语言是否可用 |
| `onLocaleChange` | `(handler: LocaleChangeHandler) => void` | 监听语言变更 |
| `offLocaleChange` | `(handler: LocaleChangeHandler) => void` | 取消监听 |

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `locale` | `string` | 当前语言 |

#### 使用示例

```typescript
const i18n = sdk.i18n;

// 设置语言
i18n.setLocale('en-US');

// 翻译文本
const msg = i18n.t('error.file_not_found');

// 带参数翻译
const welcome = i18n.t('common.welcome', { name: '张三' });

// 添加自定义翻译
i18n.addTranslation('zh-CN', {
  custom: {
    greeting: '你好，{name}！',
  },
});

// 监听语言变更
i18n.onLocaleChange((newLocale) => {
  console.log('语言已切换到:', newLocale);
});
```

---

## 功能模块

### PluginManager

插件管理器。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `register` | `(registration: PluginRegistration) => void` | 注册插件 |
| `unregister` | `(id: string) => Promise<void>` | 取消注册 |
| `enable` | `(id: string) => Promise<void>` | 启用插件 |
| `disable` | `(id: string) => Promise<void>` | 禁用插件 |
| `get` | `(id: string) => PluginInstance \| undefined` | 获取插件 |
| `getMetadata` | `(id: string) => PluginMetadata \| undefined` | 获取元数据 |
| `getState` | `(id: string) => PluginState \| undefined` | 获取状态 |
| `isEnabled` | `(id: string) => boolean` | 检查是否启用 |
| `list` | `(options?: PluginQueryOptions) => PluginInstance[]` | 列出插件 |
| `updateConfig` | `(id: string, config: Partial<PluginConfig>) => void` | 更新配置 |
| `executeCommand` | `(name: string, args?: unknown) => Promise<unknown>` | 执行命令 |
| `getRenderer` | `(cardType: string) => RendererDefinition \| undefined` | 获取渲染器 |
| `getCommands` | `() => string[]` | 获取所有命令 |
| `getRendererTypes` | `() => string[]` | 获取渲染器类型 |

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `count` | `number` | 已注册数量 |
| `enabledCount` | `number` | 已启用数量 |

#### PluginRegistration

```typescript
interface PluginRegistration {
  id: string;
  metadata: PluginMetadata;
  activate?: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
  defaultConfig?: PluginConfig;
}
```

#### PluginState

```typescript
type PluginState = 'installed' | 'enabled' | 'disabled' | 'loading' | 'error';
```

#### 使用示例

```typescript
const plugins = sdk.plugins;

// 注册插件
plugins.register({
  id: 'my-plugin',
  metadata: {
    id: 'my-plugin',
    name: '我的插件',
    version: '1.0.0',
    description: '示例插件',
  },
  activate: (ctx) => {
    // 注册命令
    ctx.registerCommand('hello', () => {
      ctx.log('Hello from plugin!');
      return 'Hello!';
    });
    
    // 注册渲染器
    ctx.registerRenderer('custom', {
      cardTypes: ['custom'],
      render: async (context) => ({
        success: true,
        html: '<div>Custom Card</div>',
      }),
    });
  },
  deactivate: () => {
    console.log('Plugin deactivated');
  },
});

// 启用插件
await plugins.enable('my-plugin');

// 执行命令
const result = await plugins.executeCommand('my-plugin:hello');

// 列出所有启用的插件
const enabled = plugins.list({ state: 'enabled' });
```

### ThemeManager

主题管理器。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `register` | `(theme: Theme) => void` | 注册主题 |
| `unregister` | `(id: string) => void` | 取消注册 |
| `setTheme` | `(id: string) => void` | 设置主题 |
| `getTheme` | `() => Theme` | 获取当前主题 |
| `getThemeById` | `(id: string) => Theme \| undefined` | 按 ID 获取 |
| `listThemes` | `() => ThemeMetadata[]` | 列出所有主题 |
| `hasTheme` | `(id: string) => boolean` | 检查是否存在 |
| `getCSSVariables` | `() => CSSVariables` | 获取 CSS 变量 |
| `applyToDOM` | `(root?: HTMLElement) => void` | 应用到 DOM |
| `detectSystemTheme` | `() => 'light' \| 'dark'` | 检测系统主题 |
| `applySystemTheme` | `() => void` | 应用系统主题 |

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `currentThemeId` | `string` | 当前主题 ID |
| `count` | `number` | 主题数量 |

#### Theme

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

#### 使用示例

```typescript
const themes = sdk.themes;

// 注册自定义主题
themes.register({
  metadata: {
    id: 'my-theme',
    name: '我的主题',
    type: 'light',
    version: '1.0.0',
    extends: 'default-light',
  },
  colors: {
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
    // ... 其他颜色
  },
  // ... 其他属性
});

// 设置主题
themes.setTheme('my-theme');

// 获取 CSS 变量
const vars = themes.getCSSVariables();
console.log(vars['--chips-color-primary']);

// 应用到 DOM
themes.applyToDOM(document.body);

// 自动应用系统主题
themes.applySystemTheme();
```

### RendererEngine

渲染引擎。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `registerCardRenderer` | `(renderer: CardRenderer) => void` | 注册卡片渲染器 |
| `registerBoxRenderer` | `(renderer: BoxRenderer) => void` | 注册箱子渲染器 |
| `renderCard` | `(card: Card, container: HTMLElement, options?: RenderOptions) => Promise<RenderResult>` | 渲染卡片 |
| `renderBox` | `(box: Box, container: HTMLElement, options?: RenderOptions) => Promise<RenderResult>` | 渲染箱子 |
| `renderCover` | `(card: Card, container: HTMLElement) => Promise<RenderResult>` | 渲染封面 |
| `renderPreview` | `(data: Card \| Box, container: HTMLElement) => Promise<RenderResult>` | 渲染预览 |
| `clearCache` | `() => void` | 清除缓存 |
| `getRegisteredCardTypes` | `() => string[]` | 获取卡片类型 |
| `getRegisteredLayouts` | `() => string[]` | 获取布局类型 |

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `cacheSize` | `number` | 缓存大小 |

#### RenderOptions

| 属性 | 类型 | 说明 |
|------|------|------|
| `targetType` | `'card' \| 'box' \| 'cover' \| 'preview'` | 目标类型 |
| `mode` | `'full' \| 'partial'` | 渲染模式 |
| `theme` | `string` | 主题 ID |
| `animations` | `boolean` | 启用动画 |
| `lazyLoad` | `boolean` | 延迟加载 |
| `customStyles` | `Record<string, string>` | 自定义样式 |
| `timeout` | `number` | 超时时间 |

#### RenderResult

```typescript
interface RenderResult {
  success: boolean;
  html?: string;
  css?: string;
  error?: string;
  duration?: number;
}
```

#### 使用示例

```typescript
const renderer = sdk.renderer;

// 渲染卡片
const container = document.getElementById('card-container');
const result = await renderer.renderCard(card, container, {
  theme: 'default-dark',
  animations: true,
});

if (result.success) {
  console.log('渲染耗时:', result.duration, 'ms');
}

// 注册自定义渲染器
renderer.registerCardRenderer({
  name: 'markdown',
  supportedTypes: ['markdown', 'md'],
  render: async (context) => {
    const card = context.data;
    const html = markdownToHtml(card.content);
    return { success: true, html };
  },
});
```

### ResourceManager

资源管理器。

#### 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `load` | `(path: string, options?: ResourceLoadOptions) => Promise<Blob>` | 加载资源 |
| `getInfo` | `(path: string) => Promise<ResourceInfo>` | 获取资源信息 |
| `getObjectUrl` | `(path: string) => string \| undefined` | 获取对象 URL |
| `createObjectUrl` | `(path: string) => Promise<string>` | 创建对象 URL |
| `releaseObjectUrl` | `(path: string) => void` | 释放对象 URL |
| `upload` | `(file: File, options: ResourceUploadOptions) => Promise<ResourceInfo>` | 上传资源 |
| `delete` | `(path: string) => Promise<void>` | 删除资源 |
| `preload` | `(paths: string[], options?: PreloadOptions) => Promise<void>` | 预加载资源 |
| `isCached` | `(path: string) => boolean` | 检查是否缓存 |
| `clearCache` | `() => void` | 清除缓存 |
| `getCacheStats` | `() => { count: number, size: number, maxSize: number }` | 获取缓存统计 |
| `destroy` | `() => void` | 销毁管理器 |
| `getResourceType` | `(mimeType: string) => ResourceType` | 获取资源类型 |

#### ResourceType

```typescript
type ResourceType = 'image' | 'video' | 'audio' | 'font' | 'document' | 'other';
```

#### 使用示例

```typescript
const resources = sdk.resources;

// 加载资源
const blob = await resources.load('/images/cover.png');

// 创建对象 URL
const url = await resources.createObjectUrl('/images/avatar.jpg');
imageElement.src = url;

// 预加载资源
await resources.preload([
  '/images/bg1.jpg',
  '/images/bg2.jpg',
  '/images/bg3.jpg',
], { concurrency: 3 });

// 上传资源
const file = inputElement.files[0];
const info = await resources.upload(file, {
  path: '/uploads/my-image.png',
  overwrite: true,
});

// 获取缓存统计
const stats = resources.getCacheStats();
console.log(`缓存: ${stats.count} 个, ${stats.size / 1024 / 1024} MB`);

// 释放对象 URL
resources.releaseObjectUrl('/images/avatar.jpg');
```

---

## 工具函数

### ID 工具

```typescript
// 生成 10 位 62 进制 ID
generateId(): ChipsId

// 验证 ID 格式
isValidId(id: string): boolean

// 生成 UUID
generateUuid(): string

// 验证 UUID 格式
isValidUuid(uuid: string): boolean

// 生成短 ID
generateShortId(length?: number): string
```

### 路径工具

```typescript
// 规范化路径
normalizePath(path: string): string

// 获取扩展名
getExtension(path: string): string

// 获取文件名
getFileName(path: string): string

// 获取基础名（不含扩展名）
getBaseName(path: string): string

// 获取目录路径
getDirPath(path: string): string

// 连接路径
joinPath(...parts: string[]): string

// 检查路径安全性
isSafePath(path: string): boolean

// 检查是否为卡片文件
isCardFile(path: string): boolean

// 检查是否为箱子文件
isBoxFile(path: string): boolean

// 检查是否为薯片文件
isChipsFile(path: string): boolean

// 获取相对路径
getRelativePath(from: string, to: string): string

// 解析路径
resolvePath(base: string, relative: string): string
```

### 验证工具

```typescript
// 验证卡片元数据
validateCardMetadata(metadata: CardMetadata): boolean

// 验证箱子元数据
validateBoxMetadata(metadata: BoxMetadata): boolean

// 验证协议版本
validateProtocolVersion(version: string): boolean

// 验证时间戳
validateTimestamp(timestamp: string): boolean

// 验证标签
validateTag(tag: Tag): boolean

// 验证标签数组
validateTags(tags: Tag[]): boolean

// 验证资源路径
validateResourcePath(path: string): boolean

// 验证文件大小
validateFileSize(size: number, maxSize: number): boolean

// 验证 MIME 类型
validateMimeType(mimeType: string, allowedTypes?: string[]): boolean

// 验证 URL
validateUrl(url: string): boolean

// 验证邮箱
validateEmail(email: string): boolean
```

### 异步工具

```typescript
// 延迟执行
delay(ms: number): Promise<void>

// 带超时的 Promise
withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError?: Error): Promise<T>

// 重试执行
retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>

// 并发限制执行
concurrent<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]>

// 防抖函数
debounce<T>(fn: T, waitMs: number): (...args: Parameters<T>) => void

// 节流函数
throttle<T>(fn: T, limitMs: number): (...args: Parameters<T>) => void

// 创建可取消的 Promise
createCancellable<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  cancel: () => void;
  isCancelled: () => boolean;
}

// 序列执行
sequence<T>(tasks: (() => Promise<T>)[]): Promise<T[]>
```

#### RetryOptions

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxRetries` | `number` | `3` | 最大重试次数 |
| `delayMs` | `number` | `1000` | 重试延迟 |
| `backoff` | `boolean` | `true` | 指数退避 |
| `maxDelayMs` | `number` | `30000` | 最大延迟 |
| `shouldRetry` | `(error: Error) => boolean` | - | 重试条件 |
| `onRetry` | `(error: Error, attempt: number) => void` | - | 重试回调 |

---

## 错误代码完整列表

### 导出相关错误代码

#### 通用错误 (EXPORT-0xxx)

| 错误代码 | 说明 |
|---------|------|
| `EXPORT-0001` | 导出失败 |
| `EXPORT-0002` | 无效的导出格式 |
| `EXPORT-0003` | 无效的导出选项 |
| `EXPORT-0004` | 导出已取消 |
| `EXPORT-0005` | 导出超时 |

#### 卡片打包错误 (EXPORT-1xxx)

| 错误代码 | 说明 |
|---------|------|
| `EXPORT-1001` | 打包失败 |
| `EXPORT-1002` | 卡片结构无效 |
| `EXPORT-1003` | 资源文件缺失 |
| `EXPORT-1004` | 文件过大 |
| `EXPORT-1005` | 缺少必需文件 |
| `EXPORT-1006` | 元数据格式无效 |
| `EXPORT-1007` | 卡片ID格式无效 |

#### HTML转换错误 (EXPORT-2xxx)

| 错误代码 | 说明 |
|---------|------|
| `EXPORT-2001` | HTML转换失败 |
| `EXPORT-2002` | 渲染器未找到 |
| `EXPORT-2003` | 主题未找到 |
| `EXPORT-2004` | HTML生成失败 |
| `EXPORT-2005` | 资源处理失败 |

#### PDF转换错误 (EXPORT-3xxx)

| 错误代码 | 说明 |
|---------|------|
| `EXPORT-3001` | PDF转换失败 |
| `EXPORT-3002` | PDF生成失败 |
| `EXPORT-3003` | 浏览器启动失败 |
| `EXPORT-3004` | 页面加载失败 |
| `EXPORT-3005` | 无效的页面格式 |

#### 图片转换错误 (EXPORT-4xxx)

| 错误代码 | 说明 |
|---------|------|
| `EXPORT-4001` | 图片转换失败 |
| `EXPORT-4002` | 图片渲染失败 |
| `EXPORT-4003` | 浏览器启动失败 |
| `EXPORT-4004` | 截图失败 |
| `EXPORT-4005` | 无效的图片格式 |

#### 文件系统错误 (EXPORT-5xxx)

| 错误代码 | 说明 |
|---------|------|
| `EXPORT-5001` | 文件写入失败 |
| `EXPORT-5002` | 文件读取失败 |
| `EXPORT-5003` | 权限不足 |
| `EXPORT-5004` | 磁盘空间不足 |
| `EXPORT-5005` | 文件已存在 |
| `EXPORT-5006` | 目录未找到 |
| `EXPORT-5007` | 路径遍历攻击 |

#### ZIP相关错误 (EXPORT-6xxx)

| 错误代码 | 说明 |
|---------|------|
| `EXPORT-6001` | ZIP创建失败 |
| `EXPORT-6002` | ZIP提取失败 |
| `EXPORT-6003` | ZIP文件损坏 |
| `EXPORT-6004` | ZIP文件过大 |

### 错误处理示例

```typescript
try {
  const result = await sdk.card.export(cardId, 'pdf', options);
  
  if (!result.success) {
    // 根据错误代码处理
    switch (result.error?.code) {
      case 'EXPORT-5001':
        console.error('文件写入失败，请检查磁盘空间和权限');
        break;
      case 'EXPORT-3001':
        console.error('PDF生成失败，请检查Puppeteer是否安装');
        break;
      case 'EXPORT-1002':
        console.error('卡片结构无效，请检查卡片数据');
        break;
      default:
        console.error(`导出失败: ${result.error?.message}`);
    }
  }
  
  // 检查警告
  if (result.warnings && result.warnings.length > 0) {
    console.warn('导出警告:', result.warnings);
  }
} catch (error) {
  console.error('导出过程发生异常:', error);
}
```

---

## 类型定义

### 基础类型

```typescript
// 十位 62 进制 ID
type ChipsId = string;

// ISO 8601 时间戳
type Timestamp = string;

// 标签类型
type Tag = string | [string, ...string[]];

// 协议版本号
type ProtocolVersion = `${number}.${number}.${number}`;

// 操作状态
type Status = 'success' | 'error' | 'partial';

// 日志级别
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 文件类型
type FileType = 'card' | 'box' | 'resource' | 'unknown';

// 位置类型
type LocationType = 'internal' | 'external';

// 排序方向
type SortDirection = 'asc' | 'desc';
```

### Card 类型

```typescript
interface Card {
  id: ChipsId;
  metadata: CardMetadata;
  structure: CardStructure;
  resources: Map<string, Blob | ArrayBuffer>;
}

interface CardMetadata {
  chip_standards_version: ProtocolVersion;
  card_id: ChipsId;
  name: string;
  created_at: Timestamp;
  modified_at: Timestamp;
  theme?: string;
  tags?: Tag[];
  description?: string;
  author?: string;
  [key: string]: unknown;
}

interface CardStructure {
  structure: BaseCardInfo[];
  manifest: CardManifest;
}

interface CardManifest {
  card_count: number;
  resource_count: number;
  resources: ResourceInfo[];
}
```

### Box 类型

```typescript
interface Box {
  id: ChipsId;
  metadata: BoxMetadata;
  structure: BoxStructure;
  content: BoxContent;
}

interface BoxMetadata {
  chip_standards_version: ProtocolVersion;
  box_id: ChipsId;
  name: string;
  created_at: Timestamp;
  modified_at: Timestamp;
  layout: string;
  tags?: Tag[];
  description?: string;
  author?: string;
  [key: string]: unknown;
}

interface BoxStructure {
  cards: BoxCardInfo[];
}

interface BoxCardInfo {
  id: ChipsId;
  location: LocationType;
  path: string;
  filename: string;
}

interface BoxContent {
  active_layout: string;
  layout_configs: Record<string, unknown>;
}
```

### 分页类型

```typescript
interface SortOptions {
  field: string;
  direction: SortDirection;
}

interface PaginationOptions {
  limit: number;
  offset: number;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

---

## 附录

### 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-02-01 | 首个正式版本 |

### 相关文档

- [使用指南](./GUIDE.md)
- [架构文档](./ARCHITECTURE.md)
