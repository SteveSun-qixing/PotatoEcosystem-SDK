/**
 * 多语言响应式 composable
 * @module composables/use-i18n
 */

import { getCurrentInstance, onUnmounted, ref, type Ref } from 'vue';
import { BridgeClient } from '../bridge';
import { getBridgeClient } from './utils/get-bridge-client';

interface UseI18nOptions {
  bridge?: BridgeClient;
  initialLanguage?: string;
}

interface LanguageChangedPayload {
  language?: string;
}

interface UseI18nState {
  language: Ref<string>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  t: (key: string, params?: Record<string, string | number>) => Promise<string>;
  translate: (key: string, params?: Record<string, string | number>) => Promise<string>;
  stop: () => void;
}

/**
 * 响应式多语言能力
 */
export function useI18n(options: UseI18nOptions = {}): UseI18nState {
  const language = ref(options.initialLanguage ?? 'zh-CN');
  const loading = ref(false);
  const error = ref<Error | null>(null);

  let unsubscribe: (() => void) | null = null;

  const translate = async (
    key: string,
    params?: Record<string, string | number>
  ): Promise<string> => {
    loading.value = true;
    error.value = null;

    try {
      const bridge = await getBridgeClient(options.bridge);
      const text = await bridge.invoke<string>('i18n', 'translate', {
        key,
        params,
      });
      return typeof text === 'string' ? text : key;
    } catch (translateError) {
      error.value = translateError instanceof Error
        ? translateError
        : new Error('Failed to translate');
      return key;
    } finally {
      loading.value = false;
    }
  };

  const stop = (): void => {
    if (!unsubscribe) {
      return;
    }
    unsubscribe();
    unsubscribe = null;
  };

  const initialize = async (): Promise<void> => {
    const bridge = await getBridgeClient(options.bridge);
    unsubscribe = bridge.on('language.changed', (payload) => {
      const data = payload as LanguageChangedPayload;
      if (typeof data.language === 'string') {
        language.value = data.language;
      }
    });
  };

  void initialize();
  if (getCurrentInstance()) {
    onUnmounted(stop);
  }

  return {
    language,
    loading,
    error,
    t: translate,
    translate,
    stop,
  };
}
