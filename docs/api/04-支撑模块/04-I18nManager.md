# I18nManager

> 版本: 1.0.0  
> 源码: `Chips-SDK/src/i18n/manager.ts`

## 概述

`I18nManager` 提供多语言翻译与复数规则支持, 内置 `zh-CN` 与 `en-US` 的基础词条.

## I18nManagerOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `defaultLocale` | `Locale` | `zh-CN` | 默认语言 |
| `fallbackLocale` | `Locale` | `en-US` | 回退语言 |
| `translations` | `Record<Locale, Translation>` | `{}` | 初始翻译字典 |

## 方法

### `setLocale(locale: Locale): void`

设置当前语言, 触发 `onLocaleChange` 监听.

### `t(key: string, params?: Record<string, string | number>): string`

翻译字符串:

- 优先当前语言
- 若未命中, 使用回退语言
- 仍未命中时返回原 key

### `plural(key: string, count: number, params?: Record<string, string | number>): string`

复数翻译, 支持 `zero/one/two/other` 规则.

### 翻译管理

- `addTranslation(locale: Locale, translation: Translation): void`
- `getAvailableLocales(): Locale[]`
- `hasLocale(locale: Locale): boolean`

### 监听

- `onLocaleChange(handler: LocaleChangeHandler): void`
- `offLocaleChange(handler: LocaleChangeHandler): void`

## 内置翻译

`error` 与 `common` 模块提供基础词条 (文件/连接/渲染等).

## 示例

```ts
const i18n = new I18nManager({ defaultLocale: 'zh-CN' });
console.log(i18n.t('error.file_not_found'));

i18n.addTranslation('fr-FR', { common: { save: 'Enregistrer' } });
```
