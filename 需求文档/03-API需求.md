# SDK - API需求

**版本**: 1.0.0  
**更新日期**: 2026-01-31  
**状态**: 正式版

---

## 1. API设计原则

### 1.1 核心原则

**简洁优先**: API 应该简单直观,常见操作只需一行代码
**类型安全**: 提供完整的 TypeScript 类型定义
**异步优先**: 所有 I/O 操作返回 Promise
**一致性**: 统一的命名风格和参数顺序
**可扩展**: 支持选项参数和未来扩展

### 1.2 命名规范

**类名**: PascalCase (例: `ChipsSDK`, `FileAPI`)
**方法名**: camelCase (例: `loadCard`, `saveCard`)
**属性名**: camelCase (例: `metadata`, `config`)
**常量**: UPPER_SNAKE_CASE (例: `DEFAULT_THEME`)
**私有成员**: 前缀 `_` (例: `_core`, `_config`)

### 1.3 参数设计

**必需参数**: 直接作为函数参数
**可选参数**: 通过 options 对象传递
**回调函数**: 使用 Promise 代替回调
**默认值**: 提供合理的默认值

---

## 2. ChipsSDK 主类 API

### 2.1 构造函数

```typescript
class ChipsSDK {
  constructor(options?: SDKOptions);
}

interface SDKOptions {
  // Core 连接配置
  core?: {
    url?: string;           // Core 服务地址
    timeout?: number;       // 连接超时(ms)
  };
  
  // 日志配置
  debug?: boolean;          // 是否启用调试模式
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  // 多语言配置
  i18n?: {
    defaultLanguage?: string;
    fallbackLanguage?: string;
  };
  
  // 缓存配置
  cache?: {
    enabled?: boolean;
    maxSize?: number;       // 最大缓存大小(字节)
    ttl?: number;           // 缓存过期时间(秒)
  };
  
  // 渲染配置
  renderer?: {
    lazyLoad?: boolean;     // 是否启用懒加载
    virtualScroll?: boolean; // 是否启用虚拟滚动
  };
}
```

**示例**:
```typescript
const sdk = new ChipsSDK({
  debug: true,
  i18n: {
    defaultLanguage: 'zh-CN'
  },
  cache: {
    enabled: true,
    maxSize: 100 * 1024 * 1024  // 100MB
  }
});
```

### 2.2 初始化相关

```typescript
// 初始化 SDK
async initialize(): Promise<void>

// 检查是否已初始化
get isInitialized(): boolean

// 检查是否准备就绪
get isReady(): boolean

// 销毁 SDK 实例
async destroy(): Promise<void>
```

### 2.3 文件操作快捷方法

```typescript
// 加载卡片
async loadCard(path: string, options?: LoadOptions): Promise<Card>

// 保存卡片
async saveCard(card: Card, path: string, options?: SaveOptions): Promise<void>

// 批量加载卡片
async loadCards(paths: string[]): Promise<Card[]>

// 导出为 Blob
async saveCardAsBlob(card: Card): Promise<Blob>

// 加载箱子
async loadBox(path: string, options?: LoadOptions): Promise<Box>

// 保存箱子
async saveBox(box: Box, path: string, options?: SaveOptions): Promise<void>
```

### 2.4 渲染相关

```typescript
// 渲染卡片
async renderCard(
  card: Card,
  container: string | HTMLElement,
  options?: RenderOptions
): Promise<RenderInstance>

// 渲染箱子
async renderBox(
  box: Box,
  container: string | HTMLElement,
  options?: RenderOptions
): Promise<RenderInstance>

// 销毁渲染
async destroyRender(instance: RenderInstance): Promise<void>
```

### 2.5 插件相关

```typescript
// 注册插件
async registerPlugin(plugin: Plugin): Promise<void>

// 获取插件
getPlugin(id: string): Plugin | undefined

// 列出插件
listPlugins(filter?: PluginFilter): Plugin[]

// 启用插件
async enablePlugin(id: string): Promise<void>

// 禁用插件
async disablePlugin(id: string): Promise<void>
```

### 2.6 主题相关

```typescript
// 设置主题
setTheme(themeId: string): void

// 注册主题
registerTheme(theme: Theme): void

// 获取主题
getTheme(id: string): Theme | undefined

// 列出主题
listThemes(): Theme[]

// 获取当前主题
get currentTheme(): Theme
```

### 2.7 事件相关

```typescript
// 监听事件
on(event: string, handler: EventHandler): void

// 监听一次
once(event: string, handler: EventHandler): void

// 取消监听
off(event: string, handler?: EventHandler): void

// 触发事件
emit(event: string, data?: any): void
```

### 2.8 访问器属性

```typescript
// 访问各个 API 模块
get file(): FileAPI
get card(): CardAPI
get box(): BoxAPI
get renderer(): RendererEngine
get plugin(): PluginSystem
get theme(): ThemeManager
get resource(): ResourceManager
get event(): EventBus
get config(): ConfigManager
get i18n(): I18nManager
get logger(): Logger
```

---

## 3. FileAPI

### 3.1 卡片文件操作

```typescript
class FileAPI {
  // 加载卡片
  async loadCard(
    path: string,
    options?: LoadOptions
  ): Promise<Card>
  
  // 保存卡片
  async saveCard(
    card: Card,
    path: string,
    options?: SaveOptions
  ): Promise<void>
  
  // 批量加载
  async loadCards(paths: string[]): Promise<Card[]>
  
  // 导出为 Blob
  async saveCardAsBlob(card: Card): Promise<Blob>
  
  // 验证卡片文件
  async validateCard(path: string): Promise<ValidationResult>
}

interface LoadOptions {
  cache?: boolean;          // 是否使用缓存
  verify?: boolean;         // 是否验证文件
  loadResources?: boolean;  // 是否预加载资源
}

interface SaveOptions {
  overwrite?: boolean;      // 是否覆盖已存在文件
  compress?: boolean;       // 是否压缩(默认false,使用ZIP存储模式)
  verify?: boolean;         // 保存后是否验证
}

interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}
```

### 3.2 箱子文件操作

```typescript
class FileAPI {
  // 加载箱子
  async loadBox(
    path: string,
    options?: LoadOptions
  ): Promise<Box>
  
  // 保存箱子
  async saveBox(
    box: Box,
    path: string,
    options?: SaveOptions
  ): Promise<void>
  
  // 验证箱子文件
  async validateBox(path: string): Promise<ValidationResult>
}
```

---

## 4. CardAPI

### 4.1 卡片操作

```typescript
class CardAPI {
  // 创建卡片
  create(type: string, config?: any): Card
  
  // 克隆卡片
  clone(card: Card): Card
  
  // 比较卡片
  equals(card1: Card, card2: Card): boolean
  
  // 合并卡片
  merge(target: Card, source: Card): Card
}
```

### 4.2 元数据操作

```typescript
class CardAPI {
  // 获取元数据
  getMetadata(card: Card): CardMetadata
  
  // 更新元数据
  setMetadata(card: Card, metadata: Partial<CardMetadata>): void
  
  // 获取标签
  getTags(card: Card): Tag[]
  
  // 添加标签
  addTag(card: Card, tag: Tag): void
  
  // 移除标签
  removeTag(card: Card, tag: Tag): void
}
```

### 4.3 内容操作

```typescript
class CardAPI {
  // 获取结构
  getStructure(card: Card): CardStructure
  
  // 添加基础卡片
  addBaseCard(
    card: Card,
    type: string,
    config: any,
    position?: number
  ): string  // 返回基础卡片ID
  
  // 移除基础卡片
  removeBaseCard(card: Card, baseCardId: string): void
  
  // 更新基础卡片
  updateBaseCard(
    card: Card,
    baseCardId: string,
    config: Partial<any>
  ): void
  
  // 重排基础卡片
  reorderBaseCards(card: Card, order: string[]): void
}
```

### 4.4 资源操作

```typescript
class CardAPI {
  // 添加资源
  async addResource(
    card: Card,
    file: File | Blob | ArrayBuffer,
    path: string
  ): Promise<string>  // 返回资源路径
  
  // 移除资源
  async removeResource(card: Card, path: string): Promise<void>
  
  // 列出资源
  listResources(card: Card): ResourceInfo[]
  
  // 获取资源
  async getResource(
    card: Card,
    path: string
  ): Promise<Blob | ArrayBuffer>
}

interface ResourceInfo {
  path: string;
  size: number;
  type: string;
  checksum?: string;
}
```

---

## 5. BoxAPI

### 5.1 箱子操作

```typescript
class BoxAPI {
  // 创建箱子
  create(name: string, layout: string, config?: any): Box
  
  // 克隆箱子
  clone(box: Box): Box
}
```

### 5.2 元数据操作

```typescript
class BoxAPI {
  // 获取元数据
  getMetadata(box: Box): BoxMetadata
  
  // 更新元数据
  setMetadata(box: Box, metadata: Partial<BoxMetadata>): void
  
  // 获取标签
  getTags(box: Box): Tag[]
  
  // 添加标签
  addTag(box: Box, tag: Tag): void
  
  // 移除标签
  removeTag(box: Box, tag: Tag): void
}
```

### 5.3 卡片管理

```typescript
class BoxAPI {
  // 添加卡片
  async addCard(
    box: Box,
    card: Card | string,  // Card对象或路径
    mode: 'copy' | 'move' | 'reference',
    position?: number
  ): Promise<void>
  
  // 移除卡片
  removeCard(box: Box, cardId: string): void
  
  // 重排卡片
  reorderCards(box: Box, order: string[]): void
  
  // 列出卡片
  listCards(box: Box): BoxCardInfo[]
  
  // 获取卡片
  async getCard(box: Box, cardId: string): Promise<Card>
}

interface BoxCardInfo {
  id: string;
  location: 'internal' | 'external';
  path: string;
  filename: string;
  metadata?: CardMetadata;  // 缓存的元数据
}
```

### 5.4 布局管理

```typescript
class BoxAPI {
  // 获取当前布局
  getLayout(box: Box): string
  
  // 切换布局
  setLayout(box: Box, layoutId: string): void
  
  // 获取布局配置
  getLayoutConfig(box: Box, layoutId?: string): any
  
  // 设置布局配置
  setLayoutConfig(box: Box, config: any, layoutId?: string): void
  
  // 列出可用布局
  listAvailableLayouts(): LayoutInfo[]
}

interface LayoutInfo {
  id: string;
  name: string;
  description: string;
  configSchema: JSONSchema;
}
```

---

## 6. RendererEngine

### 6.1 渲染方法

```typescript
class RendererEngine {
  // 渲染卡片
  async renderCard(
    card: Card,
    container: string | HTMLElement,
    options?: RenderOptions
  ): Promise<RenderInstance>
  
  // 渲染箱子
  async renderBox(
    box: Box,
    container: string | HTMLElement,
    options?: RenderOptions
  ): Promise<RenderInstance>
  
  // 销毁渲染
  async destroy(instance: RenderInstance): Promise<void>
  
  // 更新渲染
  async update(instance: RenderInstance, data: any): Promise<void>
}

interface RenderOptions {
  // 主题
  theme?: string;
  
  // 模式
  mode?: 'view' | 'edit' | 'preview';
  readOnly?: boolean;
  interactive?: boolean;
  
  // 性能
  lazyLoad?: boolean;
  virtualScroll?: boolean;
  animations?: boolean;
  
  // 布局(仅箱子)
  layout?: string;
  layoutConfig?: any;
  
  // 其他
  className?: string;
  style?: CSSProperties;
  attributes?: Record<string, string>;
}

interface RenderInstance {
  id: string;
  type: 'card' | 'box';
  container: HTMLElement;
  getState(): any;
  setState(state: any): void;
  destroy(): Promise<void>;
}
```

---

## 7. PluginSystem

### 7.1 插件管理

```typescript
class PluginSystem {
  // 注册插件
  async register(plugin: Plugin): Promise<void>
  
  // 卸载插件
  async unregister(id: string): Promise<void>
  
  // 获取插件
  get(id: string): Plugin | undefined
  
  // 列出插件
  list(filter?: PluginFilter): Plugin[]
  
  // 启用插件
  async enable(id: string): Promise<void>
  
  // 禁用插件
  async disable(id: string): Promise<void>
  
  // 检查插件状态
  isEnabled(id: string): boolean
}

interface PluginFilter {
  type?: 'base_card' | 'layout' | 'theme' | 'tool';
  enabled?: boolean;
  publisher?: string;
}

interface Plugin {
  metadata: PluginMetadata;
  initialize?(context: PluginContext): Promise<void>;
  enable?(context: PluginContext): Promise<void>;
  disable?(context: PluginContext): Promise<void>;
  destroy?(): Promise<void>;
}

interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  type: string;
  description?: string;
  author?: string;
  publisher?: string;
  icon?: string;
}

interface PluginContext {
  sdk: ChipsSDK;
  config: any;
  logger: Logger;
}
```

---

## 8. ThemeManager

### 8.1 主题管理

```typescript
class ThemeManager {
  // 注册主题
  register(theme: Theme): void
  
  // 应用主题
  apply(themeId: string): void
  
  // 获取主题
  get(id: string): Theme | undefined
  
  // 列出主题
  list(): Theme[]
  
  // 获取当前主题
  get current(): Theme
  
  // 获取主题变量
  getVariable(name: string): string | undefined
  
  // 设置主题变量(临时覆盖)
  setVariable(name: string, value: string): void
  
  // 重置主题变量
  resetVariables(): void
}

interface Theme {
  metadata: ThemeMetadata;
  variables: ThemeVariables;
  components?: ComponentStyles;
  customCSS?: string;
}

interface ThemeMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  preview?: string;
}

interface ThemeVariables {
  colors?: Record<string, string>;
  typography?: Record<string, string | number>;
  spacing?: Record<string, string>;
  [key: string]: any;
}
```

---

## 9. ResourceManager

### 9.1 资源访问

```typescript
class ResourceManager {
  // 加载资源
  async load(uri: string): Promise<Blob | ArrayBuffer>
  
  // 解析URI
  resolve(uri: string, baseUri?: string): string
  
  // 检查资源是否存在
  async exists(uri: string): Promise<boolean>
  
  // 获取资源信息
  async getInfo(uri: string): Promise<ResourceInfo>
  
  // 预加载资源
  async preload(uris: string[]): Promise<void>
}
```

### 9.2 缓存管理

```typescript
class ResourceManager {
  // 缓存资源
  cache(uri: string, data: Blob | ArrayBuffer): void
  
  // 获取缓存
  getCached(uri: string): Blob | ArrayBuffer | undefined
  
  // 清除缓存
  clearCache(uri?: string): void
  
  // 获取缓存大小
  getCacheSize(): number
}
```

---

## 10. EventBus

### 10.1 事件操作

```typescript
class EventBus {
  // 监听事件
  on(event: string, handler: EventHandler): void
  
  // 监听一次
  once(event: string, handler: EventHandler): void
  
  // 取消监听
  off(event: string, handler?: EventHandler): void
  
  // 触发事件
  emit(event: string, data?: any): void
  
  // 异步触发
  async emitAsync(event: string, data?: any): Promise<void>
  
  // 列出监听器
  listeners(event: string): EventHandler[]
}

type EventHandler = (data: any) => void | Promise<void>
```

---

## 11. ConfigManager

### 11.1 配置操作

```typescript
class ConfigManager {
  // 获取配置
  get<T = any>(key: string, defaultValue?: T): T
  
  // 设置配置
  set(key: string, value: any): void
  
  // 检查配置是否存在
  has(key: string): boolean
  
  // 删除配置
  delete(key: string): void
  
  // 重置配置
  reset(key?: string): void
  
  // 获取所有配置
  getAll(): Record<string, any>
  
  // 监听配置变化
  watch(key: string, handler: ConfigChangeHandler): void
}

type ConfigChangeHandler = (newValue: any, oldValue: any) => void
```

---

## 12. I18nManager

### 12.1 语言管理

```typescript
class I18nManager {
  // 切换语言
  setLanguage(lang: string): void
  
  // 获取当前语言
  get currentLanguage(): string
  
  // 列出支持的语言
  getSupportedLanguages(): string[]
  
  // 翻译文本
  t(key: string, vars?: Record<string, any>): string
  
  // 格式化日期
  formatDate(date: Date, format?: string): string
  
  // 格式化数字
  formatNumber(num: number, options?: NumberFormatOptions): string
  
  // 格式化货币
  formatCurrency(amount: number, currency: string): string
}

interface NumberFormatOptions {
  style?: 'decimal' | 'percent';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}
```

---

## 13. Logger

### 13.1 日志记录

```typescript
class Logger {
  // 调试日志
  debug(message: string, data?: any): void
  
  // 信息日志
  info(message: string, data?: any): void
  
  // 警告日志
  warn(message: string, data?: any): void
  
  // 错误日志
  error(message: string, error?: Error, data?: any): void
  
  // 设置日志级别
  setLevel(level: LogLevel): void
  
  // 获取日志级别
  get level(): LogLevel
  
  // 启用/禁用日志
  enable(): void
  disable(): void
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
```

---

## 14. 数据类型定义

### 14.1 Card 类型

```typescript
interface Card {
  id: string;
  metadata: CardMetadata;
  structure: CardStructure;
  resources: Map<string, Blob | ArrayBuffer>;
}

interface CardMetadata {
  chip_standards_version: string;
  card_id: string;
  name: string;
  created_at: string;
  modified_at: string;
  theme?: string;
  tags?: Tag[];
  [key: string]: any;
}

interface CardStructure {
  structure: BaseCardInfo[];
  manifest: Manifest;
}

interface BaseCardInfo {
  id: string;
  type: string;
}

interface Manifest {
  card_count: number;
  resource_count: number;
  resources: ResourceInfo[];
}

type Tag = string | [string, ...string[]]
```

### 14.2 Box 类型

```typescript
interface Box {
  id: string;
  metadata: BoxMetadata;
  structure: BoxStructure;
  content: BoxContent;
}

interface BoxMetadata {
  chip_standards_version: string;
  box_id: string;
  name: string;
  created_at: string;
  modified_at: string;
  layout: string;
  tags?: Tag[];
  [key: string]: any;
}

interface BoxStructure {
  cards: BoxCardInfo[];
}

interface BoxContent {
  active_layout: string;
  layout_configs: Record<string, any>;
}
```

---

**文档维护者**: Chips 生态核心团队  
**反馈渠道**: 提交 Issue 到官方仓库
