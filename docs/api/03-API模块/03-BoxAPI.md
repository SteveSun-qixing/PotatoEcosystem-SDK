# BoxAPI

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/api/box-api.ts`

## 概述

`BoxAPI` 用于创建、加载、保存与管理箱子文件, 并支持卡片在箱子中的组织与布局配置.

## 构造函数

```ts
const boxApi = new BoxAPI(connector, fileApi, logger, config, eventBus);
```

## 关键类型

### CreateBoxOptions

- `name: string` (必填)
- `layout?: string` (默认 `grid`)
- `tags?: Tag[]`
- `description?: string`

### BoxQueryOptions

扩展自 `QueryBoxOptions`:

- `modifiedAfter?: Timestamp`
- `modifiedBefore?: Timestamp`
- `sortBy?: 'name' | 'created' | 'modified' | 'cardCount'`
- `sortOrder?: 'asc' | 'desc'`

### CardPosition

- `cardPath: string`
- `location?: LocationType` (`internal`/`external`)
- `position?: number`

## 方法

### `create(options: CreateBoxOptions): Promise<Box>`

创建箱子对象 (内存中, 不落盘):

- `chip_standards_version`: `1.0.0`
- `box_id`: `generateId()`
- `layout`: 默认 `grid`
- `structure.cards`: 空数组
- `content.active_layout`: 与 metadata.layout 一致

事件: `box:created`

### `get(idOrPath: string, options?: LoadOptions): Promise<Box>`

- 路径直接使用 `FileAPI.loadBox`
- ID 通过缓存或 Core `box.findById` 查询
- 未找到时抛出 `FileError(FILE_NOT_FOUND)`

### `save(path: string, box: Box, options?: SaveOptions): Promise<void>`

- 更新 `metadata.modified_at`
- `FileAPI.saveBox`
- 更新 `id -> path` 映射
- 事件: `box:saved`

### `update(idOrPath, updates): Promise<Box>`

- 修改内存对象, **不会自动保存**
- 若修改 `layout`, 同时更新 `content.active_layout`
- 事件: `box:updated`

### `delete(idOrPath: string): Promise<void>`

- 解析路径后 `FileAPI.delete`
- 事件: `box:deleted`

### `query(options?: BoxQueryOptions): Promise<Box[]>`

- Core 调用: `box.query`
- 逐个读取箱子文件, 失败会记录日志

### `addCard(idOrPath, cardPath, position?): Promise<Box>`

- 在 `structure.cards` 中插入卡片
- 当前实现 **不会检查 cardPath 是否存在**
- 若已存在, 仅记录警告并返回原箱子
- 事件: `box:card:added`

### `removeCard(idOrPath, cardPath): Promise<Box>`

- 删除对应卡片条目
- 若不存在, 仅记录警告
- 事件: `box:card:removed`

### `reorderCards(idOrPath, cardPaths: string[]): Promise<Box>`

- 新顺序必须包含当前卡片路径, 否则抛出 `Error`
- 事件: `box:cards:reordered`

### `getCardCount(idOrPath): Promise<number>`

返回卡片数量.

### `setLayout(idOrPath, layout): Promise<Box>`

等同于 `update(..., { layout })`.

### `getLayoutConfig(idOrPath): Promise<Record<string, unknown>>`

读取当前激活布局的配置.

### `setLayoutConfig(idOrPath, config): Promise<Box>`

写入当前激活布局配置.

- 事件: `box:layout:configured`

### `copy(idOrPath, destPath, includeCards = true): Promise<Box>`

- 新 ID
- 可选复制 `structure.cards`
- 保存为新文件 (默认不覆盖)
- 事件: `box:copied`

### 其他

- `validate(box): boolean`
- `getCachedIds(): ChipsId[]`
- `clearCache(): void`

## 事件

| 事件名 | 数据 |
| --- | --- |
| `box:created` | `{ box }` |
| `box:saved` | `{ id, path }` |
| `box:updated` | `{ id, updates }` |
| `box:deleted` | `{ id, path }` |
| `box:card:added` | `{ boxId, cardPath, position }` |
| `box:card:removed` | `{ boxId, cardPath }` |
| `box:cards:reordered` | `{ boxId, cardPaths }` |
| `box:layout:configured` | `{ boxId, layout, config }` |
| `box:copied` | `{ sourceId, newId }` |

## 示例

```ts
const box = await boxApi.create({ name: 'My Box', layout: 'grid' });
await boxApi.save('boxes/demo.box', box, { overwrite: true });

await boxApi.addCard(box.id, 'cards/demo.card');
```
