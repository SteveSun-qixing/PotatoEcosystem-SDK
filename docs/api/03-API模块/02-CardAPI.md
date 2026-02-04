# CardAPI

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/api/card-api.ts`

## 概述

`CardAPI` 提供卡片对象的创建、查询、保存、删除、标签管理与导出能力. 内部维护 `id -> path` 映射缓存, 并通过 `FileAPI` 实际读写文件.

## 构造函数

```ts
const cardApi = new CardAPI(connector, fileApi, logger, config, eventBus);
```

## 关键类型

### CreateCardOptions

- `name: string` (必填)
- `type?: string` (默认 `basic`)
- `tags?: Tag[]`
- `theme?: string`
- `description?: string`

### CardQueryOptions

扩展自 `QueryCardOptions`:

- `sortBy?: 'name' | 'created' | 'modified'`
- `sortOrder?: 'asc' | 'desc'`

### UpdateCardOptions

扩展自 `types/card.UpdateCardOptions`:

- `mergeTags?: boolean` (为 `true` 时会与原标签合并)

## 方法

### `create(options: CreateCardOptions): Promise<Card>`

创建卡片对象 (内存中, 不落盘):

- `chip_standards_version` 固定为 `1.0.0`
- `card_id` 使用 `generateId()`
- `type` 默认 `basic`
- `structure` 初始化为空
- `resources` 初始化为 `new Map()`

事件: `card:created`

### `get(idOrPath: string, options?: LoadOptions): Promise<Card>`

- 若传入路径, 直接 `FileAPI.loadCard`
- 若传入 ID, 使用缓存或 Core `card.findById` 查询路径
- 未找到时抛出 `FileError(FILE_NOT_FOUND)`

### `save(path: string, card: Card, options?: SaveOptions): Promise<void>`

- 会更新 `metadata.modified_at`
- 调用 `FileAPI.saveCard`
- 更新 `id -> path` 映射
- 事件: `card:saved`

### `update(idOrPath: string, updates: UpdateCardOptions): Promise<Card>`

- 仅修改内存对象, **不会自动保存到文件**
- 标签合并逻辑由 `mergeTags` 控制
- 事件: `card:updated`

### `delete(idOrPath: string): Promise<void>`

- 解析路径后调用 `FileAPI.delete`
- 事件: `card:deleted`

### `query(options?: CardQueryOptions): Promise<Card[]>`

- Core 调用: `card.query`
- 逐个读取卡片文件, 失败会被忽略并记录日志

### `copy(idOrPath: string, destPath: string): Promise<Card>`

- 基于源卡片创建新 ID
- 保存为新文件 (默认不覆盖)
- 事件: `card:copied`

### 标签管理

- `addTags(idOrPath, tags)`
- `removeTags(idOrPath, tags)`

### 其他

- `validate(card): boolean`
- `getCachedIds(): ChipsId[]`
- `clearCache(): void`

### `export(cardId, format, options): Promise<any>`

统一导出入口:

- `format: 'card' | 'html' | 'pdf' | 'image'`
- 内部动态导入 `ConversionAPI`
- `onProgress` 回调不会通过 IPC 传递

注意事项:

- `CardAPI` 构造参数 `config` 未被保存为成员, 导出逻辑使用 `this._config as any` 时可能为 `undefined`. 若需稳定使用转换能力, 建议使用 `ChipsSDK` 中初始化后的 `CardAPI`, 并确认该问题已修复.

## 事件

| 事件名 | 数据 |
| --- | --- |
| `card:created` | `{ card }` |
| `card:saved` | `{ id, path }` |
| `card:updated` | `{ id, updates }` |
| `card:deleted` | `{ id, path }` |
| `card:copied` | `{ sourceId, newId }` |

## 示例

```ts
const card = await cardApi.create({ name: 'Demo' });
await cardApi.save('cards/demo.card', card, { overwrite: true });

const list = await cardApi.query({ tags: ['work'] });
```
