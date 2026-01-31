# 主题开发指南

本指南将帮助你创建自定义主题，为Chips SDK提供个性化的视觉风格。

---

## 主题简介

主题是一组视觉配置，包括：
- **颜色** - 主色、背景色、文本色等
- **字体** - 字体家族、大小、行高等
- **间距** - 边距、内距等
- **阴影** - 元素阴影效果
- **圆角** - 边框圆角大小

---

## 主题结构

### 完整主题定义

```typescript
import type { Theme } from '@chips/sdk';

const myTheme: Theme = {
  // 基本信息
  id: 'my-theme',                    // 唯一标识
  name: 'My Theme',                  // 显示名称
  description: '我的自定义主题',     // 描述（可选）
  
  // 颜色配置
  colors: {
    // 主色
    primary: '#1976d2',
    primaryLight: '#4791db',
    primaryDark: '#115293',
    
    // 辅助色
    secondary: '#424242',
    secondaryLight: '#6d6d6d',
    secondaryDark: '#1b1b1b',
    
    // 背景色
    background: '#ffffff',
    surface: '#f5f5f5',
    
    // 文本色
    text: '#212121',
    textSecondary: '#757575',
    textDisabled: '#9e9e9e',
    
    // 状态色
    error: '#d32f2f',
    warning: '#f57c00',
    info: '#0288d1',
    success: '#388e3c',
    
    // 边框色
    border: '#e0e0e0',
    divider: '#bdbdbd',
  },
  
  // 字体配置
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.5',
    letterSpacing: '0.00938em',
  },
  
  // 间距配置
  spacing: {
    unit: 8,  // 基础单位（px）
  },
  
  // 阴影配置
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12)',
    md: '0 4px 6px rgba(0,0,0,0.16)',
    lg: '0 10px 20px rgba(0,0,0,0.19)',
    xl: '0 15px 30px rgba(0,0,0,0.25)',
  },
  
  // 圆角配置
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px',
  },
};

export default myTheme;
```

---

## 快速开始

### 1. 创建基础主题

```typescript
import type { Theme } from '@chips/sdk';

const simpleTheme: Theme = {
  id: 'simple',
  name: 'Simple Theme',
  colors: {
    primary: '#3f51b5',
    secondary: '#ff4081',
    background: '#fafafa',
    surface: '#ffffff',
    text: '#212121',
    textSecondary: '#757575',
  },
};

export default simpleTheme;
```

### 2. 注册主题

```typescript
import { ChipsSDK } from '@chips/sdk';
import simpleTheme from './simple-theme';

const sdk = new ChipsSDK();

// 注册主题
sdk.themeManager.register(simpleTheme);

// 应用主题
sdk.setTheme('simple');
```

---

## 颜色系统

### 颜色类型

#### 主色 (Primary)

主色是品牌的主要颜色，用于主要操作按钮、重点元素等。

```typescript
colors: {
  primary: '#1976d2',        // 主色
  primaryLight: '#4791db',   // 浅色变体（hover状态）
  primaryDark: '#115293',    // 深色变体（active状态）
}
```

#### 辅助色 (Secondary)

辅助色用于次要元素、强调和对比。

```typescript
colors: {
  secondary: '#424242',
  secondaryLight: '#6d6d6d',
  secondaryDark: '#1b1b1b',
}
```

#### 背景色

```typescript
colors: {
  background: '#ffffff',     // 页面背景色
  surface: '#f5f5f5',       // 卡片/组件表面颜色
}
```

#### 文本色

```typescript
colors: {
  text: '#212121',           // 主要文本
  textSecondary: '#757575',  // 次要文本
  textDisabled: '#9e9e9e',   // 禁用文本
}
```

#### 状态色

```typescript
colors: {
  error: '#d32f2f',          // 错误
  warning: '#f57c00',        // 警告
  info: '#0288d1',           // 信息
  success: '#388e3c',        // 成功
}
```

### 颜色生成

可以使用工具生成颜色变体：

```typescript
// 简单的颜色变化函数（示例）
function lighten(color: string, amount: number): string {
  // 使用color库或自己实现
  // 返回变浅的颜色
}

function darken(color: string, amount: number): string {
  // 返回变深的颜色
}

// 生成主题
const baseColor = '#1976d2';
const theme: Theme = {
  id: 'generated',
  name: 'Generated Theme',
  colors: {
    primary: baseColor,
    primaryLight: lighten(baseColor, 20),
    primaryDark: darken(baseColor, 20),
    // ...
  },
};
```

### 对比度检查

确保文本和背景有足够的对比度（WCAG标准）：

```typescript
function getContrastRatio(foreground: string, background: string): number {
  // 计算对比度
  // WCAG AA标准要求至少4.5:1
  // WCAG AAA标准要求至少7:1
}

// 检查主题对比度
const ratio = getContrastRatio(theme.colors.text, theme.colors.background);
if (ratio < 4.5) {
  console.warn('Text contrast is too low');
}
```

---

## 主题示例

### Light Theme (浅色主题)

```typescript
const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  description: '清新明亮的浅色主题',
  colors: {
    primary: '#1976d2',
    primaryLight: '#4791db',
    primaryDark: '#115293',
    secondary: '#dc004e',
    secondaryLight: '#e33371',
    secondaryDark: '#9a0036',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#212121',
    textSecondary: '#757575',
    textDisabled: '#9e9e9e',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3',
    success: '#4caf50',
    border: '#e0e0e0',
    divider: '#bdbdbd',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  spacing: {
    unit: 8,
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12)',
    md: '0 4px 6px rgba(0,0,0,0.16)',
    lg: '0 10px 20px rgba(0,0,0,0.19)',
    xl: '0 15px 30px rgba(0,0,0,0.25)',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px',
  },
};
```

### Dark Theme (深色主题)

```typescript
const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  description: '护眼舒适的深色主题',
  colors: {
    primary: '#90caf9',
    primaryLight: '#b3d9f9',
    primaryDark: '#5d9bcb',
    secondary: '#ce93d8',
    secondaryLight: '#daaee3',
    secondaryDark: '#a06eb4',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    textDisabled: '#808080',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3',
    success: '#4caf50',
    border: '#333333',
    divider: '#424242',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  spacing: {
    unit: 8,
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.3)',
    md: '0 4px 6px rgba(0,0,0,0.4)',
    lg: '0 10px 20px rgba(0,0,0,0.5)',
    xl: '0 15px 30px rgba(0,0,0,0.6)',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px',
  },
};
```

### High Contrast Theme (高对比度主题)

```typescript
const highContrastTheme: Theme = {
  id: 'high-contrast',
  name: 'High Contrast',
  description: '高对比度主题，适合视力障碍用户',
  colors: {
    primary: '#0000ff',
    primaryLight: '#4d4dff',
    primaryDark: '#0000cc',
    secondary: '#ff00ff',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#000000',
    textSecondary: '#000000',
    error: '#ff0000',
    warning: '#ff8800',
    info: '#0088ff',
    success: '#00ff00',
    border: '#000000',
    divider: '#000000',
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    fontWeight: '700',
    lineHeight: '1.6',
  },
  spacing: {
    unit: 12,  // 更大的间距
  },
  shadows: {
    sm: 'none',
    md: 'none',
    lg: 'none',
    xl: 'none',
  },
  borderRadius: {
    sm: '0px',
    md: '0px',
    lg: '0px',
    full: '0px',
  },
};
```

### Nature Theme (自然主题)

```typescript
const natureTheme: Theme = {
  id: 'nature',
  name: 'Nature',
  description: '自然清新的绿色主题',
  colors: {
    primary: '#4caf50',
    primaryLight: '#80e27e',
    primaryDark: '#087f23',
    secondary: '#8bc34a',
    secondaryLight: '#bef67a',
    secondaryDark: '#5a9216',
    background: '#f1f8e9',
    surface: '#ffffff',
    text: '#1b5e20',
    textSecondary: '#558b2f',
    error: '#d32f2f',
    warning: '#f57c00',
    info: '#0288d1',
    success: '#4caf50',
    border: '#c5e1a5',
    divider: '#aed581',
  },
  typography: {
    fontFamily: '"Nunito", "Roboto", sans-serif',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  spacing: {
    unit: 8,
  },
  shadows: {
    sm: '0 2px 4px rgba(76,175,80,0.15)',
    md: '0 4px 8px rgba(76,175,80,0.2)',
    lg: '0 8px 16px rgba(76,175,80,0.25)',
    xl: '0 16px 32px rgba(76,175,80,0.3)',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '20px',
    full: '9999px',
  },
};
```

---

## 主题插件

将主题封装为插件：

```typescript
import type { Plugin } from '@chips/sdk';
import lightTheme from './themes/light';
import darkTheme from './themes/dark';
import natureTheme from './themes/nature';

const themePackPlugin: Plugin = {
  id: 'theme-pack',
  name: 'Theme Pack',
  version: '1.0.0',
  description: '主题包插件',
  
  async install(context) {
    const themeManager = context.sdk.themeManager;
    
    // 注册所有主题
    const themes = [lightTheme, darkTheme, natureTheme];
    themes.forEach(theme => {
      themeManager.register(theme);
      context.logger.info(`Registered theme: ${theme.name}`);
    });
  },
  
  async uninstall(context) {
    const themeManager = context.sdk.themeManager;
    
    // 注销所有主题
    ['light', 'dark', 'nature'].forEach(id => {
      themeManager.unregister(id);
    });
  },
};

export default themePackPlugin;
```

---

## CSS变量

主题应用后会自动设置CSS变量：

```css
:root {
  /* 颜色 */
  --chips-primary: #1976d2;
  --chips-primary-light: #4791db;
  --chips-primary-dark: #115293;
  --chips-secondary: #424242;
  --chips-background: #ffffff;
  --chips-surface: #f5f5f5;
  --chips-text: #212121;
  --chips-text-secondary: #757575;
  
  /* 字体 */
  --chips-font-family: 'Roboto', sans-serif;
  --chips-font-size: 14px;
  --chips-line-height: 1.5;
  
  /* 间距 */
  --chips-spacing-unit: 8px;
  
  /* 阴影 */
  --chips-shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
  --chips-shadow-md: 0 4px 6px rgba(0,0,0,0.16);
  
  /* 圆角 */
  --chips-radius-sm: 4px;
  --chips-radius-md: 8px;
}
```

### 使用CSS变量

```css
.my-card {
  background-color: var(--chips-surface);
  color: var(--chips-text);
  padding: calc(var(--chips-spacing-unit) * 2);
  border-radius: var(--chips-radius-md);
  box-shadow: var(--chips-shadow-sm);
  font-family: var(--chips-font-family);
}

.my-button {
  background-color: var(--chips-primary);
  color: #ffffff;
  padding: var(--chips-spacing-unit) calc(var(--chips-spacing-unit) * 2);
  border-radius: var(--chips-radius-sm);
}

.my-button:hover {
  background-color: var(--chips-primary-light);
}
```

---

## 主题切换

### 用户界面

```typescript
function createThemeSwitcher(sdk: ChipsSDK) {
  const container = document.createElement('div');
  container.className = 'theme-switcher';
  
  const select = document.createElement('select');
  const themes = sdk.themeManager.listThemes();
  
  themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    select.appendChild(option);
  });
  
  select.value = sdk.getCurrentTheme() || 'light';
  
  select.addEventListener('change', (e) => {
    const themeId = (e.target as HTMLSelectElement).value;
    sdk.setTheme(themeId);
  });
  
  container.appendChild(select);
  return container;
}

// 使用
const switcher = createThemeSwitcher(sdk);
document.body.appendChild(switcher);
```

### 响应系统主题

```typescript
function setupAutoTheme(sdk: ChipsSDK) {
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  // 应用初始主题
  const theme = darkModeQuery.matches ? 'dark' : 'light';
  sdk.setTheme(theme);
  
  // 监听变化
  darkModeQuery.addEventListener('change', (e) => {
    sdk.setTheme(e.matches ? 'dark' : 'light');
  });
}

setupAutoTheme(sdk);
```

### 持久化主题

```typescript
class ThemeStorage {
  private static KEY = 'chips-theme';
  
  static save(themeId: string) {
    localStorage.setItem(this.KEY, themeId);
  }
  
  static load(): string | null {
    return localStorage.getItem(this.KEY);
  }
  
  static clear() {
    localStorage.removeItem(this.KEY);
  }
}

// 应用保存的主题
const savedTheme = ThemeStorage.load();
if (savedTheme && sdk.themeManager.has(savedTheme)) {
  sdk.setTheme(savedTheme);
}

// 监听主题变化并保存
sdk.on('theme:change', (themeId: string) => {
  ThemeStorage.save(themeId);
});
```

---

## 最佳实践

### 1. 完整的颜色定义

提供所有必需的颜色，包括变体：

```typescript
colors: {
  primary: '#1976d2',
  primaryLight: '#4791db',    // 必需
  primaryDark: '#115293',     // 必需
  // ... 其他颜色
}
```

### 2. 保持足够的对比度

确保文本和背景有足够的对比度（WCAG AA标准至少4.5:1）。

### 3. 测试不同场景

在不同元素和状态下测试主题：
- 按钮（正常、hover、active、禁用）
- 输入框（正常、focus、错误）
- 卡片和列表
- 文本层级

### 4. 提供语义化的颜色

使用语义化的状态颜色：
- error (错误)
- warning (警告)
- info (信息)
- success (成功)

### 5. 考虑可访问性

为视力障碍用户提供高对比度主题选项。

### 6. 响应式字体

考虑不同屏幕尺寸的字体大小：

```typescript
typography: {
  fontFamily: 'Roboto, sans-serif',
  fontSize: '14px',  // 默认
  // 可以在应用主题时根据屏幕尺寸调整
}
```

---

## 调试主题

### 主题预览工具

```typescript
function previewTheme(sdk: ChipsSDK, themeId: string) {
  const theme = sdk.themeManager.getTheme(themeId);
  if (!theme) {
    console.error('Theme not found');
    return;
  }
  
  const preview = document.createElement('div');
  preview.className = 'theme-preview';
  preview.innerHTML = `
    <h2>${theme.name}</h2>
    <div class="color-swatches">
      <div style="background: ${theme.colors.primary}">Primary</div>
      <div style="background: ${theme.colors.secondary}">Secondary</div>
      <div style="background: ${theme.colors.background}; color: ${theme.colors.text}; border: 1px solid ${theme.colors.border}">Background</div>
      <div style="background: ${theme.colors.surface}; color: ${theme.colors.text}">Surface</div>
    </div>
    <div class="status-colors">
      <div style="background: ${theme.colors.error}">Error</div>
      <div style="background: ${theme.colors.warning}">Warning</div>
      <div style="background: ${theme.colors.info}">Info</div>
      <div style="background: ${theme.colors.success}">Success</div>
    </div>
  `;
  
  document.body.appendChild(preview);
}
```

---

## 下一步

- 查看[ThemeManager API](../api/ThemeManager.md)了解详细API
- 浏览[主题示例](../../examples/themes/)学习更多
- 阅读[最佳实践](../best-practices/theming.md)提高主题质量
