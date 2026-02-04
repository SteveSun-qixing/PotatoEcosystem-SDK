# API 类型

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/types/api.ts`, `Chips-SDK/src/api/file-types.ts`

## 说明

SDK 中存在两套与 API 相关的类型:

- `src/types/api.ts`: 更偏 UI/渲染层使用
- `src/api/file-types.ts`: FileAPI 的实际类型

使用时需注意二者差异.

## FileAPI 类型 (file-types)

### LoadOptions

- `cache?: boolean`
- `verify?: boolean`
- `loadResources?: boolean`
- `maxResourceCount?: number`

### SaveOptions

- `overwrite?: boolean`
- `compress?: boolean`
- `verify?: boolean`
- `backup?: boolean`

### ValidateOptions

- `structure?: boolean`
- `resources?: boolean`
- `metadata?: boolean`

### FileValidationResult

- `valid: boolean`
- `fileType: FileType`
- `errors: ValidationIssue[]`
- `warnings: ValidationIssue[]`

### ValidationIssue

- `code: string`
- `message: string`
- `path?: string`
- `severity: 'error' | 'warning'`

### FileInfo

- `path`, `name`, `extension`, `size`, `modified`, `type`

### ZipEntry / RawFileData

- `ZipEntry`: ZIP 条目描述
- `RawFileData`: metadata/structure/content/cover/resources

## API 通用类型 (types/api.ts)

### RenderOptions (UI 侧)

- `theme?: string`
- `mode?: 'view' | 'edit' | 'preview'`
- `readOnly?: boolean`
- `interactive?: boolean`
- `lazyLoad?: boolean`
- `virtualScroll?: boolean`
- `animations?: boolean`
- `layout?: string`
- `layoutConfig?: Record<string, unknown>`
- `className?: string`
- `style?: Record<string, string>`
- `attributes?: Record<string, string>`

### ValidationResult

- `valid: boolean`
- `errors?: ValidationError[]`
- `warnings?: ValidationWarning[]`

### ValidationError / ValidationWarning

- `code`, `message`, `path?`
