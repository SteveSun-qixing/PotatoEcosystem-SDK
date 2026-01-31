/**
 * 视频卡片渲染器
 */

import type { BaseCardRenderer } from './BaseCardRenderer';
import type { BaseCardConfig } from '../../types';
import type { RenderOptions } from '../RendererEngine';

/**
 * 视频渲染器
 */
export class VideoRenderer implements BaseCardRenderer {
  render(
    config: BaseCardConfig,
    container: HTMLElement,
    _options: RenderOptions
  ): void {
    const videoConfig = config as any as {
      video_file: string;
      cover_image?: string;
      autoplay?: boolean;
      controls?: boolean;
      loop?: boolean;
      muted?: boolean;
    };

    // 创建视频元素
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-card';

    const video = document.createElement('video');
    video.src = videoConfig.video_file;
    video.controls = videoConfig.controls !== false;
    video.autoplay = videoConfig.autoplay === true;
    video.loop = videoConfig.loop === true;
    video.muted = videoConfig.muted === true;

    if (videoConfig.cover_image) {
      video.poster = videoConfig.cover_image;
    }

    videoWrapper.appendChild(video);
    container.appendChild(videoWrapper);
  }
}
