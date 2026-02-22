/**
 * 卡片响应式 composable
 * @module composables/use-card
 */

import { getCurrentInstance, onUnmounted, ref, unref, watch, type Ref } from 'vue';
import { BridgeClient } from '../bridge';
import { getBridgeClient } from './utils/get-bridge-client';

interface UseCardOptions {
  bridge?: BridgeClient;
}

type CardPathSource = string | Ref<string>;

type CardData = Record<string, unknown>;

interface UseCardState {
  card: Ref<CardData | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reload: (targetPath?: string) => Promise<void>;
  stop: () => void;
}

/**
 * 响应式卡片读取
 */
export function useCard(cardPath: CardPathSource, options: UseCardOptions = {}): UseCardState {
  const card = ref<CardData | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  let unsubscribe: (() => void) | null = null;

  const load = async (targetPath?: string): Promise<void> => {
    const path = targetPath ?? unref(cardPath);
    if (!path) {
      card.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const bridge = await getBridgeClient(options.bridge);
      const data = await bridge.invoke<CardData>('card', 'read', { path });
      card.value = data;
    } catch (loadError) {
      error.value = loadError instanceof Error
        ? loadError
        : new Error('Failed to load card');
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
    unsubscribe = bridge.on('card.updated', (payload) => {
      const eventData = payload as Record<string, unknown>;
      const eventPath = eventData.path;
      const currentPath = unref(cardPath);
      if (typeof eventPath === 'string' && eventPath === currentPath) {
        void load(currentPath);
      }
    });

    await load(unref(cardPath));
  };

  watch(
    () => unref(cardPath),
    (nextPath) => {
      void load(nextPath);
    }
  );

  void initialize();
  if (getCurrentInstance()) {
    onUnmounted(stop);
  }

  return {
    card,
    loading,
    error,
    reload: load,
    stop,
  };
}
