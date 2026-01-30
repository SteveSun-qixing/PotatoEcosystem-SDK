/**
 * 多语言管理器
 *
 * 遵循薯片生态的系统统一多语言方案：
 * - 零硬编码：所有文本使用词汇key
 * - 系统接管：文本由系统多语言引擎管理
 * - 自动替换：打包时key替换为系统编码
 */

import { SupportedLanguage } from '../../types';
import type { EventEmitter } from 'eventemitter3';

/**
 * 翻译字典类型
 */
type TranslationDict = Record<string, string | Record<string, string>>;

/**
 * 多语言管理器
 */
class I18nManager {
  private currentLanguage: SupportedLanguage = SupportedLanguage.ZhCN;
  private fallbackLanguage: SupportedLanguage = SupportedLanguage.ZhCN;
  private translations: Map<SupportedLanguage, TranslationDict> = new Map();
  private eventEmitter?: EventEmitter;

  constructor(options?: {
    defaultLanguage?: SupportedLanguage;
    fallbackLanguage?: SupportedLanguage;
    eventEmitter?: EventEmitter;
  }) {
    this.currentLanguage = options?.defaultLanguage ?? SupportedLanguage.ZhCN;
    this.fallbackLanguage = options?.fallbackLanguage ?? SupportedLanguage.ZhCN;
    this.eventEmitter = options?.eventEmitter;

    // 加载默认翻译
    this.loadDefaultTranslations();
  }

  /**
   * 加载默认翻译
   */
  private loadDefaultTranslations(): void {
    // 简体中文
    this.translations.set(SupportedLanguage.ZhCN, {
      common: {
        save: '保存',
        cancel: '取消',
        ok: '确定',
        delete: '删除',
        edit: '编辑',
        create: '创建',
        update: '更新',
        close: '关闭',
      },
      error: {
        protocol_version_mismatch: '协议版本不匹配',
        protocol_invalid_format: '消息格式错误',
        service_not_found: '服务不存在',
        route_failed: '路由失败',
        permission_denied: '权限不足',
        resource_not_found: '资源不存在',
        resource_access_failed: '资源访问失败',
        invalid_id: '无效的ID',
        invalid_card_data: '无效的卡片数据',
        file_not_found: '文件未找到',
        parse_error: '解析错误',
        network_error: '网络错误',
        unknown: '未知错误',
      },
      message: {
        save_success: '保存成功',
        delete_confirm: '确定要删除吗？',
        loading: '加载中...',
      },
    });

    // 英文
    this.translations.set(SupportedLanguage.EnUS, {
      common: {
        save: 'Save',
        cancel: 'Cancel',
        ok: 'OK',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        update: 'Update',
        close: 'Close',
      },
      error: {
        protocol_version_mismatch: 'Protocol version mismatch',
        protocol_invalid_format: 'Invalid message format',
        service_not_found: 'Service not found',
        route_failed: 'Route failed',
        permission_denied: 'Permission denied',
        resource_not_found: 'Resource not found',
        resource_access_failed: 'Resource access failed',
        invalid_id: 'Invalid ID',
        invalid_card_data: 'Invalid card data',
        file_not_found: 'File not found',
        parse_error: 'Parse error',
        network_error: 'Network error',
        unknown: 'Unknown error',
      },
      message: {
        save_success: 'Saved successfully',
        delete_confirm: 'Are you sure you want to delete?',
        loading: 'Loading...',
      },
    });
  }

  /**
   * 设置当前语言
   * @param language 语言代码
   */
  setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
    this.eventEmitter?.emit('language:change', language);
  }

  /**
   * 获取当前语言
   * @returns 当前语言代码
   */
  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * 翻译函数
   * @param key 翻译key（开发时使用，打包时会替换为系统编码）
   * @param params 参数（用于插值）
   * @returns 翻译后的文本
   */
  t(key: string, params?: Record<string, string | number>): string {
    // 获取翻译文本
    let text = this.getTranslation(key, this.currentLanguage);

    // 如果当前语言没有翻译，尝试使用fallback语言
    if (!text) {
      text = this.getTranslation(key, this.fallbackLanguage);
    }

    // 如果都没有，返回key本身
    if (!text) {
      return key;
    }

    // 处理参数插值
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(
          new RegExp(`\\{${paramKey}\\}`, 'g'),
          String(paramValue)
        );
      }
    }

    return text;
  }

  /**
   * 获取翻译文本
   * @param key 翻译key
   * @param language 语言
   * @returns 翻译文本
   */
  private getTranslation(
    key: string,
    language: SupportedLanguage
  ): string | null {
    const dict = this.translations.get(language);
    if (!dict) return null;

    // 支持点分隔的嵌套key
    const keys = key.split('.');
    let current: unknown = dict;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k];
      } else {
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }

  /**
   * 添加翻译
   * @param language 语言
   * @param translations 翻译字典
   */
  addTranslations(
    language: SupportedLanguage,
    translations: TranslationDict
  ): void {
    const existing = this.translations.get(language) ?? {};
    this.translations.set(language, { ...existing, ...translations });
  }

  /**
   * 加载翻译文件
   * @param language 语言
   * @param translations 翻译数据
   */
  loadTranslations(
    language: SupportedLanguage,
    translations: TranslationDict
  ): void {
    this.translations.set(language, translations);
  }
}

/**
 * 全局翻译函数实例
 */
let globalI18nManager: I18nManager | null = null;

/**
 * 设置全局多语言管理器
 * @param manager 多语言管理器实例
 */
export function setGlobalI18nManager(manager: I18nManager): void {
  globalI18nManager = manager;
}

/**
 * 全局翻译函数（开发时使用key，打包时会替换为系统编码）
 * @param key 翻译key
 * @param params 参数
 * @returns 翻译后的文本
 */
export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  if (!globalI18nManager) {
    return key;
  }
  return globalI18nManager.t(key, params);
}

export { I18nManager };
