/**
 * 主题类型定义
 * @module theme/types
 */

/**
 * 主题类型
 */
export type ThemeType = 'light' | 'dark' | 'auto';

/**
 * CSS 变量定义
 */
export type CSSVariables = Record<string, string>;

/**
 * 主题元数据
 */
export interface ThemeMetadata {
  /** 主题 ID */
  id: string;
  /** 主题名称 */
  name: string;
  /** 主题类型 */
  type: ThemeType;
  /** 版本 */
  version: string;
  /** 描述 */
  description?: string;
  /** 作者 */
  author?: string;
  /** 预览图 */
  preview?: string;
  /** 父主题 */
  extends?: string;
}

/**
 * 主题配色
 */
export interface ThemeColors {
  /** 主色 */
  primary: string;
  /** 辅助色 */
  secondary: string;
  /** 强调色 */
  accent: string;
  /** 背景色 */
  background: string;
  /** 表面色 */
  surface: string;
  /** 文字色 */
  text: string;
  /** 次要文字色 */
  textSecondary: string;
  /** 边框色 */
  border: string;
  /** 错误色 */
  error: string;
  /** 警告色 */
  warning: string;
  /** 成功色 */
  success: string;
  /** 信息色 */
  info: string;
}

/**
 * 主题间距
 */
export interface ThemeSpacing {
  /** 超小 */
  xs: string;
  /** 小 */
  sm: string;
  /** 中 */
  md: string;
  /** 大 */
  lg: string;
  /** 超大 */
  xl: string;
  /** 特大 */
  xxl: string;
}

/**
 * 主题圆角
 */
export interface ThemeRadius {
  /** 无 */
  none: string;
  /** 小 */
  sm: string;
  /** 中 */
  md: string;
  /** 大 */
  lg: string;
  /** 圆形 */
  full: string;
}

/**
 * 主题阴影
 */
export interface ThemeShadow {
  /** 无 */
  none: string;
  /** 小 */
  sm: string;
  /** 中 */
  md: string;
  /** 大 */
  lg: string;
  /** 超大 */
  xl: string;
}

/**
 * 主题排版
 */
export interface ThemeTypography {
  /** 字体族 */
  fontFamily: string;
  /** 代码字体族 */
  fontFamilyMono: string;
  /** 字号 */
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  /** 行高 */
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
  /** 字重 */
  fontWeight: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
}

/**
 * 主题动画
 */
export interface ThemeAnimation {
  /** 过渡时长 */
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  /** 缓动函数 */
  easing: {
    default: string;
    in: string;
    out: string;
    inOut: string;
  };
}

/**
 * 完整主题定义
 */
export interface Theme {
  /** 元数据 */
  metadata: ThemeMetadata;
  /** 配色 */
  colors: ThemeColors;
  /** 间距 */
  spacing: ThemeSpacing;
  /** 圆角 */
  radius: ThemeRadius;
  /** 阴影 */
  shadow: ThemeShadow;
  /** 排版 */
  typography: ThemeTypography;
  /** 动画 */
  animation: ThemeAnimation;
  /** 自定义 CSS 变量 */
  customVariables?: CSSVariables;
}

/**
 * 主题管理器选项
 */
export interface ThemeManagerOptions {
  /** 默认主题 ID */
  defaultTheme?: string;
  /** 自动检测系统主题 */
  autoDetect?: boolean;
  /** 主题列表 */
  themes?: Theme[];
  /** 自动应用 CSS 变量到 DOM（默认 true） */
  autoApply?: boolean;
  /** 开发模式 CSS 加载器选项 */
  devCssLoader?: {
    /** 主题包的 CSS 基础路径 */
    themeBasePath?: string;
    /** 需要加载的组件 CSS 文件列表 */
    componentFiles?: string[];
  };
}

/**
 * 主题变更事件
 */
export interface ThemeChangeEvent {
  /** 前一个主题 */
  previousTheme: string;
  /** 当前主题 */
  currentTheme: string;
}
