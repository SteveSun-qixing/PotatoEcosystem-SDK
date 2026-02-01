/**
 * Chips SDK 基础使用示例
 *
 * 本示例展示了 SDK 的基本用法，包括：
 * - SDK 初始化和配置
 * - 卡片的创建、保存和管理
 * - 箱子的创建和卡片管理
 * - 错误处理
 *
 * @module examples/basic-usage
 */

import {
  ChipsSDK,
  ChipsError,
  Card,
  Box,
  CreateCardOptions,
  CreateBoxOptions,
} from '@chips/sdk';

// ============================================================
// 第一部分：SDK 初始化
// ============================================================

/**
 * 创建和初始化 SDK 实例
 *
 * SDK 支持多种配置选项，可根据实际需求进行调整
 */
async function initializeSDK(): Promise<ChipsSDK> {
  // 创建 SDK 实例，传入配置选项
  const sdk = new ChipsSDK({
    // 连接配置 - 指定 Core 服务地址
    connector: {
      url: 'ws://localhost:9527',
      timeout: 30000, // 连接超时时间（毫秒）
    },
    // 日志配置
    logger: {
      level: 'info', // 日志级别：debug | info | warn | error
      prefix: '[MyApp]', // 日志前缀
    },
    // 配置管理
    config: {
      namespace: 'myapp', // 配置命名空间
    },
    // 是否自动连接 Core
    autoConnect: true,
    // 调试模式（会输出更详细的日志）
    debug: false,
  });

  // 初始化 SDK（连接 Core、初始化模块等）
  await sdk.initialize();

  // 检查 SDK 状态
  console.log('SDK 状态:', sdk.state); // 应该是 'ready'
  console.log('SDK 版本:', ChipsSDK.VERSION.sdk);
  console.log('是否已连接:', sdk.isConnected);

  return sdk;
}

// ============================================================
// 第二部分：卡片操作
// ============================================================

/**
 * 创建新卡片
 *
 * 卡片是薯片生态的基本内容单元
 */
async function createCard(sdk: ChipsSDK): Promise<Card> {
  // 定义卡片创建选项
  const options: CreateCardOptions = {
    name: '我的第一张卡片',
    type: 'note', // 卡片类型
    tags: ['示例', '教程'],
    description: '这是一张示例卡片，用于演示 SDK 的基本用法',
  };

  // 创建卡片
  const card = await sdk.card.create(options);

  console.log('卡片已创建:');
  console.log('  - ID:', card.id);
  console.log('  - 名称:', card.metadata.name);
  console.log('  - 类型:', card.metadata.type);
  console.log('  - 创建时间:', card.metadata.created_at);

  return card;
}

/**
 * 保存卡片到文件
 *
 * 卡片创建后存在于内存中，需要保存才能持久化
 */
async function saveCard(sdk: ChipsSDK, card: Card, path: string): Promise<void> {
  // 保存卡片到指定路径
  await sdk.card.save(path, card, {
    overwrite: true, // 如果文件存在则覆盖
    compress: true, // 压缩资源文件
  });

  console.log(`卡片已保存到: ${path}`);
}

/**
 * 加载卡片
 *
 * 从文件或通过 ID 加载卡片
 */
async function loadCard(sdk: ChipsSDK, pathOrId: string): Promise<Card> {
  // 通过路径或 ID 获取卡片
  const card = await sdk.card.get(pathOrId, {
    cache: true, // 启用缓存
  });

  console.log('卡片已加载:');
  console.log('  - ID:', card.id);
  console.log('  - 名称:', card.metadata.name);

  return card;
}

/**
 * 更新卡片
 *
 * 修改卡片的元数据
 */
async function updateCard(sdk: ChipsSDK, cardId: string): Promise<Card> {
  // 更新卡片信息
  const updatedCard = await sdk.card.update(cardId, {
    name: '更新后的卡片名称',
    tags: ['更新', '修改'],
    description: '这是更新后的描述',
    mergeTags: false, // 是否合并标签（true 为追加，false 为替换）
  });

  console.log('卡片已更新:');
  console.log('  - 新名称:', updatedCard.metadata.name);
  console.log('  - 修改时间:', updatedCard.metadata.modified_at);

  return updatedCard;
}

/**
 * 查询卡片
 *
 * 按条件搜索卡片
 */
async function queryCards(sdk: ChipsSDK): Promise<Card[]> {
  // 查询所有卡片
  const allCards = await sdk.card.query();
  console.log(`找到 ${allCards.length} 张卡片`);

  // 按标签查询
  const taggedCards = await sdk.card.query({
    tags: ['示例'],
  });
  console.log(`带有"示例"标签的卡片: ${taggedCards.length} 张`);

  // 按类型查询并排序
  const sortedCards = await sdk.card.query({
    type: 'note',
    sortBy: 'modified',
    sortOrder: 'desc',
  });

  return sortedCards;
}

/**
 * 管理卡片标签
 *
 * 添加和移除卡片标签
 */
async function manageCardTags(sdk: ChipsSDK, cardId: string): Promise<void> {
  // 添加标签
  await sdk.card.addTags(cardId, ['新标签1', '新标签2']);
  console.log('标签已添加');

  // 移除标签
  await sdk.card.removeTags(cardId, ['新标签1']);
  console.log('标签已移除');
}

/**
 * 复制卡片
 *
 * 创建卡片的副本
 */
async function copyCard(
  sdk: ChipsSDK,
  sourceId: string,
  destPath: string
): Promise<Card> {
  // 复制卡片到新路径（会生成新的 ID）
  const copiedCard = await sdk.card.copy(sourceId, destPath);

  console.log('卡片已复制:');
  console.log('  - 原始 ID:', sourceId);
  console.log('  - 新 ID:', copiedCard.id);

  return copiedCard;
}

/**
 * 删除卡片
 *
 * 从存储中删除卡片
 */
async function deleteCard(sdk: ChipsSDK, pathOrId: string): Promise<void> {
  await sdk.card.delete(pathOrId);
  console.log(`卡片已删除: ${pathOrId}`);
}

// ============================================================
// 第三部分：箱子操作
// ============================================================

/**
 * 创建箱子
 *
 * 箱子是用于组织和展示多张卡片的容器
 */
async function createBox(sdk: ChipsSDK): Promise<Box> {
  // 定义箱子创建选项
  const options: CreateBoxOptions = {
    name: '我的收藏箱',
    layout: 'grid', // 布局类型：grid | list | masonry
    tags: ['收藏', '精选'],
    description: '收藏我喜欢的卡片',
  };

  // 创建箱子
  const box = await sdk.box.create(options);

  console.log('箱子已创建:');
  console.log('  - ID:', box.id);
  console.log('  - 名称:', box.metadata.name);
  console.log('  - 布局:', box.metadata.layout);

  return box;
}

/**
 * 向箱子添加卡片
 *
 * 将卡片添加到箱子中进行组织
 */
async function addCardsToBox(
  sdk: ChipsSDK,
  boxId: string,
  cardPaths: string[]
): Promise<Box> {
  let box: Box | null = null;

  // 逐个添加卡片
  for (const cardPath of cardPaths) {
    box = await sdk.box.addCard(boxId, cardPath, {
      location: 'internal', // 卡片位置类型：internal | external
    });
    console.log(`卡片已添加到箱子: ${cardPath}`);
  }

  // 获取卡片数量
  const count = await sdk.box.getCardCount(boxId);
  console.log(`箱子中共有 ${count} 张卡片`);

  return box!;
}

/**
 * 从箱子移除卡片
 */
async function removeCardFromBox(
  sdk: ChipsSDK,
  boxId: string,
  cardPath: string
): Promise<void> {
  await sdk.box.removeCard(boxId, cardPath);
  console.log(`卡片已从箱子移除: ${cardPath}`);
}

/**
 * 重新排序箱子中的卡片
 */
async function reorderCardsInBox(
  sdk: ChipsSDK,
  boxId: string,
  newOrder: string[]
): Promise<void> {
  await sdk.box.reorderCards(boxId, newOrder);
  console.log('卡片顺序已更新');
}

/**
 * 设置箱子布局
 */
async function setBoxLayout(
  sdk: ChipsSDK,
  boxId: string,
  layout: string
): Promise<void> {
  // 设置布局类型
  await sdk.box.setLayout(boxId, layout);
  console.log(`布局已更改为: ${layout}`);

  // 设置布局配置
  await sdk.box.setLayoutConfig(boxId, {
    columns: 3, // 网格列数
    gap: 16, // 间距
    cardSize: 'medium', // 卡片大小
  });
  console.log('布局配置已更新');
}

/**
 * 保存箱子
 */
async function saveBox(sdk: ChipsSDK, box: Box, path: string): Promise<void> {
  await sdk.box.save(path, box, {
    overwrite: true,
  });
  console.log(`箱子已保存到: ${path}`);
}

/**
 * 查询箱子
 */
async function queryBoxes(sdk: ChipsSDK): Promise<Box[]> {
  // 查询所有箱子
  const boxes = await sdk.box.query({
    sortBy: 'modified',
    sortOrder: 'desc',
  });

  console.log(`找到 ${boxes.length} 个箱子`);

  for (const box of boxes) {
    console.log(`  - ${box.metadata.name} (${box.structure.cards.length} 张卡片)`);
  }

  return boxes;
}

// ============================================================
// 第四部分：错误处理
// ============================================================

/**
 * 错误处理示例
 *
 * SDK 定义了多种错误类型，便于精确处理不同的错误情况
 */
async function errorHandlingExample(sdk: ChipsSDK): Promise<void> {
  try {
    // 尝试加载一个不存在的卡片
    await sdk.card.get('non-existent-card-id');
  } catch (error) {
    if (error instanceof ChipsError) {
      // ChipsError 是所有 SDK 错误的基类
      console.error('SDK 错误:');
      console.error('  - 错误代码:', error.code);
      console.error('  - 错误消息:', error.message);
      console.error('  - 错误详情:', error.details);

      // 根据错误代码进行不同处理
      switch (error.code) {
        case 'FILE_NOT_FOUND':
          console.log('文件不存在，请检查路径是否正确');
          break;
        case 'CONNECTION_FAILED':
          console.log('连接失败，请检查 Core 服务是否运行');
          break;
        case 'VALIDATION_FAILED':
          console.log('验证失败，请检查数据格式');
          break;
        default:
          console.log('发生未知错误');
      }
    } else {
      // 其他类型的错误
      console.error('未知错误:', error);
    }
  }
}

// ============================================================
// 第五部分：完整使用流程
// ============================================================

/**
 * 完整的使用流程示例
 *
 * 展示从初始化到销毁的完整生命周期
 */
async function completeWorkflow(): Promise<void> {
  let sdk: ChipsSDK | null = null;

  try {
    // 1. 初始化 SDK
    console.log('=== 步骤 1: 初始化 SDK ===');
    sdk = await initializeSDK();

    // 2. 创建卡片
    console.log('\n=== 步骤 2: 创建卡片 ===');
    const card = await createCard(sdk);
    const cardPath = '/path/to/my-card.card';

    // 3. 保存卡片
    console.log('\n=== 步骤 3: 保存卡片 ===');
    await saveCard(sdk, card, cardPath);

    // 4. 更新卡片
    console.log('\n=== 步骤 4: 更新卡片 ===');
    await updateCard(sdk, card.id);

    // 5. 创建箱子
    console.log('\n=== 步骤 5: 创建箱子 ===');
    const box = await createBox(sdk);
    const boxPath = '/path/to/my-box.box';

    // 6. 添加卡片到箱子
    console.log('\n=== 步骤 6: 添加卡片到箱子 ===');
    await addCardsToBox(sdk, box.id, [cardPath]);

    // 7. 保存箱子
    console.log('\n=== 步骤 7: 保存箱子 ===');
    await saveBox(sdk, box, boxPath);

    // 8. 查询数据
    console.log('\n=== 步骤 8: 查询数据 ===');
    await queryCards(sdk);
    await queryBoxes(sdk);

    console.log('\n=== 工作流程完成 ===');
  } catch (error) {
    console.error('工作流程出错:', error);
    throw error;
  } finally {
    // 9. 销毁 SDK（释放资源）
    if (sdk) {
      console.log('\n=== 步骤 9: 销毁 SDK ===');
      sdk.destroy();
      console.log('SDK 已销毁，状态:', sdk.state);
    }
  }
}

// ============================================================
// 第六部分：实用技巧
// ============================================================

/**
 * 使用配置管理器
 *
 * 配置管理器用于管理应用程序配置
 */
function useConfigManager(sdk: ChipsSDK): void {
  // 设置配置
  sdk.config.set('myapp.theme', 'dark');
  sdk.config.set('myapp.language', 'zh-CN');

  // 获取配置
  const theme = sdk.config.get<string>('myapp.theme');
  console.log('当前主题:', theme);

  // 监听配置变化
  sdk.config.onChange('myapp.theme', (newValue, oldValue) => {
    console.log(`主题从 ${oldValue} 变更为 ${newValue}`);
  });
}

/**
 * 使用日志系统
 *
 * 日志系统用于记录应用程序运行信息
 */
function useLogger(sdk: ChipsSDK): void {
  const logger = sdk.logger;

  // 不同级别的日志
  logger.debug('调试信息', { detail: 'some data' });
  logger.info('普通信息');
  logger.warn('警告信息');
  logger.error('错误信息', { error: 'some error' });

  // 创建子日志器
  const childLogger = logger.createChild('MyModule');
  childLogger.info('来自子模块的日志');
}

/**
 * 检查 SDK 版本兼容性
 */
function checkVersion(): void {
  console.log('SDK 版本信息:');
  console.log('  - SDK 版本:', ChipsSDK.VERSION.sdk);
  console.log('  - 协议版本:', ChipsSDK.VERSION.protocol);
  console.log('  - 构建时间:', ChipsSDK.VERSION.buildTime);
}

// ============================================================
// 运行示例
// ============================================================

// 导出主函数供外部调用
export { completeWorkflow, initializeSDK };

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  completeWorkflow()
    .then(() => {
      console.log('\n示例运行完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n示例运行失败:', error);
      process.exit(1);
    });
}
