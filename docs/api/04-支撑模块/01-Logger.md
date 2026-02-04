# Logger

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/logger/logger.ts`

## 概述

`Logger` 提供分级日志输出、历史记录、处理器与传输器扩展能力. 支持创建子 Logger 以分模块记录.

## LoggerOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `level` | `LogLevel` | `info` | 日志级别 |
| `prefix` | `string` | `ChipsSDK` | 控制台前缀 |
| `enableConsole` | `boolean` | `true` | 是否输出到控制台 |
| `enableRemote` | `boolean` | `false` | 保留字段 (未实现远程上传) |
| `maxHistory` | `number` | `1000` | 最大历史记录条数 |

## 构造函数

```ts
const logger = new Logger('ModuleName', options?: LoggerOptions);
```

## 方法

### 日志输出

- `debug(message, data?)`
- `info(message, data?)`
- `warn(message, data?)`
- `error(message, data?)`

### 级别控制

- `setLevel(level: LogLevel)`
- `getLevel(): LogLevel`

### 处理器与传输器

- `addHandler(handler: LogHandler)` / `removeHandler(handler)`
- `addTransport(transport: LogTransport)` / `removeTransport(name)`

### 历史记录

- `getHistory(level?: LogLevel, limit?: number): LogEntry[]`
- `clearHistory(): void`

### 其它

- `createChild(subModule: string): Logger`
- `module: string`

## 数据结构

### LogEntry

- `level: LogLevel`
- `timestamp: string`
- `module: string`
- `message: string`
- `data?: Record<string, unknown>`

### LogTransport

- `name: string`
- `log(entry: LogEntry): void`

## 注意事项

- 子 Logger 共享父级的 handlers/transports (通过复制注册实现).
- `enableRemote` 当前未被使用, 如需远程日志请自行实现 Transport.
