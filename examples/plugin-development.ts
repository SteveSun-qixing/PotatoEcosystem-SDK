/**
 * Chips SDK 插件开发示例
 *
 * 本示例展示了如何开发薯片生态插件，包括：
 * - 插件的基本结构
 * - 注册和管理命令
 * - 自定义渲染器
 * - 插件生命周期管理
 * - 插件间通信
 *
 * @module examples/plugin-development
 */

import {
  ChipsSDK,
  PluginMetadata,
  PluginContext,
  PluginRegistration,
  PluginConfig,
  CommandHandler,
  RendererDefinition,
} from '@chips/sdk';

// ============================================================
// 第一部分：插件基础结构
// ============================================================

/**
 * 定义插件元数据
 *
 * 元数据描述了插件的基本信息，用于插件管理和显示
 */
const myPluginMetadata: PluginMetadata = {
  id: 'com.example.my-plugin', // 插件唯一标识（推荐使用反向域名格式）
  name: '我的示例插件',
  version: '1.0.0',
  description: '这是一个示例插件，展示插件开发的基本模式',
  author: '开发者名称',
  homepage: 'https://example.com/my-plugin',
  chipStandardsVersion: '1.0.0', // 兼容的薯片标准版本
  keywords: ['示例', '教程'],
  license: 'MIT',
  // 声明依赖的其他插件
  dependencies: [
    {
      id: 'com.chips.core-utils',
      version: '>=1.0.0',
      optional: true, // 可选依赖
    },
  ],
};

/**
 * 插件默认配置
 *
 * 定义插件的默认配置项，用户可以覆盖这些值
 */
const defaultConfig: PluginConfig = {
  enableFeatureA: true,
  maxItems: 100,
  theme: 'default',
  shortcuts: {
    activate: 'Ctrl+Shift+P',
    quickSearch: 'Ctrl+K',
  },
};

// ============================================================
// 第二部分：命令注册
// ============================================================

/**
 * 创建命令处理器
 *
 * 命令是插件提供功能的主要方式
 */
function createCommands(context: PluginContext): void {
  // 注册简单命令
  context.registerCommand('hello', ((args: { name?: string }) => {
    const name = args.name || '世界';
    context.log(`你好, ${name}!`);
    return { message: `你好, ${name}!` };
  }) as CommandHandler);

  // 注册异步命令
  context.registerCommand('fetchData', (async (args: { url: string }) => {
    context.log(`正在获取数据: ${args.url}`);

    // 模拟异步操作
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      data: { url: args.url, timestamp: Date.now() },
    };
  }) as CommandHandler);

  // 注册带验证的命令
  context.registerCommand('createItem', ((args: { name: string; type: string }) => {
    // 参数验证
    if (!args.name || args.name.trim() === '') {
      throw new Error('名称不能为空');
    }

    if (!['note', 'task', 'bookmark'].includes(args.type)) {
      throw new Error(`不支持的类型: ${args.type}`);
    }

    context.log(`创建项目: ${args.name} (${args.type})`);

    return {
      id: `item-${Date.now()}`,
      name: args.name,
      type: args.type,
      createdAt: new Date().toISOString(),
    };
  }) as CommandHandler);

  // 注册使用配置的命令
  context.registerCommand('getSettings', (() => {
    return {
      pluginId: context.pluginId,
      sdkVersion: context.sdkVersion,
      config: context.config,
    };
  }) as CommandHandler);

  context.log('命令已注册完成');
}

// ============================================================
// 第三部分：渲染器开发
// ============================================================

/**
 * 创建自定义渲染器
 *
 * 渲染器用于将卡片数据渲染为可视化内容
 */
function createRenderers(context: PluginContext): void {
  // 基础文本渲染器
  const textRenderer: RendererDefinition = {
    name: 'text-renderer',
    cardTypes: ['text', 'note', 'markdown'], // 支持的卡片类型
    render: (data: unknown, container: HTMLElement) => {
      interface TextData {
        title?: string;
        content?: string;
      }
      const cardData = data as TextData;

      // 清空容器
      container.innerHTML = '';

      // 创建标题
      if (cardData.title) {
        const titleEl = document.createElement('h2');
        titleEl.className = 'card-title';
        titleEl.textContent = cardData.title;
        container.appendChild(titleEl);
      }

      // 创建内容
      if (cardData.content) {
        const contentEl = document.createElement('div');
        contentEl.className = 'card-content';
        contentEl.textContent = cardData.content;
        container.appendChild(contentEl);
      }

      context.log('文本卡片已渲染');
    },
    destroy: () => {
      context.log('文本渲染器已销毁');
    },
  };

  // 图片画廊渲染器
  const galleryRenderer: RendererDefinition = {
    name: 'gallery-renderer',
    cardTypes: ['gallery', 'album'],
    render: async (data: unknown, container: HTMLElement) => {
      interface GalleryData {
        title?: string;
        images?: Array<{ url: string; alt?: string }>;
      }
      const cardData = data as GalleryData;

      container.innerHTML = '';

      // 创建画廊容器
      const gallery = document.createElement('div');
      gallery.className = 'card-gallery';
      gallery.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;';

      // 添加图片
      const images = cardData.images || [];
      for (const img of images) {
        const imgEl = document.createElement('img');
        imgEl.src = img.url;
        imgEl.alt = img.alt || '';
        imgEl.style.cssText = 'width: 100%; height: auto; border-radius: 4px;';
        gallery.appendChild(imgEl);
      }

      container.appendChild(gallery);
      context.log(`画廊渲染完成，共 ${images.length} 张图片`);
    },
  };

  // 任务列表渲染器
  const taskListRenderer: RendererDefinition = {
    name: 'task-list-renderer',
    cardTypes: ['task-list', 'todo'],
    render: (data: unknown, container: HTMLElement) => {
      interface TaskData {
        title?: string;
        tasks?: Array<{ id: string; text: string; completed: boolean }>;
      }
      const cardData = data as TaskData;

      container.innerHTML = '';

      // 创建标题
      if (cardData.title) {
        const titleEl = document.createElement('h3');
        titleEl.textContent = cardData.title;
        container.appendChild(titleEl);
      }

      // 创建任务列表
      const list = document.createElement('ul');
      list.className = 'task-list';
      list.style.cssText = 'list-style: none; padding: 0;';

      const tasks = cardData.tasks || [];
      for (const task of tasks) {
        const li = document.createElement('li');
        li.style.cssText = 'display: flex; align-items: center; padding: 8px 0;';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.style.marginRight = '8px';

        // 添加交互事件
        checkbox.addEventListener('change', () => {
          context.emit('task:toggled', {
            taskId: task.id,
            completed: checkbox.checked,
          });
        });

        const label = document.createElement('span');
        label.textContent = task.text;
        if (task.completed) {
          label.style.textDecoration = 'line-through';
          label.style.color = '#888';
        }

        li.appendChild(checkbox);
        li.appendChild(label);
        list.appendChild(li);
      }

      container.appendChild(list);
    },
  };

  // 注册所有渲染器
  context.registerRenderer('text', textRenderer);
  context.registerRenderer('gallery', galleryRenderer);
  context.registerRenderer('task-list', taskListRenderer);

  context.log('渲染器已注册完成');
}

// ============================================================
// 第四部分：插件生命周期
// ============================================================

/**
 * 插件激活函数
 *
 * 当插件被启用时调用，用于初始化插件功能
 */
async function activate(context: PluginContext): Promise<void> {
  context.log('插件正在激活...');

  // 1. 注册命令
  createCommands(context);

  // 2. 注册渲染器
  createRenderers(context);

  // 3. 订阅事件
  setupEventListeners(context);

  // 4. 执行初始化任务
  await performInitialization(context);

  context.log('插件激活完成');
}

/**
 * 插件停用函数
 *
 * 当插件被禁用时调用，用于清理资源
 */
async function deactivate(): Promise<void> {
  console.log('插件正在停用...');

  // 执行清理操作
  // - 取消事件订阅
  // - 释放资源
  // - 保存状态

  console.log('插件已停用');
}

/**
 * 设置事件监听器
 */
function setupEventListeners(context: PluginContext): void {
  // 监听卡片创建事件
  context.on('card:created', (data: unknown) => {
    const eventData = data as { card: { id: string; metadata: { name: string } } };
    context.log(`新卡片已创建: ${eventData.card.metadata.name}`);
  });

  // 监听卡片更新事件
  context.on('card:updated', (data: unknown) => {
    const eventData = data as { id: string; updates: Record<string, unknown> };
    context.log(`卡片已更新: ${eventData.id}`);
  });

  // 监听自定义事件
  context.on('task:toggled', (data: unknown) => {
    const eventData = data as { taskId: string; completed: boolean };
    context.log(`任务状态变更: ${eventData.taskId} -> ${eventData.completed ? '已完成' : '未完成'}`);
  });

  context.log('事件监听器已设置');
}

/**
 * 执行初始化任务
 */
async function performInitialization(context: PluginContext): Promise<void> {
  // 读取配置
  const config = context.config;
  context.log('插件配置:', config);

  // 模拟异步初始化
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 发送初始化完成事件
  context.emit('plugin:initialized', {
    pluginId: context.pluginId,
    timestamp: Date.now(),
  });
}

// ============================================================
// 第五部分：完整插件注册
// ============================================================

/**
 * 创建完整的插件注册对象
 */
const myPluginRegistration: PluginRegistration = {
  id: myPluginMetadata.id,
  metadata: myPluginMetadata,
  activate,
  deactivate,
  defaultConfig,
};

/**
 * 在 SDK 中注册插件
 */
async function registerPlugin(sdk: ChipsSDK): Promise<void> {
  // 注册插件
  sdk.registerPlugin(myPluginRegistration);
  console.log('插件已注册');

  // 获取插件管理器
  const pluginManager = sdk.plugins;

  // 查看已注册的插件
  const plugins = pluginManager.list();
  console.log('已注册的插件:', plugins.map((p) => p.metadata.name));

  // 启用插件
  await pluginManager.enable(myPluginMetadata.id);
  console.log('插件已启用');

  // 获取插件状态
  const plugin = pluginManager.get(myPluginMetadata.id);
  if (plugin) {
    console.log('插件状态:', plugin.state);
  }
}

// ============================================================
// 第六部分：高级插件示例
// ============================================================

/**
 * 创建带有持久化状态的插件
 */
function createStatefulPlugin(): PluginRegistration {
  // 插件内部状态
  let state: {
    counter: number;
    history: string[];
    lastAccess: string | null;
  } = {
    counter: 0,
    history: [],
    lastAccess: null,
  };

  const metadata: PluginMetadata = {
    id: 'com.example.stateful-plugin',
    name: '有状态插件',
    version: '1.0.0',
    chipStandardsVersion: '1.0.0',
  };

  return {
    id: metadata.id,
    metadata,
    defaultConfig: {
      maxHistorySize: 50,
      autoSaveInterval: 60000, // 自动保存间隔（毫秒）
    },
    activate: async (context: PluginContext) => {
      // 恢复状态（从存储中读取）
      context.log('正在恢复插件状态...');

      // 注册状态相关命令
      context.registerCommand('incrementCounter', (() => {
        state.counter++;
        state.lastAccess = new Date().toISOString();
        return { counter: state.counter };
      }) as CommandHandler);

      context.registerCommand('getState', (() => {
        return { ...state };
      }) as CommandHandler);

      context.registerCommand('addToHistory', ((args: { item: string }) => {
        const config = context.config as { maxHistorySize?: number };
        const maxSize = config.maxHistorySize || 50;

        state.history.push(args.item);
        if (state.history.length > maxSize) {
          state.history = state.history.slice(-maxSize);
        }

        return { historySize: state.history.length };
      }) as CommandHandler);

      context.registerCommand('clearState', (() => {
        state = { counter: 0, history: [], lastAccess: null };
        return { success: true };
      }) as CommandHandler);

      context.log('有状态插件已激活');
    },
    deactivate: async () => {
      // 保存状态（到存储中）
      console.log('正在保存插件状态...');
      console.log('有状态插件已停用');
    },
  };
}

/**
 * 创建带有 UI 组件的插件
 */
function createUIPlugin(): PluginRegistration {
  const metadata: PluginMetadata = {
    id: 'com.example.ui-plugin',
    name: 'UI 组件插件',
    version: '1.0.0',
    chipStandardsVersion: '1.0.0',
  };

  return {
    id: metadata.id,
    metadata,
    activate: (context: PluginContext) => {
      // 注册自定义 UI 渲染器
      context.registerRenderer('custom-card', {
        name: 'custom-card-renderer',
        cardTypes: ['custom'],
        render: (data: unknown, container: HTMLElement) => {
          interface CustomData {
            title?: string;
            items?: Array<{ label: string; value: string }>;
            actions?: Array<{ id: string; label: string }>;
          }
          const cardData = data as CustomData;

          // 创建卡片 UI
          container.innerHTML = `
            <div class="custom-card" style="
              border: 1px solid var(--chips-color-border);
              border-radius: var(--chips-radius-md);
              padding: var(--chips-spacing-md);
              background: var(--chips-color-surface);
            ">
              <h3 style="
                margin: 0 0 var(--chips-spacing-sm);
                color: var(--chips-color-text);
              ">${cardData.title || '自定义卡片'}</h3>
              <div class="card-items">
                ${(cardData.items || [])
                  .map(
                    (item) => `
                  <div style="
                    display: flex;
                    justify-content: space-between;
                    padding: var(--chips-spacing-xs) 0;
                    border-bottom: 1px solid var(--chips-color-border);
                  ">
                    <span style="color: var(--chips-color-text-secondary);">${item.label}</span>
                    <span style="color: var(--chips-color-text);">${item.value}</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
              <div class="card-actions" style="
                margin-top: var(--chips-spacing-md);
                display: flex;
                gap: var(--chips-spacing-sm);
              ">
                ${(cardData.actions || [])
                  .map(
                    (action) => `
                  <button 
                    data-action="${action.id}"
                    style="
                      padding: var(--chips-spacing-xs) var(--chips-spacing-sm);
                      border: 1px solid var(--chips-color-primary);
                      border-radius: var(--chips-radius-sm);
                      background: transparent;
                      color: var(--chips-color-primary);
                      cursor: pointer;
                    "
                  >${action.label}</button>
                `
                  )
                  .join('')}
              </div>
            </div>
          `;

          // 绑定按钮事件
          const buttons = container.querySelectorAll('[data-action]');
          buttons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
              const actionId = (e.target as HTMLElement).getAttribute('data-action');
              context.emit('custom-card:action', { actionId, cardData });
            });
          });
        },
      });

      context.log('UI 组件插件已激活');
    },
  };
}

// ============================================================
// 第七部分：插件开发最佳实践
// ============================================================

/**
 * 插件开发最佳实践总结
 *
 * 1. 命名规范
 *    - 使用反向域名作为插件 ID（如 com.company.plugin-name）
 *    - 命令名使用 camelCase（如 createItem）
 *    - 事件名使用 kebab-case（如 card:created）
 *
 * 2. 错误处理
 *    - 在命令处理器中进行参数验证
 *    - 使用 try-catch 包装异步操作
 *    - 提供有意义的错误消息
 *
 * 3. 性能优化
 *    - 避免在渲染器中进行重复计算
 *    - 使用事件委托处理大量元素
 *    - 及时清理不需要的事件监听
 *
 * 4. 状态管理
 *    - 在 deactivate 中保存状态
 *    - 在 activate 中恢复状态
 *    - 使用配置存储持久化数据
 *
 * 5. 兼容性
 *    - 声明正确的 chipStandardsVersion
 *    - 处理可选依赖不存在的情况
 *    - 提供降级方案
 */

// ============================================================
// 导出和运行
// ============================================================

export {
  myPluginRegistration,
  createStatefulPlugin,
  createUIPlugin,
  registerPlugin,
};

// 完整示例运行
async function runExample(): Promise<void> {
  // 初始化 SDK
  const sdk = new ChipsSDK({
    connector: { url: 'ws://localhost:9527' },
    autoConnect: true,
  });

  await sdk.initialize();

  try {
    // 注册示例插件
    await registerPlugin(sdk);

    // 注册有状态插件
    const statefulPlugin = createStatefulPlugin();
    sdk.registerPlugin(statefulPlugin);
    await sdk.plugins.enable(statefulPlugin.id);

    // 注册 UI 插件
    const uiPlugin = createUIPlugin();
    sdk.registerPlugin(uiPlugin);
    await sdk.plugins.enable(uiPlugin.id);

    // 执行插件命令
    const result = await sdk.plugins.executeCommand(
      'com.example.my-plugin',
      'hello',
      { name: '薯片' }
    );
    console.log('命令执行结果:', result);

    // 列出所有插件
    const allPlugins = sdk.plugins.list();
    console.log('所有插件:');
    for (const plugin of allPlugins) {
      console.log(`  - ${plugin.metadata.name} (${plugin.state})`);
    }
  } finally {
    sdk.destroy();
  }
}

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runExample()
    .then(() => {
      console.log('\n插件示例运行完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n插件示例运行失败:', error);
      process.exit(1);
    });
}
