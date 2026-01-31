# Chips SDK 文档中心

欢迎来到Chips SDK文档中心！这里包含了SDK的完整文档，帮助你快速上手并深入使用SDK。

---

## 📚 文档导航

### 🚀 快速开始

如果你是第一次使用Chips SDK，从这里开始：

1. [快速开始指南](./guides/quick-start.md) - 5分钟快速上手
2. [配置指南](./guides/configuration.md) - 了解如何配置SDK
3. [基础示例](../examples/basic/) - 查看实际代码示例

### 📖 API参考

查阅完整的API文档：

- [API文档索引](./api/README.md) - 所有API的总览
- [ChipsSDK](./api/ChipsSDK.md) - SDK主类API
- [FileAPI](./api/FileAPI.md) - 文件操作API
- [RendererEngine](./api/RendererEngine.md) - 渲染引擎API
- [ThemeManager](./api/ThemeManager.md) - 主题管理API
- [PluginSystem](./api/PluginSystem.md) - 插件系统API

### 📝 开发指南

深入学习SDK的各项功能：

- [快速开始](./guides/quick-start.md) - 快速上手指南
- [配置指南](./guides/configuration.md) - 配置系统详解
- [渲染指南](./guides/rendering.md) - 渲染功能详解
- [插件开发](./guides/plugin-development.md) - 创建自己的插件
- [主题开发](./guides/theme-development.md) - 创建自定义主题

### 🏗️ 架构设计

了解SDK的内部设计：

- [架构概览](./architecture/overview.md) - SDK架构设计文档

### 💡 最佳实践

学习如何更好地使用SDK：

- [最佳实践总览](./best-practices/README.md)
- [性能优化](./best-practices/performance.md) - 提升应用性能
- [错误处理](./best-practices/error-handling.md) - 正确处理错误

---

## 🎯 按场景查找

### Web应用开发

1. [快速开始](./guides/quick-start.md#web应用) - Web应用基础
2. [FileAPI](./api/FileAPI.md) - 处理用户上传的文件
3. [RendererEngine](./api/RendererEngine.md) - 在浏览器中渲染卡片
4. [ThemeManager](./api/ThemeManager.md) - 主题切换

### Node.js应用开发

1. [快速开始](./guides/quick-start.md#nodejs应用) - Node.js基础
2. [FileAPI](./api/FileAPI.md) - 批量处理文件
3. [配置指南](./guides/configuration.md) - 服务端配置

### 插件开发

1. [插件开发指南](./guides/plugin-development.md) - 完整的插件开发教程
2. [PluginSystem API](./api/PluginSystem.md) - 插件系统API参考
3. [架构设计](./architecture/overview.md) - 了解插件系统架构

### 主题开发

1. [主题开发指南](./guides/theme-development.md) - 完整的主题开发教程
2. [ThemeManager API](./api/ThemeManager.md) - 主题管理API参考

---

## 🔍 按功能查找

### 文件操作

- [FileAPI完整文档](./api/FileAPI.md)
- 加载卡片: `loadCard()`, `loadCards()`
- 保存卡片: `saveCard()`, `saveCardAsBlob()`
- 箱子操作: `loadBox()`, `saveBox()`

### 渲染功能

- [RendererEngine完整文档](./api/RendererEngine.md)
- [渲染指南](./guides/rendering.md)
- 基础渲染: `renderCard()`
- 渲染选项: `theme`, `readOnly`, `animations`等

### 主题管理

- [ThemeManager完整文档](./api/ThemeManager.md)
- [主题开发指南](./guides/theme-development.md)
- 应用主题: `setTheme()`, `getCurrentTheme()`
- 注册主题: `register()`, `unregister()`

### 插件系统

- [PluginSystem完整文档](./api/PluginSystem.md)
- [插件开发指南](./guides/plugin-development.md)
- 使用插件: `use()`, `enable()`, `disable()`
- 管理插件: `listPlugins()`, `getPlugin()`

### 事件系统

- 监听事件: `on()`, `off()`
- 内置事件: `card:load`, `render:complete`等
- [完整事件列表](./api/README.md#内置事件)

### 配置管理

- [配置指南](./guides/configuration.md)
- 读取配置: `getConfig()`
- 设置配置: `setConfig()`

---

## 💻 代码示例

### 基础使用

```typescript
import { ChipsSDK } from '@chips/sdk';

// 创建SDK实例
const sdk = new ChipsSDK();

// 加载和渲染卡片
const card = await sdk.loadCard('card.card');
await sdk.renderCard(card, '#container');
```

### 完整配置

```typescript
import { ChipsSDK, SupportedLanguage } from '@chips/sdk';

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

sdk.setTheme('dark');

const card = await sdk.loadCard('example.card');
await sdk.renderCard(card, '#app', {
  readOnly: false,
  interactive: true,
});
```

更多示例请查看 [示例代码目录](../examples/)。

---

## 🆘 获取帮助

### 常见问题

查看各文档中的常见问题部分：

- [快速开始 - 常见问题](./guides/quick-start.md#常见问题)
- [配置指南 - 常见问题](./guides/configuration.md#常见问题)
- [插件开发 - 常见问题](./guides/plugin-development.md#常见问题)

### 问题反馈

如果遇到问题或发现文档错误：

- [GitHub Issues](https://github.com/chips/sdk/issues) - 报告问题
- [GitHub Discussions](https://github.com/chips/sdk/discussions) - 提问讨论

### 联系我们

- 邮件: sdk@chips.example.com
- 社区: [Chips开发者社区](https://community.chips.example.com)

---

## 📊 文档状态

| 类别 | 文档数 | 状态 |
|------|--------|------|
| API参考 | 6 | ✅ 已完成 |
| 开发指南 | 5 | ✅ 已完成 |
| 架构文档 | 1 | ✅ 已完成 |
| 最佳实践 | 3 | ✅ 已完成 |

查看 [文档完成报告](./DOCUMENTATION_COMPLETION_REPORT.md) 了解详细信息。

---

## 🔄 文档版本

当前文档版本：**v0.1.0**  
最后更新时间：**2026-01-31**

查看 [更新日志](../CHANGELOG.md) 了解文档变更历史。

---

## 🤝 贡献文档

我们欢迎对文档的贡献！

### 如何贡献

1. Fork本仓库
2. 在`docs/`目录中添加或修改文档
3. 提交Pull Request

### 文档规范

- 使用Markdown格式
- 保持一致的风格和结构
- 提供清晰的代码示例
- 包含必要的截图或图表

详细信息请查看 [贡献指南](../CONTRIBUTING.md)。

---

## 📜 许可证

文档采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 许可证。

---

<div align="center">

**感谢使用Chips SDK！**

如有任何问题或建议，请随时联系我们。

</div>
