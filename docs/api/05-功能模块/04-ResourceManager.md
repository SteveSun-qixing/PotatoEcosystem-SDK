# ResourceManager

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/resource/manager.ts`

## 概述

`ResourceManager` 负责资源加载、缓存、上传、预加载与对象 URL 管理. 内置基于容量与 TTL 的缓存清理策略.

## ResourceManagerOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `maxCacheSize` | `number` | `104857600` | 最大缓存大小 (字节, 100MB) |
| `maxCacheCount` | `number` | `500` | 最大缓存条目数 |
| `cacheTTL` | `number` | `1800000` | 缓存过期时间 (ms) |
| `autoCleanup` | `boolean` | `true` | 是否自动清理 |

## 相关类型摘要

- `ResourceType`: `'image' | 'video' | 'audio' | 'font' | 'document' | 'other'`
- `ResourceState`: `'pending' | 'loading' | 'loaded' | 'error'`
- `ResourceInfo`: `{ id; name; path; type; mimeType; size; checksum?; created?; modified? }`
- `CacheEntry`: `{ info; data; objectUrl?; state; lastAccess; refCount }`
- `ResourceLoadOptions`: `{ cache?; priority?; timeout?; onProgress? }`
- `ResourceUploadOptions`: `{ path; overwrite?; onProgress? }`
- `PreloadOptions`: `{ priority?; concurrency? }`

## 方法

### `load(path: string, options?: ResourceLoadOptions): Promise<Blob>`

- 若命中缓存, 增加引用计数并返回
- 调用 Core `resource.load`
- 失败抛出 `ResourceError(RES_NOT_FOUND)`

### `getInfo(path: string): Promise<ResourceInfo>`

调用 Core `resource.info`.

### `getObjectUrl(path: string): string | undefined`

返回缓存资源的对象 URL, 无缓存则返回 `undefined`.

### `createObjectUrl(path: string): Promise<string>`

确保资源已加载并生成对象 URL.

### `releaseObjectUrl(path: string): void`

减少引用计数, 计数为 0 时释放 `URL.revokeObjectURL`.

### `upload(file: File, options: ResourceUploadOptions): Promise<ResourceInfo>`

调用 Core `resource.upload`.

### `delete(path: string): Promise<void>`

调用 Core `resource.delete`, 并清除缓存.

### `preload(paths: string[], options?: PreloadOptions): Promise<void>`

按 `concurrency` 批量并发加载.

### 缓存相关

- `isCached(path: string): boolean`
- `clearCache(): void`
- `getCacheStats(): { count; size; maxSize }`
- `destroy(): void`

### `getResourceType(mimeType: string): ResourceType`

根据 MIME 类型映射资源类型.

## 事件

| 事件名 | 数据 |
| --- | --- |
| `resource:uploaded` | `{ path, info }` |
| `resource:deleted` | `{ path }` |

## 注意事项

- 缓存清理仅移除 `refCount <= 0` 的条目.
- `RES_NOT_FOUND` 当前未在 `ErrorCodes` 定义, 请补充.
