/**
 * 媒体元数据提取器
 *
 * 提取图片、视频、音频等媒体的元数据信息
 */

import { Logger } from '../core/logger';
import { ResourceError } from '../core/error';
import { ERROR_CODES } from '../constants/errors';

/**
 * 图片元数据
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  colorSpace?: string;
  hasAlpha?: boolean;
  orientation?: number;
  exif?: Record<string, unknown>;
}

/**
 * 视频元数据
 */
export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  format: string;
  codec?: string;
  bitrate?: number;
  framerate?: number;
  size: number;
}

/**
 * 音频元数据
 */
export interface AudioMetadata {
  duration: number;
  format: string;
  codec?: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  size: number;
}

/**
 * 媒体元数据（通用）
 */
export type MediaMetadata = ImageMetadata | VideoMetadata | AudioMetadata;

/**
 * 媒体类型
 */
export type MediaType = 'image' | 'video' | 'audio' | 'unknown';

/**
 * 媒体元数据提取器类
 */
export class MediaMetadataExtractor {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 检测媒体类型
   * @param data 媒体数据
   * @param contentType MIME类型（可选）
   * @returns 媒体类型
   */
  async detectMediaType(
    data: ArrayBuffer | Blob,
    contentType?: string
  ): Promise<MediaType> {
    if (contentType) {
      if (contentType.startsWith('image/')) {
        return 'image';
      }
      if (contentType.startsWith('video/')) {
        return 'video';
      }
      if (contentType.startsWith('audio/')) {
        return 'audio';
      }
    }

    // 通过文件头检测
    const bytes = new Uint8Array(
      data instanceof Blob ? await this.blobToArrayBuffer(data) : data
    );

    // 图片格式检测
    if (this.isImage(bytes)) {
      return 'image';
    }

    // 视频格式检测
    if (this.isVideo(bytes)) {
      return 'video';
    }

    // 音频格式检测
    if (this.isAudio(bytes)) {
      return 'audio';
    }

    return 'unknown';
  }

  /**
   * 提取媒体元数据
   * @param data 媒体数据
   * @param contentType MIME类型（可选）
   * @returns 媒体元数据
   */
  async extract(
    data: ArrayBuffer | Blob,
    contentType?: string
  ): Promise<MediaMetadata> {
    const mediaType = await this.detectMediaType(data, contentType);

    this.logger.debug('Extracting media metadata', {
      mediaType,
      contentType,
    });

    switch (mediaType) {
      case 'image':
        return this.extractImageMetadata(data, contentType);

      case 'video':
        return this.extractVideoMetadata(data, contentType);

      case 'audio':
        return this.extractAudioMetadata(data, contentType);

      default:
        throw new ResourceError(
          ERROR_CODES.RESOURCE_LOAD_FAILED,
          `Unsupported media type: ${mediaType}`,
          { mediaType, contentType }
        );
    }
  }

  /**
   * 提取图片元数据
   * @param data 图片数据
   * @param contentType MIME类型（可选）
   * @returns 图片元数据
   */
  async extractImageMetadata(
    data: ArrayBuffer | Blob,
    contentType?: string
  ): Promise<ImageMetadata> {
    try {
      const blob =
        data instanceof Blob ? data : new Blob([data], { type: contentType });
      const image = await this.loadImage(blob);

      const size = data instanceof Blob ? data.size : data.byteLength;
      const format = await this.getImageFormat(contentType, data);

      return {
        width: image.width,
        height: image.height,
        format,
        size,
        hasAlpha: this.hasAlphaChannel(image),
      };
    } catch (error) {
      this.logger.error('Failed to extract image metadata', error as Error);
      throw new ResourceError(
        ERROR_CODES.RESOURCE_LOAD_FAILED,
        'Failed to extract image metadata',
        { originalError: error }
      );
    }
  }

  /**
   * 提取视频元数据
   * @param data 视频数据
   * @param contentType MIME类型（可选）
   * @returns 视频元数据
   */
  async extractVideoMetadata(
    data: ArrayBuffer | Blob,
    contentType?: string
  ): Promise<VideoMetadata> {
    try {
      const blob =
        data instanceof Blob ? data : new Blob([data], { type: contentType });
      const video = await this.loadVideo(blob);

      const size = data instanceof Blob ? data.size : data.byteLength;
      const format = this.getVideoFormat(contentType, data);

      return {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration || 0,
        format,
        size,
        framerate: this.estimateFramerate(video),
      };
    } catch (error) {
      this.logger.error('Failed to extract video metadata', error as Error);
      throw new ResourceError(
        ERROR_CODES.RESOURCE_LOAD_FAILED,
        'Failed to extract video metadata',
        { originalError: error }
      );
    }
  }

  /**
   * 提取音频元数据
   * @param data 音频数据
   * @param contentType MIME类型（可选）
   * @returns 音频元数据
   */
  async extractAudioMetadata(
    data: ArrayBuffer | Blob,
    contentType?: string
  ): Promise<AudioMetadata> {
    try {
      const blob =
        data instanceof Blob ? data : new Blob([data], { type: contentType });
      const audio = await this.loadAudio(blob);

      const size = data instanceof Blob ? data.size : data.byteLength;
      const format = this.getAudioFormat(contentType, data);

      return {
        duration: audio.duration || 0,
        format,
        size,
        sampleRate: this.estimateSampleRate(audio),
      };
    } catch (error) {
      this.logger.error('Failed to extract audio metadata', error as Error);
      throw new ResourceError(
        ERROR_CODES.RESOURCE_LOAD_FAILED,
        'Failed to extract audio metadata',
        { originalError: error }
      );
    }
  }

  /**
   * 加载图片
   * @param blob Blob对象
   * @returns HTMLImageElement
   */
  private async loadImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * 加载视频
   * @param blob Blob对象
   * @returns HTMLVideoElement
   */
  private async loadVideo(blob: Blob): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video);
      };

      video.onerror = reject;
      video.src = URL.createObjectURL(blob);
    });
  }

  /**
   * 加载音频
   * @param blob Blob对象
   * @returns HTMLAudioElement
   */
  private async loadAudio(blob: Blob): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio);
      };

      audio.onerror = reject;
      audio.src = URL.createObjectURL(blob);
    });
  }

  /**
   * 检测是否为图片
   * @param bytes 字节数组
   * @returns 是否为图片
   */
  private isImage(bytes: Uint8Array): boolean {
    // PNG: 89 50 4E 47
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return true;
    }

    // JPEG: FF D8 FF
    if (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    ) {
      return true;
    }

    // GIF: 47 49 46 38
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    ) {
      return true;
    }

    // WebP: 52 49 46 46 ... 57 45 42 50
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return true;
    }

    return false;
  }

  /**
   * 检测是否为视频
   * @param bytes 字节数组
   * @returns 是否为视频
   */
  private isVideo(bytes: Uint8Array): boolean {
    // MP4: 00 00 00 ?? 66 74 79 70
    if (bytes.length >= 8) {
      for (let i = 0; i <= bytes.length - 8; i++) {
        if (
          bytes[i + 4] === 0x66 &&
          bytes[i + 5] === 0x74 &&
          bytes[i + 6] === 0x79 &&
          bytes[i + 7] === 0x70
        ) {
          return true;
        }
      }
    }

    // WebM: 1A 45 DF A3
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    ) {
      return true;
    }

    return false;
  }

  /**
   * 检测是否为音频
   * @param bytes 字节数组
   * @returns 是否为音频
   */
  private isAudio(bytes: Uint8Array): boolean {
    // MP3: FF FB 或 FF F3 或 FF F2
    if (
      bytes.length >= 2 &&
      bytes[0] === 0xff &&
      (bytes[1] === 0xfb || bytes[1] === 0xf3 || bytes[1] === 0xf2)
    ) {
      return true;
    }

    // WAV: 52 49 46 46 ... 57 41 56 45
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x41 &&
      bytes[10] === 0x56 &&
      bytes[11] === 0x45
    ) {
      return true;
    }

    // OGG: 4F 67 67 53
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x4f &&
      bytes[1] === 0x67 &&
      bytes[2] === 0x67 &&
      bytes[3] === 0x53
    ) {
      return true;
    }

    return false;
  }

  /**
   * 获取图片格式
   * @param contentType MIME类型
   * @param data 数据
   * @returns 格式字符串
   */
  private async getImageFormat(
    contentType: string | undefined,
    data: ArrayBuffer | Blob
  ): Promise<string> {
    if (contentType) {
      const match = contentType.match(/image\/(\w+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // 通过文件头检测
    const arrayBuffer =
      data instanceof Blob ? await this.blobToArrayBuffer(data) : data;
    const bytes = new Uint8Array(arrayBuffer);

    if (
      bytes.length >= 4 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return 'png';
    }

    if (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    ) {
      return 'jpeg';
    }

    if (
      bytes.length >= 4 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    ) {
      return 'gif';
    }

    if (
      bytes.length >= 12 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'webp';
    }

    return 'unknown';
  }

  /**
   * 获取视频格式
   * @param contentType MIME类型
   * @param data 数据
   * @returns 格式字符串
   */
  private getVideoFormat(
    contentType: string | undefined,
    _data: ArrayBuffer | Blob
  ): string {
    if (contentType) {
      const match = contentType.match(/video\/(\w+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    return 'unknown';
  }

  /**
   * 获取音频格式
   * @param contentType MIME类型
   * @param data 数据
   * @returns 格式字符串
   */
  private getAudioFormat(
    contentType: string | undefined,
    _data: ArrayBuffer | Blob
  ): string {
    if (contentType) {
      const match = contentType.match(/audio\/(\w+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    return 'unknown';
  }

  /**
   * 检查是否有Alpha通道
   * @param image 图片元素
   * @returns 是否有Alpha通道
   */
  private hasAlphaChannel(image: HTMLImageElement): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return false;
    }

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 检查是否有透明像素
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      const alpha = data[i];
      if (alpha !== undefined && alpha < 255) {
        return true;
      }
    }

    return false;
  }

  /**
   * 估算帧率
   * @param _video 视频元素
   * @returns 帧率（fps）
   */
  private estimateFramerate(_video: HTMLVideoElement): number {
    // 这是一个简化的估算，实际应该从视频元数据中读取
    return 30; // 默认30fps
  }

  /**
   * 估算采样率
   * @param _audio 音频元素
   * @returns 采样率（Hz）
   */
  private estimateSampleRate(_audio: HTMLAudioElement): number {
    // 这是一个简化的估算，实际应该从音频元数据中读取
    return 44100; // 默认44.1kHz
  }

  /**
   * Blob转ArrayBuffer（异步）
   * @param blob Blob对象
   * @returns ArrayBuffer
   */
  private async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return blob.arrayBuffer();
  }

  // 已移除未使用的 _blobToArrayBufferSync 方法
}
