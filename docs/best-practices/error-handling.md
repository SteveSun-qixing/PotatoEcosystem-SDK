# 错误处理最佳实践

本文档提供Chips SDK中错误处理的最佳实践和模式。

---

## 错误类型

SDK定义了以下错误类型：

```typescript
// 基础错误类
class ChipsError extends Error {
  code: string;
  details?: any;
}

// 文件相关错误
class FileNotFoundError extends ChipsError {}
class InvalidFileFormatError extends ChipsError {}
class FileExistsError extends ChipsError {}
class PermissionError extends ChipsError {}

// 验证错误
class ValidationError extends ChipsError {}

// 渲染错误
class RenderError extends ChipsError {}

// 插件错误
class PluginError extends ChipsError {}
```

---

## 基本错误处理

### 1. 始终使用try-catch

```typescript
// ✅ 推荐
async function loadCard(path: string) {
  try {
    const card = await sdk.loadCard(path);
    return card;
  } catch (error) {
    console.error('Failed to load card:', error);
    throw error;  // 重新抛出或处理
  }
}

// ❌ 不推荐：不处理错误
async function loadCard(path: string) {
  const card = await sdk.loadCard(path);
  return card;
}
```

### 2. 具体的错误处理

```typescript
import { 
  FileNotFoundError, 
  InvalidFileFormatError,
  ValidationError 
} from '@chips/sdk';

async function loadCard(path: string) {
  try {
    return await sdk.loadCard(path);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      console.error('File not found:', path);
      // 显示友好的错误消息
      showError('文件不存在，请检查路径');
    } else if (error instanceof InvalidFileFormatError) {
      console.error('Invalid file format');
      showError('文件格式不正确');
    } else if (error instanceof ValidationError) {
      console.error('Validation failed:', error.details);
      showError('文件验证失败');
    } else {
      console.error('Unknown error:', error);
      showError('加载失败，请重试');
    }
    throw error;
  }
}
```

---

## Promise错误处理

### 1. 使用async/await

```typescript
// ✅ 推荐：使用async/await
async function processCard() {
  try {
    const card = await sdk.loadCard('card.card');
    await sdk.renderCard(card, container);
  } catch (error) {
    handleError(error);
  }
}

// ❌ 不推荐：Promise链容易遗漏错误
function processCard() {
  return sdk.loadCard('card.card')
    .then(card => sdk.renderCard(card, container));
  // 没有.catch()
}
```

### 2. Promise.all错误处理

```typescript
// ✅ 推荐：捕获任何一个失败
async function loadMultipleCards(paths: string[]) {
  try {
    const cards = await Promise.all(
      paths.map(path => sdk.loadCard(path))
    );
    return cards;
  } catch (error) {
    console.error('Failed to load some cards:', error);
    throw error;
  }
}

// ✅ 推荐：继续处理成功的Promise
async function loadMultipleCardsSafe(paths: string[]) {
  const results = await Promise.allSettled(
    paths.map(path => sdk.loadCard(path))
  );
  
  const successful = results
    .filter((r): r is PromiseFulfilledResult<Card> => r.status === 'fulfilled')
    .map(r => r.value);
  
  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason);
  
  if (failed.length > 0) {
    console.warn(`${failed.length} cards failed to load`);
  }
  
  return successful;
}
```

---

## 错误恢复

### 1. 重试机制

```typescript
async function loadCardWithRetry(
  path: string,
  maxRetries = 3,
  delay = 1000
): Promise<Card> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sdk.loadCard(path);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} retries: ${lastError!.message}`);
}
```

### 2. 降级策略

```typescript
async function renderCard(card: Card, container: HTMLElement) {
  try {
    // 尝试完整渲染
    await sdk.renderCard(card, container, {
      animations: true,
      interactive: true,
    });
  } catch (error) {
    console.warn('Full render failed, trying simple render:', error);
    
    try {
      // 降级到简单渲染
      await sdk.renderCard(card, container, {
        animations: false,
        interactive: false,
      });
    } catch (fallbackError) {
      console.error('Simple render also failed:', fallbackError);
      // 显示错误状态
      container.innerHTML = '<div class="error">渲染失败</div>';
    }
  }
}
```

### 3. 默认值

```typescript
async function loadCardOrDefault(path: string): Promise<Card> {
  try {
    return await sdk.loadCard(path);
  } catch (error) {
    console.warn('Failed to load card, using default:', error);
    
    // 返回默认卡片
    return {
      metadata: {
        card_id: 'default',
        name: 'Default Card',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0.0',
      },
      structure: { structure: [] },
      content: {},
      resources: {},
    };
  }
}
```

---

## 错误日志

### 1. 结构化日志

```typescript
function handleError(error: Error, context?: any) {
  sdk.logger.error('Operation failed', error, {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    ...context,
  });
}

// 使用
try {
  await sdk.loadCard(path);
} catch (error) {
  handleError(error as Error, {
    operation: 'loadCard',
    path: path,
  });
}
```

### 2. 错误上报

```typescript
class ErrorReporter {
  static async report(error: Error, context?: any) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ...context,
    };
    
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }
}

// 使用
try {
  await sdk.loadCard(path);
} catch (error) {
  await ErrorReporter.report(error as Error, {
    operation: 'loadCard',
    path: path,
  });
}
```

---

## 用户友好的错误消息

### 1. 错误消息映射

```typescript
const errorMessages: Record<string, string> = {
  FileNotFoundError: '文件不存在，请检查路径',
  InvalidFileFormatError: '文件格式不正确，请选择.card文件',
  ValidationError: '文件内容验证失败',
  PermissionError: '没有访问权限',
  NetworkError: '网络连接失败，请检查网络',
};

function getUserFriendlyMessage(error: Error): string {
  const errorType = error.constructor.name;
  return errorMessages[errorType] || '操作失败，请重试';
}

// 使用
try {
  await sdk.loadCard(path);
} catch (error) {
  const message = getUserFriendlyMessage(error as Error);
  showErrorToast(message);
}
```

### 2. 错误UI组件

```typescript
function showErrorDialog(error: Error) {
  const dialog = document.createElement('div');
  dialog.className = 'error-dialog';
  dialog.innerHTML = `
    <div class="error-content">
      <h3>操作失败</h3>
      <p>${getUserFriendlyMessage(error)}</p>
      <div class="error-actions">
        <button class="btn-retry">重试</button>
        <button class="btn-cancel">取消</button>
      </div>
    </div>
  `;
  
  dialog.querySelector('.btn-retry')?.addEventListener('click', () => {
    dialog.remove();
    retryLastOperation();
  });
  
  dialog.querySelector('.btn-cancel')?.addEventListener('click', () => {
    dialog.remove();
  });
  
  document.body.appendChild(dialog);
}
```

---

## 防御性编程

### 1. 输入验证

```typescript
async function loadCard(path: string | undefined) {
  // 验证输入
  if (!path) {
    throw new Error('Path is required');
  }
  
  if (typeof path !== 'string') {
    throw new Error('Path must be a string');
  }
  
  if (!path.endsWith('.card')) {
    throw new Error('Path must end with .card');
  }
  
  return await sdk.loadCard(path);
}
```

### 2. 空值检查

```typescript
async function renderCard(card: Card | null | undefined) {
  // 空值检查
  if (!card) {
    throw new Error('Card is required');
  }
  
  const container = document.querySelector('#container');
  
  if (!container) {
    throw new Error('Container not found');
  }
  
  return await sdk.renderCard(card, container as HTMLElement);
}
```

### 3. 边界检查

```typescript
function getBaseCard(card: Card, index: number) {
  if (index < 0 || index >= card.structure.structure.length) {
    throw new Error(`Index out of bounds: ${index}`);
  }
  
  return card.structure.structure[index];
}
```

---

## 全局错误处理

### 1. 未捕获的Promise rejection

```typescript
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // 报告错误
  ErrorReporter.report(event.reason);
  
  // 显示通用错误消息
  showErrorToast('发生了未知错误');
});
```

### 2. 全局错误处理器

```typescript
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // 报告错误
  ErrorReporter.report(event.error);
  
  // 防止默认行为
  event.preventDefault();
});
```

### 3. React Error Boundary

```typescript
import React from 'react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('React error:', error, errorInfo);
    ErrorReporter.report(error, { errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>出错了</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// 使用
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

## 错误处理检查清单

在编写代码时，确保：

- [ ] 所有async函数都有错误处理
- [ ] 所有Promise都有.catch()或try-catch
- [ ] 错误被适当记录
- [ ] 用户看到友好的错误消息
- [ ] 关键操作有重试机制
- [ ] 提供降级方案
- [ ] 输入参数有验证
- [ ] 空值有检查
- [ ] 设置全局错误处理器
- [ ] 错误被上报到监控系统

---

## 相关文档

- [API参考](../api/)
- [最佳实践总览](./README.md)
- [性能优化](./performance.md)
