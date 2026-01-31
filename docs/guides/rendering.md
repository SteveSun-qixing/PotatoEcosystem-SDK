# 渲染指南

本指南介绍如何使用Chips SDK渲染卡片，包括基础渲染、高级选项和最佳实践。

---

## 渲染基础

### 简单渲染

最简单的渲染方式：

```typescript
import { ChipsSDK } from '@chips/sdk';

const sdk = new ChipsSDK();

// 加载卡片
const card = await sdk.loadCard('card.card');

// 渲染到指定容器
await sdk.renderCard(card, '#container');
```

### 从路径直接渲染

SDK可以直接从文件路径加载并渲染：

```typescript
// 自动加载并渲染
await sdk.renderCard('card.card', '#container');
```

### 使用HTMLElement

可以直接传递HTMLElement而不是选择器：

```typescript
const container = document.getElementById('app');
await sdk.renderCard(card, container);
```

---

## 渲染选项

### 完整选项说明

```typescript
interface RenderOptions {
  theme?: string;           // 主题ID
  readOnly?: boolean;       // 只读模式
  interactive?: boolean;    // 交互模式
  animations?: boolean;     // 动画效果
  responsive?: boolean;     // 响应式布局
  lazyLoad?: boolean;       // 懒加载资源
  virtualScroll?: boolean;  // 虚拟滚动
}
```

### 主题选项

```typescript
// 使用浅色主题
await sdk.renderCard(card, container, {
  theme: 'light'
});

// 使用深色主题
await sdk.renderCard(card, container, {
  theme: 'dark'
});

// 使用自定义主题
await sdk.renderCard(card, container, {
  theme: 'custom-theme'
});
```

### 只读模式

在只读模式下，用户无法编辑卡片内容：

```typescript
// 预览模式（只读）
await sdk.renderCard(card, container, {
  readOnly: true
});

// 编辑模式
await sdk.renderCard(card, container, {
  readOnly: false
});
```

### 交互模式

控制卡片是否响应用户交互：

```typescript
// 完全交互
await sdk.renderCard(card, container, {
  interactive: true
});

// 静态展示（不响应交互）
await sdk.renderCard(card, container, {
  interactive: false
});
```

### 动画效果

```typescript
// 启用动画（默认）
await sdk.renderCard(card, container, {
  animations: true
});

// 禁用动画（提升性能）
await sdk.renderCard(card, container, {
  animations: false
});
```

### 响应式布局

```typescript
// 响应式布局（默认）
await sdk.renderCard(card, container, {
  responsive: true
});

// 固定布局
await sdk.renderCard(card, container, {
  responsive: false
});
```

### 懒加载

对于包含大量图片或资源的卡片，启用懒加载可以加快初始渲染：

```typescript
await sdk.renderCard(card, container, {
  lazyLoad: true
});
```

### 虚拟滚动

对于包含大量内容的长列表卡片，启用虚拟滚动可以显著提升性能：

```typescript
await sdk.renderCard(card, container, {
  virtualScroll: true
});
```

---

## 场景化配置

### 预览场景

```typescript
// 适合预览展示的配置
await sdk.renderCard(card, container, {
  readOnly: true,
  interactive: true,  // 允许滚动和缩放
  animations: true,
  responsive: true,
});
```

### 编辑场景

```typescript
// 适合编辑的配置
await sdk.renderCard(card, container, {
  readOnly: false,
  interactive: true,
  animations: false,  // 禁用动画提升编辑体验
  responsive: true,
});
```

### 移动端场景

```typescript
// 适合移动设备的配置
const isMobile = window.innerWidth < 768;

await sdk.renderCard(card, container, {
  readOnly: true,
  animations: !isMobile,      // 移动端禁用动画
  lazyLoad: isMobile,         // 移动端启用懒加载
  virtualScroll: isMobile,    // 移动端启用虚拟滚动
  responsive: true,
});
```

### 演示场景

```typescript
// 适合演示的配置
await sdk.renderCard(card, container, {
  readOnly: true,
  interactive: false,  // 禁用交互避免干扰
  animations: true,    // 启用动画使演示更生动
  responsive: true,
});
```

---

## 渲染生命周期

### 监听渲染事件

```typescript
// 监听渲染开始
sdk.on('render:start', (card) => {
  console.log('开始渲染:', card.metadata.name);
  showLoadingSpinner();
});

// 监听渲染完成
sdk.on('render:complete', (card) => {
  console.log('渲染完成:', card.metadata.name);
  hideLoadingSpinner();
});

// 监听渲染错误
sdk.on('render:error', (error) => {
  console.error('渲染失败:', error);
  hideLoadingSpinner();
  showErrorMessage('渲染失败，请重试');
});

// 执行渲染
await sdk.renderCard(card, container);
```

### 渲染结果管理

```typescript
// 获取渲染结果
const result = await sdk.rendererEngine.render(card, container);

// 访问渲染的DOM元素
console.log('渲染的元素:', result.element);

// 添加自定义样式
result.element.style.border = '1px solid #ccc';

// 添加事件监听
result.element.addEventListener('click', () => {
  console.log('卡片被点击');
});

// 销毁渲染结果
result.destroy();
```

---

## 多卡片渲染

### 顺序渲染

```typescript
const cards = await sdk.loadCards(['card1.card', 'card2.card', 'card3.card']);

for (const card of cards) {
  const container = document.createElement('div');
  container.className = 'card-container';
  document.body.appendChild(container);
  
  await sdk.renderCard(card, container);
}
```

### 并行渲染

```typescript
const cards = await sdk.loadCards(['card1.card', 'card2.card', 'card3.card']);

const promises = cards.map((card, index) => {
  const container = document.createElement('div');
  container.className = 'card-container';
  container.id = `card-${index}`;
  document.body.appendChild(container);
  
  return sdk.renderCard(card, container);
});

await Promise.all(promises);
```

---

## 样式定制

### 使用CSS变量

渲染后的卡片会应用主题的CSS变量：

```css
/* 自定义卡片样式 */
.chips-card {
  background: var(--chips-surface);
  border-radius: var(--chips-radius-md);
  box-shadow: var(--chips-shadow-sm);
  padding: calc(var(--chips-spacing-unit) * 2);
}

.chips-base-card {
  margin-bottom: var(--chips-spacing-unit);
}
```

### 自定义样式类

```typescript
// 渲染后添加自定义类
await sdk.renderCard(card, container);

const cardElement = container.querySelector('.chips-card');
cardElement?.classList.add('my-custom-card');
```

```css
.my-custom-card {
  max-width: 800px;
  margin: 0 auto;
  border: 2px solid #e0e0e0;
}
```

---

## 响应式渲染

### 响应屏幕尺寸

```typescript
function renderResponsive(card: Card) {
  const container = document.getElementById('app')!;
  const width = window.innerWidth;
  
  let options: RenderOptions;
  
  if (width < 576) {
    // 小屏幕（手机）
    options = {
      animations: false,
      lazyLoad: true,
      virtualScroll: true,
    };
  } else if (width < 992) {
    // 中等屏幕（平板）
    options = {
      animations: true,
      lazyLoad: false,
    };
  } else {
    // 大屏幕（桌面）
    options = {
      animations: true,
      lazyLoad: false,
    };
  }
  
  return sdk.renderCard(card, container, options);
}

// 监听窗口大小变化
let currentCard: Card;

window.addEventListener('resize', debounce(async () => {
  if (currentCard) {
    await renderResponsive(currentCard);
  }
}, 300));
```

---

## 性能优化

### 1. 按需渲染

只渲染可见的卡片：

```typescript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(async (entry) => {
    if (entry.isIntersecting) {
      const container = entry.target as HTMLElement;
      const cardPath = container.dataset.cardPath;
      
      if (cardPath) {
        await sdk.renderCard(cardPath, container);
        observer.unobserve(container);
      }
    }
  });
});

// 观察容器
document.querySelectorAll('.lazy-card-container').forEach(container => {
  observer.observe(container);
});
```

### 2. 复用渲染结果

```typescript
const renderedCards = new Map<string, RenderResult>();

async function renderCardCached(cardId: string, container: HTMLElement) {
  // 检查是否已渲染
  if (renderedCards.has(cardId)) {
    const result = renderedCards.get(cardId)!;
    container.appendChild(result.element);
    return result;
  }
  
  // 首次渲染
  const card = await sdk.loadCard(`${cardId}.card`);
  const result = await sdk.rendererEngine.render(card, container);
  renderedCards.set(cardId, result);
  
  return result;
}
```

### 3. 批量渲染优化

```typescript
async function renderCardsBatch(cards: Card[], batchSize = 5) {
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map((card, index) => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        return sdk.renderCard(card, container);
      })
    );
    
    // 给浏览器喘息的机会
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

---

## 错误处理

### 渲染错误处理

```typescript
async function safeRender(card: Card, container: HTMLElement) {
  try {
    await sdk.renderCard(card, container);
  } catch (error) {
    console.error('渲染失败:', error);
    
    // 显示错误UI
    container.innerHTML = `
      <div class="render-error">
        <h3>渲染失败</h3>
        <p>${error.message}</p>
        <button onclick="retry()">重试</button>
      </div>
    `;
  }
}
```

### 降级渲染

```typescript
async function renderWithFallback(card: Card, container: HTMLElement) {
  try {
    // 尝试完整渲染
    await sdk.renderCard(card, container, {
      animations: true,
      interactive: true,
    });
  } catch (error) {
    console.warn('完整渲染失败，尝试简化渲染');
    
    try {
      // 降级到简化渲染
      await sdk.renderCard(card, container, {
        animations: false,
        interactive: false,
      });
    } catch (fallbackError) {
      console.error('简化渲染也失败了');
      throw fallbackError;
    }
  }
}
```

---

## 最佳实践

### 1. 使用合适的渲染选项

根据场景选择合适的渲染选项，不要启用不需要的功能。

### 2. 监听渲染事件

通过事件监听提供更好的用户体验（加载状态、错误提示等）。

### 3. 及时销毁

不再需要的渲染结果应该及时调用`destroy()`方法清理。

### 4. 性能监控

在生产环境监控渲染性能：

```typescript
async function renderWithMonitoring(card: Card, container: HTMLElement) {
  const start = performance.now();
  
  try {
    await sdk.renderCard(card, container);
    
    const duration = performance.now() - start;
    console.log(`渲染耗时: ${duration.toFixed(2)}ms`);
    
    // 上报性能数据
    reportPerformance('card_render', duration);
  } catch (error) {
    // 上报错误
    reportError('card_render_failed', error);
    throw error;
  }
}
```

### 5. 响应式设计

确保渲染的卡片在不同设备上都有良好的显示效果。

---

## 相关文档

- [RendererEngine API](../api/RendererEngine.md)
- [ThemeManager API](../api/ThemeManager.md)
- [性能优化](../best-practices/performance.md)
- [最佳实践](../best-practices/)
