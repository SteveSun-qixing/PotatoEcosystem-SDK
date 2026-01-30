# 快速开始

本指南将帮助你快速上手Chips SDK。

---

## 安装

```bash
npm install @chips/sdk
```

---

## 基础使用

### 1. 创建SDK实例

```typescript
import { ChipsSDK } from '@chips/sdk';

const sdk = new ChipsSDK();
```

### 2. 加载卡片

```typescript
// 从文件路径加载
const card = await sdk.loadCard('path/to/card.card');

// 从URL加载
const card = await sdk.loadCard('https://example.com/card.card');

// 从File对象加载（浏览器）
const card = await sdk.loadCard(fileInput.files[0]);
```

### 3. 渲染卡片

```typescript
// 渲染到指定容器
await sdk.renderCard(card, '#container');

// 使用渲染选项
await sdk.renderCard(card, '#container', {
  theme: 'dark',
  readOnly: true,
});
```

### 4. 保存卡片

```typescript
// 保存到文件
await sdk.saveCard(card, 'output.card');

// 保存为Blob
const blob = await sdk.saveCardAsBlob(card);
```

---

## 进阶功能

### 主题切换

```typescript
// 切换到深色主题
sdk.setTheme('dark');

// 列出所有主题
const themes = sdk.listThemes();
```

### 多语言支持

```typescript
import { SupportedLanguage } from '@chips/sdk';

// 切换到英文
sdk.setLanguage(SupportedLanguage.EnUS);

// 切换到中文
sdk.setLanguage(SupportedLanguage.ZhCN);
```

### 事件监听

```typescript
// 监听卡片加载
sdk.on('card:load', (card) => {
  console.log('Card loaded:', card.id);
});

// 监听渲染完成
sdk.on('render:complete', (card) => {
  console.log('Render complete');
});

// 监听错误
sdk.on('error', (error) => {
  console.error('SDK error:', error);
});
```

---

## 完整示例

```typescript
import { ChipsSDK, SupportedLanguage } from '@chips/sdk';

// 创建SDK实例
const sdk = new ChipsSDK({
  debug: true,
  i18n: {
    defaultLanguage: SupportedLanguage.ZhCN,
  },
});

// 设置主题
sdk.setTheme('dark');

// 加载卡片
const card = await sdk.loadCard('my-card.card');

// 渲染卡片
await sdk.renderCard(card, '#app', {
  readOnly: false,
  interactive: true,
});

// 修改卡片并保存
card.metadata.name = '新卡片名称';
await sdk.saveCard(card, 'updated-card.card', {
  overwrite: true,
});
```

---

## 下一步

- 阅读 [API参考文档](../api/) 了解详细API
- 查看 [示例代码](../../examples/) 学习更多用法
- 查看 [架构设计](../architecture/) 了解内部实现
