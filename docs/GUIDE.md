# Chips SDK 使用指南

> 薯片生态前端开发工具包使用指南

## 目录

- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [常见用例](#常见用例)
- [最佳实践](#最佳实践)
- [错误处理](#错误处理)
- [性能优化](#性能优化)
- [常见问题](#常见问题)

---

## 快速开始

### 安装

```bash
npm install @chips/sdk
# 或
yarn add @chips/sdk
# 或
pnpm add @chips/sdk
```

### 基础使用

```typescript
import { ChipsSDK } from '@chips/sdk';

// 1. 创建 SDK 实例
const sdk = new ChipsSDK({
  connector: {
    url: 'ws://localhost:9527',
    timeout: 30000,
  },
  debug: true,
});

// 2. 初始化 SDK
async function init() {
  try {
    await sdk.initialize();
    console.log('SDK 已就绪');
    
    // 3. 开始使用
    const card = await sdk.card.create({
      name: '我的第一张卡片',
    });
    
    console.log('卡片已创建:', card.id);
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

init();
```

### 在 Vue 中使用

```typescript
// composables/useChipsSDK.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { ChipsSDK } from '@chips/sdk';

const sdk = new ChipsSDK({
  connector: { url: 'ws://localhost:9527' },
});

export function useChipsSDK() {
  const isReady = ref(false);
  const error = ref<Error | null>(null);

  onMounted(async () => {
    try {
      await sdk.initialize();
      isReady.value = true;
    } catch (e) {
      error.value = e as Error;
    }
  });

  onUnmounted(() => {
    // 不在这里销毁，SDK 应该是全局单例
  });

  return {
    sdk,
    isReady,
    error,
  };
}
```

```vue
<!-- components/CardList.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useChipsSDK } from '@/composables/useChipsSDK';
import type { Card } from '@chips/sdk';

const { sdk, isReady } = useChipsSDK();
const cards = ref<Card[]>([]);

watch(isReady, async (ready) => {
  if (ready) {
    cards.value = await sdk.card.query({
      sortBy: 'modified',
      sortOrder: 'desc',
      limit: 20,
    });
  }
});
</script>

<template>
  <div v-if="!isReady">加载中...</div>
  <ul v-else>
    <li v-for="card in cards" :key="card.id">
      {{ card.metadata.name }}
    </li>
  </ul>
</template>
```

### 在 React 中使用

```typescript
// hooks/useChipsSDK.ts
import { useState, useEffect, useRef } from 'react';
import { ChipsSDK } from '@chips/sdk';

let sdkInstance: ChipsSDK | null = null;

function getSDK(): ChipsSDK {
  if (!sdkInstance) {
    sdkInstance = new ChipsSDK({
      connector: { url: 'ws://localhost:9527' },
    });
  }
  return sdkInstance;
}

export function useChipsSDK() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const sdk = useRef(getSDK());

  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.current.initialize();
        setIsReady(true);
      } catch (e) {
        setError(e as Error);
      }
    };

    initSDK();
  }, []);

  return { sdk: sdk.current, isReady, error };
}
```

```tsx
// components/CardList.tsx
import { useState, useEffect } from 'react';
import { useChipsSDK } from '@/hooks/useChipsSDK';
import type { Card } from '@chips/sdk';

export function CardList() {
  const { sdk, isReady } = useChipsSDK();
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    if (isReady) {
      sdk.card.query({
        sortBy: 'modified',
        sortOrder: 'desc',
        limit: 20,
      }).then(setCards);
    }
  }, [isReady]);

  if (!isReady) return <div>加载中...</div>;

  return (
    <ul>
      {cards.map((card) => (
        <li key={card.id}>{card.metadata.name}</li>
      ))}
    </ul>
  );
}
```

---

## 核心概念

### 卡片 (Card)

卡片是薯片生态的核心内容单元，代表一个独立的内容块。

```typescript
interface Card {
  id: ChipsId;           // 唯一标识符
  metadata: CardMetadata; // 元数据（名称、标签等）
  structure: CardStructure; // 结构信息
  resources: Map<string, Blob | ArrayBuffer>; // 资源文件
}
```

**卡片文件结构** (`.card` 文件是 ZIP 格式):

```
my-card.card
├── metadata.yaml    # 元数据
├── structure.yaml   # 结构定义
├── cover.html       # 封面 HTML
└── resources/       # 资源目录
    ├── image1.png
    └── style.css
```

### 箱子 (Box)

箱子是卡片的容器，用于组织和展示多张卡片。

```typescript
interface Box {
  id: ChipsId;           // 唯一标识符
  metadata: BoxMetadata; // 元数据
  structure: BoxStructure; // 包含的卡片列表
  content: BoxContent;   // 布局配置
}
```

**箱子文件结构** (`.box` 文件):

```
my-box.box
├── metadata.yaml    # 元数据
├── structure.yaml   # 卡片列表
└── content.yaml     # 布局配置
```

### 布局类型

箱子支持多种布局方式：

| 布局 | 说明 |
|------|------|
| `grid` | 网格布局（默认） |
| `masonry` | 瀑布流布局 |
| `list` | 列表布局 |
| `compact` | 紧凑列表 |

### 事件系统

SDK 使用事件驱动架构，通过 EventBus 进行组件间通信。

```typescript
// 订阅事件
sdk.on('card:created', (data) => {
  console.log('新卡片:', data.card);
});

// 发布事件（SDK 内部使用）
sdk.events.emit('custom:event', { data: 'value' });
```

### 插件系统

插件可以扩展 SDK 功能，如添加新的渲染器或命令。

```typescript
sdk.registerPlugin({
  id: 'my-plugin',
  metadata: {
    id: 'my-plugin',
    name: '我的插件',
    version: '1.0.0',
  },
  activate: (ctx) => {
    // 插件逻辑
  },
});
```

### 主题系统

主题控制 SDK 渲染内容的视觉样式。

```typescript
// 切换主题
sdk.setTheme('default-dark');

// 应用到 DOM
sdk.themes.applyToDOM();
```

---

## 常见用例

### 用例 1: 创建和管理卡片

```typescript
// 创建卡片
const card = await sdk.card.create({
  name: '学习笔记',
  type: 'text',
  tags: ['学习', 'TypeScript'],
  description: 'TypeScript 学习笔记',
});

// 保存到文件
await sdk.card.save('/cards/notes/typescript.card', card);

// 更新卡片
await sdk.card.update(card.id, {
  name: 'TypeScript 高级笔记',
  tags: ['学习', 'TypeScript', '高级'],
});

// 查询卡片
const cards = await sdk.card.query({
  tags: ['学习'],
  sortBy: 'modified',
  sortOrder: 'desc',
});

// 删除卡片
await sdk.card.delete(card.id);
```

### 用例 2: 箱子操作

```typescript
// 创建箱子
const box = await sdk.box.create({
  name: '项目文档',
  layout: 'grid',
  tags: ['项目', '文档'],
});

// 添加卡片到箱子
await sdk.box.addCard(box.id, '/cards/doc1.card');
await sdk.box.addCard(box.id, '/cards/doc2.card');
await sdk.box.addCard(box.id, '/cards/doc3.card');

// 设置布局
await sdk.box.setLayout(box.id, 'masonry');

// 设置布局配置
await sdk.box.setLayoutConfig(box.id, {
  columns: 3,
  gap: 20,
  padding: 16,
});

// 重新排序卡片
await sdk.box.reorderCards(box.id, [
  '/cards/doc3.card',
  '/cards/doc1.card',
  '/cards/doc2.card',
]);

// 保存箱子
await sdk.box.save('/boxes/project-docs.box', box);
```

### 用例 3: 渲染内容

```typescript
// 渲染卡片到容器
const cardContainer = document.getElementById('card-view');
const result = await sdk.renderer.renderCard(card, cardContainer, {
  theme: 'default-light',
  animations: true,
});

if (!result.success) {
  console.error('渲染失败:', result.error);
}

// 渲染箱子
const boxContainer = document.getElementById('box-view');
await sdk.renderer.renderBox(box, boxContainer, {
  lazyLoad: true,
});

// 渲染预览
const previewContainer = document.getElementById('preview');
await sdk.renderer.renderPreview(card, previewContainer);
```

### 用例 4: 资源管理

```typescript
// 加载图片资源
const imageBlob = await sdk.resources.load('/images/cover.png');

// 创建对象 URL 用于显示
const imageUrl = await sdk.resources.createObjectUrl('/images/avatar.jpg');
document.getElementById('avatar').src = imageUrl;

// 上传新资源
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const file = fileInput.files[0];

const resourceInfo = await sdk.resources.upload(file, {
  path: '/uploads/new-image.png',
  overwrite: false,
});

console.log('上传成功:', resourceInfo.path);

// 预加载多个资源
await sdk.resources.preload([
  '/images/bg1.jpg',
  '/images/bg2.jpg',
  '/images/bg3.jpg',
], {
  concurrency: 3,
  priority: 'high',
});

// 使用完毕后释放
sdk.resources.releaseObjectUrl('/images/avatar.jpg');
```

### 用例 5: 事件监听

```typescript
// 监听卡片事件
sdk.on('card:created', (data) => {
  console.log('创建了卡片:', data.card.metadata.name);
  showNotification('卡片已创建');
});

sdk.on('card:saved', (data) => {
  console.log('保存了卡片:', data.path);
});

sdk.on('card:deleted', (data) => {
  console.log('删除了卡片:', data.id);
  refreshCardList();
});

// 监听主题变更
sdk.on('theme:changed', (data) => {
  console.log('主题从', data.previousTheme, '变更为', data.currentTheme);
});

// 等待特定事件
try {
  const result = await sdk.events.waitFor('card:saved', 5000);
  console.log('卡片保存完成:', result);
} catch (error) {
  console.error('等待超时');
}
```

### 用例 6: 配置管理

```typescript
// 获取配置
const timeout = sdk.config.get('timeout.default', 30000);
const isDebug = sdk.config.get('sdk.debug', false);

// 设置配置
sdk.config.set('cache.maxSize', 200);

// 批量设置
sdk.config.setMany({
  'render.lazyLoad': true,
  'render.animations': true,
});

// 监听配置变更
sdk.config.onChange('theme.*', (key, newValue, oldValue) => {
  console.log(`主题配置变更: ${key} = ${newValue}`);
});

// 获取特定前缀的配置
const renderConfig = sdk.config.getByPrefix('render');
console.log('渲染配置:', renderConfig);
```

### 用例 7: 多语言支持

```typescript
// 设置语言
sdk.setLocale('en-US');

// 翻译文本
const errorMsg = sdk.t('error.file_not_found');
const welcomeMsg = sdk.t('common.welcome', { name: '张三' });

// 添加自定义翻译
sdk.i18n.addTranslation('zh-CN', {
  app: {
    title: '我的应用',
    subtitle: '欢迎使用',
  },
});

// 监听语言变更
sdk.i18n.onLocaleChange((locale) => {
  console.log('语言已切换到:', locale);
  updateUI();
});
```

### 用例 8: 自定义插件

```typescript
// 创建一个 Markdown 渲染插件
sdk.registerPlugin({
  id: 'markdown-renderer',
  metadata: {
    id: 'markdown-renderer',
    name: 'Markdown 渲染器',
    version: '1.0.0',
    description: '支持 Markdown 格式卡片的渲染',
    keywords: ['markdown', 'renderer'],
  },
  activate: (ctx) => {
    ctx.log('Markdown 渲染插件已激活');

    // 注册自定义渲染器
    ctx.registerRenderer('markdown', {
      cardTypes: ['markdown', 'md'],
      render: async (context) => {
        const card = context.data;
        const content = card.metadata.content || '';
        
        // 使用 markdown-it 等库解析
        const html = parseMarkdown(content);
        
        return {
          success: true,
          html: `<div class="markdown-content">${html}</div>`,
          css: `.markdown-content { line-height: 1.6; }`,
        };
      },
    });

    // 注册命令
    ctx.registerCommand('convert-to-html', async (args) => {
      const { markdown } = args as { markdown: string };
      return parseMarkdown(markdown);
    });
  },
  deactivate: () => {
    console.log('Markdown 渲染插件已停用');
  },
});

// 启用插件
await sdk.plugins.enable('markdown-renderer');

// 使用插件命令
const html = await sdk.plugins.executeCommand(
  'markdown-renderer:convert-to-html',
  { markdown: '# Hello World' }
);
```

### 用例 9: 自定义主题

```typescript
// 注册自定义主题
sdk.registerTheme({
  metadata: {
    id: 'ocean-blue',
    name: '海洋蓝',
    type: 'light',
    version: '1.0.0',
    description: '清爽的海洋蓝主题',
    extends: 'default-light', // 继承默认亮色主题
  },
  colors: {
    primary: '#0077b6',
    secondary: '#00b4d8',
    accent: '#90e0ef',
    background: '#f8fdff',
    surface: '#ffffff',
    text: '#023e8a',
    textSecondary: '#0077b6',
    border: '#caf0f8',
    error: '#e63946',
    warning: '#ffb703',
    success: '#2a9d8f',
    info: '#0077b6',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  radius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadow: {
    none: 'none',
    sm: '0 1px 3px rgba(0, 119, 182, 0.1)',
    md: '0 4px 6px rgba(0, 119, 182, 0.15)',
    lg: '0 10px 15px rgba(0, 119, 182, 0.2)',
    xl: '0 20px 25px rgba(0, 119, 182, 0.25)',
  },
  typography: {
    fontFamily: '"Noto Sans SC", system-ui, sans-serif',
    fontFamilyMono: '"JetBrains Mono", monospace',
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  animation: {
    duration: {
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: {
      default: 'ease',
      in: 'ease-in',
      out: 'ease-out',
      inOut: 'ease-in-out',
    },
  },
});

// 应用主题
sdk.setTheme('ocean-blue');
sdk.themes.applyToDOM();
```

---

## 最佳实践

### 1. SDK 单例模式

SDK 应该作为单例使用，避免创建多个实例。

```typescript
// sdk.ts - 创建单例
import { ChipsSDK } from '@chips/sdk';

let instance: ChipsSDK | null = null;

export function getSDK(): ChipsSDK {
  if (!instance) {
    instance = new ChipsSDK({
      connector: { url: 'ws://localhost:9527' },
    });
  }
  return instance;
}

export async function initSDK(): Promise<ChipsSDK> {
  const sdk = getSDK();
  if (!sdk.isReady) {
    await sdk.initialize();
  }
  return sdk;
}
```

### 2. 合理使用缓存

```typescript
// 对于频繁访问的数据，启用缓存
const card = await sdk.file.loadCard('/path/to/card.card', {
  cache: true, // 启用缓存
});

// 修改后及时更新缓存
await sdk.file.saveCard('/path/to/card.card', updatedCard, {
  overwrite: true,
});

// 定期清理缓存
setInterval(() => {
  const stats = sdk.resources.getCacheStats();
  if (stats.size > stats.maxSize * 0.9) {
    // 缓存接近上限，清理过期项
    sdk.resources.clearCache();
  }
}, 60000);
```

### 3. 优雅的错误处理

```typescript
import { ChipsError, FileError, ConnectionError } from '@chips/sdk';

async function loadCardSafely(path: string) {
  try {
    return await sdk.card.get(path);
  } catch (error) {
    if (error instanceof ConnectionError) {
      // 连接错误，尝试重连
      await sdk.connect();
      return await sdk.card.get(path);
    }
    
    if (error instanceof FileError) {
      if (error.code === 'FILE-1001') {
        // 文件不存在，创建新卡片
        return await sdk.card.create({ name: '新卡片' });
      }
    }
    
    // 其他错误，记录日志并抛出
    sdk.logger.error('加载卡片失败', { path, error: String(error) });
    throw error;
  }
}
```

### 4. 资源清理

```typescript
// 组件卸载时清理资源
function cleanup() {
  // 释放对象 URL
  objectUrls.forEach(url => {
    sdk.resources.releaseObjectUrl(url);
  });
  
  // 取消事件订阅
  subscriptionIds.forEach(id => {
    sdk.off('*', id);
  });
}

// React 中使用
useEffect(() => {
  const subId = sdk.on('card:updated', handleUpdate);
  return () => {
    sdk.off('card:updated', subId);
  };
}, []);

// Vue 中使用
onUnmounted(() => {
  cleanup();
});
```

### 5. 异步操作的取消

```typescript
import { createCancellable, withTimeout } from '@chips/sdk';

async function loadWithCancel() {
  const { promise, cancel, isCancelled } = createCancellable();
  
  // 存储取消函数
  cancelFn = cancel;
  
  try {
    const card = await withTimeout(
      sdk.card.get(cardId),
      5000
    );
    
    if (!isCancelled()) {
      setCard(card);
    }
  } catch (error) {
    if (!isCancelled()) {
      setError(error);
    }
  }
}

// 取消操作
function handleCancel() {
  cancelFn?.();
}
```

### 6. 批量操作优化

```typescript
import { concurrent } from '@chips/sdk';

// 并发加载多张卡片
async function loadCards(paths: string[]) {
  const tasks = paths.map(path => () => sdk.card.get(path));
  
  // 限制并发数为 5
  const cards = await concurrent(tasks, 5);
  
  return cards;
}

// 预加载资源
async function preloadResources(paths: string[]) {
  await sdk.resources.preload(paths, {
    concurrency: 3,
    priority: 'low',
  });
}
```

---

## 错误处理

### 错误类型

| 错误类 | 场景 | 处理建议 |
|--------|------|----------|
| `ConnectionError` | 网络连接问题 | 重试连接 |
| `TimeoutError` | 请求超时 | 增加超时时间或重试 |
| `FileError` | 文件操作失败 | 检查文件路径和权限 |
| `ValidationError` | 数据验证失败 | 检查数据格式 |
| `PluginError` | 插件加载/执行失败 | 检查插件依赖 |
| `RenderError` | 渲染失败 | 检查渲染器和数据 |
| `ResourceError` | 资源加载失败 | 检查资源路径 |

### 错误处理模式

```typescript
// 统一错误处理
async function safeOperation<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ChipsError) {
      sdk.logger.error(error.toString(), error.details);
      
      // 根据错误码处理
      switch (error.code) {
        case 'CONN-1001':
        case 'CONN-1002':
          // 尝试重连
          await sdk.connect();
          return await operation();
          
        case 'FILE-1001':
          // 文件不存在
          return fallback;
          
        default:
          throw error;
      }
    }
    
    throw error;
  }
}

// 使用
const card = await safeOperation(
  () => sdk.card.get(cardId),
  null // fallback
);
```

---

## 性能优化

### 1. 延迟加载

```typescript
// 渲染时启用懒加载
await sdk.renderer.renderBox(box, container, {
  lazyLoad: true,
});

// 资源按需加载
const loadResourceOnDemand = async (path: string) => {
  if (!sdk.resources.isCached(path)) {
    await sdk.resources.load(path);
  }
  return sdk.resources.getObjectUrl(path);
};
```

### 2. 缓存策略

```typescript
// 配置缓存大小
sdk.config.set('cache.maxSize', 200);

// 预加载常用数据
async function preload() {
  // 预加载最近访问的卡片
  const recentPaths = getRecentCardPaths();
  await Promise.all(
    recentPaths.map(path => sdk.card.get(path, { cache: true }))
  );
}
```

### 3. 防抖和节流

```typescript
import { debounce, throttle } from '@chips/sdk';

// 搜索输入防抖
const searchCards = debounce(async (keyword: string) => {
  const results = await sdk.card.query({ name: keyword });
  setSearchResults(results);
}, 300);

// 滚动事件节流
const handleScroll = throttle(() => {
  // 处理滚动
}, 100);
```

### 4. 分页加载

```typescript
async function loadCardsPaginated(page: number, pageSize: number = 20) {
  const cards = await sdk.card.query({
    limit: pageSize,
    offset: page * pageSize,
    sortBy: 'modified',
    sortOrder: 'desc',
  });
  
  return cards;
}
```

---

## 常见问题

### Q: SDK 初始化失败怎么办？

检查以下几点：
1. Chips-Core 是否正在运行
2. WebSocket 地址是否正确
3. 网络连接是否正常

```typescript
// 添加错误处理和重试
async function initWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await sdk.initialize();
      return;
    } catch (error) {
      console.error(`初始化失败 (${i + 1}/${maxRetries}):`, error);
      if (i < maxRetries - 1) {
        await delay(1000 * (i + 1)); // 递增延迟
      }
    }
  }
  throw new Error('SDK 初始化失败');
}
```

### Q: 如何处理大文件？

```typescript
// 使用流式加载
const card = await sdk.file.loadCard(largePath, {
  loadResources: false, // 不立即加载资源
});

// 按需加载资源
const image = await sdk.resources.load(resourcePath, {
  cache: true,
  timeout: 60000, // 大文件增加超时
});
```

### Q: 如何实现实时同步？

```typescript
// 监听 Core 的文件变更事件
sdk.connector.on('file:changed', async (data) => {
  const { path, type } = data as { path: string; type: string };
  
  if (type === 'card') {
    // 重新加载卡片
    sdk.file.removeFromCache(path);
    const card = await sdk.card.get(path);
    updateUI(card);
  }
});
```

### Q: 如何调试 SDK？

```typescript
// 启用调试模式
const sdk = new ChipsSDK({
  debug: true,
});

// 或运行时设置
sdk.logger.setLevel('debug');
sdk.config.set('sdk.debug', true);

// 查看日志历史
const logs = sdk.logger.getHistory('error', 50);
console.log('最近错误:', logs);
```

---

## 下一步

- 阅读 [API 参考文档](./API.md) 了解完整 API
- 阅读 [架构文档](./ARCHITECTURE.md) 了解内部实现
- 查看 [示例项目](../examples/) 获取更多代码示例
