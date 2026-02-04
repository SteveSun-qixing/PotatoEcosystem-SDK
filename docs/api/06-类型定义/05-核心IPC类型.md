# 核心 IPC 类型

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/core/types.ts`

## MessageType

- `Route` / `Publish` / `Subscribe` / `Unsubscribe`
- `ConfigGet` / `ConfigSet` / `Status` / `Heartbeat`

## IpcRequest

- `id: string`
- `message_type: MessageType`
- `payload: RoutePayload | PublishPayload | SubscribePayload | ConfigPayload`
- `timestamp: Timestamp`
- `protocol_version?: ProtocolVersion`

## RoutePayload

- `sender: string`
- `action: string` (格式 `service.method`)
- `params: Record<string, unknown>`
- `timeout_ms?: number`

## PublishPayload

- `event_type: string`
- `sender: string`
- `data: Record<string, unknown>`

## SubscribePayload

- `subscriber_id: string`
- `event_type: string`
- `filter?: Record<string, unknown>`

## ConfigPayload

- `key: string`
- `value?: unknown`

## IpcResponse

- `request_id: string`
- `success: boolean`
- `data?: unknown`
- `error?: string`
- `timestamp: Timestamp`

## EventMessage

- `type: 'event'`
- `event_type: string`
- `sender: string`
- `data: Record<string, unknown>`
- `timestamp: Timestamp`

## RequestParams / ResponseData

- `RequestParams`: `{ service; method; payload; timeout? }`
- `ResponseData<T>`: `{ success; data?; error? }`

## ConnectorOptions

- `url?`, `timeout?`, `reconnect?`, `reconnectDelay?`, `maxReconnectAttempts?`, `heartbeatInterval?`
