# API完整索引

本文档提供 Chips SDK 所有公开 API 的完整索引和详细说明。

## 目录

1. [主类 API](#1-主类-api)
2. [文件 API](#2-文件-api)
3. [渲染 API](#3-渲染-api)
4. [编辑 API](#4-编辑-api)
5. [主题 API](#5-主题-api)
6. [插件 API](#6-插件-api)
7. [工具 API](#7-工具-api)
8. [事件 API](#8-事件-api)

---

## 1. 主类 API

### 1.1 ChipsSDK

SDK 主类。

#### 构造函数

```typescript
constructor(options?: SDKOptions)
```

**参数**:
- `options` (可选): SDK 配置选项
  - `platform`: 'web' | 'node' | 'electron' - 平台类型
  - `dataDir`: string - 数据目录
  - `debug`: boolean - 调试模式

**示例**:
```typescript
const sdk = new ChipsSDK({
  platform: 'web',
  debug: true
});
```

#### loadCard()

```typescript
async loadCard(path: string | File, options?: LoadOptions): Promise<Card>
```

加载卡片文件。

**参数**:
- `path`: 文件路径或 File 对象
- `options` (可选): 加载选项
  - `cache`: boolean - 是否缓存
  - `validate`: boolean - 是否验证

**返回**: Promise<Card>

**抛出**:
- `FileNotFoundError` - 文件不存在
- `ParseError` - 解析失败

**示例**:
```typescript
const card = await sdk.loadCard('./card.card');
const card2 = await sdk.loadCard(fileObject, { cache: true });
```

#### saveCard()

```typescript
async saveCard(card: Card, path: string, options?: SaveOptions): Promise<void>
```

保存卡片到文件。

**参数**:
- `card`: 卡片对象
- `path`: 保存路径
- `options` (可选): 保存选项

**示例**:
```typescript
await sdk.saveCard(card, './output.card');
```

#### renderCard()

```typescript
async renderCard(
  card: Card | string,
  container: string | HTMLElement,
  options?: RenderOptions
): Promise<void>
```

渲染卡片。

**参数**:
- `card`: 卡片对象或路径
- `container`: 容器选择器或元素
- `options` (可选): 渲染选项

**示例**:
```typescript
await sdk.renderCard(card, '#container', {
  theme: 'dark',
  readonly: true
});
```

#### createEditor()

```typescript
createEditor(
  container: HTMLElement,
  options?: EditorOptions
): IEditor
```

创建编辑器实例。

**参数**:
- `container`: 容器元素
- `options` (可选): 编辑器选项

**返回**: IEditor

**示例**:
```typescript
const editor = sdk.createEditor(container, {
  placeholder: 'Start typing...'
});
```

#### use()

```typescript
use(plugin: Plugin | Plugin[]): void
```

使用插件。

**参数**:
- `plugin`: 插件或插件数组

**示例**:
```typescript
sdk.use(myPlugin);
sdk.use([plugin1, plugin2]);
```

---

## 2. 文件 API

### 2.1 FileAPI

文件操作 API。

#### loadCard()

```typescript
async loadCard(path: string, options?: LoadOptions): Promise<Card>
```

加载卡片文件。

#### saveCard()

```typescript
async saveCard(card: Card, path: string, options?: SaveOptions): Promise<void>
```

保存卡片文件。

#### loadBox()

```typescript
async loadBox(directory: string): Promise<Box>
```

加载箱子。

**参数**:
- `directory`: 箱子目录路径

**返回**: Promise<Box>

#### scanDirectory()

```typescript
async scanDirectory(directory: string): Promise<FileInfo[]>
```

扫描目录。

**参数**:
- `directory`: 目录路径

**返回**: Promise<FileInfo[]>

---

## 3. 渲染 API

### 3.1 RendererAPI

渲染相关 API。

#### renderCard()

```typescript
async renderCard(
  card: Card,
  container: HTMLElement,
  options?: RenderOptions
): Promise<RenderResult>
```

渲染卡片。

**返回**: Promise<RenderResult>
  - `element`: HTMLElement - 渲染的元素
  - `dispose`: () => void - 清理函数
  - `update`: (updates: Partial<Card>) => void - 更新函数

#### renderBox()

```typescript
async renderBox(
  box: Box,
  container: HTMLElement,
  options?: BoxRenderOptions
): Promise<BoxRenderResult>
```

渲染箱子。

**示例**:
```typescript
const result = await rendererAPI.renderBox(box, container, {
  layout: 'grid',
  columns: 3,
  gap: 16
});
```

#### updateCard()

```typescript
updateCard(cardId: string, updates: Partial<Card>): void
```

更新已渲染的卡片。

#### disposeCard()

```typescript
disposeCard(cardId: string): void
```

清理卡片渲染资源。

---

## 4. 编辑 API

### 4.1 EditorAPI

编辑器 API。

#### createEditor()

```typescript
createEditor(
  container: HTMLElement,
  options?: EditorOptions
): IEditor
```

创建编辑器。

**返回**: IEditor
  - `getContent(): Card` - 获取内容
  - `setContent(card: Card): void` - 设置内容
  - `insert(content: Content): void` - 插入内容
  - `delete(): void` - 删除选中内容
  - `undo(): void` - 撤销
  - `redo(): void` - 重做
  - `on(event: string, handler: Function): void` - 监听事件
  - `dispose(): void` - 销毁编辑器

**示例**:
```typescript
const editor = editorAPI.createEditor(container, {
  placeholder: 'Start typing...',
  autosave: true,
  autosaveInterval: 5000
});

editor.on('change', (content) => {
  console.log('Content changed:', content);
});

editor.on('save', async (content) => {
  await sdk.saveCard(content, './auto-save.card');
});
```

---

## 5. 主题 API

### 5.1 ThemeAPI

主题相关 API。

#### loadTheme()

```typescript
loadTheme(theme: string | Theme): void
```

加载主题。

**参数**:
- `theme`: 主题 ID 或主题对象

**示例**:
```typescript
themeAPI.loadTheme('dark');

const customTheme = {
  id: 'custom',
  name: 'Custom Theme',
  colors: { /* ... */ }
};
themeAPI.loadTheme(customTheme);
```

#### setTheme()

```typescript
setTheme(themeId: string): void
```

切换主题。

#### getCurrentTheme()

```typescript
getCurrentTheme(): Theme
```

获取当前主题。

**返回**: Theme

#### listThemes()

```typescript
listThemes(): ThemeInfo[]
```

列出所有可用主题。

**返回**: ThemeInfo[]

---

## 6. 插件 API

### 6.1 PluginAPI

插件相关 API。

#### use()

```typescript
use(plugin: Plugin | Plugin[]): void
```

使用插件。

**参数**:
- `plugin`: 插件或插件数组

**示例**:
```typescript
pluginAPI.use({
  name: 'my-plugin',
  install(sdk) {
    // 插件逻辑
  }
});
```

#### unuse()

```typescript
unuse(pluginId: string): void
```

卸载插件。

**参数**:
- `pluginId`: 插件 ID

---

## 7. 工具 API

### 7.1 parse()

```typescript
function parse(data: ArrayBuffer): Card
```

解析卡片数据。

**参数**:
- `data`: 卡片二进制数据

**返回**: Card

**示例**:
```typescript
import { parse } from '@chips/sdk';

const data = await readFile('card.card');
const card = parse(data);
```

### 7.2 serialize()

```typescript
function serialize(card: Card): ArrayBuffer
```

序列化卡片。

**参数**:
- `card`: 卡片对象

**返回**: ArrayBuffer

### 7.3 validate()

```typescript
function validate(card: Card): ValidationResult
```

验证卡片数据。

**返回**: ValidationResult
  - `valid`: boolean
  - `errors`: ValidationError[]

---

## 8. 事件 API

### 8.1 on()

```typescript
on(event: string, handler: EventHandler): void
```

监听事件。

**参数**:
- `event`: 事件名称
- `handler`: 事件处理函数

**示例**:
```typescript
sdk.on('card:loaded', (card) => {
  console.log('Card loaded:', card.id);
});

sdk.on('error', (error) => {
  console.error('Error:', error);
});
```

### 8.2 off()

```typescript
off(event: string, handler: EventHandler): void
```

取消监听。

### 8.3 once()

```typescript
once(event: string, handler: EventHandler): void
```

监听一次性事件。

### 8.4 标准事件列表

- `card:loaded` - 卡片已加载
- `card:saved` - 卡片已保存
- `card:rendered` - 卡片已渲染
- `card:updated` - 卡片已更新
- `theme:changed` - 主题已更改
- `editor:change` - 编辑器内容变化
- `editor:save` - 编辑器保存
- `error` - 错误发生

---

## 9. 类型定义

### 9.1 Card

```typescript
interface Card {
  id: string;
  type: CardType;
  version: string;
  metadata: CardMetadata;
  content: any;
  children?: Card[];
}
```

### 9.2 RenderOptions

```typescript
interface RenderOptions {
  theme?: string | Theme;
  readonly?: boolean;
  interactive?: boolean;
  animations?: boolean;
}
```

### 9.3 EditorOptions

```typescript
interface EditorOptions {
  placeholder?: string;
  autosave?: boolean;
  autosaveInterval?: number;
  spellcheck?: boolean;
  readonly?: boolean;
}
```

---

## 10. 错误处理

### 10.1 错误类型

- `ChipsError` - 基础错误类
- `FileNotFoundError` - 文件不存在
- `ParseError` - 解析错误
- `ValidationError` - 验证错误
- `RenderError` - 渲染错误

### 10.2 错误处理示例

```typescript
try {
  const card = await sdk.loadCard('./card.card');
} catch (error) {
  if (error instanceof FileNotFoundError) {
    console.error('File not found');
  } else if (error instanceof ParseError) {
    console.error('Parse error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## 11. 使用示例

### 11.1 基本使用

```typescript
import { ChipsSDK } from '@chips/sdk';

// 创建 SDK 实例
const sdk = new ChipsSDK();

// 加载卡片
const card = await sdk.loadCard('./card.card');

// 渲染卡片
await sdk.renderCard(card, '#container');
```

### 11.2 完整工作流

```typescript
import { ChipsSDK } from '@chips/sdk';

const sdk = new ChipsSDK({ debug: true });

// 监听事件
sdk.on('card:loaded', (card) => {
  console.log('Loaded:', card.id);
});

// 加载并渲染
const card = await sdk.loadCard('./card.card', { cache: true });
await sdk.renderCard(card, '#container', { theme: 'dark' });

// 创建编辑器
const editor = sdk.createEditor(document.getElementById('editor'), {
  autosave: true
});

// 保存
editor.on('save', async (content) => {
  await sdk.saveCard(content, './saved.card');
});
```

---

## 附录

### A. API 版本

当前 API 版本: **v1.0.0**

### B. 兼容性

- **Node.js**: >= 18.0.0
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+
- **Electron**: >= 22.0.0

### C. 参考链接

- [完整文档](https://chips.dev/docs/sdk)
- [示例代码](https://github.com/chips-project/sdk/examples)
- [API 参考](https://chips.dev/docs/sdk/api)
