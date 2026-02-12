/**
 * 主题响应式 composable
 * @module composables/use-theme
 */

import { getCurrentInstance, onUnmounted, ref, type Ref } from 'vue';
import { BridgeClient } from '../bridge';
import { getBridgeClient } from './utils/get-bridge-client';

interface UseThemeOptions {
  bridge?: BridgeClient;
  componentType?: string;
}

interface ThemeChangedPayload {
  themeId?: string;
}

interface UseThemeState {
  themeCss: Ref<string>;
  themeId: Ref<string | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
  stop: () => void;
}

/**
 * 响应式主题 CSS
 */
export function useTheme(options: UseThemeOptions = {}): UseThemeState {
  const themeCss = ref('');
  const themeId = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  let unsubscribe: (() => void) | null = null;

  const refresh = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const bridge = await getBridgeClient(options.bridge);
      const css = await bridge.invoke<string>('theme', 'getCSS', {
        componentType: options.componentType,
      });
      themeCss.value = typeof css === 'string' ? css : '';
    } catch (refreshError) {
      error.value = refreshError instanceof Error
        ? refreshError
        : new Error('Failed to load theme css');
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
    unsubscribe = bridge.on('theme.changed', (payload) => {
      const data = payload as ThemeChangedPayload;
      themeId.value = typeof data.themeId === 'string' ? data.themeId : null;
      void refresh();
    });

    await refresh();
  };

  void initialize();
  if (getCurrentInstance()) {
    onUnmounted(stop);
  }

  return {
    themeCss,
    themeId,
    loading,
    error,
    refresh,
    stop,
  };
}
