# Chips SDK

薯片生态开发工具包 - 为开发者提供简单易用的 API

## 特性

- 🎴 卡片和箱子管理
- 🔌 灵活的插件系统
- 🎨 强大的主题系统
- 📦 文件操作 API
- 🖼️ 渲染引擎
- 🌐 多语言支持

## 安装

```bash
npm install @chips/sdk
```

## 快速开始

```typescript
import { createSDK } from '@chips/sdk';

// 创建并初始化 SDK
const sdk = createSDK();
await sdk.initialize();

// 创建卡片
const card = await sdk.createCard({ name: '我的卡片' });

// 渲染卡片
await sdk.renderCard(card, document.getElementById('container'));

// 保存卡片
await sdk.saveCard('./my-card.card', card);
```

## 文档

- [开发计划](./开发计划/00-开发计划总览.md)
- [API 文档](./docs/api/) （开发中）
- [示例代码](./examples/) （开发中）

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 运行测试
npm run test

# 类型检查
npm run typecheck

# 代码检查
npm run lint
```

## 兼容性

- 浏览器: Chrome 80+, Firefox 75+, Safari 13+
- Node.js: 16+
- Electron: 20+
- TypeScript: 5.0+

## 许可证

MIT License

## 相关项目

- [Chips-Core](../Chips-core/) - 薯片微内核
- [Chips-Foundation](../Chips-Foundation/) - 薯片公共基础层
