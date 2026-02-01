/**
 * Chips SDK 事件处理示例
 *
 * 本示例展示了 SDK 事件系统的使用方法，包括：
 * - 订阅和取消订阅事件
 * - SDK 生命周期事件
 * - 卡片和箱子事件
 * - 主题和插件事件
 * - 自定义事件
 * - 事件最佳实践
 *
 * @module examples/event-handling
 */

import {
  ChipsSDK,
  EventBus,
  EventData,
  EventHandler,
  Card,
  Box,
  ThemeChangeEvent,
} from '@chips/sdk';

// ============================================================
// 第一部分：事件基础
// ============================================================

/**
 * 事件订阅基础用法
 *
 * 展示如何订阅和处理事件
 */
function eventBasics(sdk: ChipsSDK): void {
  // 1. 基本订阅
  // on() 方法返回订阅 ID，用于后续取消订阅
  const subscriptionId = sdk.on('sdk:ready', (data) => {
    console.log('SDK 已就绪:', data);
  });

  console.log('订阅 ID:', subscriptionId);

  // 2. 带类型的订阅
  // 通过泛型指定事件数据类型
  sdk.on<{ version: { sdk: string; protocol: string } }>('sdk:ready', (data) => {
    console.log('SDK 版本:', data.version.sdk);
  });

  // 3. 取消特定订阅
  sdk.off('sdk:ready', subscriptionId);

  // 4. 取消某事件的所有订阅
  sdk.off('sdk:ready');
}

/**
 * 直接使用 EventBus
 *
 * 可以直接操作事件总线获得更多控制
 */
function useEventBusDirect(sdk: ChipsSDK): void {
  const eventBus: EventBus = sdk.events;

  // 订阅事件
  const handlerId = eventBus.on('custom:event', (data) => {
    console.log('收到自定义事件:', data);
  });

  // 一次性订阅（只触发一次）
  eventBus.once('one-time:event', (data) => {
    console.log('一次性事件触发:', data);
  });

  // 同步发送事件
  eventBus.emitSync('custom:event', { message: '同步消息' });

  // 异步发送事件
  eventBus.emit('custom:event', { message: '异步消息' }).then(() => {
    console.log('异步事件已处理');
  });

  // 取消订阅
  eventBus.off('custom:event', handlerId);
}

// ============================================================
// 第二部分：SDK 生命周期事件
// ============================================================

/**
 * SDK 生命周期事件
 *
 * 这些事件在 SDK 状态变化时触发
 */
function setupSDKLifecycleEvents(sdk: ChipsSDK): void {
  // SDK 就绪事件
  sdk.on<{ version: { sdk: string; protocol: string } }>('sdk:ready', (data) => {
    console.log('[生命周期] SDK 已就绪');
    console.log('  版本:', data.version.sdk);
    console.log('  协议:', data.version.protocol);

    // 在这里可以开始使用 SDK 功能
    initializeApplication();
  });

  // SDK 连接事件
  sdk.on('sdk:connected', () => {
    console.log('[生命周期] 已连接到 Core');

    // 更新 UI 状态
    updateConnectionStatus(true);
  });

  // SDK 断开连接事件
  sdk.on('sdk:disconnected', () => {
    console.log('[生命周期] 已断开与 Core 的连接');

    // 更新 UI 状态
    updateConnectionStatus(false);

    // 尝试重连或提示用户
    handleDisconnection();
  });

  // SDK 错误事件
  sdk.on<{ error: string }>('sdk:error', (data) => {
    console.error('[生命周期] SDK 错误:', data.error);

    // 显示错误提示
    showErrorNotification(data.error);
  });

  // SDK 销毁事件
  sdk.on('sdk:destroyed', () => {
    console.log('[生命周期] SDK 已销毁');

    // 清理应用状态
    cleanupApplication();
  });
}

// 辅助函数
function initializeApplication(): void {
  console.log('应用初始化...');
}

function updateConnectionStatus(connected: boolean): void {
  console.log(`连接状态: ${connected ? '已连接' : '未连接'}`);
}

function handleDisconnection(): void {
  console.log('处理断开连接...');
}

function showErrorNotification(error: string): void {
  console.error('错误通知:', error);
}

function cleanupApplication(): void {
  console.log('清理应用...');
}

// ============================================================
// 第三部分：卡片事件
// ============================================================

/**
 * 卡片相关事件类型定义
 */
interface CardCreatedEvent {
  card: Card;
}

interface CardSavedEvent {
  id: string;
  path: string;
}

interface CardUpdatedEvent {
  id: string;
  updates: Record<string, unknown>;
}

interface CardDeletedEvent {
  id: string;
  path: string;
}

interface CardCopiedEvent {
  sourceId: string;
  newId: string;
}

/**
 * 卡片事件处理
 */
function setupCardEvents(sdk: ChipsSDK): void {
  // 卡片创建事件
  sdk.on<CardCreatedEvent>('card:created', (event) => {
    console.log('[卡片] 新卡片已创建');
    console.log('  ID:', event.card.id);
    console.log('  名称:', event.card.metadata.name);
    console.log('  类型:', event.card.metadata.type);

    // 可以在这里执行后续操作
    // 例如：更新卡片列表、发送通知等
    refreshCardList();
  });

  // 卡片保存事件
  sdk.on<CardSavedEvent>('card:saved', (event) => {
    console.log('[卡片] 卡片已保存');
    console.log('  ID:', event.id);
    console.log('  路径:', event.path);

    // 更新缓存或同步状态
    markCardAsSaved(event.id);
  });

  // 卡片更新事件
  sdk.on<CardUpdatedEvent>('card:updated', (event) => {
    console.log('[卡片] 卡片已更新');
    console.log('  ID:', event.id);
    console.log('  更新内容:', JSON.stringify(event.updates));

    // 刷新显示的卡片内容
    refreshCardDisplay(event.id);
  });

  // 卡片删除事件
  sdk.on<CardDeletedEvent>('card:deleted', (event) => {
    console.log('[卡片] 卡片已删除');
    console.log('  ID:', event.id);
    console.log('  路径:', event.path);

    // 从列表中移除卡片
    removeCardFromList(event.id);
  });

  // 卡片复制事件
  sdk.on<CardCopiedEvent>('card:copied', (event) => {
    console.log('[卡片] 卡片已复制');
    console.log('  源 ID:', event.sourceId);
    console.log('  新 ID:', event.newId);

    // 添加新卡片到列表
    addCardToList(event.newId);
  });
}

// 辅助函数
function refreshCardList(): void {
  console.log('刷新卡片列表...');
}

function markCardAsSaved(id: string): void {
  console.log(`标记卡片 ${id} 为已保存`);
}

function refreshCardDisplay(id: string): void {
  console.log(`刷新卡片 ${id} 的显示`);
}

function removeCardFromList(id: string): void {
  console.log(`从列表移除卡片 ${id}`);
}

function addCardToList(id: string): void {
  console.log(`添加卡片 ${id} 到列表`);
}

// ============================================================
// 第四部分：箱子事件
// ============================================================

/**
 * 箱子相关事件类型定义
 */
interface BoxCreatedEvent {
  box: Box;
}

interface BoxSavedEvent {
  id: string;
  path: string;
}

interface BoxUpdatedEvent {
  id: string;
  updates: Record<string, unknown>;
}

interface BoxDeletedEvent {
  id: string;
  path: string;
}

interface BoxCardAddedEvent {
  boxId: string;
  cardPath: string;
  position?: {
    location?: string;
    position?: number;
  };
}

interface BoxCardRemovedEvent {
  boxId: string;
  cardPath: string;
}

interface BoxCardsReorderedEvent {
  boxId: string;
  cardPaths: string[];
}

interface BoxLayoutConfiguredEvent {
  boxId: string;
  layout: string;
  config: Record<string, unknown>;
}

/**
 * 箱子事件处理
 */
function setupBoxEvents(sdk: ChipsSDK): void {
  // 箱子创建事件
  sdk.on<BoxCreatedEvent>('box:created', (event) => {
    console.log('[箱子] 新箱子已创建');
    console.log('  ID:', event.box.id);
    console.log('  名称:', event.box.metadata.name);
    console.log('  布局:', event.box.metadata.layout);
  });

  // 箱子保存事件
  sdk.on<BoxSavedEvent>('box:saved', (event) => {
    console.log('[箱子] 箱子已保存');
    console.log('  ID:', event.id);
    console.log('  路径:', event.path);
  });

  // 箱子更新事件
  sdk.on<BoxUpdatedEvent>('box:updated', (event) => {
    console.log('[箱子] 箱子已更新');
    console.log('  ID:', event.id);
    console.log('  更新内容:', JSON.stringify(event.updates));
  });

  // 箱子删除事件
  sdk.on<BoxDeletedEvent>('box:deleted', (event) => {
    console.log('[箱子] 箱子已删除');
    console.log('  ID:', event.id);
    console.log('  路径:', event.path);
  });

  // 卡片添加到箱子事件
  sdk.on<BoxCardAddedEvent>('box:card:added', (event) => {
    console.log('[箱子] 卡片已添加到箱子');
    console.log('  箱子 ID:', event.boxId);
    console.log('  卡片路径:', event.cardPath);

    // 更新箱子显示
    refreshBoxDisplay(event.boxId);
  });

  // 卡片从箱子移除事件
  sdk.on<BoxCardRemovedEvent>('box:card:removed', (event) => {
    console.log('[箱子] 卡片已从箱子移除');
    console.log('  箱子 ID:', event.boxId);
    console.log('  卡片路径:', event.cardPath);

    // 更新箱子显示
    refreshBoxDisplay(event.boxId);
  });

  // 箱子卡片重排序事件
  sdk.on<BoxCardsReorderedEvent>('box:cards:reordered', (event) => {
    console.log('[箱子] 卡片顺序已更新');
    console.log('  箱子 ID:', event.boxId);
    console.log('  新顺序:', event.cardPaths);

    // 更新箱子显示
    refreshBoxDisplay(event.boxId);
  });

  // 箱子布局配置事件
  sdk.on<BoxLayoutConfiguredEvent>('box:layout:configured', (event) => {
    console.log('[箱子] 布局配置已更新');
    console.log('  箱子 ID:', event.boxId);
    console.log('  布局:', event.layout);
    console.log('  配置:', JSON.stringify(event.config));
  });

  // 箱子复制事件
  sdk.on<{ sourceId: string; newId: string }>('box:copied', (event) => {
    console.log('[箱子] 箱子已复制');
    console.log('  源 ID:', event.sourceId);
    console.log('  新 ID:', event.newId);
  });
}

// 辅助函数
function refreshBoxDisplay(boxId: string): void {
  console.log(`刷新箱子 ${boxId} 的显示`);
}

// ============================================================
// 第五部分：主题和插件事件
// ============================================================

/**
 * 主题事件处理
 */
function setupThemeEvents(sdk: ChipsSDK): void {
  // 主题变更事件
  sdk.on<ThemeChangeEvent>('theme:changed', (event) => {
    console.log('[主题] 主题已变更');
    console.log('  从:', event.previousTheme);
    console.log('  到:', event.currentTheme);

    // 重新应用主题
    sdk.themes.applyToDOM();

    // 更新主题选择器 UI
    updateThemeSelector(event.currentTheme);
  });

  // 主题注册事件
  sdk.on<{ id: string }>('theme:registered', (event) => {
    console.log('[主题] 新主题已注册:', event.id);

    // 刷新主题列表
    refreshThemeList();
  });
}

// 辅助函数
function updateThemeSelector(themeId: string): void {
  console.log(`更新主题选择器: ${themeId}`);
}

function refreshThemeList(): void {
  console.log('刷新主题列表...');
}

/**
 * 插件事件处理
 */
function setupPluginEvents(sdk: ChipsSDK): void {
  // 插件注册事件
  sdk.on<{ pluginId: string }>('plugin:registered', (event) => {
    console.log('[插件] 插件已注册:', event.pluginId);
  });

  // 插件启用事件
  sdk.on<{ pluginId: string }>('plugin:enabled', (event) => {
    console.log('[插件] 插件已启用:', event.pluginId);
  });

  // 插件禁用事件
  sdk.on<{ pluginId: string }>('plugin:disabled', (event) => {
    console.log('[插件] 插件已禁用:', event.pluginId);
  });

  // 插件错误事件
  sdk.on<{ pluginId: string; error: string }>('plugin:error', (event) => {
    console.error('[插件] 插件错误:', event.pluginId, event.error);
  });
}

// ============================================================
// 第六部分：自定义事件
// ============================================================

/**
 * 自定义事件示例
 *
 * 展示如何使用事件总线传递应用自定义事件
 */
function setupCustomEvents(sdk: ChipsSDK): void {
  // 定义自定义事件类型
  interface UserLoginEvent {
    userId: string;
    username: string;
    timestamp: number;
  }

  interface UserLogoutEvent {
    userId: string;
    reason?: string;
  }

  interface DataSyncEvent {
    syncId: string;
    status: 'started' | 'completed' | 'failed';
    progress?: number;
    error?: string;
  }

  // 用户登录事件
  sdk.on<UserLoginEvent>('user:login', (event) => {
    console.log('[自定义] 用户登录');
    console.log('  用户 ID:', event.userId);
    console.log('  用户名:', event.username);
    console.log('  时间:', new Date(event.timestamp).toLocaleString());
  });

  // 用户登出事件
  sdk.on<UserLogoutEvent>('user:logout', (event) => {
    console.log('[自定义] 用户登出');
    console.log('  用户 ID:', event.userId);
    if (event.reason) {
      console.log('  原因:', event.reason);
    }
  });

  // 数据同步事件（带进度）
  sdk.on<DataSyncEvent>('data:sync', (event) => {
    switch (event.status) {
      case 'started':
        console.log(`[自定义] 数据同步开始: ${event.syncId}`);
        break;
      case 'completed':
        console.log(`[自定义] 数据同步完成: ${event.syncId}`);
        break;
      case 'failed':
        console.error(`[自定义] 数据同步失败: ${event.syncId}`, event.error);
        break;
    }

    if (event.progress !== undefined) {
      console.log(`  进度: ${event.progress}%`);
    }
  });
}

/**
 * 发送自定义事件
 */
async function emitCustomEvents(sdk: ChipsSDK): Promise<void> {
  // 发送用户登录事件
  await sdk.events.emit('user:login', {
    userId: 'user-123',
    username: '张三',
    timestamp: Date.now(),
  });

  // 发送数据同步事件（进度更新）
  const syncId = `sync-${Date.now()}`;

  await sdk.events.emit('data:sync', {
    syncId,
    status: 'started',
  });

  // 模拟同步进度
  for (let progress = 0; progress <= 100; progress += 20) {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (progress < 100) {
      sdk.events.emitSync('data:sync', {
        syncId,
        status: 'started',
        progress,
      });
    }
  }

  await sdk.events.emit('data:sync', {
    syncId,
    status: 'completed',
    progress: 100,
  });
}

// ============================================================
// 第七部分：事件管理工具
// ============================================================

/**
 * 事件订阅管理器
 *
 * 用于统一管理事件订阅，方便批量取消
 */
class EventSubscriptionManager {
  private _subscriptions: Map<string, { event: string; handlerId: string }[]> = new Map();
  private _eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  /**
   * 注册命名空间
   */
  registerNamespace(namespace: string): void {
    if (!this._subscriptions.has(namespace)) {
      this._subscriptions.set(namespace, []);
    }
  }

  /**
   * 在命名空间中订阅事件
   */
  subscribe<T>(
    namespace: string,
    event: string,
    handler: EventHandler<T>
  ): string {
    this.registerNamespace(namespace);

    const handlerId = this._eventBus.on(event, handler);
    this._subscriptions.get(namespace)!.push({ event, handlerId });

    return handlerId;
  }

  /**
   * 取消命名空间中的所有订阅
   */
  unsubscribeNamespace(namespace: string): void {
    const subscriptions = this._subscriptions.get(namespace);
    if (!subscriptions) return;

    for (const { event, handlerId } of subscriptions) {
      this._eventBus.off(event, handlerId);
    }

    this._subscriptions.delete(namespace);
    console.log(`已取消命名空间 "${namespace}" 的所有订阅`);
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    for (const namespace of this._subscriptions.keys()) {
      this.unsubscribeNamespace(namespace);
    }
  }

  /**
   * 获取命名空间的订阅数量
   */
  getSubscriptionCount(namespace: string): number {
    return this._subscriptions.get(namespace)?.length || 0;
  }
}

/**
 * 使用事件订阅管理器
 */
function useSubscriptionManager(sdk: ChipsSDK): void {
  const manager = new EventSubscriptionManager(sdk.events);

  // 为不同模块创建命名空间
  manager.subscribe('card-module', 'card:created', () => {
    console.log('卡片模块: 卡片已创建');
  });

  manager.subscribe('card-module', 'card:updated', () => {
    console.log('卡片模块: 卡片已更新');
  });

  manager.subscribe('box-module', 'box:created', () => {
    console.log('箱子模块: 箱子已创建');
  });

  // 查看订阅数量
  console.log('卡片模块订阅数:', manager.getSubscriptionCount('card-module'));
  console.log('箱子模块订阅数:', manager.getSubscriptionCount('box-module'));

  // 卸载模块时取消该模块的所有订阅
  manager.unsubscribeNamespace('card-module');

  // 应用退出时取消所有订阅
  manager.unsubscribeAll();
}

// ============================================================
// 第八部分：事件最佳实践
// ============================================================

/**
 * 事件处理最佳实践
 */
function eventBestPractices(sdk: ChipsSDK): void {
  // 1. 使用类型安全的事件处理
  interface MyEventData {
    id: string;
    action: 'start' | 'stop' | 'pause';
    timestamp: number;
  }

  sdk.on<MyEventData>('my:event', (data) => {
    // TypeScript 会正确推断 data 的类型
    if (data.action === 'start') {
      console.log(`动作开始: ${data.id}`);
    }
  });

  // 2. 错误处理
  sdk.on('some:event', async (data) => {
    try {
      // 处理事件
      await processEvent(data);
    } catch (error) {
      console.error('事件处理错误:', error);
      // 发送错误事件
      sdk.events.emitSync('error:occurred', {
        source: 'some:event',
        error: String(error),
      });
    }
  });

  // 3. 避免内存泄漏 - 组件卸载时取消订阅
  const subscriptions: string[] = [];

  // 订阅时保存 ID
  subscriptions.push(
    sdk.on('event:a', () => console.log('A'))
  );
  subscriptions.push(
    sdk.on('event:b', () => console.log('B'))
  );

  // 卸载时取消所有订阅
  function cleanup(): void {
    for (const id of subscriptions) {
      // 需要知道事件名才能取消...
      // 这是为什么推荐使用 EventSubscriptionManager
    }
  }

  // 4. 使用防抖处理高频事件
  let debounceTimer: NodeJS.Timeout | null = null;
  sdk.on('frequent:event', (data) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      console.log('防抖后处理:', data);
    }, 300);
  });

  // 5. 使用节流处理连续事件
  let lastExecution = 0;
  const throttleInterval = 1000;
  sdk.on('continuous:event', (data) => {
    const now = Date.now();
    if (now - lastExecution >= throttleInterval) {
      lastExecution = now;
      console.log('节流后处理:', data);
    }
  });
}

// 辅助函数
async function processEvent(data: unknown): Promise<void> {
  console.log('处理事件:', data);
}

// ============================================================
// 导出和运行
// ============================================================

export {
  eventBasics,
  useEventBusDirect,
  setupSDKLifecycleEvents,
  setupCardEvents,
  setupBoxEvents,
  setupThemeEvents,
  setupPluginEvents,
  setupCustomEvents,
  emitCustomEvents,
  EventSubscriptionManager,
  useSubscriptionManager,
};

// 完整示例运行
async function runExample(): Promise<void> {
  // 初始化 SDK
  const sdk = new ChipsSDK({
    connector: { url: 'ws://localhost:9527' },
    autoConnect: true,
    eventBus: {
      maxListeners: 100, // 设置最大监听器数量
      async: true, // 异步执行事件处理器
    },
  });

  // 1. 设置 SDK 生命周期事件（在初始化之前）
  console.log('=== 步骤 1: 设置生命周期事件 ===');
  setupSDKLifecycleEvents(sdk);

  // 初始化 SDK
  await sdk.initialize();

  try {
    // 2. 事件基础
    console.log('\n=== 步骤 2: 事件基础 ===');
    eventBasics(sdk);

    // 3. 直接使用 EventBus
    console.log('\n=== 步骤 3: 使用 EventBus ===');
    useEventBusDirect(sdk);

    // 4. 设置卡片事件
    console.log('\n=== 步骤 4: 卡片事件 ===');
    setupCardEvents(sdk);

    // 5. 设置箱子事件
    console.log('\n=== 步骤 5: 箱子事件 ===');
    setupBoxEvents(sdk);

    // 6. 设置主题和插件事件
    console.log('\n=== 步骤 6: 主题和插件事件 ===');
    setupThemeEvents(sdk);
    setupPluginEvents(sdk);

    // 7. 自定义事件
    console.log('\n=== 步骤 7: 自定义事件 ===');
    setupCustomEvents(sdk);

    // 8. 发送自定义事件
    console.log('\n=== 步骤 8: 发送事件 ===');
    await emitCustomEvents(sdk);

    // 9. 使用订阅管理器
    console.log('\n=== 步骤 9: 订阅管理器 ===');
    useSubscriptionManager(sdk);

    // 10. 触发一些事件来测试
    console.log('\n=== 步骤 10: 触发测试事件 ===');

    // 创建卡片触发事件
    const card = await sdk.card.create({
      name: '事件测试卡片',
      type: 'note',
    });
    console.log('创建了测试卡片:', card.id);

    // 创建箱子触发事件
    const box = await sdk.box.create({
      name: '事件测试箱子',
    });
    console.log('创建了测试箱子:', box.id);

    // 切换主题触发事件
    sdk.setTheme('default-dark');
    sdk.setTheme('default-light');
  } finally {
    sdk.destroy();
  }
}

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runExample()
    .then(() => {
      console.log('\n事件示例运行完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n事件示例运行失败:', error);
      process.exit(1);
    });
}
