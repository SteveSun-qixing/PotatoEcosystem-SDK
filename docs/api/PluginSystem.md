# PluginSystem API参考

`PluginSystem`提供插件的注册、加载、管理和生命周期控制功能，支持插件依赖解析和沙箱隔离。

## 类型定义

```typescript
class PluginSystem {
  constructor(logger: Logger, eventBus?: EventBus, config?: PluginSystemConfig);
  
  use(plugin: Plugin | Plugin[]): Promise<void>;
  enable(pluginId: string): Promise<void>;
  disable(pluginId: string): Promise<void>;
  uninstall(pluginId: string): Promise<void>;
  getPlugin(pluginId: string): Plugin | undefined;
  listPlugins(status?: PluginStatus): PluginInfo[];
  hasPlugin(pluginId: string): boolean;
}
```

---

## 插件类型定义

```typescript
interface Plugin {
  id: string;                    // 插件唯一标识
  name: string;                  // 插件名称
  version: string;               // 版本号
  description?: string;          // 描述
  author?: string;               // 作者
  
  // 生命周期钩子
  install?(context: PluginContext): Promise<void> | void;
  uninstall?(context: PluginContext): Promise<void> | void;
  enable?(context: PluginContext): Promise<void> | void;
  disable?(context: PluginContext): Promise<void> | void;
  
  // 依赖
  dependencies?: string[];       // 依赖的其他插件ID
  peerDependencies?: string[];   // 对等依赖
}

interface PluginContext {
  sdk: ChipsSDK;                 // SDK实例
  logger: Logger;                // 日志记录器
  eventBus: EventBus;            // 事件总线
  config: any;                   // 配置对象
}

enum PluginStatus {
  Installed = 'installed',       // 已安装
  Enabled = 'enabled',           // 已启用
  Disabled = 'disabled',         // 已禁用
  Error = 'error',               // 错误状态
}

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  status: PluginStatus;
  loadedAt?: Date;
}
```

---

## 配置选项

```typescript
interface PluginSystemConfig {
  autoResolveDependencies?: boolean;  // 自动解析依赖，默认true
  sandbox?: boolean;                   // 沙箱模式，默认false
  strict?: boolean;                    // 严格模式，默认false
}
```

---

## 方法详解

### `use(plugin)`

注册并安装插件。

**参数:**
- `plugin: Plugin | Plugin[]` - 单个插件或插件数组

**返回:** `Promise<void>`

**事件:**
- `plugin:install` - 插件安装完成

**示例:**
```typescript
import { PluginSystem } from '@chips/sdk';

const pluginSystem = new PluginSystem(logger, eventBus);

// 定义插件
const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'A sample plugin',
  
  async install(context) {
    console.log('Plugin installed');
    // 初始化插件
  },
  
  async enable(context) {
    console.log('Plugin enabled');
    // 启动插件功能
  },
  
  async disable(context) {
    console.log('Plugin disabled');
    // 停止插件功能
  },
  
  async uninstall(context) {
    console.log('Plugin uninstalled');
    // 清理资源
  },
};

// 安装单个插件
await pluginSystem.use(myPlugin);

// 批量安装
await pluginSystem.use([plugin1, plugin2, plugin3]);
```

---

### `enable(pluginId)`

启用已安装的插件。

**参数:**
- `pluginId: string` - 插件ID

**返回:** `Promise<void>`

**事件:**
- `plugin:enable` - 插件启用完成

**示例:**
```typescript
await pluginSystem.enable('my-plugin');
console.log('Plugin enabled');
```

---

### `disable(pluginId)`

禁用已启用的插件。

**参数:**
- `pluginId: string` - 插件ID

**返回:** `Promise<void>`

**事件:**
- `plugin:disable` - 插件禁用完成

**示例:**
```typescript
await pluginSystem.disable('my-plugin');
console.log('Plugin disabled');
```

---

### `uninstall(pluginId)`

卸载插件。

**参数:**
- `pluginId: string` - 插件ID

**返回:** `Promise<void>`

**事件:**
- `plugin:uninstall` - 插件卸载完成

**示例:**
```typescript
await pluginSystem.uninstall('my-plugin');
console.log('Plugin uninstalled');
```

---

### `getPlugin(pluginId)`

获取插件实例。

**参数:**
- `pluginId: string` - 插件ID

**返回:** `Plugin | undefined` - 插件对象

**示例:**
```typescript
const plugin = pluginSystem.getPlugin('my-plugin');
if (plugin) {
  console.log(`Plugin: ${plugin.name} v${plugin.version}`);
}
```

---

### `listPlugins(status?)`

列出所有插件或指定状态的插件。

**参数:**
- `status?: PluginStatus` - 插件状态（可选）

**返回:** `PluginInfo[]` - 插件信息数组

**示例:**
```typescript
// 列出所有插件
const allPlugins = pluginSystem.listPlugins();
console.log(`Total plugins: ${allPlugins.length}`);

// 列出已启用的插件
const enabledPlugins = pluginSystem.listPlugins(PluginStatus.Enabled);
console.log(`Enabled plugins: ${enabledPlugins.length}`);

// 遍历插件
allPlugins.forEach(info => {
  console.log(`${info.id}: ${info.name} (${info.status})`);
});
```

---

### `hasPlugin(pluginId)`

检查插件是否已安装。

**参数:**
- `pluginId: string` - 插件ID

**返回:** `boolean` - 是否存在

**示例:**
```typescript
if (pluginSystem.hasPlugin('my-plugin')) {
  console.log('Plugin is installed');
} else {
  console.log('Plugin not found');
}
```

---

## 完整使用示例

### 示例1: 创建基础插件

```typescript
const basicPlugin: Plugin = {
  id: 'hello-world',
  name: 'Hello World Plugin',
  version: '1.0.0',
  description: '一个简单的示例插件',
  author: 'Your Name',
  
  async install(context) {
    context.logger.info('Hello World Plugin installed');
    
    // 监听事件
    context.eventBus.on('card:load', () => {
      console.log('Card loaded!');
    });
  },
  
  async enable(context) {
    context.logger.info('Hello World Plugin enabled');
  },
  
  async disable(context) {
    context.logger.info('Hello World Plugin disabled');
  },
  
  async uninstall(context) {
    context.logger.info('Hello World Plugin uninstalled');
  },
};

// 使用插件
await pluginSystem.use(basicPlugin);
await pluginSystem.enable('hello-world');
```

### 示例2: 带依赖的插件

```typescript
// 基础插件
const basePlugin: Plugin = {
  id: 'base-plugin',
  name: 'Base Plugin',
  version: '1.0.0',
  
  async install(context) {
    // 提供共享功能
    context.config.sharedData = {
      apiKey: 'abc123',
    };
  },
};

// 依赖插件
const dependentPlugin: Plugin = {
  id: 'dependent-plugin',
  name: 'Dependent Plugin',
  version: '1.0.0',
  dependencies: ['base-plugin'],  // 声明依赖
  
  async install(context) {
    // 使用基础插件提供的功能
    const apiKey = context.config.sharedData.apiKey;
    console.log('Using API key:', apiKey);
  },
};

// 安装（会自动解析依赖顺序）
await pluginSystem.use([basePlugin, dependentPlugin]);
```

### 示例3: 扩展渲染器的插件

```typescript
const customRendererPlugin: Plugin = {
  id: 'custom-renderer',
  name: 'Custom Renderer Plugin',
  version: '1.0.0',
  description: '添加自定义渲染器',
  
  async install(context) {
    const sdk = context.sdk;
    
    // 注册自定义渲染器
    const rendererFactory = sdk.rendererEngine.rendererFactory;
    
    rendererFactory.register('custom-type', {
      async render(config, container, options) {
        container.innerHTML = `
          <div class="custom-card">
            <h3>${config.title}</h3>
            <p>${config.content}</p>
          </div>
        `;
      },
    });
    
    context.logger.info('Custom renderer registered');
  },
  
  async uninstall(context) {
    // 注销渲染器
    const rendererFactory = context.sdk.rendererEngine.rendererFactory;
    rendererFactory.unregister('custom-type');
  },
};

await pluginSystem.use(customRendererPlugin);
```

### 示例4: 主题扩展插件

```typescript
const themePlugin: Plugin = {
  id: 'theme-extension',
  name: 'Theme Extension Plugin',
  version: '1.0.0',
  
  async install(context) {
    const themeManager = context.sdk.themeManager;
    
    // 注册多个自定义主题
    const themes = [
      {
        id: 'monokai',
        name: 'Monokai',
        colors: {
          primary: '#f92672',
          secondary: '#66d9ef',
          background: '#272822',
          surface: '#3e3d32',
          text: '#f8f8f2',
        },
      },
      {
        id: 'solarized',
        name: 'Solarized',
        colors: {
          primary: '#268bd2',
          secondary: '#2aa198',
          background: '#fdf6e3',
          surface: '#eee8d5',
          text: '#657b83',
        },
      },
    ];
    
    themes.forEach(theme => {
      themeManager.register(theme);
    });
    
    context.logger.info(`Registered ${themes.length} themes`);
  },
};

await pluginSystem.use(themePlugin);
```

### 示例5: 工具函数插件

```typescript
const utilsPlugin: Plugin = {
  id: 'utils',
  name: 'Utils Plugin',
  version: '1.0.0',
  description: '提供实用工具函数',
  
  async install(context) {
    // 在context中添加工具函数
    context.config.utils = {
      formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
      },
      
      generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      },
      
      validateEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
    };
    
    context.logger.info('Utils plugin installed');
  },
};

await pluginSystem.use(utilsPlugin);

// 其他插件可以使用这些工具
const anotherPlugin: Plugin = {
  id: 'another-plugin',
  name: 'Another Plugin',
  version: '1.0.0',
  dependencies: ['utils'],
  
  async install(context) {
    const utils = context.config.utils;
    const id = utils.generateId();
    console.log('Generated ID:', id);
  },
};
```

### 示例6: 插件管理界面

```typescript
class PluginManager {
  private pluginSystem: PluginSystem;
  
  constructor(pluginSystem: PluginSystem) {
    this.pluginSystem = pluginSystem;
  }
  
  // 创建插件管理UI
  createUI(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'plugin-manager';
    
    const plugins = this.pluginSystem.listPlugins();
    
    plugins.forEach(plugin => {
      const item = this.createPluginItem(plugin);
      container.appendChild(item);
    });
    
    return container;
  }
  
  // 创建单个插件项
  private createPluginItem(info: PluginInfo): HTMLElement {
    const item = document.createElement('div');
    item.className = 'plugin-item';
    item.innerHTML = `
      <div class="plugin-info">
        <h3>${info.name}</h3>
        <p>Version: ${info.version}</p>
        <p>Status: ${info.status}</p>
      </div>
      <div class="plugin-actions">
        <button class="btn-toggle">${
          info.status === PluginStatus.Enabled ? 'Disable' : 'Enable'
        }</button>
        <button class="btn-uninstall">Uninstall</button>
      </div>
    `;
    
    // 绑定事件
    const toggleBtn = item.querySelector('.btn-toggle');
    toggleBtn?.addEventListener('click', async () => {
      if (info.status === PluginStatus.Enabled) {
        await this.pluginSystem.disable(info.id);
      } else {
        await this.pluginSystem.enable(info.id);
      }
      // 刷新UI
      this.refreshUI();
    });
    
    const uninstallBtn = item.querySelector('.btn-uninstall');
    uninstallBtn?.addEventListener('click', async () => {
      if (confirm(`Uninstall ${info.name}?`)) {
        await this.pluginSystem.uninstall(info.id);
        this.refreshUI();
      }
    });
    
    return item;
  }
  
  private refreshUI() {
    // 刷新插件列表UI
  }
}

// 使用
const manager = new PluginManager(pluginSystem);
const ui = manager.createUI();
document.body.appendChild(ui);
```

### 示例7: 插件热重载

```typescript
class PluginHotReload {
  private pluginSystem: PluginSystem;
  private watchedPlugins: Map<string, Plugin>;
  
  constructor(pluginSystem: PluginSystem) {
    this.pluginSystem = pluginSystem;
    this.watchedPlugins = new Map();
  }
  
  // 监听插件变化
  watch(plugin: Plugin) {
    this.watchedPlugins.set(plugin.id, plugin);
  }
  
  // 重新加载插件
  async reload(pluginId: string) {
    const plugin = this.watchedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not watched`);
    }
    
    // 禁用旧插件
    if (this.pluginSystem.hasPlugin(pluginId)) {
      await this.pluginSystem.disable(pluginId);
      await this.pluginSystem.uninstall(pluginId);
    }
    
    // 重新安装
    await this.pluginSystem.use(plugin);
    await this.pluginSystem.enable(pluginId);
    
    console.log(`Plugin ${pluginId} reloaded`);
  }
}

// 使用
const hotReload = new PluginHotReload(pluginSystem);
hotReload.watch(myPlugin);

// 在开发时重新加载
await hotReload.reload('my-plugin');
```

---

## 插件生命周期

插件有以下生命周期阶段：

```
安装 (install) → 启用 (enable) → 运行
                        ↓
                   禁用 (disable) → 卸载 (uninstall)
```

### 生命周期钩子

```typescript
const lifecyclePlugin: Plugin = {
  id: 'lifecycle-demo',
  name: 'Lifecycle Demo',
  version: '1.0.0',
  
  // 1. 安装时调用（仅一次）
  async install(context) {
    console.log('1. Install - 初始化资源');
    // 注册渲染器、主题等
    // 设置配置
    // 不应该执行业务逻辑
  },
  
  // 2. 启用时调用（可多次）
  async enable(context) {
    console.log('2. Enable - 启动功能');
    // 启动监听器
    // 注册事件处理器
    // 开始执行业务逻辑
  },
  
  // 3. 禁用时调用（可多次）
  async disable(context) {
    console.log('3. Disable - 停止功能');
    // 移除监听器
    // 取消事件订阅
    // 停止业务逻辑
  },
  
  // 4. 卸载时调用（仅一次）
  async uninstall(context) {
    console.log('4. Uninstall - 清理资源');
    // 注销渲染器、主题等
    // 清理配置
    // 释放所有资源
  },
};
```

---

## 最佳实践

### 1. 合理的依赖管理

```typescript
const plugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  
  // 声明依赖
  dependencies: ['base-plugin'],
  
  async install(context) {
    // 检查依赖是否可用
    if (!context.sdk.pluginSystem.hasPlugin('base-plugin')) {
      throw new Error('Base plugin is required');
    }
    
    // 使用依赖提供的功能
  },
};
```

### 2. 错误处理

```typescript
const plugin: Plugin = {
  id: 'safe-plugin',
  name: 'Safe Plugin',
  version: '1.0.0',
  
  async install(context) {
    try {
      // 插件逻辑
      await this.doSomething();
    } catch (error) {
      context.logger.error('Plugin installation failed', error);
      throw error;  // 重新抛出让系统处理
    }
  },
  
  async doSomething() {
    // ...
  },
};
```

### 3. 资源清理

```typescript
const plugin: Plugin = {
  id: 'cleanup-plugin',
  name: 'Cleanup Plugin',
  version: '1.0.0',
  
  private subscriptionIds: string[] = [],
  
  async enable(context) {
    // 记录订阅ID
    const id = context.eventBus.on('event', handler);
    this.subscriptionIds.push(id);
  },
  
  async disable(context) {
    // 清理所有订阅
    this.subscriptionIds.forEach(id => {
      context.eventBus.off(id);
    });
    this.subscriptionIds = [];
  },
};
```

### 4. 配置管理

```typescript
interface MyPluginConfig {
  apiKey: string;
  endpoint: string;
  timeout: number;
}

const plugin: Plugin = {
  id: 'config-plugin',
  name: 'Config Plugin',
  version: '1.0.0',
  
  async install(context) {
    // 加载配置
    const config: MyPluginConfig = {
      apiKey: context.sdk.getConfig('plugin.config.apiKey'),
      endpoint: context.sdk.getConfig('plugin.config.endpoint', 'https://api.example.com'),
      timeout: context.sdk.getConfig('plugin.config.timeout', 5000),
    };
    
    // 保存到context供后续使用
    context.config.pluginConfig = config;
  },
};
```

---

## 相关文档

- [ChipsSDK 文档](./ChipsSDK.md)
- [插件开发指南](../guides/plugin-development.md)
- [最佳实践](../best-practices/plugins.md)
- [示例插件](../../examples/plugins/)
