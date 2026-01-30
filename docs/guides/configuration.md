# 配置指南

Chips SDK提供了灵活的配置系统，支持多层级配置覆盖。

---

## SDK初始化配置

### 基础配置

```typescript
import { ChipsSDK, SupportedLanguage, LogLevel } from '@chips/sdk';

const sdk = new ChipsSDK({
  // 调试模式
  debug: true,
  
  // 日志级别
  logLevel: LogLevel.Debug,
  
  // 多语言配置
  i18n: {
    defaultLanguage: SupportedLanguage.ZhCN,
    fallbackLanguage: SupportedLanguage.EnUS,
  },
  
  // 缓存配置
  cache: {
    enabled: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    ttl: 3600 * 1000, // 1小时
    strategy: 'lru',
  },
});
```

### 平台特定配置

```typescript
import { Platform } from '@chips/sdk';

const sdk = new ChipsSDK({
  platform: Platform.Web,
  // 或让SDK自动检测
});
```

---

## 运行时配置

### 读取配置

```typescript
// 获取配置值
const value = sdk.getConfig('ui.theme');

// 使用默认值
const value = sdk.getConfig('nonexistent.key', 'default value');
```

### 设置配置

```typescript
// 设置配置
await sdk.setConfig('ui.theme', 'dark');
await sdk.setConfig('cache.size', 200 * 1024 * 1024);
```

---

## 日志配置

### 日志级别

```typescript
import { LogLevel } from '@chips/sdk';

// 调试模式
sdk.enableDebug(true); // 等同于 LogLevel.Debug

// 或直接设置日志级别
const logger = sdk.getLogger();
logger.setLevel(LogLevel.Info);
```

### 日志输出

```typescript
// 默认输出到控制台
const sdk = new ChipsSDK({
  logger: {
    enableConsole: true,
    enableStorage: false,
  },
});
```

---

## 缓存配置

### 缓存策略

```typescript
// LRU（最近最少使用）
cache: { strategy: 'lru' }

// LFU（最不经常使用）
cache: { strategy: 'lfu' }

// FIFO（先进先出）
cache: { strategy: 'fifo' }
```

### 清除缓存

```typescript
// 清除文件缓存
sdk.fileAPI.clearCache();

// 获取缓存统计
const stats = sdk.fileAPI.getCacheStats();
```

---

## 多语言配置

### 支持的语言

- `zh-CN` - 简体中文
- `zh-TW` - 繁体中文
- `en-US` - 英语
- `ja-JP` - 日语
- `ko-KR` - 韩语

### 语言切换

```typescript
import { SupportedLanguage } from '@chips/sdk';

sdk.setLanguage(SupportedLanguage.EnUS);
```

---

## 主题配置

### 应用主题

```typescript
// 使用内置主题
sdk.setTheme('light');
sdk.setTheme('dark');

// 查看可用主题
const themes = sdk.listThemes();
```

### 自定义主题

```typescript
// 注册自定义主题
const themeManager = sdk.themeManager;

themeManager.register({
  id: 'custom-theme',
  name: 'My Custom Theme',
  colors: {
    primary: '#1976d2',
    secondary: '#424242',
    background: '#ffffff',
    text: '#212121',
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
  },
});

// 应用自定义主题
sdk.setTheme('custom-theme');
```

---

## 调试配置

### 启用调试

```typescript
// 启用调试模式
sdk.enableDebug(true);

// 获取调试信息
const debugInfo = sdk.getDebugInfo();
console.log(debugInfo);
```

### 调试信息内容

```typescript
{
  version: '0.1.0',
  platform: 'web',
  initialized: true,
  eventListeners: 5,
  cacheStats: { ... },
  currentTheme: 'dark',
  currentLanguage: 'zh-CN',
  logStats: { total: 100, error: 2, ... }
}
```

---

## 配置层级

SDK使用四层配置系统，按优先级从高到低：

1. **运行时配置** - 临时覆盖
2. **模块配置** - 模块级别配置
3. **用户配置** - 用户个性化配置
4. **系统配置** - 全局默认配置

高优先级的配置会覆盖低优先级的配置。
