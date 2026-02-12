import { describe, expect, it } from 'vitest';
import { useConfig } from '../../../src/composables/use-config';
import { MockBridgeClient } from '../../helpers/mock-connector';

async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('useConfig', () => {
  it('should load config value on initialize', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('config', 'get', 'zh-CN');

    const state = useConfig<string>('ui.language', { bridge });
    await flushPromises();

    expect(state.value.value).toBe('zh-CN');
  });

  it('should refresh config value manually', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('config', 'get', 'light');

    const state = useConfig<string>('ui.theme', { bridge });
    await flushPromises();

    bridge.mockResponse('config', 'get', 'dark');
    await state.refresh();

    expect(state.value.value).toBe('dark');
  });

  it('should update value when config.updated matches key', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('config', 'get', 'light');

    const state = useConfig<string>('ui.theme', { bridge });
    await flushPromises();

    bridge.emit('config.updated', { key: 'ui.theme', value: 'dark' });
    await flushPromises();

    expect(state.value.value).toBe('dark');
  });

  it('should ignore config.updated for other keys', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('config', 'get', 'light');

    const state = useConfig<string>('ui.theme', { bridge });
    await flushPromises();

    bridge.emit('config.updated', { key: 'ui.language', value: 'en-US' });
    await flushPromises();

    expect(state.value.value).toBe('light');
  });

  it('should fallback to default value on failure', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockError('config', 'get', 'CONFIG_FAIL', 'config load failed');

    const state = useConfig<string>('ui.language', {
      bridge,
      defaultValue: 'zh-CN',
    });
    await flushPromises();

    expect(state.value.value).toBe('zh-CN');
    expect(state.error.value).not.toBeNull();
  });
});
