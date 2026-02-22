import { describe, expect, it } from 'vitest';
import { useI18n } from '../../../src/composables/use-i18n';
import { MockBridgeClient } from '../../helpers/mock-connector';

async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('useI18n', () => {
  it('should translate text via bridge', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockResponse('i18n', 'translate', '保存');

    const state = useI18n({ bridge });
    const text = await state.t('common.save');

    expect(text).toBe('保存');
  });

  it('should fallback to key when translation fails', async () => {
    const bridge = new MockBridgeClient();
    bridge.mockError('i18n', 'translate', 'I18N_FAIL', 'translate failed');

    const state = useI18n({ bridge });
    const text = await state.translate('common.save');

    expect(text).toBe('common.save');
    expect(state.error.value).not.toBeNull();
  });

  it('should react to language.changed event', async () => {
    const bridge = new MockBridgeClient();
    const state = useI18n({ bridge, initialLanguage: 'zh-CN' });

    await flushPromises();
    bridge.emit('language.changed', { language: 'en-US' });
    await flushPromises();

    expect(state.language.value).toBe('en-US');
  });

  it('should keep initial language before event update', async () => {
    const bridge = new MockBridgeClient();
    const state = useI18n({ bridge, initialLanguage: 'ja-JP' });

    await flushPromises();

    expect(state.language.value).toBe('ja-JP');
  });

  it('should stop listening after stop is called', async () => {
    const bridge = new MockBridgeClient();
    const state = useI18n({ bridge, initialLanguage: 'zh-CN' });

    await flushPromises();
    state.stop();

    bridge.emit('language.changed', { language: 'en-US' });
    await flushPromises();

    expect(state.language.value).toBe('zh-CN');
  });
});
