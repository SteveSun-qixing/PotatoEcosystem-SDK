# API参考

本文档提供 Chips SDK 所有公开 API 的详细参考。

## 1. ChipsSDK 主类

```typescript
class ChipsSDK {
  constructor(options?: SDKOptions);
  
  // 文件操作
  loadCard(path: string, options?: LoadOptions): Promise<Card>;
  saveCard(card: Card, path: string, options?: SaveOptions): Promise<void>;
  
  // 渲染
  renderCard(card: Card, container: HTMLElement, options?: RenderOptions): Promise<void>;
  renderBox(box: Box, container: HTMLElement, options?: BoxRenderOptions): Promise<void>;
  
  // 编辑
  createEditor(container: HTMLElement, options?: EditorOptions): IEditor;
  
  // 主题
  loadTheme(theme: string | Theme): void;
  setTheme(themeId: string): void;
  
  // 插件
  use(plugin: Plugin | Plugin[]): void;
  unuse(pluginId: string): void;
  
  // 事件
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, ...args: any[]): void;
}
```

## 2. 类型定义

### 2.1 Card

```typescript
interface Card {
  id: string;
  type: CardType;
  version: string;
  metadata: CardMetadata;
  content: any;
  children?: Card[];
}
```

### 2.2 RenderOptions

```typescript
interface RenderOptions {
  theme?: string | Theme;
  readOnly?: boolean;
  interactive?: boolean;
  animations?: boolean;
}
```

## 3. 错误类型

```typescript
class ChipsError extends Error {}
class FileNotFoundError extends ChipsError {}
class ParseError extends ChipsError {}
class ValidationError extends ChipsError {}
```

完整的 API 参考请访问在线文档：https://chips.dev/docs/api
