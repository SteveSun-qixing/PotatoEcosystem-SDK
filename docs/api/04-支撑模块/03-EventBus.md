# EventBus

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/event/bus.ts`

## 概述

`EventBus` 提供轻量事件订阅与发布机制, 支持异步执行、一次性订阅和通配符事件.

## EventBusOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `maxListeners` | `number` | `100` | 单个事件最大监听器数量 |
| `async` | `boolean` | `true` | 处理器是否异步执行 |

## 方法

### 订阅

- `on<T>(eventType: string, handler: EventHandler<T>): string`
- `once<T>(eventType: string, handler: EventHandler<T>): string`

返回订阅 ID, 可用于取消订阅.

### 取消订阅

- `off(eventType: string, handlerOrId?: EventHandler | string): void`

### 发布

- `emit<T>(eventType: string, data: T): Promise<void>` (遵循 `async` 选项)
- `emitSync<T>(eventType: string, data: T): void`

### 查询与清理

- `hasListeners(eventType: string): boolean`
- `listenerCount(eventType: string): number`
- `eventNames(): string[]`
- `clear(): void`
- `removeAllListeners(eventType?: string): void`

### 等待事件

- `waitFor<T>(eventType: string, timeout?: number): Promise<T>`

超时将抛出 `Error('Timeout waiting for event: ...')`.

## 通配符

`eventType = '*'` 可订阅所有事件. 发布时会同时触发精确匹配和通配符订阅.

## 示例

```ts
const bus = new EventBus({ async: false });

const id = bus.on('card:created', (data) => console.log(data));
bus.emitSync('card:created', { id: 'demo' });

bus.off('card:created', id);
```
