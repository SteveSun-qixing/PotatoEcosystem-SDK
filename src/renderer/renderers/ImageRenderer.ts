/**
 * 图片卡片渲染器
 */

import type { BaseCardRenderer } from './BaseCardRenderer';
import type { BaseCardConfig } from '../../types';
import type { RenderOptions } from '../RendererEngine';

/**
 * 图片渲染器
 */
export class ImageRenderer implements BaseCardRenderer {
  render(
    config: BaseCardConfig,
    container: HTMLElement,
    _options: RenderOptions
  ): void {
    const imgConfig = config as {
      image_file: string;
      title?: string;
      caption?: string;
      fit_mode?: string;
      clickable?: boolean;
    };

    // 创建图片元素
    const figure = document.createElement('figure');
    figure.className = 'image-card';

    const img = document.createElement('img');
    img.src = imgConfig.image_file;
    img.alt = imgConfig.title || '';
    img.className = `fit-${imgConfig.fit_mode || 'contain'}`;

    // 设置点击放大
    if (imgConfig.clickable !== false) {
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => {
        // TODO: 实现图片放大查看
        // eslint-disable-next-line no-console
        console.log('Image clicked:', imgConfig.image_file);
      });
    }

    figure.appendChild(img);

    // 添加标题
    if (imgConfig.title) {
      const title = document.createElement('h3');
      title.textContent = imgConfig.title;
      figure.insertBefore(title, img);
    }

    // 添加说明
    if (imgConfig.caption) {
      const caption = document.createElement('figcaption');
      caption.textContent = imgConfig.caption;
      figure.appendChild(caption);
    }

    container.appendChild(figure);
  }
}
