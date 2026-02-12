/**
 * 配置响应式 composable
 * @module composables/use-config
 */

import { getCurrentInstance, onUnmounted, ref, shallowRef, type Ref } from 'vue';
import { BridgeClient } from '../bridge';
import { getBridgeClient } from './utils/get-bridge-client';

interface UseConfigOptions<TValue> {
  bridge?: BridgeClient;
  defaultValue?: TValue;
}

interface ConfigUpdatedPayload<TValue> {
  key?: string;
  value?: TValue;
}

interface UseConfigState<TValue> {
  value: Ref<TValue | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
  stop: () => void;
}

/**
 * 响应式配置读取
 */
export function useConfig<TValue = unknown>(
  key: string,
  options: UseConfigOptions<TValue> = {}
): UseConfigState<TValue> {
  const value = shallowRef<TValue | null>(options.defaultValue ?? null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  let unsubscribe: (() => void) | null = null;

  const refresh = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const bridge = await getBridgeClient(options.bridge);
      const nextValue = await bridge.invoke<TValue>('config', 'get', { key });
      value.value = nextValue;
    } catch (refreshError) {
      error.value = refreshError instanceof Error
        ? refreshError
        : new Error('Failed to load config');
      if (options.defaultValue !== undefined) {
        value.value = options.defaultValue;
      }
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
    unsubscribe = bridge.on('config.updated', (payload) => {
      const data = payload as ConfigUpdatedPayload<TValue>;
      if (data.key === key) {
        value.value = data.value ?? options.defaultValue ?? null;
      }
    });

    await refresh();
  };

  void initialize();
  if (getCurrentInstance()) {
    onUnmounted(stop);
  }

  return {
    value,
    loading,
    error,
    refresh,
    stop,
  };
}
