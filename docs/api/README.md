# Chips SDK API参考文档

**版本**: 0.1.0  
**更新时间**: 2026-01-30

---

## 目录

### 核心API
- [ChipsSDK](./ChipsSDK.md) - SDK主类
- [FileAPI](./FileAPI.md) - 文件操作API
- [RendererEngine](./RendererEngine.md) - 渲染引擎

### 工具类
- [IdGenerator](./IdGenerator.md) - ID生成器
- [Logger](./Logger.md) - 日志系统
- [CacheManager](./CacheManager.md) - 缓存管理
- [EventBus](./EventBus.md) - 事件系统
- [ThemeManager](./ThemeManager.md) - 主题管理

### 类型定义
- [Types](./types.md) - 完整类型定义

---

## 快速开始

```typescript
import { ChipsSDK } from '@chips/sdk';

// 创建SDK实例
const sdk = new ChipsSDK();

// 加载和渲染卡片
const card = await sdk.loadCard('card.card');
await sdk.renderCard(card, '#container');
```

---

## API分类

### 文件操作
- `loadCard()` - 加载卡片
- `loadCards()` - 批量加载
- `saveCard()` - 保存卡片
- `saveCardAsBlob()` - 保存为Blob
- `loadBox()` - 加载箱子
- `saveBox()` - 保存箱子

### 渲染功能
- `renderCard()` - 渲染卡片
- `setTheme()` - 设置主题
- `getCurrentTheme()` - 获取当前主题

### 多语言
- `setLanguage()` - 设置语言
- `getLanguage()` - 获取当前语言

### 事件系统
- `on()` - 监听事件
- `off()` - 取消监听

### 配置管理
- `getConfig()` - 获取配置
- `setConfig()` - 设置配置

### 工具方法
- `getVersion()` - 获取SDK版本
- `getPlatform()` - 获取平台信息
- `enableDebug()` - 启用调试模式
- `getDebugInfo()` - 获取调试信息
