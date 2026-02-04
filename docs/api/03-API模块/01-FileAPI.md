# FileAPI

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/api/file-api.ts`

## 概述

`FileAPI` 负责卡片/箱子的加载、保存、验证与基础文件操作, 并与 Core 文件服务通信. 内置 LRU 缓存, 通过 `ConfigManager` 控制缓存大小与超时.

## 构造函数

```ts
const fileApi = new FileAPI(connector, logger, config);
```

## 默认配置

- `cache.maxSize`: 100 (决定缓存条目上限)
- `timeout.file`: 60000 (文件读写超时)

## 选项类型

### LoadOptions

- `cache?: boolean` (默认 `true`)
- `verify?: boolean` (默认 `true`)
- `loadResources?: boolean` (默认 `true`)
- `maxResourceCount?: number` (默认 `1000`)

### SaveOptions

- `overwrite?: boolean` (默认 `false`)
- `compress?: boolean` (默认 `false`)
- `verify?: boolean` (默认 `true`)
- `backup?: boolean` (默认 `true`)

### ValidateOptions

- `structure?: boolean`
- `resources?: boolean`
- `metadata?: boolean`

## 方法

### `loadCard(path: string, options?: LoadOptions): Promise<Card>`

加载 `.card` 文件.

- 仅允许安全相对路径 (`isSafePath`)
- 通过 Core 服务 `file.read` 读取, 再调用 `parser.parseYaml`
- 可选校验: 使用 `validateCard`

错误:
- `FILE_INVALID_PATH`
- `FILE_FORMAT_INVALID`
- `FILE_READ_FAILED`
- `FILE_CORRUPTED`

### `saveCard(path: string, card: Card, options?: SaveOptions): Promise<void>`

保存 `.card` 文件.

- `overwrite=false` 时会先调用 `file.exists`
- 调用 Core `file.write` 写入
- 成功后更新缓存

错误:
- `FILE_INVALID_PATH`
- `FILE_ALREADY_EXISTS`
- `FILE_WRITE_FAILED`

### `loadBox(path: string, options?: LoadOptions): Promise<Box>` / `saveBox(...)`

与 `loadCard/saveCard` 类似, 面向 `.box` 文件.

### `validateCard(card: Card): FileValidationResult`

本地结构校验:

- metadata 合规
- `card.id` 与 `metadata.card_id` 一致
- `metadata.name` 非空

### `validateBox(box: Box): FileValidationResult`

本地结构校验:

- metadata 合规
- `box.id` 与 `metadata.box_id` 一致
- `metadata.layout` 存在

### `validateFile(path: string, options?: ValidateOptions): Promise<FileValidationResult>`

调用 Core `file.validate`.

- 当 Core 返回失败时, 会返回 `valid=false` 的结果 (不抛错).

### `getFileInfo(path: string): Promise<FileInfo>`

调用 Core `file.info`.

错误:
- `FILE_NOT_FOUND`

### `exists(path: string): Promise<boolean>`

调用 Core `file.exists`.

### `copy(sourcePath: string, destPath: string, overwrite = false): Promise<void>`

调用 Core `file.copy`.

### `move(sourcePath: string, destPath: string, overwrite = false): Promise<void>`

调用 Core `file.move`, 并同步更新缓存映射.

### `delete(path: string): Promise<void>`

调用 Core `file.delete`, 并清除缓存.

### 缓存相关

- `clearCache(): void`
- `removeFromCache(path: string): void`
- `cacheSize: number`

## 缓存策略

- 使用简单 LRU (插入顺序), 超出 `cache.maxSize` 时淘汰最早条目.
- 缓存键为 `path`.

## 重要说明

- `isSafePath` **不允许绝对路径**, 也不允许包含 `..`.
- 解析卡片/箱子时依赖 Core 的 `parser.parseYaml`.
- `_serializeCard` 使用 `Object.fromEntries(card.resources)` 生成资源对象, 资源内容需可序列化.

## 示例

```ts
const card = await fileApi.loadCard('cards/demo.card');
card.metadata.name = 'Updated';
await fileApi.saveCard('cards/demo.card', card, { overwrite: true });
```
