# RendererEngine API参考

`RendererEngine`负责卡片和箱子的渲染，支持多种渲染器、主题和渲染选项。

## 类型定义

```typescript
class RendererEngine {
  constructor(logger: Logger, eventBus?: EventBus);
  
  render(card: Card, container: HTMLElement, options?: RenderOptions): Promise<RenderResult>;
}
```

---

## 构造函数

### `constructor(logger, eventBus?)`

创建渲染引擎实例。

**参数:**
- `logger: Logger` - 日志记录器
- `eventBus?: EventBus` - 事件总线（可选）

**示例:**
```typescript
import { RendererEngine, Logger, EventBus } from '@chips/sdk';

const logger = new Logger();
const eventBus = new EventBus();
const renderer = new RendererEngine(logger, eventBus);
```

---

## 方法详解

### `render(card, container, options?)`

渲染卡片到指定容器。

**参数:**
- `card: Card` - 卡片对象
- `container: HTMLElement` - 容器元素
- `options?: RenderOptions` - 渲染选项

**返回:** `Promise<RenderResult>` - 渲染结果

**选项:**
```typescript
interface RenderOptions {
  theme?: string;           // 主题ID
  readOnly?: boolean;       // 只读模式，默认false
  interactive?: boolean;    // 交互模式，默认true
  animations?: boolean;     // 启用动画，默认true
  responsive?: boolean;     // 响应式布局，默认true
  lazyLoad?: boolean;       // 懒加载，默认false
  virtualScroll?: boolean;  // 虚拟滚动，默认false
}
```

**返回类型:**
```typescript
interface RenderResult {
  element: HTMLElement;  // 渲染的DOM元素
  destroy: () => void;   // 销毁渲染结果的函数
}
```

**事件:**
- `render:start` - 开始渲染
- `render:complete` - 渲染完成
- `render:error` - 渲染错误

**示例:**
```typescript
// 基础渲染
const container = document.getElementById('app');
const result = await renderer.render(card, container);

// 使用选项
const result = await renderer.render(card, container, {
  theme: 'dark',
  readOnly: true,
  animations: true,
  responsive: true
});

// 销毁渲染结果
result.destroy();
```

---

## 渲染选项详解

### theme (主题)

设置渲染使用的主题。

```typescript
// 使用内置主题
await renderer.render(card, container, {
  theme: 'light'  // 或 'dark'
});

// 使用自定义主题
await renderer.render(card, container, {
  theme: 'custom-theme'
});
```

### readOnly (只读模式)

在只读模式下，卡片内容不可编辑。

```typescript
// 只读模式（预览）
await renderer.render(card, container, {
  readOnly: true
});

// 可编辑模式
await renderer.render(card, container, {
  readOnly: false
});
```

### interactive (交互模式)

控制卡片是否响应用户交互。

```typescript
// 启用交互
await renderer.render(card, container, {
  interactive: true
});

// 禁用交互（静态显示）
await renderer.render(card, container, {
  interactive: false
});
```

### animations (动画)

控制是否启用渲染动画和过渡效果。

```typescript
// 启用动画
await renderer.render(card, container, {
  animations: true
});

// 禁用动画（提高性能）
await renderer.render(card, container, {
  animations: false
});
```

### responsive (响应式)

启用响应式布局适配不同屏幕尺寸。

```typescript
// 响应式布局
await renderer.render(card, container, {
  responsive: true
});

// 固定布局
await renderer.render(card, container, {
  responsive: false
});
```

### lazyLoad (懒加载)

延迟加载卡片资源以提高初始渲染速度。

```typescript
// 启用懒加载
await renderer.render(card, container, {
  lazyLoad: true
});
```

### virtualScroll (虚拟滚动)

对于包含大量内容的卡片，启用虚拟滚动以提高性能。

```typescript
// 启用虚拟滚动
await renderer.render(card, container, {
  virtualScroll: true
});
```

---

## 完整使用示例

### 示例1: 基础渲染

```typescript
import { RendererEngine, Logger } from '@chips/sdk';

async function basicRender() {
  const logger = new Logger();
  const renderer = new RendererEngine(logger);
  
  // 获取容器
  const container = document.getElementById('card-container');
  
  // 渲染卡片
  const result = await renderer.render(card, container);
  
  console.log('Card rendered:', result.element);
  
  // 稍后销毁
  setTimeout(() => {
    result.destroy();
  }, 5000);
}
```

### 示例2: 主题切换

```typescript
async function renderWithTheme() {
  const container = document.getElementById('app');
  
  // 渲染浅色主题
  let result = await renderer.render(card, container, {
    theme: 'light'
  });
  
  // 3秒后切换到深色主题
  setTimeout(async () => {
    result.destroy();
    result = await renderer.render(card, container, {
      theme: 'dark'
    });
  }, 3000);
}
```

### 示例3: 预览模式

```typescript
async function renderPreview() {
  const container = document.getElementById('preview');
  
  // 只读预览模式
  const result = await renderer.render(card, container, {
    readOnly: true,
    interactive: true,   // 允许滚动和缩放
    animations: true,    // 启用动画
    responsive: true     // 响应式布局
  });
}
```

### 示例4: 性能优化渲染

```typescript
async function renderOptimized() {
  const container = document.getElementById('app');
  
  // 性能优化配置
  const result = await renderer.render(card, container, {
    animations: false,      // 禁用动画
    lazyLoad: true,        // 懒加载资源
    virtualScroll: true    // 虚拟滚动
  });
  
  console.log('Optimized render complete');
}
```

### 示例5: 事件监听

```typescript
async function renderWithEvents() {
  const logger = new Logger();
  const eventBus = new EventBus();
  const renderer = new RendererEngine(logger, eventBus);
  
  // 监听渲染事件
  eventBus.on('render:start', (card) => {
    console.log('Rendering started:', card.metadata.name);
  });
  
  eventBus.on('render:complete', (card) => {
    console.log('Rendering completed:', card.metadata.name);
  });
  
  eventBus.on('render:error', (error) => {
    console.error('Rendering failed:', error);
  });
  
  // 渲染卡片
  const container = document.getElementById('app');
  const result = await renderer.render(card, container);
}
```

### 示例6: 批量渲染

```typescript
async function renderMultipleCards() {
  const cards = await sdk.loadCards(['card1.card', 'card2.card', 'card3.card']);
  const container = document.getElementById('cards-container');
  
  const results = [];
  
  for (const card of cards) {
    // 为每个卡片创建独立容器
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-wrapper';
    container.appendChild(cardContainer);
    
    // 渲染卡片
    const result = await renderer.render(card, cardContainer, {
      theme: 'light',
      responsive: true,
      animations: true
    });
    
    results.push(result);
  }
  
  console.log(`Rendered ${results.length} cards`);
  
  // 销毁所有渲染结果
  const destroyAll = () => {
    results.forEach(result => result.destroy());
  };
}
```

### 示例7: 响应式渲染

```typescript
async function responsiveRender() {
  const container = document.getElementById('app');
  
  // 检测屏幕尺寸
  const isMobile = window.innerWidth < 768;
  
  // 根据设备类型调整选项
  const result = await renderer.render(card, container, {
    responsive: true,
    animations: !isMobile,      // 移动设备禁用动画
    lazyLoad: isMobile,         // 移动设备启用懒加载
    virtualScroll: isMobile     // 移动设备启用虚拟滚动
  });
  
  // 监听窗口大小变化
  window.addEventListener('resize', async () => {
    const nowMobile = window.innerWidth < 768;
    if (isMobile !== nowMobile) {
      // 重新渲染
      result.destroy();
      await responsiveRender();
    }
  });
}
```

---

## 渲染结果管理

### RenderResult 对象

```typescript
interface RenderResult {
  element: HTMLElement;  // 渲染的根元素
  destroy: () => void;   // 清理函数
}
```

### 使用渲染结果

```typescript
async function manageRenderResult() {
  const container = document.getElementById('app');
  const result = await renderer.render(card, container);
  
  // 访问渲染的元素
  console.log('Rendered element:', result.element);
  console.log('Element ID:', result.element.dataset.cardId);
  
  // 修改样式
  result.element.style.border = '1px solid #ccc';
  result.element.style.borderRadius = '8px';
  
  // 添加事件监听
  result.element.addEventListener('click', () => {
    console.log('Card clicked');
  });
  
  // 销毁渲染结果
  result.destroy();
}
```

---

## 错误处理

```typescript
async function renderWithErrorHandling() {
  const container = document.getElementById('app');
  
  try {
    const result = await renderer.render(card, container, {
      theme: 'dark'
    });
    
    console.log('Render successful');
    
  } catch (error) {
    console.error('Render failed:', error);
    
    // 显示错误消息
    container.innerHTML = `
      <div class="error">
        <h3>渲染失败</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}
```

---

## DOM 结构

渲染后的DOM结构：

```html
<div class="chips-card" data-card-id="card-123" data-theme="light">
  <div class="chips-base-card" data-base-card-id="base-1" data-card-type="text">
    <!-- 基础卡片内容 -->
  </div>
  <div class="chips-base-card" data-base-card-id="base-2" data-card-type="image">
    <!-- 基础卡片内容 -->
  </div>
  <!-- 更多基础卡片... -->
</div>
```

### 样式类

- `.chips-card` - 卡片容器
- `.chips-base-card` - 基础卡片容器
- `[data-card-id]` - 卡片ID
- `[data-theme]` - 主题标识
- `[data-card-type]` - 基础卡片类型

---

## 性能优化建议

1. **禁用不需要的功能**: 对于静态展示，禁用animations和interactive
2. **使用懒加载**: 对于包含大量资源的卡片启用lazyLoad
3. **虚拟滚动**: 对于长列表内容启用virtualScroll
4. **批量渲染**: 使用DocumentFragment减少DOM操作
5. **及时销毁**: 调用destroy()清理不再需要的渲染结果

---

## 最佳实践

### 1. 始终处理错误

```typescript
try {
  const result = await renderer.render(card, container);
} catch (error) {
  // 处理错误
  logger.error('Render failed', error);
}
```

### 2. 及时清理资源

```typescript
const result = await renderer.render(card, container);

// 使用完后销毁
window.addEventListener('beforeunload', () => {
  result.destroy();
});
```

### 3. 根据场景选择选项

```typescript
// 预览场景
const previewOptions = {
  readOnly: true,
  interactive: true,
  animations: true
};

// 编辑场景
const editOptions = {
  readOnly: false,
  interactive: true,
  animations: false  // 编辑时禁用动画提高性能
};

// 移动设备
const mobileOptions = {
  responsive: true,
  lazyLoad: true,
  animations: false
};
```

### 4. 使用事件追踪渲染状态

```typescript
eventBus.on('render:start', () => {
  showLoadingSpinner();
});

eventBus.on('render:complete', () => {
  hideLoadingSpinner();
});

eventBus.on('render:error', (error) => {
  showErrorMessage(error);
});
```

---

## 相关文档

- [ChipsSDK 文档](./ChipsSDK.md)
- [ThemeManager 文档](./ThemeManager.md)
- [渲染指南](../guides/rendering.md)
- [性能优化](../best-practices/performance.md)
