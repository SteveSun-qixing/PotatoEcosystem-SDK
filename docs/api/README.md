# Chips SDK API参考文档

**版本**: 0.1.0  
**更新时间**: 2026-01-31

---

## 目录

### 核心API
- [ChipsSDK](./ChipsSDK.md) - SDK主类，统一的入口点
- [FileAPI](./FileAPI.md) - 文件操作API，卡片和箱子的读写
- [RendererEngine](./RendererEngine.md) - 渲染引擎，卡片渲染和主题应用

### 扩展功能
- [ThemeManager](./ThemeManager.md) - 主题管理，主题注册和应用
- [PluginSystem](./PluginSystem.md) - 插件系统，插件管理和生命周期

### 核心组件
- [EventBus](./EventBus.md) - 事件系统，模块间通信
- [Logger](./Logger.md) - 日志系统，统一日志记录
- [CacheManager](./CacheManager.md) - 缓存管理，性能优化
- [ConfigManager](./ConfigManager.md) - 配置管理，配置存储

### 类型定义
- [Types](./types.md) - 完整类型定义

---

## 快速开始

### 基础使用

```typescript
import { ChipsSDK } from '@chips/sdk';

// 创建SDK实例
const sdk = new ChipsSDK();

// 加载和渲染卡片
const card = await sdk.loadCard('card.card');
await sdk.renderCard(card, '#container');
```

### 完整示例

```typescript
import { ChipsSDK, SupportedLanguage } from '@chips/sdk';

// 创建配置完整的SDK实例
const sdk = new ChipsSDK({
  debug: true,
  i18n: {
    defaultLanguage: SupportedLanguage.ZhCN,
  },
  cache: {
    enabled: true,
    maxSize: 100 * 1024 * 1024,
  },
});

// 设置主题
sdk.setTheme('dark');

// 监听事件
sdk.on('card:load', (card) => {
  console.log('Card loaded:', card.metadata.name);
});

// 加载和渲染
const card = await sdk.loadCard('example.card');
await sdk.renderCard(card, '#app', {
  readOnly: false,
  interactive: true,
});

// 保存修改
card.metadata.name = '新名称';
await sdk.saveCard(card, 'updated.card', { overwrite: true });
```

---

## API分类

### 文件操作

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `loadCard(path, options?)` | 加载单个卡片 | `Promise<Card>` |
| `loadCards(paths, options?)` | 批量加载卡片 | `Promise<Card[]>` |
| `saveCard(card, path, options?)` | 保存卡片到文件 | `Promise<void>` |
| `saveCardAsBlob(card)` | 保存卡片为Blob | `Promise<Blob>` |
| `loadBox(path, options?)` | 加载箱子 | `Promise<Box>` |
| `saveBox(box, path, options?)` | 保存箱子 | `Promise<void>` |

### 渲染功能

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `renderCard(card, container, options?)` | 渲染卡片 | `Promise<void>` |
| `setTheme(themeId)` | 设置主题 | `void` |
| `getCurrentTheme()` | 获取当前主题 | `string \| null` |
| `listThemes()` | 列出所有主题 | `ThemeInfo[]` |

### 主题管理

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `themeManager.register(theme)` | 注册主题 | `void` |
| `themeManager.unregister(themeId)` | 注销主题 | `void` |
| `themeManager.apply(themeId)` | 应用主题 | `void` |
| `themeManager.getTheme(themeId)` | 获取主题配置 | `Theme \| undefined` |

### 插件系统

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `pluginSystem.use(plugin)` | 安装插件 | `Promise<void>` |
| `pluginSystem.enable(pluginId)` | 启用插件 | `Promise<void>` |
| `pluginSystem.disable(pluginId)` | 禁用插件 | `Promise<void>` |
| `pluginSystem.uninstall(pluginId)` | 卸载插件 | `Promise<void>` |
| `pluginSystem.listPlugins(status?)` | 列出插件 | `PluginInfo[]` |

### 多语言

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `setLanguage(language)` | 设置语言 | `void` |
| `getLanguage()` | 获取当前语言 | `SupportedLanguage` |

### 事件系统

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `on(event, listener)` | 监听事件 | `string` (订阅ID) |
| `off(subscriptionId)` | 取消监听 | `void` |

### 配置管理

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `getConfig(key, defaultValue?)` | 获取配置 | `T` |
| `setConfig(key, value)` | 设置配置 | `Promise<void>` |

### 工具方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `getVersion()` | 获取SDK版本 | `string` |
| `getPlatform()` | 获取平台信息 | `Platform` |
| `isInitialized()` | 检查是否已初始化 | `boolean` |
| `enableDebug(enabled)` | 启用调试模式 | `void` |
| `getDebugInfo()` | 获取调试信息 | `DebugInfo` |

---

## 内置事件

| 事件名 | 触发时机 | 参数 |
|--------|---------|------|
| `ready` | SDK初始化完成 | 无 |
| `card:load` | 卡片加载完成 | `card: Card` |
| `card:save` | 卡片保存完成 | `card: Card` |
| `render:start` | 开始渲染 | `card: Card` |
| `render:complete` | 渲染完成 | `card: Card` |
| `render:error` | 渲染错误 | `error: Error` |
| `theme:change` | 主题切换 | `themeId: string` |
| `language:change` | 语言切换 | `language: SupportedLanguage` |
| `plugin:install` | 插件安装 | `pluginId: string` |
| `plugin:enable` | 插件启用 | `pluginId: string` |
| `plugin:disable` | 插件禁用 | `pluginId: string` |
| `error` | 错误事件 | `error: Error` |

---

## 错误类型

| 错误类 | 说明 | 使用场景 |
|--------|------|---------|
| `ChipsError` | 基础错误类 | 所有SDK错误的基类 |
| `FileNotFoundError` | 文件不存在 | 加载文件时文件不存在 |
| `InvalidFileFormatError` | 无效文件格式 | 文件格式不正确 |
| `FileExistsError` | 文件已存在 | 保存时文件已存在且未允许覆盖 |
| `PermissionError` | 权限错误 | 没有读写权限 |
| `ValidationError` | 验证错误 | 数据验证失败 |
| `RenderError` | 渲染错误 | 渲染过程出错 |
| `PluginError` | 插件错误 | 插件操作失败 |

---

## 平台支持

| 平台 | 支持状态 | 适配器 |
|------|---------|--------|
| Web浏览器 | ✅ 完全支持 | `WebAdapter` |
| Node.js | ✅ 完全支持 | `NodeAdapter` |
| Electron | ✅ 完全支持 | `ElectronAdapter` |

---

## 下一步

- 阅读[快速开始指南](../guides/quick-start.md)开始使用
- 查看[配置指南](../guides/configuration.md)了解配置选项
- 学习[插件开发](../guides/plugin-development.md)扩展功能
- 参考[最佳实践](../best-practices/)提升代码质量
