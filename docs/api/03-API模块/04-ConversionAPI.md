# ConversionAPI

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/api/conversion-api.ts`

## 概述

`ConversionAPI` 负责卡片文件的转换与导出, 通过 Core 的 `conversion`/`card.pack` 服务完成 HTML/PDF/图片转换以及 `.card` 打包.

## 关键类型

### ConversionSource

- `type`: `'path' | 'data'`
- `path?: string` (当 `type` 为 `path` 必填)
- `data?: Uint8Array` (当 `type` 为 `data` 必填)
- `fileType: string` (通常为 `card` 或 `box`)

### HTMLConversionOptions

- `outputPath?: string`
- `includeAssets?: boolean`
- `themeId?: string`
- `assetStrategy?: 'copy-all' | 'copy-local' | 'embed' | 'reference-only'`
- `onProgress?: (progress: ConversionProgress) => void`

### ImageConversionOptions

- `outputPath?: string`
- `format?: 'png' | 'jpg' | 'jpeg'`
- `quality?: number`
- `scale?: number`
- `width?: number`
- `height?: number`
- `backgroundColor?: string`
- `transparent?: boolean`
- `themeId?: string`
- `onProgress?: (progress: ConversionProgress) => void`

### PDFConversionOptions

- `outputPath?: string`
- `pageFormat?: 'a4' | 'a5' | 'letter' | 'legal'`
- `orientation?: 'portrait' | 'landscape'`
- `margin?: { top?: string; right?: string; bottom?: string; left?: string }`
- `themeId?: string`
- `onProgress?: (progress: ConversionProgress) => void`

### CardExportOptions

- `outputPath: string`
- `compress?: boolean`
- `includeResources?: boolean`
- `onProgress?: (progress: ConversionProgress) => void`

### ConversionResult

- `success: boolean`
- `taskId: string`
- `outputPath?: string`
- `data?: Uint8Array | Map<string, string | Uint8Array>`
- `error?: { code: string; message: string }`
- `warnings?: string[]`
- `stats?: { duration; inputSize; outputSize }`

### ConversionStatus / ConversionProgress

`ConversionStatus` 取值:

- `pending` / `parsing` / `rendering` / `processing` / `writing` / `completed` / `failed` / `cancelled`

`ConversionProgress`:

- `taskId: string`
- `status: ConversionStatus`
- `percent: number`
- `currentStep?: string`

### SupportedConversion

- `sourceType: string`
- `targetType: string`
- `description?: string`

## 方法

### `convertToHTML(source, options?): Promise<ConversionResult>`

调用 Core `conversion.convert` 目标 `html`.

### `convertToImage(source, options?): Promise<ConversionResult>`

调用 Core `conversion.convert` 目标 `image`.

### `convertToPDF(source, options?): Promise<ConversionResult>`

调用 Core `conversion.convert` 目标 `pdf`.

### `exportAsCard(cardId, options): Promise<ConversionResult>`

调用 Core `card.pack.pack` 打包 `.card` 文件.

### `getSupportedConversions(): Promise<SupportedConversion[]>`

调用 Core `conversion.getSupportedConversions`, 若失败返回内置默认列表.

### `canConvert(sourceType, targetType): Promise<boolean>`

基于 `getSupportedConversions` 判断是否支持.

### `cancelConversion(taskId): Promise<boolean>`

调用 Core `conversion.cancel`, 若成功会移除本地任务状态.

### `getActiveTaskCount(): number`

返回当前活跃任务数量.

## 重要说明

- `onProgress` 回调无法通过 IPC 传递, 会在请求前被置为 `undefined`.
- 内部错误会返回 `ConversionResult.success=false`, `error.code` 为 `CONV-00x`.
- `exportAsCard` 通过 `card.pack` 路由到 Foundation `CardPacker`.
- 超时配置读取 `timeout.conversion`, 未配置时分别使用 `120000` (HTML), `180000` (PDF/图片), `60000` (打包).

## 示例

```ts
const conversion = new ConversionAPI(connector, logger, config);

const result = await conversion.convertToHTML(
  { type: 'path', path: 'cards/demo.card', fileType: 'card' },
  { outputPath: 'exports/demo-html' }
);

if (!result.success) {
  console.error(result.error);
}
```
