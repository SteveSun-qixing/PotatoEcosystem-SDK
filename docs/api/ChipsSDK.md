# ChipsSDK API参考

`ChipsSDK`是整个SDK的主类，提供统一的入口来访问所有功能模块。

## 类型定义

```typescript
class ChipsSDK {
  constructor(options?: SDKOptions);
  
  // 文件操作
  loadCard(path: string | File | Blob, options?: LoadOptions): Promise<Card>;
  loadCards(paths: string[], options?: LoadOptions): Promise<Card[]>;
  saveCard(card: Card, path: string, options?: SaveOptions): Promise<void>;
  saveCardAsBlob(card: Card): Promise<Blob>;
  loadBox(path: string | File | Blob, options?: LoadOptions): Promise<Box>;
  saveBox(box: Box, path: string, options?: SaveOptions): Promise<void>;
  
  // 渲染功能
  renderCard(card: Card | string, container: string | HTMLElement, options?: RenderOptions): Promise<void>;
  
  // 主题功能
  setTheme(themeId: string): void;
  getCurrentTheme(): string | null;
  listThemes(): ThemeInfo[];
  
  // 多语言功能
  setLanguage(language: SupportedLanguage): void;
  getLanguage(): SupportedLanguage;
  
  // 事件功能
  on(event: string, listener: (...args: unknown[]) => void): string;
  off(subscriptionId: string): void;
  
  // 配置功能
  getConfig<T>(key: string, defaultValue?: T): T;
  setConfig(key: string, value: unknown): Promise<void>;
  
  // 平台信息
  getVersion(): string;
  getPlatform(): Platform;
  isInitialized(): boolean;
  
  // 调试功能
  enableDebug(enabled: boolean): void;
  getDebugInfo(): DebugInfo;
}
```

---

## 构造函数

### `constructor(options?: SDKOptions)`

创建SDK实例。

**参数:**
- `options` - SDK配置选项（可选）

**类型:**
```typescript
interface SDKOptions {
  // 平台类型（自动检测）
  platform?: Platform;
  
  // 平台适配器（自定义适配器）
  adapter?: IPlatformAdapter;
  
  // 调试模式
  debug?: boolean;
  
  // 日志级别
  logLevel?: LogLevel;
  
  // 多语言配置
  i18n?: {
    defaultLanguage?: SupportedLanguage;
    fallbackLanguage?: SupportedLanguage;
  };
  
  // 缓存配置
  cache?: {
    enabled?: boolean;
    maxSize?: number;
    ttl?: number;
    strategy?: 'lru' | 'lfu' | 'fifo';
  };
}
```

**示例:**
```typescript
import { ChipsSDK, SupportedLanguage, LogLevel } from '@chips/sdk';

// 基础配置
const sdk = new ChipsSDK();

// 完整配置
const sdk = new ChipsSDK({
  debug: true,
  logLevel: LogLevel.Debug,
  i18n: {
    defaultLanguage: SupportedLanguage.ZhCN,
  },
  cache: {
    enabled: true,
    maxSize: 100 * 1024 * 1024, // 100MB
  },
});
```

---

## 文件操作方法

### `loadCard(path, options?)`

加载卡片文件。

**参数:**
- `path: string | File | Blob` - 文件路径、File对象或Blob对象
- `options?: LoadOptions` - 加载选项

**返回:** `Promise<Card>` - 卡片对象

**选项:**
```typescript
interface LoadOptions {
  cache?: boolean;      // 是否使用缓存，默认true
  validate?: boolean;   // 是否验证文件，默认true
}
```

**示例:**
```typescript
// 从文件路径加载
const card = await sdk.loadCard('path/to/card.card');

// 从URL加载
const card = await sdk.loadCard('https://example.com/card.card');

// 从File对象加载（浏览器）
const fileInput = document.querySelector('input[type="file"]');
const card = await sdk.loadCard(fileInput.files[0]);

// 禁用缓存
const card = await sdk.loadCard('card.card', { cache: false });
```

---

### `loadCards(paths, options?)`

批量加载多个卡片。

**参数:**
- `paths: string[]` - 文件路径数组
- `options?: LoadOptions` - 加载选项

**返回:** `Promise<Card[]>` - 卡片对象数组

**示例:**
```typescript
const cards = await sdk.loadCards([
  'card1.card',
  'card2.card',
  'card3.card'
]);

console.log(`Loaded ${cards.length} cards`);
```

---

### `saveCard(card, path, options?)`

保存卡片到文件。

**参数:**
- `card: Card` - 卡片对象
- `path: string` - 保存路径
- `options?: SaveOptions` - 保存选项

**返回:** `Promise<void>`

**选项:**
```typescript
interface SaveOptions {
  overwrite?: boolean;        // 是否覆盖已存在的文件，默认false
  createDirectories?: boolean; // 是否自动创建目录，默认true
}
```

**示例:**
```typescript
// 基础保存
await sdk.saveCard(card, 'output.card');

// 允许覆盖
await sdk.saveCard(card, 'output.card', { overwrite: true });
```

---

### `saveCardAsBlob(card)`

将卡片保存为Blob对象。

**参数:**
- `card: Card` - 卡片对象

**返回:** `Promise<Blob>` - Blob对象

**示例:**
```typescript
// 保存为Blob
const blob = await sdk.saveCardAsBlob(card);

// 下载文件（浏览器）
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'card.card';
a.click();
URL.revokeObjectURL(url);
```

---

### `loadBox(path, options?)`

加载箱子文件。

**参数:**
- `path: string | File | Blob` - 文件路径、File对象或Blob对象
- `options?: LoadOptions` - 加载选项

**返回:** `Promise<Box>` - 箱子对象

**示例:**
```typescript
const box = await sdk.loadBox('box.box');
console.log(`Box contains ${box.cards.length} cards`);
```

---

### `saveBox(box, path, options?)`

保存箱子到文件。

**参数:**
- `box: Box` - 箱子对象
- `path: string` - 保存路径
- `options?: SaveOptions` - 保存选项

**返回:** `Promise<void>`

**示例:**
```typescript
await sdk.saveBox(box, 'output.box', { overwrite: true });
```

---

## 渲染方法

### `renderCard(card, container, options?)`

渲染卡片到指定容器。

**参数:**
- `card: Card | string` - 卡片对象或文件路径
- `container: string | HTMLElement` - 容器选择器或元素
- `options?: RenderOptions` - 渲染选项

**返回:** `Promise<void>`

**选项:**
```typescript
interface RenderOptions {
  theme?: string;         // 主题ID
  readOnly?: boolean;     // 只读模式，默认false
  interactive?: boolean;  // 交互模式，默认true
  animations?: boolean;   // 启用动画，默认true
  responsive?: boolean;   // 响应式布局，默认true
  lazyLoad?: boolean;     // 懒加载，默认false
  virtualScroll?: boolean; // 虚拟滚动，默认false
}
```

**示例:**
```typescript
// 基础渲染
await sdk.renderCard(card, '#container');

// 从路径渲染
await sdk.renderCard('card.card', '#container');

// 使用选项
await sdk.renderCard(card, '#container', {
  theme: 'dark',
  readOnly: true,
  animations: true,
});

// 使用HTMLElement
const container = document.getElementById('app');
await sdk.renderCard(card, container);
```

---

## 主题方法

### `setTheme(themeId)`

设置当前主题。

**参数:**
- `themeId: string` - 主题ID

**示例:**
```typescript
// 使用内置主题
sdk.setTheme('light');
sdk.setTheme('dark');

// 使用自定义主题
sdk.setTheme('custom-theme');
```

---

### `getCurrentTheme()`

获取当前主题ID。

**返回:** `string | null` - 主题ID，未设置则返回null

**示例:**
```typescript
const currentTheme = sdk.getCurrentTheme();
console.log(`Current theme: ${currentTheme}`);
```

---

### `listThemes()`

列出所有可用主题。

**返回:** `ThemeInfo[]` - 主题信息数组

**类型:**
```typescript
interface ThemeInfo {
  id: string;
  name: string;
  description?: string;
}
```

**示例:**
```typescript
const themes = sdk.listThemes();
themes.forEach(theme => {
  console.log(`${theme.id}: ${theme.name}`);
});
```

---

## 多语言方法

### `setLanguage(language)`

设置当前语言。

**参数:**
- `language: SupportedLanguage` - 语言代码

**支持的语言:**
```typescript
enum SupportedLanguage {
  ZhCN = 'zh-CN',  // 简体中文
  ZhTW = 'zh-TW',  // 繁体中文
  EnUS = 'en-US',  // 英语
  JaJP = 'ja-JP',  // 日语
  KoKR = 'ko-KR',  // 韩语
}
```

**示例:**
```typescript
import { SupportedLanguage } from '@chips/sdk';

sdk.setLanguage(SupportedLanguage.ZhCN);
sdk.setLanguage(SupportedLanguage.EnUS);
```

---

### `getLanguage()`

获取当前语言。

**返回:** `SupportedLanguage` - 语言代码

**示例:**
```typescript
const currentLang = sdk.getLanguage();
console.log(`Current language: ${currentLang}`);
```

---

## 事件方法

### `on(event, listener)`

监听事件。

**参数:**
- `event: string` - 事件名称
- `listener: (...args: unknown[]) => void` - 监听器函数

**返回:** `string` - 订阅ID

**内置事件:**
- `ready` - SDK初始化完成
- `card:load` - 卡片加载完成
- `card:save` - 卡片保存完成
- `render:start` - 开始渲染
- `render:complete` - 渲染完成
- `render:error` - 渲染错误
- `theme:change` - 主题切换
- `language:change` - 语言切换
- `error` - 错误事件

**示例:**
```typescript
// 监听卡片加载
const subscriptionId = sdk.on('card:load', (card) => {
  console.log('Card loaded:', card.metadata.card_id);
});

// 监听渲染完成
sdk.on('render:complete', () => {
  console.log('Render complete');
});

// 监听错误
sdk.on('error', (error) => {
  console.error('SDK error:', error);
});
```

---

### `off(subscriptionId)`

取消事件监听。

**参数:**
- `subscriptionId: string` - 订阅ID

**示例:**
```typescript
const id = sdk.on('card:load', handler);

// 取消监听
sdk.off(id);
```

---

## 配置方法

### `getConfig(key, defaultValue?)`

获取配置值。

**参数:**
- `key: string` - 配置键（支持点号分隔）
- `defaultValue?: T` - 默认值

**返回:** `T` - 配置值

**示例:**
```typescript
const theme = sdk.getConfig('ui.theme', 'light');
const cacheSize = sdk.getConfig('cache.maxSize', 100 * 1024 * 1024);
```

---

### `setConfig(key, value)`

设置配置值。

**参数:**
- `key: string` - 配置键
- `value: unknown` - 配置值

**返回:** `Promise<void>`

**示例:**
```typescript
await sdk.setConfig('ui.theme', 'dark');
await sdk.setConfig('cache.enabled', true);
```

---

## 平台信息方法

### `getVersion()`

获取SDK版本号。

**返回:** `string` - 版本号

**示例:**
```typescript
const version = sdk.getVersion();
console.log(`Chips SDK v${version}`);
```

---

### `getPlatform()`

获取当前平台类型。

**返回:** `Platform` - 平台类型

**平台类型:**
```typescript
enum Platform {
  Web = 'web',
  Node = 'node',
  Electron = 'electron',
}
```

**示例:**
```typescript
const platform = sdk.getPlatform();
console.log(`Running on ${platform}`);
```

---

### `isInitialized()`

检查SDK是否已初始化。

**返回:** `boolean` - 是否已初始化

**示例:**
```typescript
if (sdk.isInitialized()) {
  console.log('SDK is ready');
}
```

---

## 调试方法

### `enableDebug(enabled)`

启用或禁用调试模式。

**参数:**
- `enabled: boolean` - 是否启用

**示例:**
```typescript
// 启用调试
sdk.enableDebug(true);

// 禁用调试
sdk.enableDebug(false);
```

---

### `getDebugInfo()`

获取调试信息。

**返回:** `DebugInfo` - 调试信息对象

**类型:**
```typescript
interface DebugInfo {
  version: string;
  platform: Platform;
  initialized: boolean;
  eventListeners: number;
  cacheStats: CacheStats;
  currentTheme: string | null;
  currentLanguage: SupportedLanguage;
  logStats: LogStats;
}
```

**示例:**
```typescript
const debugInfo = sdk.getDebugInfo();
console.log('SDK Debug Info:', debugInfo);
```

---

## 完整示例

```typescript
import { ChipsSDK, SupportedLanguage } from '@chips/sdk';

// 1. 创建SDK实例
const sdk = new ChipsSDK({
  debug: true,
  i18n: {
    defaultLanguage: SupportedLanguage.ZhCN,
  },
});

// 2. 设置事件监听
sdk.on('card:load', (card) => {
  console.log('Card loaded:', card.metadata.name);
});

sdk.on('render:complete', () => {
  console.log('Render complete');
});

// 3. 设置主题
sdk.setTheme('dark');

// 4. 加载和渲染卡片
async function main() {
  try {
    // 加载卡片
    const card = await sdk.loadCard('example.card');
    
    // 修改卡片
    card.metadata.name = '新卡片名称';
    
    // 渲染卡片
    await sdk.renderCard(card, '#app', {
      readOnly: false,
      interactive: true,
    });
    
    // 保存修改
    await sdk.saveCard(card, 'updated.card', {
      overwrite: true,
    });
    
    console.log('Success!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

---

## 相关文档

- [FileAPI 文档](./FileAPI.md)
- [RendererEngine 文档](./RendererEngine.md)
- [ThemeManager 文档](./ThemeManager.md)
- [快速开始指南](../guides/quick-start.md)
- [配置指南](../guides/configuration.md)
