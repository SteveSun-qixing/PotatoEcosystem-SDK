# Chips SDK

<div align="center">

**一套完整的开发工具包，让第三方开发者能够轻松地将Chips的核心能力集成到自己的应用中**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./VERSION)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

[快速开始](#快速开始) • [文档](#文档) • [示例](#示例) • [贡献](#贡献)

</div>

---

## ✨ 特性

- 🚀 **极简API** - 几行代码实现复杂功能，快速上手
- 🎯 **功能完整** - 覆盖卡片操作的所有需求，从加载到渲染
- 🌍 **跨平台** - 支持Web、Node.js、Electron等多平台运行
- 📚 **文档完善** - 详细的API文档、开发指南和丰富的示例
- 🔧 **可扩展** - 强大的插件系统支持功能扩展
- 🎨 **主题系统** - 灵活的主题管理，支持自定义主题
- 🌐 **多语言** - 完整的国际化支持（中文、英语、日语等）
- ⚡ **高性能** - 内置缓存、懒加载、虚拟滚动等优化
- 🛡️ **类型安全** - 完整的TypeScript类型定义
- 🧪 **测试完备** - 高覆盖率的单元测试和集成测试

---

## 📦 安装

### npm

```bash
npm install @chips/sdk
```

### yarn

```bash
yarn add @chips/sdk
```

### pnpm

```bash
pnpm add @chips/sdk
```

---

## 🚀 快速开始

### 基础使用

```typescript
import { ChipsSDK } from '@chips/sdk';

// 创建SDK实例
const sdk = new ChipsSDK();

// 加载卡片
const card = await sdk.loadCard('path/to/card.card');

// 渲染卡片
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
    maxSize: 100 * 1024 * 1024,  // 100MB
  },
});

// 设置主题
sdk.setTheme('dark');

// 监听事件
sdk.on('card:load', (card) => {
  console.log('卡片已加载:', card.metadata.name);
});

// 加载和渲染卡片
const card = await sdk.loadCard('example.card');
await sdk.renderCard(card, '#app', {
  readOnly: false,
  interactive: true,
  animations: true,
});

// 修改并保存
card.metadata.name = '新卡片名称';
await sdk.saveCard(card, 'updated.card', {
  overwrite: true,
});
```

---

## 📚 文档

### 核心文档

- [快速开始指南](./docs/guides/quick-start.md) - 5分钟上手Chips SDK
- [配置指南](./docs/guides/configuration.md) - 详细的配置说明
- [架构设计](./docs/architecture/overview.md) - 了解SDK的架构设计

### API参考

- [ChipsSDK](./docs/api/ChipsSDK.md) - SDK主类API
- [FileAPI](./docs/api/FileAPI.md) - 文件操作API
- [RendererEngine](./docs/api/RendererEngine.md) - 渲染引擎API
- [ThemeManager](./docs/api/ThemeManager.md) - 主题管理API
- [PluginSystem](./docs/api/PluginSystem.md) - 插件系统API
- [完整API参考](./docs/api/) - 查看所有API

### 开发指南

- [插件开发指南](./docs/guides/plugin-development.md) - 创建自己的插件
- [主题开发指南](./docs/guides/theme-development.md) - 创建自定义主题

### 最佳实践

- [性能优化](./docs/best-practices/performance.md) - 提升应用性能
- [错误处理](./docs/best-practices/error-handling.md) - 正确处理错误
- [最佳实践总览](./docs/best-practices/) - 查看所有最佳实践

---

## 💡 示例

### 基础示例

查看 [examples/basic/](./examples/basic/) 目录获取基础使用示例：

- 加载和渲染卡片
- 主题切换
- 多语言支持
- 事件监听

### 平台示例

查看 [examples/platform/](./examples/platform/) 目录获取平台特定示例：

- [Web浏览器示例](./examples/platform/web-example.html)
- [Node.js示例](./examples/platform/node-example.ts)
- [Electron示例](./examples/platform/electron-example.ts)

### 在线演示

访问 [在线演示](https://chips-sdk-demo.example.com) 查看实际效果。

---

## 🎯 核心功能

### 文件操作

```typescript
// 加载单个卡片
const card = await sdk.loadCard('card.card');

// 批量加载
const cards = await sdk.loadCards(['card1.card', 'card2.card']);

// 保存卡片
await sdk.saveCard(card, 'output.card', { overwrite: true });

// 保存为Blob（浏览器下载）
const blob = await sdk.saveCardAsBlob(card);
```

### 渲染功能

```typescript
// 基础渲染
await sdk.renderCard(card, '#container');

// 高级选项
await sdk.renderCard(card, '#container', {
  theme: 'dark',
  readOnly: true,
  animations: true,
  lazyLoad: true,
  virtualScroll: true,
});
```

### 主题管理

```typescript
// 使用内置主题
sdk.setTheme('light');
sdk.setTheme('dark');

// 注册自定义主题
sdk.themeManager.register({
  id: 'custom',
  name: 'Custom Theme',
  colors: {
    primary: '#1976d2',
    secondary: '#424242',
    background: '#ffffff',
    text: '#212121',
    // ...
  },
});

// 应用自定义主题
sdk.setTheme('custom');
```

### 插件系统

```typescript
// 创建插件
const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  
  async install(context) {
    // 初始化逻辑
  },
  
  async enable(context) {
    // 启用逻辑
  },
};

// 使用插件
await sdk.pluginSystem.use(myPlugin);
await sdk.pluginSystem.enable('my-plugin');
```

---

## 🗂️ 项目结构

```
SDK/
├── src/                    # 源代码
│   ├── ChipsSDK.ts        # SDK主类
│   ├── api/               # API层
│   ├── core/              # 核心层
│   ├── platform/          # 平台适配层
│   ├── renderer/          # 渲染引擎
│   ├── theme/             # 主题系统
│   ├── plugin/            # 插件系统
│   └── types/             # 类型定义
├── docs/                  # 文档
│   ├── api/              # API参考文档
│   ├── guides/           # 开发指南
│   ├── architecture/     # 架构文档
│   └── best-practices/   # 最佳实践
├── examples/             # 示例代码
├── tests/                # 测试文件
└── cli/                  # 命令行工具
```

---

## 🔧 开发

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0 或 yarn >= 1.22.0

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 代码检查
npm run lint

# 格式化代码
npm run format

# 类型检查
npm run type-check
```

### 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm test -- --watch

# 运行特定测试
npm test -- src/api/FileAPI.test.ts

# 生成覆盖率报告
npm run test:coverage
```

---

## 📊 开发状态

当前版本：**0.1.0**（开发中）

### ✅ 已完成

- 基础架构和类型系统
- 平台适配（Web、Node.js、Electron）
- 文件操作API（加载、保存、缓存）
- 解析引擎（YAML、ZIP）
- 渲染引擎和渲染器工厂
- 主题系统
- 插件系统
- 事件系统
- 日志系统
- 配置管理
- 多语言支持
- 命令行工具
- 完整的文档体系

### 🚧 进行中

- 编辑器功能
- 更多内置渲染器
- 性能优化
- 更多示例和教程

### 📋 计划中

- 可视化编辑器
- 协作功能
- 云同步
- 移动端支持

---

## 🤝 贡献

我们欢迎所有形式的贡献！

### 如何贡献

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启Pull Request

### 贡献指南

请阅读[贡献指南](./CONTRIBUTING.md)了解详细信息：

- 代码规范
- 提交信息规范
- 测试要求
- 文档要求

---

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 许可证。

---

## 🌟 致谢

感谢所有贡献者和支持者！

---

## 📞 联系我们

- 问题反馈：[GitHub Issues](https://github.com/chips/sdk/issues)
- 功能建议：[GitHub Discussions](https://github.com/chips/sdk/discussions)
- 邮件：sdk@chips.example.com

---

## 🔗 相关链接

- [官方网站](https://chips.example.com)
- [文档中心](https://docs.chips.example.com)
- [在线演示](https://demo.chips.example.com)
- [更新日志](./CHANGELOG.md)
- [发布说明](./RELEASE_NOTES.md)

---

<div align="center">

**Made with ❤️ by Chips Team**

</div>
