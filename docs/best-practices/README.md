# 最佳实践

本目录包含Chips SDK的最佳实践指南。

---

## 文档列表

### 性能优化
- [性能优化最佳实践](./performance.md) - 提升应用性能的技巧和建议

### 错误处理
- [错误处理最佳实践](./error-handling.md) - 正确处理错误和异常

### 安全性
- [安全最佳实践](./security.md) - 保护应用和用户数据

### 代码质量
- [代码质量最佳实践](./code-quality.md) - 编写高质量代码

---

## 通用原则

### 1. 始终处理错误

```typescript
try {
  const card = await sdk.loadCard('card.card');
  await sdk.renderCard(card, container);
} catch (error) {
  console.error('Operation failed:', error);
  // 显示用户友好的错误消息
  showErrorMessage('加载卡片失败，请重试');
}
```

### 2. 使用TypeScript

```typescript
// ✅ 推荐：使用TypeScript获得类型安全
import type { Card, RenderOptions } from '@chips/sdk';

const options: RenderOptions = {
  theme: 'dark',
  readOnly: true,
};

// ❌ 不推荐：使用JavaScript失去类型检查
const options = {
  theme: 'dark',
  readOnly: true,
};
```

### 3. 及时清理资源

```typescript
class CardViewer {
  private result?: RenderResult;
  private subscriptions: string[] = [];
  
  async render(card: Card) {
    this.result = await sdk.renderCard(card, this.container);
    
    const id = sdk.on('card:update', this.handleUpdate);
    this.subscriptions.push(id);
  }
  
  destroy() {
    // 清理渲染结果
    this.result?.destroy();
    
    // 清理事件订阅
    this.subscriptions.forEach(id => sdk.off(id));
    this.subscriptions = [];
  }
}
```

### 4. 使用配置管理

```typescript
// ✅ 推荐：使用配置系统
const sdk = new ChipsSDK({
  debug: process.env.NODE_ENV === 'development',
  logLevel: LogLevel.Info,
  cache: {
    enabled: true,
    maxSize: 100 * 1024 * 1024,
  },
});

// ❌ 不推荐：硬编码配置
const sdk = new ChipsSDK({
  debug: true,
  cache: { maxSize: 100000000 },
});
```

### 5. 提供用户反馈

```typescript
// 加载状态
showLoading();

try {
  const card = await sdk.loadCard('card.card');
  hideLoading();
  
  // 成功反馈
  showSuccess('卡片加载成功');
  
  await sdk.renderCard(card, container);
} catch (error) {
  hideLoading();
  
  // 错误反馈
  showError('加载失败，请重试');
}
```

---

## 场景最佳实践

### Web应用

```typescript
import { ChipsSDK, SupportedLanguage } from '@chips/sdk';

// 初始化
const sdk = new ChipsSDK({
  platform: 'web',
  i18n: {
    defaultLanguage: SupportedLanguage.ZhCN,
  },
  cache: {
    enabled: true,
    maxSize: 50 * 1024 * 1024,  // 50MB
  },
});

// 响应式主题
const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
sdk.setTheme(darkMode.matches ? 'dark' : 'light');

darkMode.addEventListener('change', (e) => {
  sdk.setTheme(e.matches ? 'dark' : 'light');
});

// 文件上传处理
const input = document.querySelector('input[type="file"]');
input?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  try {
    const card = await sdk.loadCard(file);
    await sdk.renderCard(card, '#viewer');
  } catch (error) {
    console.error('Failed to load card:', error);
  }
});
```

### Node.js应用

```typescript
import { ChipsSDK } from '@chips/sdk';
import fs from 'fs';
import path from 'path';

// 初始化
const sdk = new ChipsSDK({
  platform: 'node',
  debug: process.env.NODE_ENV === 'development',
});

// 批量处理
async function processCards(dir: string) {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.card'))
    .map(f => path.join(dir, f));
  
  const cards = await sdk.loadCards(files);
  
  for (const card of cards) {
    // 处理卡片
    card.metadata.updated_at = new Date().toISOString();
    
    // 保存
    await sdk.saveCard(card, `processed-${card.metadata.card_id}.card`);
  }
}

processCards('./cards').catch(console.error);
```

### Electron应用

```typescript
import { ChipsSDK } from '@chips/sdk';
import { ipcRenderer } from 'electron';

// 初始化
const sdk = new ChipsSDK({
  platform: 'electron',
  cache: {
    enabled: true,
  },
});

// 与主进程通信
ipcRenderer.on('open-card', async (event, filePath) => {
  try {
    const card = await sdk.loadCard(filePath);
    await sdk.renderCard(card, '#main-viewer');
  } catch (error) {
    console.error('Failed to open card:', error);
  }
});

// 保存到本地
async function saveCard(card: Card) {
  const result = await ipcRenderer.invoke('show-save-dialog', {
    filters: [{ name: 'Cards', extensions: ['card'] }],
  });
  
  if (!result.canceled && result.filePath) {
    await sdk.saveCard(card, result.filePath);
  }
}
```

---

## 反模式（应避免）

### 1. 不处理错误

```typescript
// ❌ 错误：不处理Promise rejection
sdk.loadCard('card.card'); // 没有.catch()或try/catch

// ✅ 正确
sdk.loadCard('card.card')
  .then(card => console.log(card))
  .catch(error => console.error(error));
```

### 2. 内存泄漏

```typescript
// ❌ 错误：不清理事件监听
function setupCard() {
  sdk.on('card:load', () => {
    // 永远不会被清理
  });
}

// ✅ 正确
function setupCard() {
  const subscriptionId = sdk.on('card:load', handler);
  
  return () => {
    sdk.off(subscriptionId);
  };
}
```

### 3. 阻塞主线程

```typescript
// ❌ 错误：同步循环大量操作
for (let i = 0; i < 10000; i++) {
  const card = await sdk.loadCard(`card-${i}.card`);
  // 阻塞主线程
}

// ✅ 正确：分批处理
async function* loadCardsGenerator(ids: string[]) {
  for (const id of ids) {
    yield await sdk.loadCard(`card-${id}.card`);
  }
}

for await (const card of loadCardsGenerator(ids)) {
  // 处理卡片
  await processCard(card);
}
```

### 4. 硬编码值

```typescript
// ❌ 错误：硬编码
const card = await sdk.loadCard('/Users/john/cards/my-card.card');

// ✅ 正确：使用配置或环境变量
const cardsDir = process.env.CARDS_DIR || './cards';
const card = await sdk.loadCard(path.join(cardsDir, 'my-card.card'));
```

---

## 相关文档

- [性能优化](./performance.md)
- [错误处理](./error-handling.md)
- [安全最佳实践](./security.md)
- [代码质量](./code-quality.md)
