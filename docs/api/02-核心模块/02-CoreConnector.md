# CoreConnector

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/core/connector.ts`

## 概述

`CoreConnector` 负责与 Chips-Core 通过 WebSocket 进行 IPC 通信, 支持请求/响应、事件发布与订阅、心跳以及自动重连.

## ConnectorOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | `string` | `ws://127.0.0.1:9527` | Core WebSocket 地址 |
| `timeout` | `number` | `30000` | 请求默认超时 (ms) |
| `reconnect` | `boolean` | `true` | 断线自动重连 |
| `reconnectDelay` | `number` | `1000` | 重连延迟基数 (ms) |
| `maxReconnectAttempts` | `number` | `5` | 最大重连次数 |
| `heartbeatInterval` | `number` | `30000` | 心跳间隔 (ms), `<=0` 表示禁用 |

## 构造函数

```ts
const connector = new CoreConnector(options?: ConnectorOptions);
```

## 方法

### `connect(): Promise<void>`

建立 WebSocket 连接.

- 失败会抛出 `ConnectionError`.
- 若正在连接会抛出 `ConnectionError('Connection already in progress')`.
- 连接成功后会启动心跳.

### `disconnect(): void`

断开连接并清理所有待处理请求, 这些请求会以 `ConnectionError('Connection closed')` 失败.

### `request<T>(params: RequestParams): Promise<ResponseData<T>>`

发送 `Route` 请求并等待响应.

- `params.action` 会被拼接为 `service.method`.
- 超时后抛出 `TimeoutError`.
- 请求以 NDJSON 发送 (JSON + `\n`).

### `publish(eventType: string, data: Record<string, unknown>): void`

发布事件给 Core (`Publish`).

### `on(eventType: string, handler: (data: unknown) => void): void`

订阅 Core 事件.

- `eventType` 支持 `*` 通配符.
- 如果当前未连接, 仅本地注册, 不会向 Core 发送订阅.

### `off(eventType: string, handler?: (data: unknown) => void): void`

取消订阅, 如果未提供 handler 会清空该事件所有订阅.

### `once(eventType: string, handler: (data: unknown) => void): void`

一次性订阅, 触发一次后自动取消.

## 访问器

- `isConnected`: 是否已连接
- `isConnecting`: 是否正在连接
- `clientId`: 客户端 ID, 格式 `sdk-xxxxxxxx`
- `pendingCount`: 当前未完成请求数量

## 事件处理

Core 推送事件格式需满足:

```json
{ "type": "event", "event_type": "xxx", "data": {} }
```

收到后会触发本地事件处理器, `*` 订阅会收到 `{ event_type, data }` 结构.

## 自动重连

- 断线后按 `reconnectDelay * attempts` 线性递增延迟重连.
- 最大重连次数达到上限后停止尝试.
- 现实现不自动重新订阅已注册事件, 如需保证事件订阅, 建议在每次 `connect` 成功后重新 `on`.

## 使用示例

```ts
const connector = new CoreConnector({ url: 'ws://localhost:9527' });
await connector.connect();

const response = await connector.request({
  service: 'file',
  method: 'read',
  payload: { path: 'cards/demo.card' },
});

connector.on('system:status', (data) => console.log(data));
```
