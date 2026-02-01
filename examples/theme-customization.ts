/**
 * Chips SDK 主题定制示例
 *
 * 本示例展示了如何定制和使用主题，包括：
 * - 创建自定义主题
 * - 主题继承机制
 * - 应用主题到 DOM
 * - 响应系统主题变化
 * - 动态主题切换
 *
 * @module examples/theme-customization
 */

import {
  ChipsSDK,
  Theme,
  ThemeColors,
  ThemeSpacing,
  ThemeRadius,
  ThemeShadow,
  ThemeTypography,
  ThemeAnimation,
  ThemeMetadata,
  ThemeChangeEvent,
} from '@chips/sdk';

// ============================================================
// 第一部分：创建自定义主题
// ============================================================

/**
 * 创建完整的自定义亮色主题
 *
 * 主题包含颜色、间距、圆角、阴影、排版和动画等多个方面
 */
const oceanLightTheme: Theme = {
  // 主题元数据
  metadata: {
    id: 'ocean-light',
    name: '海洋亮色主题',
    type: 'light',
    version: '1.0.0',
    description: '清新的海洋风格亮色主题',
    author: '薯片团队',
    preview: '/themes/ocean-light-preview.png',
  },

  // 配色方案
  colors: {
    primary: '#0077b6', // 主色 - 海洋蓝
    secondary: '#00b4d8', // 辅助色 - 浅海蓝
    accent: '#ff6b6b', // 强调色 - 珊瑚红
    background: '#ffffff', // 背景色
    surface: '#f0f9ff', // 表面色 - 淡蓝
    text: '#023e8a', // 文字色 - 深蓝
    textSecondary: '#48cae4', // 次要文字色
    border: '#90e0ef', // 边框色 - 浅蓝
    error: '#dc2626', // 错误色
    warning: '#f59e0b', // 警告色
    success: '#059669', // 成功色
    info: '#0077b6', // 信息色
  },

  // 间距系统
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    xxl: '3rem', // 48px
  },

  // 圆角系统
  radius: {
    none: '0',
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '1rem', // 16px
    full: '9999px', // 圆形
  },

  // 阴影系统
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 119, 182, 0.05)',
    md: '0 4px 6px -1px rgba(0, 119, 182, 0.1), 0 2px 4px -1px rgba(0, 119, 182, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 119, 182, 0.1), 0 4px 6px -2px rgba(0, 119, 182, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 119, 182, 0.1), 0 10px 10px -5px rgba(0, 119, 182, 0.04)',
  },

  // 排版系统
  typography: {
    fontFamily:
      '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontFamilyMono:
      '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", monospace',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      xxl: '1.5rem', // 24px
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // 动画系统
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // 自定义 CSS 变量（可选）
  customVariables: {
    '--chips-gradient-primary': 'linear-gradient(135deg, #0077b6 0%, #00b4d8 100%)',
    '--chips-gradient-accent': 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
    '--chips-blur-sm': 'blur(4px)',
    '--chips-blur-md': 'blur(8px)',
    '--chips-blur-lg': 'blur(16px)',
  },
};

/**
 * 创建对应的暗色主题
 *
 * 通常暗色主题会复用亮色主题的间距、圆角等，主要修改颜色
 */
const oceanDarkTheme: Theme = {
  metadata: {
    id: 'ocean-dark',
    name: '海洋暗色主题',
    type: 'dark',
    version: '1.0.0',
    description: '深邃的海洋风格暗色主题',
    author: '薯片团队',
    preview: '/themes/ocean-dark-preview.png',
  },
  colors: {
    primary: '#00b4d8', // 亮一点的主色
    secondary: '#48cae4',
    accent: '#ff8585',
    background: '#03045e', // 深海蓝背景
    surface: '#023e8a',
    text: '#caf0f8', // 浅色文字
    textSecondary: '#90e0ef',
    border: '#0077b6',
    error: '#f87171',
    warning: '#fbbf24',
    success: '#34d399',
    info: '#60a5fa',
  },
  // 复用亮色主题的其他属性
  spacing: oceanLightTheme.spacing,
  radius: oceanLightTheme.radius,
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  },
  typography: oceanLightTheme.typography,
  animation: oceanLightTheme.animation,
  customVariables: {
    '--chips-gradient-primary': 'linear-gradient(135deg, #00b4d8 0%, #48cae4 100%)',
    '--chips-gradient-accent': 'linear-gradient(135deg, #ff8585 0%, #ffb347 100%)',
    '--chips-blur-sm': 'blur(4px)',
    '--chips-blur-md': 'blur(8px)',
    '--chips-blur-lg': 'blur(16px)',
  },
};

// ============================================================
// 第二部分：主题继承
// ============================================================

/**
 * 使用继承创建主题变体
 *
 * 通过 extends 属性继承父主题，只需定义差异部分
 */
const coralAccentTheme: Theme = {
  metadata: {
    id: 'ocean-coral',
    name: '珊瑚变体主题',
    type: 'light',
    version: '1.0.0',
    description: '基于海洋主题的珊瑚色变体',
    extends: 'ocean-light', // 继承海洋亮色主题
  },
  // 只覆盖需要修改的颜色
  colors: {
    ...oceanLightTheme.colors,
    primary: '#ff6b6b', // 珊瑚红作为主色
    secondary: '#ff8585',
    accent: '#0077b6', // 蓝色作为强调色
  },
  // 其他属性会从父主题继承
  spacing: oceanLightTheme.spacing,
  radius: oceanLightTheme.radius,
  shadow: oceanLightTheme.shadow,
  typography: oceanLightTheme.typography,
  animation: oceanLightTheme.animation,
};

/**
 * 创建紧凑型主题变体
 *
 * 继承颜色和样式，但使用更小的间距
 */
const compactTheme: Theme = {
  metadata: {
    id: 'ocean-compact',
    name: '紧凑型主题',
    type: 'light',
    version: '1.0.0',
    description: '适用于信息密集场景的紧凑主题',
    extends: 'ocean-light',
  },
  colors: oceanLightTheme.colors,
  // 使用更小的间距
  spacing: {
    xs: '0.125rem', // 2px
    sm: '0.25rem', // 4px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    xxl: '1.5rem', // 24px
  },
  // 使用更小的圆角
  radius: {
    none: '0',
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.5rem',
    full: '9999px',
  },
  shadow: oceanLightTheme.shadow,
  // 使用更小的字号
  typography: {
    ...oceanLightTheme.typography,
    fontSize: {
      xs: '0.625rem', // 10px
      sm: '0.75rem', // 12px
      base: '0.875rem', // 14px
      lg: '1rem', // 16px
      xl: '1.125rem', // 18px
      xxl: '1.25rem', // 20px
    },
  },
  animation: oceanLightTheme.animation,
};

// ============================================================
// 第三部分：注册和使用主题
// ============================================================

/**
 * 注册所有自定义主题
 */
function registerThemes(sdk: ChipsSDK): void {
  // 注册海洋主题系列
  sdk.registerTheme(oceanLightTheme);
  sdk.registerTheme(oceanDarkTheme);
  sdk.registerTheme(coralAccentTheme);
  sdk.registerTheme(compactTheme);

  console.log('自定义主题已注册');

  // 查看所有可用主题
  const themes = sdk.themes.listThemes();
  console.log('可用主题列表:');
  themes.forEach((theme) => {
    console.log(`  - ${theme.name} (${theme.id}) [${theme.type}]`);
  });
}

/**
 * 切换主题
 */
function switchTheme(sdk: ChipsSDK, themeId: string): void {
  // 检查主题是否存在
  if (!sdk.themes.hasTheme(themeId)) {
    console.error(`主题不存在: ${themeId}`);
    return;
  }

  // 使用便捷方法切换主题
  sdk.setTheme(themeId);
  console.log(`主题已切换为: ${themeId}`);

  // 获取当前主题信息
  const currentTheme = sdk.themes.getTheme();
  console.log('当前主题:', currentTheme.metadata.name);
}

/**
 * 应用主题到 DOM
 */
function applyThemeToDOM(sdk: ChipsSDK): void {
  // 应用到 document.documentElement（默认）
  sdk.themes.applyToDOM();
  console.log('主题已应用到 DOM');

  // 或应用到指定元素
  const container = document.getElementById('app');
  if (container) {
    sdk.themes.applyToDOM(container);
    console.log('主题已应用到 #app 容器');
  }
}

/**
 * 获取和使用 CSS 变量
 */
function useCSSVariables(sdk: ChipsSDK): void {
  // 获取所有 CSS 变量
  const cssVars = sdk.themes.getCSSVariables();

  console.log('CSS 变量示例:');
  console.log(`  主色: ${cssVars['--chips-color-primary']}`);
  console.log(`  背景色: ${cssVars['--chips-color-background']}`);
  console.log(`  中等间距: ${cssVars['--chips-spacing-md']}`);
  console.log(`  字体: ${cssVars['--chips-font-family']}`);

  // 在代码中使用 CSS 变量
  const element = document.createElement('div');
  element.style.cssText = `
    background: var(--chips-color-surface);
    color: var(--chips-color-text);
    padding: var(--chips-spacing-md);
    border-radius: var(--chips-radius-md);
    box-shadow: var(--chips-shadow-md);
    font-family: var(--chips-font-family);
    transition: all var(--chips-duration-normal) var(--chips-easing-default);
  `;
}

// ============================================================
// 第四部分：响应系统主题变化
// ============================================================

/**
 * 监听主题变化事件
 */
function listenToThemeChanges(sdk: ChipsSDK): void {
  // 订阅主题变化事件
  sdk.on<ThemeChangeEvent>('theme:changed', (event) => {
    console.log(`主题已变更: ${event.previousTheme} -> ${event.currentTheme}`);

    // 重新应用主题到 DOM
    sdk.themes.applyToDOM();

    // 可以在这里执行其他更新操作
    updateUIAfterThemeChange(event);
  });

  // 订阅主题注册事件
  sdk.on<{ id: string }>('theme:registered', (event) => {
    console.log(`新主题已注册: ${event.id}`);
  });
}

/**
 * 主题变更后的 UI 更新
 */
function updateUIAfterThemeChange(event: ThemeChangeEvent): void {
  // 更新状态栏显示
  const statusBar = document.getElementById('theme-status');
  if (statusBar) {
    statusBar.textContent = `当前主题: ${event.currentTheme}`;
  }

  // 触发自定义事件供其他组件响应
  window.dispatchEvent(
    new CustomEvent('chips-theme-changed', {
      detail: event,
    })
  );
}

/**
 * 响应系统主题偏好
 */
function handleSystemThemePreference(sdk: ChipsSDK): void {
  // 检测系统主题
  const systemTheme = sdk.themes.detectSystemTheme();
  console.log(`系统主题偏好: ${systemTheme}`);

  // 自动应用系统主题
  sdk.themes.applySystemTheme();

  // 监听系统主题变化
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (e) => {
      console.log(`系统主题已变更为: ${e.matches ? 'dark' : 'light'}`);

      // 自动切换到对应的主题
      if (e.matches) {
        sdk.setTheme('ocean-dark');
      } else {
        sdk.setTheme('ocean-light');
      }

      // 应用到 DOM
      sdk.themes.applyToDOM();
    });

    console.log('已设置系统主题变化监听');
  }
}

// ============================================================
// 第五部分：主题构建器
// ============================================================

/**
 * 主题构建器类
 *
 * 提供流畅的 API 来构建主题
 */
class ThemeBuilder {
  private _theme: Partial<Theme> = {};

  /**
   * 设置主题元数据
   */
  metadata(metadata: ThemeMetadata): ThemeBuilder {
    this._theme.metadata = metadata;
    return this;
  }

  /**
   * 设置配色
   */
  colors(colors: ThemeColors): ThemeBuilder {
    this._theme.colors = colors;
    return this;
  }

  /**
   * 设置间距
   */
  spacing(spacing: ThemeSpacing): ThemeBuilder {
    this._theme.spacing = spacing;
    return this;
  }

  /**
   * 设置圆角
   */
  radius(radius: ThemeRadius): ThemeBuilder {
    this._theme.radius = radius;
    return this;
  }

  /**
   * 设置阴影
   */
  shadow(shadow: ThemeShadow): ThemeBuilder {
    this._theme.shadow = shadow;
    return this;
  }

  /**
   * 设置排版
   */
  typography(typography: ThemeTypography): ThemeBuilder {
    this._theme.typography = typography;
    return this;
  }

  /**
   * 设置动画
   */
  animation(animation: ThemeAnimation): ThemeBuilder {
    this._theme.animation = animation;
    return this;
  }

  /**
   * 添加自定义变量
   */
  customVariable(name: string, value: string): ThemeBuilder {
    if (!this._theme.customVariables) {
      this._theme.customVariables = {};
    }
    this._theme.customVariables[name] = value;
    return this;
  }

  /**
   * 从现有主题继承
   */
  extendFrom(theme: Theme): ThemeBuilder {
    this._theme = { ...theme };
    return this;
  }

  /**
   * 构建主题
   */
  build(): Theme {
    // 验证必需字段
    if (!this._theme.metadata) {
      throw new Error('主题元数据是必需的');
    }
    if (!this._theme.colors) {
      throw new Error('主题配色是必需的');
    }
    if (!this._theme.spacing) {
      throw new Error('主题间距是必需的');
    }
    if (!this._theme.radius) {
      throw new Error('主题圆角是必需的');
    }
    if (!this._theme.shadow) {
      throw new Error('主题阴影是必需的');
    }
    if (!this._theme.typography) {
      throw new Error('主题排版是必需的');
    }
    if (!this._theme.animation) {
      throw new Error('主题动画是必需的');
    }

    return this._theme as Theme;
  }
}

/**
 * 使用构建器创建主题
 */
function createThemeWithBuilder(): Theme {
  return new ThemeBuilder()
    .metadata({
      id: 'builder-theme',
      name: '构建器创建的主题',
      type: 'light',
      version: '1.0.0',
    })
    .colors({
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      background: '#ffffff',
      surface: '#f5f3ff',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      error: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      info: '#3b82f6',
    })
    .spacing({
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem',
    })
    .radius({
      none: '0',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      full: '9999px',
    })
    .shadow({
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    })
    .typography({
      fontFamily: 'system-ui, sans-serif',
      fontFamilyMono: 'monospace',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        xxl: '1.5rem',
      },
      lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    })
    .animation({
      duration: {
        fast: '100ms',
        normal: '200ms',
        slow: '300ms',
      },
      easing: {
        default: 'ease',
        in: 'ease-in',
        out: 'ease-out',
        inOut: 'ease-in-out',
      },
    })
    .customVariable('--app-header-height', '64px')
    .customVariable('--app-sidebar-width', '280px')
    .build();
}

// ============================================================
// 第六部分：实用工具函数
// ============================================================

/**
 * 生成颜色变体
 */
function generateColorVariants(baseColor: string): Record<string, string> {
  // 这是一个简化的示例，实际应用中可能需要更复杂的颜色处理
  return {
    50: lightenColor(baseColor, 0.9),
    100: lightenColor(baseColor, 0.8),
    200: lightenColor(baseColor, 0.6),
    300: lightenColor(baseColor, 0.4),
    400: lightenColor(baseColor, 0.2),
    500: baseColor,
    600: darkenColor(baseColor, 0.1),
    700: darkenColor(baseColor, 0.2),
    800: darkenColor(baseColor, 0.3),
    900: darkenColor(baseColor, 0.4),
  };
}

/**
 * 简单的颜色加亮函数
 */
function lightenColor(color: string, amount: number): string {
  // 将十六进制颜色转换为 RGB，然后加亮
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const newR = Math.round(r + (255 - r) * amount);
  const newG = Math.round(g + (255 - g) * amount);
  const newB = Math.round(b + (255 - b) * amount);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * 简单的颜色加深函数
 */
function darkenColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const newR = Math.round(r * (1 - amount));
  const newG = Math.round(g * (1 - amount));
  const newB = Math.round(b * (1 - amount));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * 检查颜色对比度是否符合 WCAG 标准
 */
function checkColorContrast(foreground: string, background: string): {
  ratio: number;
  passAA: boolean;
  passAAA: boolean;
} {
  // 计算相对亮度
  const getLuminance = (color: string): number => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio,
    passAA: ratio >= 4.5, // AA 标准要求 4.5:1
    passAAA: ratio >= 7, // AAA 标准要求 7:1
  };
}

// ============================================================
// 导出和运行
// ============================================================

export {
  oceanLightTheme,
  oceanDarkTheme,
  coralAccentTheme,
  compactTheme,
  ThemeBuilder,
  registerThemes,
  switchTheme,
  applyThemeToDOM,
  handleSystemThemePreference,
  generateColorVariants,
  checkColorContrast,
};

// 完整示例运行
async function runExample(): Promise<void> {
  // 初始化 SDK
  const sdk = new ChipsSDK({
    connector: { url: 'ws://localhost:9527' },
    autoConnect: true,
    theme: {
      defaultTheme: 'default-light',
      autoDetect: true,
    },
  });

  await sdk.initialize();

  try {
    // 1. 注册自定义主题
    console.log('=== 步骤 1: 注册主题 ===');
    registerThemes(sdk);

    // 2. 设置主题变化监听
    console.log('\n=== 步骤 2: 设置监听 ===');
    listenToThemeChanges(sdk);

    // 3. 切换主题
    console.log('\n=== 步骤 3: 切换主题 ===');
    switchTheme(sdk, 'ocean-light');

    // 4. 获取 CSS 变量
    console.log('\n=== 步骤 4: CSS 变量 ===');
    useCSSVariables(sdk);

    // 5. 处理系统主题偏好
    console.log('\n=== 步骤 5: 系统主题 ===');
    handleSystemThemePreference(sdk);

    // 6. 使用构建器创建主题
    console.log('\n=== 步骤 6: 使用构建器 ===');
    const builderTheme = createThemeWithBuilder();
    sdk.registerTheme(builderTheme);
    console.log(`构建器主题已创建: ${builderTheme.metadata.name}`);

    // 7. 颜色工具演示
    console.log('\n=== 步骤 7: 颜色工具 ===');
    const primaryVariants = generateColorVariants('#0077b6');
    console.log('主色变体:', primaryVariants);

    const contrast = checkColorContrast('#023e8a', '#ffffff');
    console.log('颜色对比度检查:', contrast);
  } finally {
    sdk.destroy();
  }
}

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runExample()
    .then(() => {
      console.log('\n主题示例运行完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n主题示例运行失败:', error);
      process.exit(1);
    });
}
