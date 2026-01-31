# 插件开发指南

本指南将帮助你创建自己的Chips SDK插件，扩展SDK功能。

---

## 插件简介

插件是扩展Chips SDK功能的独立模块，可以：
- 添加新的基础卡片类型
- 扩展渲染器功能
- 注册自定义主题
- 提供工具函数
- 集成第三方服务

---

## 插件结构

### 基础插件结构

```typescript
import type { Plugin, PluginContext } from '@chips/sdk';

const myPlugin: Plugin = {
  // 必需字段
  id: 'unique-plugin-id',        // 唯一标识符
  name: 'My Plugin',              // 显示名称
  version: '1.0.0',               // 语义化版本号
  
  // 可选字段
  description: '插件描述',
  author: 'Your Name',
  homepage: 'https://example.com',
  license: 'MIT',
  
  // 依赖声明
  dependencies: [],               // 依赖的其他插件
  peerDependencies: [],          // 对等依赖
  
  // 生命周期钩子
  async install(context) {
    // 插件安装逻辑
  },
  
  async enable(context) {
    // 插件启用逻辑
  },
  
  async disable(context) {
    // 插件禁用逻辑
  },
  
  async uninstall(context) {
    // 插件卸载逻辑
  },
};

export default myPlugin;
```

---

## 快速开始

### 1. 创建Hello World插件

```typescript
import type { Plugin } from '@chips/sdk';

const helloPlugin: Plugin = {
  id: 'hello-world',
  name: 'Hello World',
  version: '1.0.0',
  description: '我的第一个插件',
  
  async install(context) {
    context.logger.info('Hello World 插件已安装');
  },
  
  async enable(context) {
    context.logger.info('Hello World 插件已启用');
    
    // 监听卡片加载事件
    context.eventBus.on('card:load', (card) => {
      console.log(`卡片已加载: ${card.metadata.name}`);
    });
  },
};

export default helloPlugin;
```

### 2. 使用插件

```typescript
import { ChipsSDK } from '@chips/sdk';
import helloPlugin from './hello-plugin';

const sdk = new ChipsSDK();

// 安装并启用插件
await sdk.pluginSystem.use(helloPlugin);
await sdk.pluginSystem.enable('hello-world');
```

---

## PluginContext详解

插件上下文提供了访问SDK功能的接口：

```typescript
interface PluginContext {
  sdk: ChipsSDK;           // SDK实例
  logger: Logger;          // 日志记录器
  eventBus: EventBus;      // 事件总线
  config: any;             // 配置对象（共享数据）
}
```

### 使用SDK功能

```typescript
async install(context) {
  const { sdk, logger, eventBus, config } = context;
  
  // 使用文件API
  const card = await sdk.loadCard('card.card');
  
  // 使用主题管理器
  sdk.themeManager.register(myTheme);
  
  // 使用配置系统
  const value = sdk.getConfig('some.key', 'default');
  
  // 记录日志
  logger.info('Plugin initialized');
  logger.debug('Debug info', { data: 'value' });
  
  // 监听事件
  eventBus.on('card:load', handler);
  
  // 共享数据
  config.pluginData = { key: 'value' };
}
```

---

## 插件类型示例

### 1. 渲染器扩展插件

添加新的基础卡片类型渲染器：

```typescript
const rendererPlugin: Plugin = {
  id: 'custom-renderer',
  name: 'Custom Renderer',
  version: '1.0.0',
  
  async install(context) {
    const factory = context.sdk.rendererEngine.rendererFactory;
    
    // 注册自定义渲染器
    factory.register('code-block', {
      async render(config, container, options) {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        
        code.className = `language-${config.language || 'text'}`;
        code.textContent = config.code;
        
        pre.appendChild(code);
        container.appendChild(pre);
        
        // 使用语法高亮库（如果可用）
        if (window.Prism) {
          window.Prism.highlightElement(code);
        }
      },
    });
    
    context.logger.info('Code block renderer registered');
  },
  
  async uninstall(context) {
    const factory = context.sdk.rendererEngine.rendererFactory;
    factory.unregister('code-block');
  },
};
```

使用自定义渲染器：

```typescript
// 卡片内容中使用
const cardContent = {
  'base-1': {
    card_type: 'code-block',
    language: 'javascript',
    code: 'console.log("Hello World");',
  },
};
```

### 2. 主题包插件

提供一组预设主题：

```typescript
const themesPlugin: Plugin = {
  id: 'theme-pack',
  name: 'Theme Pack',
  version: '1.0.0',
  description: '精选主题包',
  
  async install(context) {
    const themeManager = context.sdk.themeManager;
    
    const themes = [
      {
        id: 'nord',
        name: 'Nord',
        colors: {
          primary: '#88c0d0',
          secondary: '#81a1c1',
          background: '#2e3440',
          surface: '#3b4252',
          text: '#eceff4',
          textSecondary: '#d8dee9',
        },
      },
      {
        id: 'dracula',
        name: 'Dracula',
        colors: {
          primary: '#bd93f9',
          secondary: '#ff79c6',
          background: '#282a36',
          surface: '#44475a',
          text: '#f8f8f2',
          textSecondary: '#6272a4',
        },
      },
      {
        id: 'material',
        name: 'Material',
        colors: {
          primary: '#2196f3',
          secondary: '#f50057',
          background: '#fafafa',
          surface: '#ffffff',
          text: '#212121',
          textSecondary: '#757575',
        },
      },
    ];
    
    themes.forEach(theme => themeManager.register(theme));
    
    context.logger.info(`Registered ${themes.length} themes`);
  },
  
  async uninstall(context) {
    const themeManager = context.sdk.themeManager;
    ['nord', 'dracula', 'material'].forEach(id => {
      themeManager.unregister(id);
    });
  },
};
```

### 3. 工具函数插件

提供通用工具函数：

```typescript
const utilsPlugin: Plugin = {
  id: 'utils',
  name: 'Utils',
  version: '1.0.0',
  
  async install(context) {
    // 在context.config中注入工具函数
    context.config.utils = {
      // 日期格式化
      formatDate(date: Date | string, format = 'YYYY-MM-DD'): string {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toISOString().split('T')[0];
      },
      
      // ID生成
      generateId(prefix = ''): string {
        return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      },
      
      // 深克隆
      deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
      },
      
      // 防抖
      debounce<T extends (...args: any[]) => any>(
        fn: T,
        delay: number
      ): (...args: Parameters<T>) => void {
        let timer: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
          clearTimeout(timer);
          timer = setTimeout(() => fn(...args), delay);
        };
      },
      
      // 节流
      throttle<T extends (...args: any[]) => any>(
        fn: T,
        delay: number
      ): (...args: Parameters<T>) => void {
        let lastCall = 0;
        return (...args: Parameters<T>) => {
          const now = Date.now();
          if (now - lastCall >= delay) {
            lastCall = now;
            fn(...args);
          }
        };
      },
    };
  },
};

// 其他插件使用工具函数
const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  dependencies: ['utils'],  // 声明依赖
  
  async install(context) {
    const utils = context.config.utils;
    const id = utils.generateId('card-');
    console.log('Generated ID:', id);
  },
};
```

### 4. 数据转换插件

提供数据格式转换功能：

```typescript
const converterPlugin: Plugin = {
  id: 'data-converter',
  name: 'Data Converter',
  version: '1.0.0',
  
  async install(context) {
    const { sdk, logger } = context;
    
    // 注册转换器到SDK
    context.config.converters = {
      // Markdown to Card
      async markdownToCard(markdown: string): Promise<Card> {
        // 解析markdown
        const lines = markdown.split('\n');
        
        // 创建卡片
        const card: Card = {
          metadata: {
            card_id: `card-${Date.now()}`,
            name: 'Converted from Markdown',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: '1.0.0',
          },
          structure: {
            structure: [],
          },
          content: {},
          resources: {},
        };
        
        // 转换内容
        lines.forEach((line, index) => {
          const id = `base-${index}`;
          
          if (line.startsWith('# ')) {
            card.structure.structure.push({ id });
            card.content[id] = {
              card_type: 'text',
              content: line.substring(2),
              style: { fontSize: '24px', fontWeight: 'bold' },
            };
          } else if (line.trim()) {
            card.structure.structure.push({ id });
            card.content[id] = {
              card_type: 'text',
              content: line,
            };
          }
        });
        
        return card;
      },
      
      // Card to JSON
      cardToJSON(card: Card): string {
        return JSON.stringify(card, null, 2);
      },
      
      // JSON to Card
      jsonToCard(json: string): Card {
        return JSON.parse(json);
      },
    };
    
    logger.info('Data converters registered');
  },
};

// 使用转换器
const markdown = `
# Hello World
This is a paragraph.
Another paragraph.
`;

const converters = sdk.pluginSystem.getPlugin('data-converter')?.context.config.converters;
const card = await converters.markdownToCard(markdown);
await sdk.renderCard(card, '#container');
```

### 5. API集成插件

集成外部API服务：

```typescript
interface WeatherPluginConfig {
  apiKey: string;
  endpoint: string;
}

const weatherPlugin: Plugin = {
  id: 'weather-api',
  name: 'Weather API',
  version: '1.0.0',
  description: '天气API集成插件',
  
  async install(context) {
    const config: WeatherPluginConfig = {
      apiKey: context.sdk.getConfig('weather.apiKey', ''),
      endpoint: context.sdk.getConfig('weather.endpoint', 'https://api.weather.com'),
    };
    
    // 提供API接口
    context.config.weatherAPI = {
      async getWeather(city: string) {
        const response = await fetch(
          `${config.endpoint}/weather?city=${city}&key=${config.apiKey}`
        );
        return response.json();
      },
      
      async getForecast(city: string, days: number = 7) {
        const response = await fetch(
          `${config.endpoint}/forecast?city=${city}&days=${days}&key=${config.apiKey}`
        );
        return response.json();
      },
    };
    
    context.logger.info('Weather API plugin installed');
  },
};

// 使用API
const weatherAPI = sdk.pluginSystem.getPlugin('weather-api')?.context.config.weatherAPI;
const weather = await weatherAPI.getWeather('Beijing');
console.log('Current temperature:', weather.temperature);
```

---

## 依赖管理

### 声明依赖

```typescript
const plugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  
  // 必需依赖（必须先安装）
  dependencies: ['base-plugin', 'utils'],
  
  // 对等依赖（建议安装）
  peerDependencies: ['theme-pack'],
};
```

### 检查依赖

```typescript
async install(context) {
  // 检查依赖是否可用
  const required = ['base-plugin', 'utils'];
  const missing = required.filter(id => 
    !context.sdk.pluginSystem.hasPlugin(id)
  );
  
  if (missing.length > 0) {
    throw new Error(`Missing dependencies: ${missing.join(', ')}`);
  }
  
  // 使用依赖提供的功能
  const utils = context.config.utils;
  // ...
}
```

---

## 配置管理

### 读取配置

```typescript
async install(context) {
  // 从SDK配置读取
  const apiKey = context.sdk.getConfig('plugin.myPlugin.apiKey', '');
  const timeout = context.sdk.getConfig('plugin.myPlugin.timeout', 5000);
  
  // 保存到插件配置
  context.config.pluginConfig = {
    apiKey,
    timeout,
  };
}
```

### 设置配置

```typescript
async enable(context) {
  // 设置配置
  await context.sdk.setConfig('plugin.myPlugin.enabled', true);
  await context.sdk.setConfig('plugin.myPlugin.lastEnabled', new Date().toISOString());
}
```

---

## 事件处理

### 监听事件

```typescript
const plugin: Plugin = {
  id: 'event-plugin',
  name: 'Event Plugin',
  version: '1.0.0',
  
  private subscriptions: string[] = [],
  
  async enable(context) {
    // 监听内置事件
    const id1 = context.eventBus.on('card:load', (card) => {
      console.log('Card loaded:', card.metadata.name);
    });
    
    const id2 = context.eventBus.on('render:complete', () => {
      console.log('Render complete');
    });
    
    // 保存订阅ID用于清理
    this.subscriptions.push(id1, id2);
  },
  
  async disable(context) {
    // 清理所有订阅
    this.subscriptions.forEach(id => {
      context.eventBus.off(id);
    });
    this.subscriptions = [];
  },
};
```

### 发射自定义事件

```typescript
async enable(context) {
  // 发射自定义事件
  context.eventBus.emit('plugin:custom-event', {
    pluginId: this.id,
    data: 'some data',
  });
}
```

---

## 错误处理

### 捕获和处理错误

```typescript
async install(context) {
  try {
    // 可能失败的操作
    await this.initialize(context);
  } catch (error) {
    // 记录错误
    context.logger.error('Plugin initialization failed', error);
    
    // 清理部分初始化的资源
    await this.cleanup(context);
    
    // 重新抛出让系统处理
    throw error;
  }
}
```

### 优雅降级

```typescript
async install(context) {
  try {
    // 尝试使用高级功能
    await this.setupAdvancedFeature(context);
  } catch (error) {
    context.logger.warn('Advanced feature not available, using fallback', error);
    
    // 降级到基础功能
    this.setupBasicFeature(context);
  }
}
```

---

## 测试插件

### 单元测试

```typescript
import { describe, it, expect, vi } from 'vitest';
import myPlugin from './my-plugin';

describe('MyPlugin', () => {
  it('should install successfully', async () => {
    const context = createMockContext();
    
    await myPlugin.install!(context);
    
    expect(context.logger.info).toHaveBeenCalled();
  });
  
  it('should handle errors gracefully', async () => {
    const context = createMockContext();
    context.sdk.loadCard = vi.fn().mockRejectedValue(new Error('Load failed'));
    
    await expect(myPlugin.install!(context)).rejects.toThrow('Load failed');
  });
});

function createMockContext(): PluginContext {
  return {
    sdk: {
      loadCard: vi.fn(),
      themeManager: { register: vi.fn() },
      // ... other SDK methods
    } as any,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any,
    eventBus: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    } as any,
    config: {},
  };
}
```

---

## 发布插件

### 1. 创建package.json

```json
{
  "name": "@your-org/chips-plugin-name",
  "version": "1.0.0",
  "description": "插件描述",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "keywords": ["chips", "plugin"],
  "peerDependencies": {
    "@chips/sdk": "^0.1.0"
  }
}
```

### 2. 创建README

```markdown
# My Chips Plugin

插件描述和使用说明

## 安装

\`\`\`bash
npm install @your-org/chips-plugin-name
\`\`\`

## 使用

\`\`\`typescript
import { ChipsSDK } from '@chips/sdk';
import myPlugin from '@your-org/chips-plugin-name';

const sdk = new ChipsSDK();
await sdk.pluginSystem.use(myPlugin);
\`\`\`
```

### 3. 构建和发布

```bash
# 构建
npm run build

# 发布到npm
npm publish
```

---

## 最佳实践

1. **清晰的插件ID**: 使用有意义的唯一标识符
2. **语义化版本**: 遵循semver规范
3. **完整的生命周期**: 实现所有必要的生命周期钩子
4. **资源清理**: 在disable和uninstall中清理资源
5. **错误处理**: 妥善处理可能的错误情况
6. **文档完善**: 提供清晰的使用文档
7. **测试覆盖**: 编写充分的单元测试

---

## 下一步

- 查看[API参考](../api/PluginSystem.md)了解详细API
- 浏览[示例插件](../../examples/plugins/)学习更多
- 阅读[最佳实践](../best-practices/plugins.md)提高插件质量
