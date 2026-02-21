/**
 * 主题模块导出
 * @module theme
 */

export { ThemeManager } from './manager';
export type { BridgeInvokeFn } from './manager';
export { CssInjector } from './css-injector';
export type { CssInjectorOptions } from './css-injector';
export { DevCssLoader } from './dev-css-loader';
export type { DevCssLoaderOptions } from './dev-css-loader';
export { DEFAULT_THEME_ID, DEFAULT_DARK_THEME_ID, LEGACY_THEME_ID_MAP } from './types';
export type {
  ThemeType,
  CSSVariables,
  ThemeMetadata,
  ThemeHierarchyChain,
  ThemeColors,
  ThemeSpacing,
  ThemeRadius,
  ThemeShadow,
  ThemeTypography,
  ThemeAnimation,
  Theme,
  ThemeManagerOptions,
  ThemeChangeEvent,
} from './types';
