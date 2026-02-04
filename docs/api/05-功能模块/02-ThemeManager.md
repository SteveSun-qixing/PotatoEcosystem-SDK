# ThemeManager

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/theme/manager.ts`

## 概述

`ThemeManager` 提供主题注册、切换与 CSS 变量生成能力, 内置 `default-light` 与 `default-dark` 主题.

## ThemeManagerOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `defaultTheme` | `string` | `default-light` | 默认主题 ID |
| `autoDetect` | `boolean` | `false` | 仅定义未自动使用 |
| `themes` | `Theme[]` | - | 初始主题列表 |

> `autoDetect` 当前未自动生效, 需手动调用 `applySystemTheme()`.

## 主题结构摘要

`Theme` 由以下部分组成:

- `metadata: ThemeMetadata` (id/name/type/version/extends 等)
- `colors: ThemeColors`
- `spacing: ThemeSpacing`
- `radius: ThemeRadius`
- `shadow: ThemeShadow`
- `typography: ThemeTypography`
- `animation: ThemeAnimation`
- `customVariables?: CSSVariables`

## 方法

### `register(theme: Theme): void`

注册主题. 若 `theme.metadata.extends` 指定父主题, 会进行合并.

事件: `theme:registered`

### `unregister(id: string): void`

默认主题不可移除 (`default-light`, `default-dark`).

### `setTheme(id: string): void`

设置当前主题, 不存在则记录警告. 事件: `theme:changed`.

### `getTheme(): Theme`

获取当前主题.

### `getThemeById(id: string): Theme | undefined`

获取指定主题.

### `listThemes(): ThemeMetadata[]`

获取主题元数据列表.

### `getCSSVariables(): CSSVariables`

生成 CSS 变量, 变量命名规则:

- `--chips-color-*`
- `--chips-spacing-*`
- `--chips-radius-*`
- `--chips-shadow-*`
- `--chips-font-*`
- `--chips-duration-*`
- `--chips-easing-*`

### `applyToDOM(root?: HTMLElement): void`

应用 CSS 变量到 DOM, 并设置 `data-theme`.

### `detectSystemTheme(): 'light' | 'dark'`

使用 `window.matchMedia` 判断系统偏好.

### `applySystemTheme(): void`

根据系统偏好切换主题.

## 事件

| 事件名 | 数据 |
| --- | --- |
| `theme:registered` | `{ id }` |
| `theme:changed` | `{ previousTheme, currentTheme }` |

## 注意事项

- 主题合并规则: 仅 `child.metadata` 保留, 其余字段与父主题浅合并.
- 如需在应用启动时自动跟随系统主题, 请手动调用 `applySystemTheme()`.
