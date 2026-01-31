# ThemeManager API参考

`ThemeManager`负责主题的注册、管理和应用，支持内置主题和自定义主题。

## 类型定义

```typescript
class ThemeManager {
  constructor(logger: Logger, eventBus?: EventBus);
  
  register(theme: Theme): void;
  unregister(themeId: string): void;
  apply(themeId: string): void;
  getCurrentTheme(): string | null;
  getTheme(themeId: string): Theme | undefined;
  listThemes(): ThemeInfo[];
  has(themeId: string): boolean;
}
```

---

## 主题类型定义

```typescript
interface Theme {
  id: string;                    // 主题唯一标识
  name: string;                  // 主题名称
  description?: string;          // 主题描述
  colors: ThemeColors;           // 颜色配置
  typography?: ThemeTypography;  // 字体配置
  spacing?: ThemeSpacing;        // 间距配置
  shadows?: ThemeShadows;        // 阴影配置
  borderRadius?: ThemeBorderRadius; // 圆角配置
}

interface ThemeColors {
  // 主色
  primary: string;
  primaryLight?: string;
  primaryDark?: string;
  
  // 辅助色
  secondary: string;
  secondaryLight?: string;
  secondaryDark?: string;
  
  // 背景色
  background: string;
  surface: string;
  
  // 文本色
  text: string;
  textSecondary?: string;
  textDisabled?: string;
  
  // 状态色
  error?: string;
  warning?: string;
  info?: string;
  success?: string;
  
  // 边框色
  border?: string;
  divider?: string;
}

interface ThemeTypography {
  fontFamily: string;
  fontSize: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
}

interface ThemeSpacing {
  unit: number;  // 基础间距单位，默认8px
}

interface ThemeShadows {
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

interface ThemeBorderRadius {
  sm?: string;
  md?: string;
  lg?: string;
  full?: string;
}
```

---

## 方法详解

### `register(theme)`

注册一个新主题。

**参数:**
- `theme: Theme` - 主题对象

**示例:**
```typescript
import { ThemeManager } from '@chips/sdk';

const themeManager = new ThemeManager(logger, eventBus);

// 注册自定义主题
themeManager.register({
  id: 'custom-blue',
  name: '蓝色主题',
  description: '以蓝色为主色调的主题',
  colors: {
    primary: '#1976d2',
    primaryLight: '#4791db',
    primaryDark: '#115293',
    secondary: '#424242',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#212121',
    textSecondary: '#757575',
    error: '#d32f2f',
    success: '#388e3c',
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
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
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px',
  },
});
```

---

### `unregister(themeId)`

注销一个主题。

**参数:**
- `themeId: string` - 主题ID

**示例:**
```typescript
// 注销主题
themeManager.unregister('custom-blue');
```

---

### `apply(themeId)`

应用指定主题。

**参数:**
- `themeId: string` - 主题ID

**事件:**
- `theme:change` - 主题切换事件

**异常:**
- 如果主题不存在，会抛出错误

**示例:**
```typescript
// 应用内置主题
themeManager.apply('light');
themeManager.apply('dark');

// 应用自定义主题
themeManager.apply('custom-blue');

// 监听主题切换
eventBus.on('theme:change', (themeId) => {
  console.log('Theme changed to:', themeId);
});
```

---

### `getCurrentTheme()`

获取当前应用的主题ID。

**返回:** `string | null` - 主题ID，未设置则返回null

**示例:**
```typescript
const currentTheme = themeManager.getCurrentTheme();
if (currentTheme) {
  console.log('Current theme:', currentTheme);
} else {
  console.log('No theme applied');
}
```

---

### `getTheme(themeId)`

获取指定主题的完整配置。

**参数:**
- `themeId: string` - 主题ID

**返回:** `Theme | undefined` - 主题对象，不存在则返回undefined

**示例:**
```typescript
const theme = themeManager.getTheme('light');
if (theme) {
  console.log('Theme colors:', theme.colors);
  console.log('Typography:', theme.typography);
}
```

---

### `listThemes()`

列出所有已注册的主题。

**返回:** `ThemeInfo[]` - 主题信息数组

**类型:**
```typescript
interface ThemeInfo {
  id: string;
  name: string;
  description?: string;
}
```

**示例:**
```typescript
const themes = themeManager.listThemes();

console.log('Available themes:');
themes.forEach(theme => {
  console.log(`- ${theme.id}: ${theme.name}`);
  if (theme.description) {
    console.log(`  ${theme.description}`);
  }
});
```

---

### `has(themeId)`

检查主题是否已注册。

**参数:**
- `themeId: string` - 主题ID

**返回:** `boolean` - 是否存在

**示例:**
```typescript
if (themeManager.has('dark')) {
  themeManager.apply('dark');
} else {
  console.warn('Dark theme not available');
}
```

---

## 内置主题

### Light (浅色主题)

```typescript
const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  colors: {
    primary: '#1976d2',
    secondary: '#424242',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#212121',
    textSecondary: '#757575',
    border: '#e0e0e0',
    error: '#d32f2f',
    warning: '#f57c00',
    info: '#0288d1',
    success: '#388e3c',
  },
};
```

### Dark (深色主题)

```typescript
const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  colors: {
    primary: '#90caf9',
    secondary: '#ce93d8',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    border: '#333333',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3',
    success: '#4caf50',
  },
};
```

---

## 完整使用示例

### 示例1: 创建和应用自定义主题

```typescript
import { ThemeManager, Logger, EventBus } from '@chips/sdk';

async function setupCustomTheme() {
  const logger = new Logger();
  const eventBus = new EventBus();
  const themeManager = new ThemeManager(logger, eventBus);
  
  // 定义自定义主题
  const myTheme: Theme = {
    id: 'ocean',
    name: 'Ocean',
    description: '海洋风格主题',
    colors: {
      primary: '#006994',
      primaryLight: '#35a0c5',
      primaryDark: '#004866',
      secondary: '#00a6a6',
      background: '#f0f8ff',
      surface: '#ffffff',
      text: '#263238',
      textSecondary: '#546e7a',
      border: '#b0bec5',
      error: '#c62828',
      warning: '#f9a825',
      info: '#0277bd',
      success: '#2e7d32',
    },
    typography: {
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      fontSize: '15px',
      lineHeight: '1.6',
      letterSpacing: '0.02em',
    },
    spacing: {
      unit: 8,
    },
    shadows: {
      sm: '0 2px 4px rgba(0,105,148,0.1)',
      md: '0 4px 8px rgba(0,105,148,0.15)',
      lg: '0 8px 16px rgba(0,105,148,0.2)',
      xl: '0 16px 32px rgba(0,105,148,0.25)',
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      full: '9999px',
    },
  };
  
  // 注册主题
  themeManager.register(myTheme);
  
  // 应用主题
  themeManager.apply('ocean');
  
  console.log('Custom theme applied');
}
```

### 示例2: 主题切换器

```typescript
function createThemeSwitcher() {
  const themeManager = sdk.themeManager;
  const themes = themeManager.listThemes();
  
  // 创建主题选择器UI
  const select = document.createElement('select');
  select.id = 'theme-switcher';
  
  themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    select.appendChild(option);
  });
  
  // 设置当前主题
  const currentTheme = themeManager.getCurrentTheme();
  if (currentTheme) {
    select.value = currentTheme;
  }
  
  // 监听切换
  select.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    themeManager.apply(target.value);
  });
  
  // 添加到页面
  document.body.appendChild(select);
}
```

### 示例3: 响应系统主题

```typescript
function setupSystemTheme() {
  const themeManager = sdk.themeManager;
  
  // 检测系统主题偏好
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  // 应用初始主题
  const theme = darkModeQuery.matches ? 'dark' : 'light';
  themeManager.apply(theme);
  
  // 监听系统主题变化
  darkModeQuery.addEventListener('change', (e) => {
    const newTheme = e.matches ? 'dark' : 'light';
    themeManager.apply(newTheme);
  });
}
```

### 示例4: 主题预览

```typescript
async function previewTheme(themeId: string) {
  const themeManager = sdk.themeManager;
  
  // 保存当前主题
  const originalTheme = themeManager.getCurrentTheme();
  
  // 应用预览主题
  themeManager.apply(themeId);
  
  // 显示预览
  const preview = document.getElementById('theme-preview');
  preview.style.display = 'block';
  
  // 3秒后恢复
  setTimeout(() => {
    if (originalTheme) {
      themeManager.apply(originalTheme);
    }
    preview.style.display = 'none';
  }, 3000);
}
```

### 示例5: 动态主题生成

```typescript
function generateTheme(baseColor: string): Theme {
  // 简单的颜色变化算法（实际项目中应使用专业库）
  const lighten = (color: string) => color; // 简化
  const darken = (color: string) => color;  // 简化
  
  return {
    id: `custom-${Date.now()}`,
    name: 'Generated Theme',
    colors: {
      primary: baseColor,
      primaryLight: lighten(baseColor),
      primaryDark: darken(baseColor),
      secondary: '#424242',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#212121',
      textSecondary: '#757575',
    },
    typography: {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
    },
  };
}

// 使用
const themeManager = sdk.themeManager;
const theme = generateTheme('#e91e63'); // 粉色
themeManager.register(theme);
themeManager.apply(theme.id);
```

### 示例6: 主题持久化

```typescript
class ThemePersistence {
  private themeManager: ThemeManager;
  private storageKey = 'chips-theme';
  
  constructor(themeManager: ThemeManager) {
    this.themeManager = themeManager;
    this.loadTheme();
    this.setupAutoSave();
  }
  
  // 加载保存的主题
  private loadTheme() {
    const savedTheme = localStorage.getItem(this.storageKey);
    if (savedTheme && this.themeManager.has(savedTheme)) {
      this.themeManager.apply(savedTheme);
    }
  }
  
  // 自动保存主题
  private setupAutoSave() {
    eventBus.on('theme:change', (themeId: string) => {
      localStorage.setItem(this.storageKey, themeId);
    });
  }
  
  // 清除保存的主题
  clearSavedTheme() {
    localStorage.removeItem(this.storageKey);
  }
}

// 使用
const persistence = new ThemePersistence(sdk.themeManager);
```

---

## CSS变量集成

主题应用时会自动设置CSS变量：

```css
:root {
  --chips-primary: #1976d2;
  --chips-secondary: #424242;
  --chips-background: #ffffff;
  --chips-surface: #f5f5f5;
  --chips-text: #212121;
  --chips-text-secondary: #757575;
  
  --chips-font-family: 'Arial, sans-serif';
  --chips-font-size: 14px;
  --chips-line-height: 1.5;
  
  --chips-spacing-unit: 8px;
  
  --chips-shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
  --chips-shadow-md: 0 4px 6px rgba(0,0,0,0.16);
  
  --chips-radius-sm: 4px;
  --chips-radius-md: 8px;
}
```

在样式中使用：

```css
.my-component {
  background-color: var(--chips-surface);
  color: var(--chips-text);
  padding: calc(var(--chips-spacing-unit) * 2);
  border-radius: var(--chips-radius-md);
  box-shadow: var(--chips-shadow-sm);
}
```

---

## 最佳实践

### 1. 提供完整的颜色配置

```typescript
const theme: Theme = {
  id: 'complete',
  name: 'Complete Theme',
  colors: {
    // 主色（必需）
    primary: '#1976d2',
    primaryLight: '#4791db',
    primaryDark: '#115293',
    
    // 辅助色（必需）
    secondary: '#424242',
    secondaryLight: '#6d6d6d',
    secondaryDark: '#1b1b1b',
    
    // 背景（必需）
    background: '#ffffff',
    surface: '#f5f5f5',
    
    // 文本（必需）
    text: '#212121',
    textSecondary: '#757575',
    textDisabled: '#9e9e9e',
    
    // 状态色（推荐）
    error: '#d32f2f',
    warning: '#f57c00',
    info: '#0288d1',
    success: '#388e3c',
    
    // 边框（推荐）
    border: '#e0e0e0',
    divider: '#bdbdbd',
  },
};
```

### 2. 测试主题对比度

确保文本和背景有足够的对比度（WCAG标准）：

```typescript
function checkContrast(foreground: string, background: string): number {
  // 计算对比度的实现（简化）
  // 实际应使用专业库
  return 4.5; // 返回对比度比值
}

const contrast = checkContrast(theme.colors.text, theme.colors.background);
if (contrast < 4.5) {
  console.warn('Contrast ratio too low');
}
```

### 3. 提供主题预设

```typescript
const themePresets = {
  light: lightTheme,
  dark: darkTheme,
  highContrast: highContrastTheme,
  colorBlind: colorBlindFriendlyTheme,
};

// 批量注册
Object.values(themePresets).forEach(theme => {
  themeManager.register(theme);
});
```

### 4. 主题验证

```typescript
function validateTheme(theme: Theme): boolean {
  const requiredColors = [
    'primary', 'secondary', 'background', 
    'surface', 'text'
  ];
  
  return requiredColors.every(color => 
    color in theme.colors && theme.colors[color]
  );
}

if (validateTheme(myTheme)) {
  themeManager.register(myTheme);
} else {
  console.error('Invalid theme configuration');
}
```

---

## 相关文档

- [ChipsSDK 文档](./ChipsSDK.md)
- [RendererEngine 文档](./RendererEngine.md)
- [主题开发指南](../guides/theme-development.md)
- [最佳实践](../best-practices/theming.md)
