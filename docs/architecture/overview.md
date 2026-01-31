# SDK架构概览

本文档描述Chips SDK的整体架构设计、模块组织和核心概念。

---

## 架构分层

Chips SDK采用分层架构设计，从下到上分为以下层次：

```
┌─────────────────────────────────────────┐
│          Application Layer              │  应用层
│         (用户代码)                       │
├─────────────────────────────────────────┤
│          SDK Layer                      │  SDK层
│         (ChipsSDK)                      │
├─────────────────────────────────────────┤
│          API Layer                      │  API层
│    FileAPI | RendererEngine | etc.     │
├─────────────────────────────────────────┤
│          Core Layer                     │  核心层
│  Logger | EventBus | Cache | Config    │
├─────────────────────────────────────────┤
│          Platform Layer                 │  平台层
│    Web | Node | Electron Adapters      │
└─────────────────────────────────────────┘
```

---

## 核心模块

### 1. SDK入口 (ChipsSDK)

**职责**: 统一的SDK入口，整合所有功能模块

**特点**:
- 单一实例管理
- 模块初始化和依赖注入
- 提供便捷的高层API

**关键代码**:
```typescript
class ChipsSDK {
  constructor(options: SDKOptions) {
    // 初始化核心系统
    this.eventBus = new EventBus();
    this.logger = new Logger();
    this.i18nManager = new I18nManager();
    
    // 初始化功能模块
    this.fileAPI = new FileAPI();
    this.rendererEngine = new RendererEngine();
    this.themeManager = new ThemeManager();
    this.pluginSystem = new PluginSystem();
  }
}
```

---

### 2. 平台适配层

**职责**: 抽象不同平台的差异，提供统一接口

**架构**:
```
┌─────────────────────────────────────┐
│     IPlatformAdapter                │  接口
├─────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────┐
│  │   Web    │  │  Node.js │  │Electron│  实现
│  │ Adapter  │  │  Adapter │  │Adapter│
│  └──────────┘  └──────────┘  └──────┘
└─────────────────────────────────────┘
```

**接口定义**:
```typescript
interface IPlatformAdapter {
  // 文件操作
  readFile(path: string): Promise<ArrayBuffer>;
  writeFile(path: string, data: ArrayBuffer): Promise<void>;
  exists(path: string): Promise<boolean>;
  
  // 平台信息
  getPlatform(): Platform;
  getCapabilities(): PlatformCapabilities;
}
```

**特点**:
- 自动平台检测
- 可插拔的适配器
- 功能能力查询

---

### 3. 核心层

#### 3.1 事件系统 (EventBus)

**职责**: 模块间通信

**特点**:
- 发布-订阅模式
- 类型安全的事件
- 订阅管理

```typescript
class EventBus {
  on(event: string, listener: Function): string;
  off(subscriptionId: string): void;
  emit(event: string, ...args: any[]): void;
}
```

#### 3.2 日志系统 (Logger)

**职责**: 统一日志记录

**特点**:
- 日志级别控制
- 结构化日志
- 可扩展的输出目标

```typescript
class Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error, data?: any): void;
}
```

#### 3.3 配置管理 (ConfigManager)

**职责**: 配置存储和管理

**特点**:
- 层级配置
- 配置合并
- 运行时修改

```typescript
class ConfigManager {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  merge(config: object): void;
}
```

#### 3.4 缓存管理 (CacheManager)

**职责**: 数据缓存

**特点**:
- LRU/LFU/FIFO策略
- 容量限制
- TTL支持

```typescript
class CacheManager<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttl?: number): void;
  clear(): void;
  getStats(): CacheStats;
}
```

---

### 4. API层

#### 4.1 文件API (FileAPI)

**职责**: 卡片和箱子文件操作

**架构**:
```
FileAPI
  ├── ParserEngine (解析)
  │     ├── CardParser
  │     ├── BoxParser
  │     └── YamlParser
  ├── ZipHandler (压缩)
  └── CacheManager (缓存)
```

**流程**:
```
加载卡片:
1. 检查缓存
2. 读取文件 (Platform Adapter)
3. 解压ZIP (ZipHandler)
4. 解析YAML (YamlParser)
5. 验证结构 (CardParser)
6. 缓存结果
7. 返回卡片对象
```

#### 4.2 渲染引擎 (RendererEngine)

**职责**: 卡片渲染

**架构**:
```
RendererEngine
  ├── RendererFactory
  │     ├── TextRenderer
  │     ├── ImageRenderer
  │     ├── VideoRenderer
  │     └── CustomRenderers...
  └── ThemeManager
```

**流程**:
```
渲染卡片:
1. 创建容器
2. 应用主题
3. 遍历基础卡片
4. 获取对应渲染器
5. 渲染到DOM
6. 触发完成事件
```

#### 4.3 插件系统 (PluginSystem)

**职责**: 插件管理

**架构**:
```
PluginSystem
  ├── PluginLoader (加载)
  ├── DependencyResolver (依赖解析)
  ├── PluginLifecycleManager (生命周期)
  └── PluginManifestLoader (清单加载)
```

**生命周期**:
```
install → enable → [running] → disable → uninstall
```

---

## 数据流

### 加载和渲染流程

```
用户代码
  │
  ↓ sdk.loadCard('card.card')
FileAPI
  │
  ↓ 读取文件
Platform Adapter
  │
  ↓ ArrayBuffer
ParserEngine
  │
  ↓ Card对象
Cache + Return
  │
  ↓ sdk.renderCard(card, '#app')
RendererEngine
  │
  ↓ 遍历基础卡片
RendererFactory
  │
  ↓ 获取渲染器
Renderer.render()
  │
  ↓ DOM操作
Browser/容器
```

---

## 依赖关系

```
ChipsSDK
  ├── EventBus (全局单例)
  ├── Logger (全局单例)
  ├── I18nManager (全局单例)
  │
  ├── FileAPI
  │     ├── Platform Adapter
  │     ├── Parser Engine
  │     ├── Cache Manager
  │     └── Logger
  │
  ├── RendererEngine
  │     ├── Renderer Factory
  │     ├── Logger
  │     └── EventBus
  │
  ├── ThemeManager
  │     ├── Logger
  │     └── EventBus
  │
  └── PluginSystem
        ├── Logger
        ├── EventBus
        ├── Plugin Loader
        ├── Dependency Resolver
        └── Lifecycle Manager
```

---

## 设计原则

### 1. 单一职责原则 (SRP)

每个模块只负责一个功能领域：
- `FileAPI` 只负责文件操作
- `RendererEngine` 只负责渲染
- `ThemeManager` 只负责主题管理

### 2. 开闭原则 (OCP)

对扩展开放，对修改关闭：
- 通过插件系统扩展功能
- 通过RendererFactory注册新渲染器
- 通过PlatformAdapter支持新平台

### 3. 依赖倒置原则 (DIP)

依赖抽象而非具体实现：
- 通过接口定义平台适配器
- 通过工厂模式管理渲染器
- 通过事件系统解耦模块

### 4. 接口隔离原则 (ISP)

客户端不应依赖它不需要的接口：
- 分离的API模块
- 可选的功能模块
- 精简的公共接口

---

## 扩展点

### 1. 平台适配器

实现`IPlatformAdapter`接口支持新平台：

```typescript
class MyPlatformAdapter implements IPlatformAdapter {
  async readFile(path: string): Promise<ArrayBuffer> {
    // 实现
  }
  
  async writeFile(path: string, data: ArrayBuffer): Promise<void> {
    // 实现
  }
  
  // ... 其他方法
}
```

### 2. 渲染器

注册自定义渲染器：

```typescript
rendererFactory.register('my-type', {
  async render(config, container, options) {
    // 自定义渲染逻辑
  },
});
```

### 3. 插件

创建插件扩展功能：

```typescript
const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  
  async install(context) {
    // 扩展SDK功能
  },
};
```

---

## 性能优化

### 1. 缓存策略

- **文件缓存**: 减少重复读取
- **解析缓存**: 避免重复解析
- **渲染缓存**: 复用渲染结果

### 2. 懒加载

- **按需加载**: 只加载需要的模块
- **资源懒加载**: 延迟加载图片等资源
- **虚拟滚动**: 长列表优化

### 3. 批量操作

- **批量加载**: 并行加载多个文件
- **批量渲染**: 减少DOM操作次数

---

## 安全性

### 1. 输入验证

- 文件格式验证
- 数据结构验证
- 参数类型检查

### 2. 错误处理

- 统一错误类型
- 错误边界
- 优雅降级

### 3. 资源限制

- 文件大小限制
- 缓存容量限制
- 递归深度限制

---

## 测试策略

### 1. 单元测试

- 每个模块独立测试
- Mock依赖项
- 高覆盖率

### 2. 集成测试

- 模块间交互测试
- 完整流程测试

### 3. 端到端测试

- 真实场景测试
- 跨平台测试

---

## 相关文档

- [模块设计](./modules.md)
- [插件架构](./plugin-architecture.md)
- [渲染引擎](./renderer-architecture.md)
- [平台适配](./platform-adaptation.md)
