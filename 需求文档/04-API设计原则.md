# API设计原则

## 1. 设计理念

Chips SDK 的 API 设计遵循"**简单优于复杂,明确优于隐晦**"的核心理念,旨在让开发者用最少的代码实现最多的功能,同时保持 API 的灵活性和可扩展性。

### 1.1 核心价值观

1. **Developer First**: 开发者体验优先
2. **Convention over Configuration**: 约定优于配置
3. **Progressive Enhancement**: 渐进式增强
4. **Fail Fast, Fail Safe**: 快速失败,安全失败
5. **Backwards Compatibility**: 向后兼容

## 2. API 设计原则

### 2.1 简洁性 (Simplicity)

**原则说明**：API 应该简单直观,常见操作用最少的代码完成。

**好的设计**：
```javascript
// ✅ 简洁明了
await chips.renderCard('card.card', '#container');
```

**不好的设计**：
```javascript
// ❌ 过于复杂
const loader = new CardLoader();
const parser = new CardParser();
const renderer = new CardRenderer();
const card = await loader.load('card.card');
const parsed = parser.parse(card);
await renderer.render(parsed, document.querySelector('#container'));
```

**实践要点**：
- 提供高层 API 处理常见场景
- 合理的默认值减少必需参数
- 链式调用提升代码可读性

### 2.2 一致性 (Consistency)

**原则说明**：相似的操作使用相似的 API 模式。

**命名一致性**：
```javascript
// ✅ 一致的命名模式
chips.loadCard()      // 加载单个
chips.loadCards()     // 加载多个
chips.saveCard()      // 保存单个
chips.saveCards()     // 保存多个

chips.createCard()    // 创建单个
chips.createBox()     // 创建箱子
chips.createEditor()  // 创建编辑器
```

**参数一致性**：
```javascript
// ✅ 一致的参数顺序
chips.renderCard(card, container, options)
chips.renderBox(box, container, options)
chips.renderPreview(card, container, options)
```

**返回值一致性**：
```javascript
// ✅ 异步操作都返回 Promise
await chips.loadCard(path)
await chips.saveCard(card, path)
await chips.renderCard(card, container)
```

### 2.3 可发现性 (Discoverability)

**原则说明**：API 应该容易被发现和理解,有良好的 IDE 支持。

**命名空间组织**：
```javascript
// ✅ 清晰的命名空间
chips.file.read()
chips.file.write()
chips.file.exists()

chips.theme.load()
chips.theme.apply()
chips.theme.create()

chips.plugin.use()
chips.plugin.register()
chips.plugin.list()
```

**TypeScript 类型支持**：
```typescript
// ✅ 完整的类型定义
interface ChipsSDK {
  loadCard(path: string): Promise<Card>;
  renderCard(
    card: Card,
    container: string | HTMLElement,
    options?: RenderOptions
  ): Promise<void>;
}

// IDE 自动补全和类型检查
const card = await chips.loadCard('card.card');  // card: Card
await chips.renderCard(card, '#container', {
  theme: 'dark',  // IDE 会提示可用的主题
  readOnly: true
});
```

### 2.4 灵活性 (Flexibility)

**原则说明**：API 应该支持多种使用方式,满足不同场景的需求。

**参数重载**：
```javascript
// ✅ 支持多种参数形式
chips.loadCard('card.card')                    // 字符串路径
chips.loadCard(fileObject)                     // File 对象
chips.loadCard({ path: 'card.card', cache: false })  // 配置对象
```

**配置对象模式**：
```javascript
// ✅ 使用配置对象,易于扩展
chips.renderCard(card, container, {
  theme: 'dark',
  readOnly: true,
  animations: true,
  onLoad: () => console.log('loaded')
});

// 而不是多个参数
chips.renderCard(card, container, 'dark', true, true, callback);  // ❌
```

**链式调用**：
```javascript
// ✅ 支持链式调用
const editor = chips.createEditor('#editor')
  .setTheme('dark')
  .setMode('markdown')
  .enableAutoSave()
  .loadCard('card.card');
```

### 2.5 安全性 (Safety)

**原则说明**：API 应该帮助开发者避免常见错误,提供清晰的错误信息。

**参数验证**：
```javascript
// ✅ 自动验证参数
chips.loadCard(null);  // 抛出 TypeError: path is required

chips.setTheme('invalid-theme');  // 抛出 Error: Theme 'invalid-theme' not found
```

**错误类型**：
```javascript
// ✅ 具体的错误类型
try {
  await chips.loadCard('missing.card');
} catch (error) {
  if (error instanceof FileNotFoundError) {
    // 文件不存在
  } else if (error instanceof ParseError) {
    // 解析错误
  }
}
```

**类型安全**：
```typescript
// ✅ TypeScript 类型保护
interface Card {
  id: string;
  type: CardType;
  content: unknown;
}

function isVideoCard(card: Card): card is VideoCard {
  return card.type === 'video';
}

if (isVideoCard(card)) {
  // card 现在是 VideoCard 类型
  console.log(card.content.url);  // 类型安全
}
```

### 2.6 性能 (Performance)

**原则说明**：API 设计应该考虑性能影响,提供优化选项。

**懒加载**：
```javascript
// ✅ 默认懒加载
chips.renderBox(box, container, {
  lazyLoad: true  // 默认值
});

// 可以禁用
chips.renderBox(box, container, {
  lazyLoad: false  // 全部加载
});
```

**批量操作**：
```javascript
// ✅ 批量操作更高效
await chips.loadCards(['card1.card', 'card2.card', 'card3.card']);

// 而不是多次单独加载
await chips.loadCard('card1.card');  // ❌
await chips.loadCard('card2.card');
await chips.loadCard('card3.card');
```

**缓存控制**：
```javascript
// ✅ 提供缓存控制
await chips.loadCard('card.card', { cache: true });  // 使用缓存
await chips.loadCard('card.card', { cache: false }); // 强制重新加载
```

## 3. 具体设计模式

### 3.1 构造函数模式

**单例模式**：
```javascript
// ✅ 全局单例
import ChipsSDK from '@chips/sdk';
const chips = new ChipsSDK();  // 全局唯一实例

// 或者
const chips = ChipsSDK.getInstance();
```

**工厂模式**：
```javascript
// ✅ 工厂方法创建对象
const renderer = chips.createRenderer(options);
const editor = chips.createEditor(selector, options);
const fileManager = chips.createFileManager(config);
```

### 3.2 配置对象模式

**选项合并**：
```javascript
// ✅ 支持部分配置,自动合并默认值
chips.renderCard(card, container, {
  theme: 'dark'  // 其他选项使用默认值
});

// 内部实现
function renderCard(card, container, options = {}) {
  const finalOptions = {
    theme: 'light',      // 默认值
    readOnly: false,
    animations: true,
    ...options           // 用户配置覆盖默认值
  };
  // ...
}
```

### 3.3 回调和事件模式

**回调函数**：
```javascript
// ✅ 回调函数处理异步结果
chips.loadCard('card.card', {
  onSuccess: (card) => console.log('加载成功', card),
  onError: (error) => console.error('加载失败', error),
  onProgress: (progress) => console.log('进度', progress)
});
```

**事件监听**：
```javascript
// ✅ 事件驱动架构
editor.on('change', (delta) => {
  console.log('内容变化', delta);
});

editor.on('save', async () => {
  await saveToServer();
});

editor.once('ready', () => {
  console.log('编辑器已就绪');  // 只触发一次
});

// 取消监听
editor.off('change', handler);
```

### 3.4 Promise 和 async/await

**统一的异步处理**：
```javascript
// ✅ 所有异步操作返回 Promise
const card = await chips.loadCard('card.card');
await chips.saveCard(card, 'output.card');
await chips.renderCard(card, container);

// 支持 Promise 链
chips.loadCard('card.card')
  .then(card => chips.renderCard(card, container))
  .then(() => console.log('渲染完成'))
  .catch(error => console.error('错误', error));
```

### 3.5 流式 API

**链式调用**：
```javascript
// ✅ 流式接口
const result = chips
  .createCard({ type: 'richtext' })
  .addText('Hello ')
  .addText('World', { bold: true })
  .addImage('image.jpg')
  .setMetadata({ title: 'My Card' })
  .build();
```

### 3.6 构建器模式

**复杂对象构建**：
```javascript
// ✅ 使用构建器创建复杂对象
const theme = chips.createThemeBuilder()
  .setColors({
    primary: '#1976d2',
    secondary: '#424242'
  })
  .setTypography({
    fontFamily: 'Roboto',
    fontSize: '16px'
  })
  .setSpacing({
    small: '8px',
    medium: '16px'
  })
  .build();
```

## 4. 错误处理

### 4.1 错误类型设计

**错误类层次**：
```typescript
// ✅ 清晰的错误类层次
class ChipsError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ChipsError';
  }
}

class FileNotFoundError extends ChipsError {
  constructor(path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND');
    this.name = 'FileNotFoundError';
  }
}

class ParseError extends ChipsError {
  constructor(message: string, public line?: number) {
    super(message, 'PARSE_ERROR');
    this.name = 'ParseError';
  }
}

class ValidationError extends ChipsError {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
```

### 4.2 错误处理模式

**捕获特定错误**：
```javascript
// ✅ 处理特定错误类型
try {
  const card = await chips.loadCard('card.card');
} catch (error) {
  if (error instanceof FileNotFoundError) {
    console.error('文件不存在:', error.path);
  } else if (error instanceof ParseError) {
    console.error('解析错误:', error.message, 'at line', error.line);
  } else {
    console.error('未知错误:', error);
  }
}
```

**错误恢复**：
```javascript
// ✅ 提供错误恢复机制
const card = await chips.loadCard('card.card').catch(error => {
  console.warn('加载失败,使用默认卡片', error);
  return chips.createCard({ type: 'richtext' });
});
```

## 5. 文档和示例

### 5.1 JSDoc 注释

**完整的文档注释**：
```typescript
/**
 * 加载卡片文件
 * 
 * @param path - 卡片文件路径,支持本地路径、URL 或 File 对象
 * @param options - 加载选项
 * @param options.cache - 是否使用缓存,默认 true
 * @param options.validate - 是否验证卡片数据,默认 true
 * @returns Promise<Card> 解析后的卡片对象
 * @throws {FileNotFoundError} 文件不存在时抛出
 * @throws {ParseError} 解析失败时抛出
 * @throws {ValidationError} 验证失败时抛出
 * 
 * @example
 * // 加载本地文件
 * const card = await chips.loadCard('card.card');
 * 
 * @example
 * // 从 URL 加载
 * const card = await chips.loadCard('https://example.com/card.card');
 * 
 * @example
 * // 禁用缓存
 * const card = await chips.loadCard('card.card', { cache: false });
 */
async loadCard(
  path: string | File,
  options?: LoadOptions
): Promise<Card>
```

### 5.2 代码示例

**完整的使用示例**：
```javascript
// ✅ 提供完整、可运行的示例

// 示例 1: 基础使用
import ChipsSDK from '@chips/sdk';

const chips = new ChipsSDK();
const card = await chips.loadCard('card.card');
await chips.renderCard(card, '#container');

// 示例 2: 自定义配置
const chips = new ChipsSDK({
  storage: 'indexeddb',
  cache: true,
  offline: true
});

// 示例 3: 错误处理
try {
  const card = await chips.loadCard('card.card');
  await chips.renderCard(card, '#container', {
    theme: 'dark',
    onError: (error) => {
      console.error('渲染错误:', error);
    }
  });
} catch (error) {
  if (error instanceof FileNotFoundError) {
    console.error('文件不存在');
  }
}
```

## 6. 版本兼容

### 6.1 语义化版本

**遵循 SemVer**：
- **主版本号（Major）**：不兼容的 API 变更
- **次版本号（Minor）**：向后兼容的功能新增
- **修订号（Patch）**：向后兼容的 bug 修复

**版本标记**：
```javascript
// ✅ 标记 API 的状态
/**
 * @deprecated since v2.0.0, use createEditor() instead
 */
function initEditor() { }

/**
 * @experimental This API may change in future versions
 */
function experimentalFeature() { }

/**
 * @since v1.5.0
 */
function newFeature() { }
```

### 6.2 弃用策略

**渐进式弃用**：
```javascript
// ✅ 提供过渡期
// v1.x
chips.loadFile('card.card');  // 旧 API

// v2.0 - 同时支持两种 API
chips.loadFile('card.card');  // 仍可用,但有警告
chips.loadCard('card.card');  // 新 API

// v3.0 - 移除旧 API
chips.loadCard('card.card');  // 唯一方式
```

**警告信息**：
```javascript
// ✅ 清晰的弃用警告
console.warn(
  'chips.loadFile() is deprecated and will be removed in v3.0. ' +
  'Use chips.loadCard() instead. ' +
  'See https://chips.dev/migration-guide for details.'
);
```

## 7. 跨语言考虑

### 7.1 命名约定

**语言特定的命名风格**：
```javascript
// JavaScript/TypeScript - camelCase
chips.loadCard()
chips.createEditor()

// Python - snake_case
chips.load_card()
chips.create_editor()

// Swift - camelCase
chips.loadCard()
chips.createEditor()

// Kotlin - camelCase
chips.loadCard()
chips.createEditor()
```

### 7.2 API 映射

**保持概念一致**：
```javascript
// JavaScript
await chips.renderCard(card, container, options)

// Python
await chips.render_card(card, container, options)

// Swift
await chips.renderCard(card: card, in: container, options: options)

// Kotlin
chips.renderCard(card, container, options)
```

## 8. 测试友好

### 8.1 依赖注入

**便于测试**：
```javascript
// ✅ 支持依赖注入
const chips = new ChipsSDK({
  fileSystem: mockFileSystem,  // 注入 mock 对象
  network: mockNetwork
});
```

### 8.2 Mock 支持

**提供 Mock 工具**：
```javascript
// ✅ SDK 提供 mock 工具
import { createMockChips, mockCard } from '@chips/sdk/testing';

const chips = createMockChips();
const card = mockCard({ type: 'richtext' });

// 测试代码
await chips.renderCard(card, container);
expect(container.innerHTML).toContain('...');
```

## 9. 总结

Chips SDK 的 API 设计遵循以下核心原则：

**设计原则总结**：
1. ✅ **简洁优先**：常见操作简单易用
2. ✅ **一致为王**：相似操作相似 API
3. ✅ **类型安全**：完整的 TypeScript 支持
4. ✅ **错误友好**：清晰的错误信息和处理
5. ✅ **性能导向**：默认优化,可选配置
6. ✅ **文档完善**：详细的文档和示例
7. ✅ **向后兼容**：渐进式演进,平滑升级
8. ✅ **跨平台**：统一的 API，多语言绑定支持（JS/Python/Swift等），系统统一的多语言方案

通过遵循这些原则,Chips SDK 为开发者提供了优秀的开发体验,让集成变得简单而愉快。

**设计目标实现**：
- 🎯 新手几分钟上手
- 🚀 老手发挥最大效率
- 📚 文档即是最好的教程
- 🔧 灵活满足各种需求
- 🛡️ 安全避免常见错误
