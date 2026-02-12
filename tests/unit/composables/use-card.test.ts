import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useCard } from '../../../src/composables/use-card';
import { MockBridgeClient } from '../../helpers/mock-connector';

async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('useCard', () => {
  it('should load card data on initialize', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('card', 'read', { id: 'card-1', metadata: { name: 'Demo' } });

    const state = useCard('/cards/demo.card', { bridge });
    await flushPromises();

    expect(state.card.value).toEqual({ id: 'card-1', metadata: { name: 'Demo' } });
  });

  it('should reload card data manually', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('card', 'read', { id: 'card-1', metadata: { name: 'A' } });

    const state = useCard('/cards/demo.card', { bridge });
    await flushPromises();

    bridge.mockResponse('card', 'read', { id: 'card-1', metadata: { name: 'B' } });
    await state.reload('/cards/demo.card');

    expect(state.card.value).toEqual({ id: 'card-1', metadata: { name: 'B' } });
  });

  it('should react to card.updated for current path', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('card', 'read', { id: 'card-1', version: 1 });

    const state = useCard('/cards/demo.card', { bridge });
    await flushPromises();

    bridge.mockResponse('card', 'read', { id: 'card-1', version: 2 });
    bridge.emit('card.updated', { path: '/cards/demo.card' });
    await flushPromises();

    expect(state.card.value).toEqual({ id: 'card-1', version: 2 });
  });

  it('should watch card path ref changes', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('card', 'read', { id: 'card-1' });

    const cardPath = ref('/cards/one.card');
    const state = useCard(cardPath, { bridge });
    await flushPromises();

    bridge.mockResponse('card', 'read', { id: 'card-2' });
    cardPath.value = '/cards/two.card';
    await flushPromises();

    expect(state.card.value).toEqual({ id: 'card-2' });
  });

  it('should expose error on read failure', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockError('card', 'read', 'CARD_FAIL', 'card load failed');

    const state = useCard('/cards/missing.card', { bridge });
    await flushPromises();

    expect(state.error.value).not.toBeNull();
  });
});
