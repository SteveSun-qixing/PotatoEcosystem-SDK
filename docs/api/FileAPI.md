# FileAPI API参考

`FileAPI`提供卡片和箱子文件的高层操作接口，包括加载、保存、缓存等功能。

## 类型定义

```typescript
class FileAPI {
  constructor(adapter: IPlatformAdapter, logger: Logger);
  
  // 卡片操作
  loadCard(path: string | File | Blob, options?: LoadOptions): Promise<Card>;
  loadCards(paths: string[], options?: LoadOptions): Promise<Card[]>;
  saveCard(card: Card, path: string, options?: SaveOptions): Promise<void>;
  saveCardAsBlob(card: Card): Promise<Blob>;
  
  // 箱子操作
  loadBox(path: string | File | Blob, options?: LoadOptions): Promise<Box>;
  saveBox(box: Box, path: string, options?: SaveOptions): Promise<void>;
  
  // 缓存管理
  clearCache(): void;
  getCacheStats(): CacheStats;
}
```

---

## 方法详解

### `loadCard(path, options?)`

加载卡片文件。支持文件路径、URL、File对象和Blob对象。

**参数:**
- `path: string | File | Blob` - 文件来源
  - `string` - 文件路径或URL
  - `File` - 浏览器File对象
  - `Blob` - Blob对象
- `options?: LoadOptions` - 加载选项

**返回:** `Promise<Card>` - 解析后的卡片对象

**选项:**
```typescript
interface LoadOptions {
  cache?: boolean;      // 是否使用缓存，默认true
  validate?: boolean;   // 是否验证文件结构，默认true
}
```

**异常:**
- `FileNotFoundError` - 文件不存在
- `InvalidFileFormatError` - 文件格式无效
- `ValidationError` - 文件验证失败

**示例:**
```typescript
import { FileAPI } from '@chips/sdk';

// 从路径加载
const card = await fileAPI.loadCard('/path/to/card.card');

// 从URL加载
const card = await fileAPI.loadCard('https://example.com/card.card');

// 从File对象加载
const file = fileInput.files[0];
const card = await fileAPI.loadCard(file);

// 禁用缓存
const card = await fileAPI.loadCard('card.card', { cache: false });

// 禁用验证（不推荐）
const card = await fileAPI.loadCard('card.card', { validate: false });
```

**卡片结构:**
```typescript
interface Card {
  metadata: CardMetadata;
  structure: CardStructure;
  content: Record<string, BaseCardConfig>;
  resources: CardResources;
}

interface CardMetadata {
  card_id: string;
  name: string;
  description?: string;
  author?: string;
  created_at: string;
  updated_at: string;
  version: string;
  theme?: string;
  tags?: string[];
}
```

---

### `loadCards(paths, options?)`

批量加载多个卡片文件。并行加载所有文件以提高性能。

**参数:**
- `paths: string[]` - 文件路径数组
- `options?: LoadOptions` - 加载选项

**返回:** `Promise<Card[]>` - 卡片对象数组

**异常:**
- 如果任何一个文件加载失败，整个Promise将被拒绝

**示例:**
```typescript
// 批量加载
const cards = await fileAPI.loadCards([
  'card1.card',
  'card2.card',
  'card3.card'
]);

console.log(`Loaded ${cards.length} cards`);

// 使用缓存
const cards = await fileAPI.loadCards(paths, { cache: true });

// 处理错误
try {
  const cards = await fileAPI.loadCards(paths);
} catch (error) {
  console.error('Failed to load some cards:', error);
}
```

---

### `saveCard(card, path, options?)`

保存卡片到文件系统。

**参数:**
- `card: Card` - 卡片对象
- `path: string` - 保存路径
- `options?: SaveOptions` - 保存选项

**返回:** `Promise<void>`

**选项:**
```typescript
interface SaveOptions {
  overwrite?: boolean;         // 是否覆盖已存在的文件，默认false
  createDirectories?: boolean; // 是否自动创建目录，默认true
}
```

**异常:**
- `FileExistsError` - 文件已存在且overwrite为false
- `PermissionError` - 没有写入权限
- `ValidationError` - 卡片数据无效

**示例:**
```typescript
// 基础保存
await fileAPI.saveCard(card, 'output.card');

// 允许覆盖
await fileAPI.saveCard(card, 'output.card', {
  overwrite: true
});

// 不自动创建目录
await fileAPI.saveCard(card, 'dir/output.card', {
  createDirectories: false
});

// 完整示例
try {
  await fileAPI.saveCard(card, 'cards/new-card.card', {
    overwrite: true,
    createDirectories: true
  });
  console.log('Card saved successfully');
} catch (error) {
  console.error('Failed to save card:', error);
}
```

---

### `saveCardAsBlob(card)`

将卡片保存为Blob对象，适用于浏览器环境下载。

**参数:**
- `card: Card` - 卡片对象

**返回:** `Promise<Blob>` - 包含卡片数据的Blob对象

**异常:**
- `ValidationError` - 卡片数据无效

**示例:**
```typescript
// 保存为Blob
const blob = await fileAPI.saveCardAsBlob(card);

// 浏览器下载
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'card.card';
a.click();
URL.revokeObjectURL(url);

// 上传到服务器
const formData = new FormData();
formData.append('card', blob, 'card.card');
await fetch('/upload', {
  method: 'POST',
  body: formData
});
```

---

### `loadBox(path, options?)`

加载箱子文件。箱子是包含多个卡片的容器。

**参数:**
- `path: string | File | Blob` - 文件来源
- `options?: LoadOptions` - 加载选项

**返回:** `Promise<Box>` - 箱子对象

**异常:**
- `FileNotFoundError` - 文件不存在
- `InvalidFileFormatError` - 文件格式无效
- `ValidationError` - 文件验证失败

**示例:**
```typescript
// 加载箱子
const box = await fileAPI.loadBox('box.box');

console.log(`Box contains ${box.cards.length} cards`);

// 访问箱子中的卡片
for (const card of box.cards) {
  console.log(`Card: ${card.metadata.name}`);
}
```

**箱子结构:**
```typescript
interface Box {
  type: 'cards' | 'boxes';  // 箱子类型
  cards: Card[];             // 卡片数组
  metadata?: {
    name?: string;
    description?: string;
    created_at?: string;
  };
}
```

---

### `saveBox(box, path, options?)`

保存箱子到文件系统。

**参数:**
- `box: Box` - 箱子对象
- `path: string` - 保存路径
- `options?: SaveOptions` - 保存选项

**返回:** `Promise<void>`

**异常:**
- `FileExistsError` - 文件已存在且overwrite为false
- `PermissionError` - 没有写入权限
- `ValidationError` - 箱子数据无效

**示例:**
```typescript
// 基础保存
await fileAPI.saveBox(box, 'output.box');

// 允许覆盖
await fileAPI.saveBox(box, 'output.box', {
  overwrite: true
});

// 创建箱子并保存
const box: Box = {
  type: 'cards',
  cards: [card1, card2, card3],
  metadata: {
    name: 'My Box',
    description: 'A collection of cards'
  }
};

await fileAPI.saveBox(box, 'my-box.box');
```

---

## 缓存管理

### `clearCache()`

清除所有缓存的卡片和箱子。

**示例:**
```typescript
// 清除缓存
fileAPI.clearCache();
console.log('Cache cleared');
```

---

### `getCacheStats()`

获取缓存统计信息。

**返回:** `CacheStats` - 缓存统计对象

**类型:**
```typescript
interface CacheStats {
  size: number;        // 缓存项数量
  hits: number;        // 缓存命中次数
  misses: number;      // 缓存未命中次数
  hitRate: number;     // 命中率 (0-1)
}
```

**示例:**
```typescript
const stats = fileAPI.getCacheStats();

console.log(`Cache stats:
  Items: ${stats.size}
  Hits: ${stats.hits}
  Misses: ${stats.misses}
  Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%
`);
```

---

## 完整使用示例

### 示例1: 加载和修改卡片

```typescript
import { FileAPI } from '@chips/sdk';

async function modifyCard() {
  // 创建FileAPI实例（通常从SDK获取）
  const fileAPI = sdk.fileAPI;
  
  // 加载卡片
  const card = await fileAPI.loadCard('original.card');
  
  // 修改卡片元数据
  card.metadata.name = '修改后的卡片';
  card.metadata.updated_at = new Date().toISOString();
  
  // 保存修改
  await fileAPI.saveCard(card, 'modified.card', {
    overwrite: true
  });
  
  console.log('Card modified successfully');
}
```

### 示例2: 批量处理卡片

```typescript
async function batchProcess() {
  const fileAPI = sdk.fileAPI;
  
  // 批量加载
  const cards = await fileAPI.loadCards([
    'card1.card',
    'card2.card',
    'card3.card'
  ]);
  
  // 批量处理
  for (const card of cards) {
    // 添加标签
    card.metadata.tags = ['processed', 'batch'];
    
    // 保存
    const filename = `processed-${card.metadata.card_id}.card`;
    await fileAPI.saveCard(card, filename);
  }
  
  console.log(`Processed ${cards.length} cards`);
}
```

### 示例3: 创建和保存箱子

```typescript
async function createBox() {
  const fileAPI = sdk.fileAPI;
  
  // 加载多个卡片
  const cards = await fileAPI.loadCards([
    'card1.card',
    'card2.card',
    'card3.card'
  ]);
  
  // 创建箱子
  const box: Box = {
    type: 'cards',
    cards: cards,
    metadata: {
      name: 'My Card Collection',
      description: '我的卡片集合',
      created_at: new Date().toISOString()
    }
  };
  
  // 保存箱子
  await fileAPI.saveBox(box, 'my-collection.box');
  
  console.log('Box created successfully');
}
```

### 示例4: 浏览器文件上传

```typescript
// HTML
// <input type="file" id="fileInput" accept=".card" />

async function handleFileUpload() {
  const fileAPI = sdk.fileAPI;
  const input = document.getElementById('fileInput') as HTMLInputElement;
  
  input.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      // 从File对象加载
      const card = await fileAPI.loadCard(file);
      
      console.log('Card loaded:', card.metadata.name);
      
      // 可以进一步处理或渲染卡片
      await sdk.renderCard(card, '#preview');
    } catch (error) {
      console.error('Failed to load card:', error);
    }
  });
}
```

### 示例5: 缓存优化

```typescript
async function cacheDemo() {
  const fileAPI = sdk.fileAPI;
  
  // 首次加载（从文件系统）
  console.time('First load');
  await fileAPI.loadCard('large-card.card');
  console.timeEnd('First load');
  
  // 第二次加载（从缓存）
  console.time('Cached load');
  await fileAPI.loadCard('large-card.card');
  console.timeEnd('Cached load');
  
  // 查看缓存统计
  const stats = fileAPI.getCacheStats();
  console.log('Cache hit rate:', stats.hitRate);
  
  // 清除缓存
  fileAPI.clearCache();
  
  // 禁用缓存加载
  await fileAPI.loadCard('large-card.card', { cache: false });
}
```

---

## 错误处理

### 错误类型

```typescript
// 文件不存在
try {
  await fileAPI.loadCard('nonexistent.card');
} catch (error) {
  if (error instanceof FileNotFoundError) {
    console.error('File not found');
  }
}

// 文件格式无效
try {
  await fileAPI.loadCard('invalid.card');
} catch (error) {
  if (error instanceof InvalidFileFormatError) {
    console.error('Invalid file format');
  }
}

// 验证失败
try {
  await fileAPI.loadCard('corrupted.card');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  }
}

// 文件已存在
try {
  await fileAPI.saveCard(card, 'existing.card');
} catch (error) {
  if (error instanceof FileExistsError) {
    // 使用overwrite选项重试
    await fileAPI.saveCard(card, 'existing.card', { overwrite: true });
  }
}
```

### 最佳实践

```typescript
async function safeFileOperation() {
  const fileAPI = sdk.fileAPI;
  
  try {
    // 加载卡片
    const card = await fileAPI.loadCard('card.card', {
      cache: true,      // 使用缓存提高性能
      validate: true    // 验证文件完整性
    });
    
    // 处理卡片
    // ...
    
    // 保存卡片
    await fileAPI.saveCard(card, 'output.card', {
      overwrite: true,         // 允许覆盖
      createDirectories: true  // 自动创建目录
    });
    
    return { success: true };
    
  } catch (error) {
    // 统一错误处理
    console.error('File operation failed:', error);
    
    // 记录错误日志
    logger.error('File operation error', error);
    
    // 返回错误信息
    return { 
      success: false, 
      error: error.message 
    };
  }
}
```

---

## 性能优化建议

1. **使用缓存**: 默认启用缓存可显著提高重复加载的性能
2. **批量加载**: 使用`loadCards()`并行加载多个文件
3. **适时清理**: 在不需要时清除缓存以释放内存
4. **避免频繁保存**: 合并多次修改后统一保存

---

## 相关文档

- [ChipsSDK 文档](./ChipsSDK.md)
- [类型定义](./types.md)
- [快速开始](../guides/quick-start.md)
- [最佳实践](../best-practices/file-operations.md)
