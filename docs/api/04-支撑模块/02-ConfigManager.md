# ConfigManager

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/config/manager.ts`

## 概述

`ConfigManager` 提供运行时配置管理、默认值初始化与变更监听能力. 支持简单 schema 验证与通配符监听.

## 默认配置

| 键 | 默认值 |
| --- | --- |
| `sdk.version` | `1.0.0` |
| `sdk.debug` | `false` |
| `timeout.default` | `30000` |
| `timeout.file` | `60000` |
| `timeout.render` | `10000` |
| `timeout.connect` | `5000` |
| `cache.enabled` | `true` |
| `cache.maxSize` | `100` |
| `cache.ttl` | `3600000` |
| `i18n.defaultLocale` | `zh-CN` |
| `i18n.fallbackLocale` | `en-US` |
| `logger.level` | `info` |
| `logger.enableConsole` | `true` |
| `logger.maxHistory` | `1000` |
| `render.lazyLoad` | `true` |
| `render.animations` | `true` |
| `render.defaultTheme` | `default` |

## ConfigManagerOptions

- `schema?: ConfigSchema`
- `defaults?: Record<string, unknown>`
- `persistent?: boolean` (未实现持久化行为)

### ConfigSchema

```ts
interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    default?: unknown;
    required?: boolean;
    validate?: (value: unknown) => boolean;
    description?: string;
  };
}
```

## 主要方法

- `initialize(): Promise<void>`: 异步初始化 (当前为空实现)
- `get<T>(key: string, defaultValue?: T): T`
- `set(key: string, value: unknown): void` (会进行 schema 校验)
- `setMany(values: Record<string, unknown>): void`
- `has(key: string): boolean`
- `delete(key: string): void`
- `getAll(): Record<string, unknown>`
- `getByPrefix(prefix: string): Record<string, unknown>`
- `reset(): void` (恢复默认值, 并应用 `options.defaults`)

## 变更监听

- `onChange(key: string, handler: ConfigChangeHandler): void`
- `offChange(key: string, handler?: ConfigChangeHandler): void`

支持三种匹配方式:

- 精确匹配: `logger.level`
- 通配符: `*`
- 前缀通配符: `logger.*`

## 示例

```ts
const config = new ConfigManager({ defaults: { 'cache.maxSize': 200 } });
config.set('sdk.debug', true);

config.onChange('sdk.*', (key, newValue) => {
  console.log('Config changed', key, newValue);
});
```
