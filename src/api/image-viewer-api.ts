/**
 * Image viewer API
 * @module api/image-viewer-api
 */

import { ConfigManager } from '../config';
import { ChipsError, ErrorCodes } from '../core';
import { BridgeClient } from '../bridge';
import { Logger } from '../logger';

export type ImageViewerFitMode = 'auto' | 'contain' | 'fit-width' | 'original';

export interface ImageViewerOpenOptions {
  src: string;
  container?: string;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  initialRotation?: number;
  fitMode?: ImageViewerFitMode;
  longImageRatioThreshold?: number;
  longPressDelayMs?: number;
  closeOnEscape?: boolean;
  enableWheelZoom?: boolean;
  enableDragPan?: boolean;
  enableQRCodeDetection?: boolean;
  qrCodeFallbackDetectorIds?: string[];
  downloadFileName?: string;
  overlayZIndex?: number;
  className?: string;
  closeButtonAriaLabel?: string;
}

export interface ImageViewerSnapshot {
  state: 'idle' | 'loading' | 'ready' | 'error' | 'closed';
  src: string;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  rotation: number;
  fitMode: ImageViewerFitMode;
  effectiveFitMode: Exclude<ImageViewerFitMode, 'auto'>;
  offset: {
    x: number;
    y: number;
  };
  qrCodes: string[];
}

export interface ImageViewerListItem {
  viewerId: string;
  snapshot: ImageViewerSnapshot;
}

export class ImageViewerAPI {
  private readonly _bridge: BridgeClient;
  private readonly _logger: Logger;
  private readonly _config: ConfigManager;

  constructor(bridge: BridgeClient, logger: Logger, config: ConfigManager) {
    this._bridge = bridge;
    this._logger = logger.createChild('ImageViewerAPI');
    this._config = config;
  }

  async open(options: ImageViewerOpenOptions): Promise<string> {
    if (!options.src?.trim()) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Image source is required');
    }

    const response = await this.requestService<{ viewerId: string }>('open', {
      config: {
        src: options.src,
        container: options.container,
        initialZoom: options.initialZoom,
        minZoom: options.minZoom,
        maxZoom: options.maxZoom,
        zoomStep: options.zoomStep,
        initialRotation: options.initialRotation,
        fitMode: options.fitMode,
        longImageRatioThreshold: options.longImageRatioThreshold,
        longPressDelayMs: options.longPressDelayMs,
        closeOnEscape: options.closeOnEscape,
        enableWheelZoom: options.enableWheelZoom,
        enableDragPan: options.enableDragPan,
        enableQRCodeDetection: options.enableQRCodeDetection,
        qrCodeFallbackDetectorIds: options.qrCodeFallbackDetectorIds,
        downloadFileName: options.downloadFileName,
        overlayZIndex: options.overlayZIndex,
        className: options.className,
        labels: {
          closeButtonAriaLabel: options.closeButtonAriaLabel,
        },
      },
    });

    return response.viewerId;
  }

  async close(viewerId: string): Promise<boolean> {
    const response = await this.requestService<{ closed: boolean }>('close', { viewerId });
    return response.closed;
  }

  async closeAll(): Promise<void> {
    await this.requestService('closeAll', {});
  }

  async setSource(viewerId: string, src: string): Promise<void> {
    await this.requestService('setSource', { viewerId, src });
  }

  async setZoom(viewerId: string, zoom: number): Promise<void> {
    await this.requestService('setZoom', { viewerId, zoom });
  }

  async zoomIn(viewerId: string, factor?: number): Promise<void> {
    await this.requestService('zoomIn', { viewerId, factor });
  }

  async zoomOut(viewerId: string, factor?: number): Promise<void> {
    await this.requestService('zoomOut', { viewerId, factor });
  }

  async rotate(viewerId: string, degrees: number): Promise<void> {
    await this.requestService('rotate', { viewerId, degrees });
  }

  async rotateClockwise(viewerId: string): Promise<void> {
    await this.requestService('rotateClockwise', { viewerId });
  }

  async rotateCounterClockwise(viewerId: string): Promise<void> {
    await this.requestService('rotateCounterClockwise', { viewerId });
  }

  async reset(viewerId: string): Promise<void> {
    await this.requestService('reset', { viewerId });
  }

  async fitToContainer(viewerId: string): Promise<void> {
    await this.requestService('fitToContainer', { viewerId });
  }

  async download(viewerId: string, fileName?: string): Promise<void> {
    await this.requestService('download', { viewerId, fileName });
  }

  async detectQRCodes(viewerId: string): Promise<string[]> {
    const response = await this.requestService<{ qrCodes: string[] }>('detectQRCodes', { viewerId });
    return response.qrCodes;
  }

  async getSnapshot(viewerId: string): Promise<ImageViewerSnapshot> {
    return this.requestService<ImageViewerSnapshot>('getSnapshot', { viewerId });
  }

  async listSnapshots(): Promise<ImageViewerListItem[]> {
    return this.requestService<ImageViewerListItem[]>('listSnapshots', {});
  }

  private async requestService<T>(method: string, payload: Record<string, unknown>): Promise<T> {
    const timeout = this._config.get('timeout.media', 20000);

    this._logger.debug('Request image viewer service', { method, payload });

    const response = await this._bridge.request<T>({
      service: 'media.image',
      method,
      payload,
      timeout,
    });

    if (!response.success || typeof response.data === 'undefined') {
      throw new ChipsError(
        ErrorCodes.OPERATION_FAILED,
        response.error ?? 'Image viewer request failed',
        {
          method,
          payload,
        }
      );
    }

    return response.data;
  }
}
