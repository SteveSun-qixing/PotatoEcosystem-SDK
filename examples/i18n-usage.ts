/**
 * Chips SDK 多语言（国际化）使用示例
 *
 * 本示例展示了 SDK 多语言系统的使用方法，包括：
 * - 基本翻译用法
 * - 添加自定义翻译
 * - 语言切换
 * - 插值使用
 * - 复数形式
 * - 语言变更监听
 * - 最佳实践
 *
 * @module examples/i18n-usage
 */

import {
  ChipsSDK,
  I18nManager,
  Translation,
  Locale,
  I18nManagerOptions,
} from '@chips/sdk';

// ============================================================
// 第一部分：基本用法
// ============================================================

/**
 * 基本翻译用法
 *
 * 展示如何使用翻译函数获取翻译文本
 */
function basicTranslation(sdk: ChipsSDK): void {
  // 使用 SDK 的便捷方法进行翻译
  // SDK 内置了常用的中英文翻译

  // 翻译简单文本
  const loading = sdk.t('common.loading');
  console.log('加载中:', loading); // 中文: "加载中..."

  const success = sdk.t('common.success');
  console.log('成功:', success); // 中文: "成功"

  // 翻译错误消息
  const fileNotFound = sdk.t('error.file_not_found');
  console.log('错误消息:', fileNotFound); // 中文: "文件未找到"

  // 翻译不存在的 key 会返回 key 本身
  const unknownKey = sdk.t('unknown.key');
  console.log('未知 key:', unknownKey); // "unknown.key"
}

/**
 * 直接使用 I18nManager
 *
 * 获取更多控制和功能
 */
function useI18nManagerDirect(sdk: ChipsSDK): void {
  const i18n = sdk.i18n;

  // 获取当前语言
  console.log('当前语言:', i18n.locale);

  // 获取可用语言列表
  const locales = i18n.getAvailableLocales();
  console.log('可用语言:', locales);

  // 检查语言是否可用
  const hasZhCN = i18n.hasLocale('zh-CN');
  const hasJaJP = i18n.hasLocale('ja-JP');
  console.log('支持中文:', hasZhCN);
  console.log('支持日语:', hasJaJP);

  // 使用 i18n 翻译
  const text = i18n.t('common.confirm');
  console.log('翻译结果:', text);
}

// ============================================================
// 第二部分：添加自定义翻译
// ============================================================

/**
 * 中文翻译
 */
const zhCNTranslation: Translation = {
  // 应用通用翻译
  app: {
    name: '我的薯片应用',
    version: '版本 {version}',
    welcome: '欢迎使用 {appName}！',
    description: '一款强大的卡片管理应用',
  },

  // 用户相关
  user: {
    login: '登录',
    logout: '退出登录',
    register: '注册',
    profile: '个人资料',
    settings: '设置',
    greeting: '你好，{name}！',
    lastLogin: '上次登录：{time}',
  },

  // 卡片相关
  card: {
    title: '卡片',
    create: '创建卡片',
    edit: '编辑卡片',
    delete: '删除卡片',
    copy: '复制卡片',
    move: '移动卡片',
    search: '搜索卡片...',
    empty: '暂无卡片',
    count: {
      zero: '没有卡片',
      one: '{count} 张卡片',
      other: '{count} 张卡片',
    },
    confirmDelete: '确定要删除卡片 "{name}" 吗？',
    deleteSuccess: '卡片已删除',
    createSuccess: '卡片创建成功',
    saveSuccess: '卡片保存成功',
  },

  // 箱子相关
  box: {
    title: '箱子',
    create: '创建箱子',
    edit: '编辑箱子',
    delete: '删除箱子',
    empty: '箱子是空的',
    addCard: '添加卡片',
    removeCard: '移除卡片',
    cardCount: '包含 {count} 张卡片',
    layout: {
      grid: '网格布局',
      list: '列表布局',
      masonry: '瀑布流布局',
    },
  },

  // 表单相关
  form: {
    required: '此字段为必填项',
    invalid: '请输入有效的值',
    minLength: '至少需要 {min} 个字符',
    maxLength: '最多允许 {max} 个字符',
    pattern: '格式不正确',
    submit: '提交',
    cancel: '取消',
    reset: '重置',
  },

  // 时间相关
  time: {
    justNow: '刚刚',
    minutesAgo: '{minutes} 分钟前',
    hoursAgo: '{hours} 小时前',
    daysAgo: '{days} 天前',
    today: '今天',
    yesterday: '昨天',
    thisWeek: '本周',
    thisMonth: '本月',
  },

  // 文件相关
  file: {
    upload: '上传文件',
    download: '下载文件',
    delete: '删除文件',
    size: '文件大小：{size}',
    type: '文件类型：{type}',
    uploadSuccess: '文件上传成功',
    uploadFailed: '文件上传失败：{error}',
    maxSize: '文件大小不能超过 {maxSize}',
  },
};

/**
 * 英文翻译
 */
const enUSTranslation: Translation = {
  app: {
    name: 'My Chips App',
    version: 'Version {version}',
    welcome: 'Welcome to {appName}!',
    description: 'A powerful card management application',
  },

  user: {
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    profile: 'Profile',
    settings: 'Settings',
    greeting: 'Hello, {name}!',
    lastLogin: 'Last login: {time}',
  },

  card: {
    title: 'Cards',
    create: 'Create Card',
    edit: 'Edit Card',
    delete: 'Delete Card',
    copy: 'Copy Card',
    move: 'Move Card',
    search: 'Search cards...',
    empty: 'No cards yet',
    count: {
      zero: 'No cards',
      one: '{count} card',
      other: '{count} cards',
    },
    confirmDelete: 'Are you sure you want to delete card "{name}"?',
    deleteSuccess: 'Card deleted',
    createSuccess: 'Card created successfully',
    saveSuccess: 'Card saved successfully',
  },

  box: {
    title: 'Boxes',
    create: 'Create Box',
    edit: 'Edit Box',
    delete: 'Delete Box',
    empty: 'Box is empty',
    addCard: 'Add Card',
    removeCard: 'Remove Card',
    cardCount: 'Contains {count} cards',
    layout: {
      grid: 'Grid Layout',
      list: 'List Layout',
      masonry: 'Masonry Layout',
    },
  },

  form: {
    required: 'This field is required',
    invalid: 'Please enter a valid value',
    minLength: 'At least {min} characters required',
    maxLength: 'Maximum {max} characters allowed',
    pattern: 'Invalid format',
    submit: 'Submit',
    cancel: 'Cancel',
    reset: 'Reset',
  },

  time: {
    justNow: 'Just now',
    minutesAgo: '{minutes} minutes ago',
    hoursAgo: '{hours} hours ago',
    daysAgo: '{days} days ago',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This week',
    thisMonth: 'This month',
  },

  file: {
    upload: 'Upload File',
    download: 'Download File',
    delete: 'Delete File',
    size: 'File size: {size}',
    type: 'File type: {type}',
    uploadSuccess: 'File uploaded successfully',
    uploadFailed: 'File upload failed: {error}',
    maxSize: 'File size cannot exceed {maxSize}',
  },
};

/**
 * 日语翻译（部分示例）
 */
const jaJPTranslation: Translation = {
  app: {
    name: '私のチップスアプリ',
    version: 'バージョン {version}',
    welcome: '{appName} へようこそ！',
  },

  user: {
    login: 'ログイン',
    logout: 'ログアウト',
    register: '登録',
    greeting: 'こんにちは、{name}さん！',
  },

  card: {
    title: 'カード',
    create: 'カードを作成',
    edit: 'カードを編集',
    delete: 'カードを削除',
    empty: 'カードがありません',
    count: {
      zero: 'カードなし',
      one: '{count} 枚のカード',
      other: '{count} 枚のカード',
    },
  },
};

/**
 * 添加自定义翻译到 SDK
 */
function addCustomTranslations(sdk: ChipsSDK): void {
  const i18n = sdk.i18n;

  // 添加中文翻译
  i18n.addTranslation('zh-CN', zhCNTranslation);
  console.log('已添加中文翻译');

  // 添加英文翻译
  i18n.addTranslation('en-US', enUSTranslation);
  console.log('已添加英文翻译');

  // 添加日语翻译
  i18n.addTranslation('ja-JP', jaJPTranslation);
  console.log('已添加日语翻译');

  // 查看更新后的可用语言
  console.log('可用语言:', i18n.getAvailableLocales());
}

// ============================================================
// 第三部分：语言切换
// ============================================================

/**
 * 切换语言
 */
function switchLanguage(sdk: ChipsSDK): void {
  // 使用 SDK 便捷方法切换语言
  sdk.setLocale('en-US');
  console.log('已切换到英语');
  console.log('欢迎消息:', sdk.t('app.welcome', { appName: 'Chips' }));

  // 切换到中文
  sdk.setLocale('zh-CN');
  console.log('已切换到中文');
  console.log('欢迎消息:', sdk.t('app.welcome', { appName: '薯片' }));

  // 切换到日语
  sdk.setLocale('ja-JP');
  console.log('已切换到日语');
  console.log('欢迎消息:', sdk.t('app.welcome', { appName: 'チップス' }));

  // 切换回中文
  sdk.setLocale('zh-CN');
}

/**
 * 监听语言变更
 */
function listenToLanguageChange(sdk: ChipsSDK): void {
  const i18n = sdk.i18n;

  // 添加语言变更监听器
  const handleLocaleChange = (newLocale: Locale) => {
    console.log('语言已变更为:', newLocale);

    // 在这里可以执行语言变更后的操作
    // 例如：重新渲染 UI、更新本地存储等
    updateUI(newLocale);
    saveLocalePreference(newLocale);
  };

  i18n.onLocaleChange(handleLocaleChange);

  // 测试语言变更
  console.log('测试语言变更...');
  sdk.setLocale('en-US');
  sdk.setLocale('zh-CN');

  // 取消监听（如果需要）
  // i18n.offLocaleChange(handleLocaleChange);
}

// 辅助函数
function updateUI(locale: Locale): void {
  console.log(`更新 UI 语言: ${locale}`);
  // 更新文档语言属性
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

function saveLocalePreference(locale: Locale): void {
  console.log(`保存语言偏好: ${locale}`);
  // 保存到本地存储
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('chips-locale', locale);
  }
}

// ============================================================
// 第四部分：插值使用
// ============================================================

/**
 * 字符串插值
 *
 * 使用 {placeholder} 语法进行变量替换
 */
function stringInterpolation(sdk: ChipsSDK): void {
  // 简单插值
  const greeting = sdk.t('user.greeting', { name: '张三' });
  console.log('问候语:', greeting); // "你好，张三！"

  // 多个变量插值
  const welcome = sdk.t('app.welcome', { appName: '薯片卡片' });
  console.log('欢迎:', welcome); // "欢迎使用 薯片卡片！"

  // 数字插值
  const version = sdk.t('app.version', { version: '1.2.3' });
  console.log('版本:', version); // "版本 1.2.3"

  // 复杂插值
  const fileInfo = sdk.t('file.size', { size: '2.5 MB' });
  console.log('文件信息:', fileInfo); // "文件大小：2.5 MB"

  // 带错误信息的插值
  const uploadError = sdk.t('file.uploadFailed', {
    error: '网络连接失败',
  });
  console.log('上传错误:', uploadError); // "文件上传失败：网络连接失败"

  // 确认消息插值
  const confirmDelete = sdk.t('card.confirmDelete', {
    name: '我的卡片',
  });
  console.log('确认删除:', confirmDelete);
  // "确定要删除卡片 "我的卡片" 吗？"

  // 时间相关插值
  const minutesAgo = sdk.t('time.minutesAgo', { minutes: 5 });
  console.log('时间:', minutesAgo); // "5 分钟前"
}

// ============================================================
// 第五部分：复数形式
// ============================================================

/**
 * 复数形式翻译
 *
 * 根据数量自动选择正确的复数形式
 */
function pluralForms(sdk: ChipsSDK): void {
  const i18n = sdk.i18n;

  // 使用 plural 方法处理复数
  console.log('复数形式测试:');

  // 0 个
  const zeroCards = i18n.plural('card.count', 0);
  console.log('  0:', zeroCards); // "没有卡片"

  // 1 个
  const oneCard = i18n.plural('card.count', 1, { count: 1 });
  console.log('  1:', oneCard); // "1 张卡片"

  // 多个
  const fiveCards = i18n.plural('card.count', 5, { count: 5 });
  console.log('  5:', fiveCards); // "5 张卡片"

  const manyCards = i18n.plural('card.count', 100, { count: 100 });
  console.log('  100:', manyCards); // "100 张卡片"

  // 英文复数形式测试
  sdk.setLocale('en-US');

  const zeroCardsEn = i18n.plural('card.count', 0);
  console.log('  EN 0:', zeroCardsEn); // "No cards"

  const oneCardEn = i18n.plural('card.count', 1, { count: 1 });
  console.log('  EN 1:', oneCardEn); // "1 card"

  const fiveCardsEn = i18n.plural('card.count', 5, { count: 5 });
  console.log('  EN 5:', fiveCardsEn); // "5 cards"

  // 切回中文
  sdk.setLocale('zh-CN');
}

// ============================================================
// 第六部分：实用工具
// ============================================================

/**
 * 创建本地化工具函数
 */
function createI18nUtils(sdk: ChipsSDK) {
  const i18n = sdk.i18n;

  return {
    /**
     * 格式化日期
     */
    formatDate(date: Date, style: 'short' | 'long' = 'short'): string {
      const locale = i18n.locale;
      const options: Intl.DateTimeFormatOptions =
        style === 'short'
          ? { year: 'numeric', month: '2-digit', day: '2-digit' }
          : { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };

      return new Intl.DateTimeFormat(locale, options).format(date);
    },

    /**
     * 格式化数字
     */
    formatNumber(num: number, style: 'decimal' | 'percent' | 'currency' = 'decimal'): string {
      const locale = i18n.locale;
      const options: Intl.NumberFormatOptions = { style };

      if (style === 'currency') {
        (options as Intl.NumberFormatOptions).currency = locale === 'zh-CN' ? 'CNY' : 'USD';
      }

      return new Intl.NumberFormat(locale, options).format(num);
    },

    /**
     * 格式化相对时间
     */
    formatRelativeTime(date: Date): string {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) {
        return sdk.t('time.justNow');
      } else if (minutes < 60) {
        return sdk.t('time.minutesAgo', { minutes });
      } else if (hours < 24) {
        return sdk.t('time.hoursAgo', { hours });
      } else {
        return sdk.t('time.daysAgo', { days });
      }
    },

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes: number): string {
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let unitIndex = 0;
      let size = bytes;

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }

      return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    },
  };
}

/**
 * 使用本地化工具
 */
function useI18nUtils(sdk: ChipsSDK): void {
  const utils = createI18nUtils(sdk);

  console.log('\n本地化工具演示:');

  // 日期格式化
  const now = new Date();
  console.log('短日期:', utils.formatDate(now, 'short'));
  console.log('长日期:', utils.formatDate(now, 'long'));

  // 数字格式化
  console.log('数字:', utils.formatNumber(1234567.89));
  console.log('百分比:', utils.formatNumber(0.8542, 'percent'));
  console.log('货币:', utils.formatNumber(99.99, 'currency'));

  // 相对时间
  const pastDate = new Date(Date.now() - 3600000 * 2); // 2小时前
  console.log('相对时间:', utils.formatRelativeTime(pastDate));

  // 文件大小
  console.log('文件大小:', utils.formatFileSize(1536000)); // 1.46 MB
}

// ============================================================
// 第七部分：国际化最佳实践
// ============================================================

/**
 * 国际化组件示例
 *
 * 展示如何在组件中使用国际化
 */
class LocalizedComponent {
  private _sdk: ChipsSDK;
  private _element: HTMLElement | null = null;

  constructor(sdk: ChipsSDK) {
    this._sdk = sdk;
  }

  /**
   * 渲染组件
   */
  render(container: HTMLElement): void {
    this._element = document.createElement('div');
    this._element.className = 'localized-component';

    this._updateContent();
    container.appendChild(this._element);

    // 监听语言变更，自动更新内容
    this._sdk.i18n.onLocaleChange(() => {
      this._updateContent();
    });
  }

  /**
   * 更新内容
   */
  private _updateContent(): void {
    if (!this._element) return;

    const t = (key: string, params?: Record<string, string | number>) =>
      this._sdk.t(key, params);

    this._element.innerHTML = `
      <div class="header">
        <h1>${t('app.name')}</h1>
        <p>${t('app.description')}</p>
      </div>
      <div class="actions">
        <button class="btn-create">${t('card.create')}</button>
        <button class="btn-search">${t('card.search')}</button>
      </div>
      <div class="status">
        <span>${t('card.count', { count: 10 })}</span>
      </div>
    `;
  }
}

/**
 * 国际化最佳实践总结
 */
function i18nBestPractices(): void {
  console.log(`
=== 国际化最佳实践 ===

1. 翻译 Key 命名规范
   - 使用点分隔的命名空间（如 'card.create'）
   - 按功能模块组织（如 user.*, card.*, box.*）
   - 使用有意义的名称，避免缩写

2. 避免硬编码文本
   - 所有用户可见的文本都应该翻译
   - 包括：按钮文本、提示消息、错误消息、占位符等
   - 不要拼接字符串，使用插值

3. 处理复数和性别
   - 不同语言有不同的复数规则
   - 使用 plural() 方法处理复数
   - 考虑不同语言的语法差异

4. 日期、时间、数字格式化
   - 使用 Intl API 进行本地化格式化
   - 考虑时区差异
   - 货币格式化要指定币种

5. 响应式翻译
   - 监听语言变更事件
   - 动态更新 UI 内容
   - 缓存翻译结果以提高性能

6. 回退机制
   - 设置合理的回退语言
   - 处理翻译缺失的情况
   - 提供默认值

7. 翻译文件管理
   - 将翻译文件独立管理
   - 支持动态加载翻译
   - 考虑使用翻译管理平台
  `);
}

// ============================================================
// 导出和运行
// ============================================================

export {
  zhCNTranslation,
  enUSTranslation,
  jaJPTranslation,
  basicTranslation,
  useI18nManagerDirect,
  addCustomTranslations,
  switchLanguage,
  listenToLanguageChange,
  stringInterpolation,
  pluralForms,
  createI18nUtils,
  LocalizedComponent,
};

// 完整示例运行
async function runExample(): Promise<void> {
  // 初始化 SDK，设置默认语言
  const sdk = new ChipsSDK({
    connector: { url: 'ws://localhost:9527' },
    autoConnect: true,
    i18n: {
      defaultLocale: 'zh-CN',
      fallbackLocale: 'en-US',
    },
  });

  await sdk.initialize();

  try {
    // 1. 基本翻译
    console.log('=== 步骤 1: 基本翻译 ===');
    basicTranslation(sdk);

    // 2. 直接使用 I18nManager
    console.log('\n=== 步骤 2: I18nManager ===');
    useI18nManagerDirect(sdk);

    // 3. 添加自定义翻译
    console.log('\n=== 步骤 3: 添加翻译 ===');
    addCustomTranslations(sdk);

    // 4. 语言切换
    console.log('\n=== 步骤 4: 语言切换 ===');
    switchLanguage(sdk);

    // 5. 监听语言变更
    console.log('\n=== 步骤 5: 语言监听 ===');
    listenToLanguageChange(sdk);

    // 6. 字符串插值
    console.log('\n=== 步骤 6: 字符串插值 ===');
    stringInterpolation(sdk);

    // 7. 复数形式
    console.log('\n=== 步骤 7: 复数形式 ===');
    pluralForms(sdk);

    // 8. 本地化工具
    console.log('\n=== 步骤 8: 本地化工具 ===');
    useI18nUtils(sdk);

    // 9. 最佳实践
    console.log('\n=== 步骤 9: 最佳实践 ===');
    i18nBestPractices();
  } finally {
    sdk.destroy();
  }
}

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runExample()
    .then(() => {
      console.log('\n国际化示例运行完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n国际化示例运行失败:', error);
      process.exit(1);
    });
}
