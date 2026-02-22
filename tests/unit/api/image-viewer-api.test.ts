import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageViewerAPI } from '../../../src/api/image-viewer-api';
import { ChipsError } from '../../../src/core';
import type { BridgeClient } from '../../../src/bridge';
import type { Logger } from '../../../src/logger/logger';
import type { ConfigManager } from '../../../src/config/manager';
import { createMockConnector, createMockLogger, createMockConfig } from '../../helpers';

describe('ImageViewerAPI', () => {
  let imageViewerApi: ImageViewerAPI;
  let mockConnector: BridgeClient;
  let mockLogger: Logger;
  let mockConfig: ConfigManager;

  beforeEach(() => {
    mockConnector = createMockConnector();
    mockLogger = createMockLogger();
    mockConfig = createMockConfig();
    imageViewerApi = new ImageViewerAPI(mockConnector, mockLogger, mockConfig);
  });

  it('should open image viewer and call media.image.open', async () => {
    vi.spyOn(mockConnector, 'request').mockResolvedValue({
      success: true,
      data: {
        viewerId: 'imgViewer01',
      },
    });

    const viewerId = await imageViewerApi.open({
      src: 'https://example.com/a.png',
      container: '#root',
      fitMode: 'auto',
      qrCodeFallbackDetectorIds: ['jsqr-wasm'],
    });

    expect(viewerId).toBe('imgViewer01');
    expect(mockConnector.request).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'media.image',
        method: 'open',
        payload: expect.objectContaining({
          config: expect.objectContaining({
            src: 'https://example.com/a.png',
            container: '#root',
            fitMode: 'auto',
            qrCodeFallbackDetectorIds: ['jsqr-wasm'],
          }),
        }),
      })
    );
  });

  it('should zoom and rotate through media.image services', async () => {
    vi.spyOn(mockConnector, 'request').mockResolvedValue({
      success: true,
      data: {
        success: true,
      },
    });

    await imageViewerApi.setZoom('imgViewer01', 2.2);
    await imageViewerApi.rotateClockwise('imgViewer01');
    await imageViewerApi.rotate('imgViewer01', 180);

    expect(mockConnector.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        service: 'media.image',
        method: 'setZoom',
      })
    );
    expect(mockConnector.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        service: 'media.image',
        method: 'rotateClockwise',
      })
    );
    expect(mockConnector.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        service: 'media.image',
        method: 'rotate',
      })
    );
  });

  it('should return qr code results from detectQRCodes', async () => {
    vi.spyOn(mockConnector, 'request').mockResolvedValue({
      success: true,
      data: {
        qrCodes: ['chips://qrcode/demo'],
      },
    });

    const codes = await imageViewerApi.detectQRCodes('imgViewer01');
    expect(codes).toEqual(['chips://qrcode/demo']);
  });

  it('should throw ChipsError when request fails', async () => {
    vi.spyOn(mockConnector, 'request').mockResolvedValue({
      success: false,
      error: 'service unavailable',
    });

    await expect(imageViewerApi.getSnapshot('imgViewer01')).rejects.toBeInstanceOf(ChipsError);
  });
});
