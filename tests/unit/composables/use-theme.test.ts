import { describe, expect, it } from 'vitest';
import { useTheme } from '../../../src/composables/use-theme';
import { MockBridgeClient } from '../../helpers/mock-connector';

async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('useTheme', () => {
  it('should load theme css on initialize', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('theme', 'getCSS', '.chips { color: red; }');

    const state = useTheme({ bridge });
    await flushPromises();

    expect(state.themeCss.value).toBe('.chips { color: red; }');
    expect(state.error.value).toBeNull();
  });

  it('should refresh theme css manually', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('theme', 'getCSS', '.chips { color: blue; }');

    const state = useTheme({ bridge });
    await flushPromises();

    bridge.mockResponse('theme', 'getCSS', '.chips { color: green; }');
    await state.refresh();

    expect(state.themeCss.value).toBe('.chips { color: green; }');
  });

  it('should react to theme.changed event', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('theme', 'getCSS', '.chips { color: black; }');

    const state = useTheme({ bridge });
    await flushPromises();

    bridge.mockResponse('theme', 'getCSS', '.chips { color: white; }');
    bridge.emit('theme.changed', { themeId: 'chips-theme-dark' });
    await flushPromises();

    expect(state.themeId.value).toBe('chips-theme-dark');
    expect(state.themeCss.value).toBe('.chips { color: white; }');
  });

  it('should expose error when bridge request fails', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockError('theme', 'getCSS', 'THEME_ERROR', 'theme failed');

    const state = useTheme({ bridge });
    await flushPromises();

    expect(state.error.value).not.toBeNull();
  });

  it('should stop listening after stop is called', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('theme', 'getCSS', '.chips { color: red; }');

    const state = useTheme({ bridge });
    await flushPromises();

    state.stop();
    bridge.mockResponse('theme', 'getCSS', '.chips { color: blue; }');
    bridge.emit('theme.changed', { themeId: 'new-theme' });
    await flushPromises();

    expect(state.themeId.value).toBeNull();
    expect(state.themeCss.value).toBe('.chips { color: red; }');
  });
});
