/**
 * 渲染引擎
 *
 * 负责卡片和箱子的渲染，支持多种渲染器和主题
 */

import type { Card } from '../types';
import { RendererFactory } from './RendererFactory';
import { Logger } from '../core/logger';
import type { EventBus } from '../core/event';

/**
 * 渲染选项
 */
export interface RenderOptions {
  theme?: string;
  readOnly?: boolean;
  interactive?: boolean;
  animations?: boolean;
  responsive?: boolean;
  lazyLoad?: boolean;
  virtualScroll?: boolean;
}

/**
 * 渲染结果
 */
export interface RenderResult {
  element: HTMLElement;
  destroy: () => void;
}

/**
 * 渲染引擎类
 */
export class RendererEngine {
  private rendererFactory: RendererFactory;
  private logger: Logger;
  private eventBus?: EventBus;

  constructor(logger: Logger, eventBus?: EventBus) {
    this.rendererFactory = new RendererFactory();
    this.logger = logger;
    this.eventBus = eventBus;
  }

  /**
   * 渲染卡片
   * @param card 卡片对象
   * @param container 容器元素
   * @param options 渲染选项
   * @returns 渲染结果
   */
  async render(
    card: Card,
    container: HTMLElement,
    options: RenderOptions = {}
  ): Promise<RenderResult> {
    this.logger.debug('Rendering card', { cardId: card.metadata.card_id });
    this.eventBus?.emit('render:start', card);

    try {
      // 创建卡片容器
      const cardElement = document.createElement('div');
      cardElement.className = 'chips-card';
      cardElement.dataset['cardId'] = card.metadata.card_id;

      // 应用主题
      if (options.theme || card.metadata.theme) {
        cardElement.dataset['theme'] = options.theme || card.metadata.theme;
      }

      // 渲染所有基础卡片
      for (const item of card.structure.structure) {
        const config = card.content[item.id];

        if (!config) {
          this.logger.warn('Base card config not found', { id: item.id });
          continue;
        }

        // 获取对应的渲染器
        const renderer = this.rendererFactory.getRenderer(config.card_type);

        // 创建基础卡片容器
        const baseCardElement = document.createElement('div');
        baseCardElement.className = 'chips-base-card';
        baseCardElement.dataset['baseCardId'] = item.id;
        baseCardElement.dataset['cardType'] = config.card_type;

        // 渲染基础卡片
        await renderer.render(config, baseCardElement, options);

        // 添加到卡片容器
        cardElement.appendChild(baseCardElement);
      }

      // 清空容器并添加卡片
      container.innerHTML = '';
      container.appendChild(cardElement);

      this.logger.info('Card rendered successfully', {
        cardId: card.metadata.card_id,
      });
      this.eventBus?.emit('render:complete', card);

      // 返回渲染结果
      return {
        element: cardElement,
        destroy: () => {
          cardElement.remove();
        },
      };
    } catch (error) {
      this.logger.error('Failed to render card', error as Error, {
        cardId: card.metadata.card_id,
      });
      this.eventBus?.emit('render:error', error);
      throw error;
    }
  }
}
