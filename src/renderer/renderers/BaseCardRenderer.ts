/**
 * 基础卡片渲染器接口
 */

import type { BaseCardConfig } from '../../types';
import type { RenderOptions } from '../RendererEngine';

/**
 * 基础卡片渲染器接口
 */
export interface BaseCardRenderer {
  /**
   * 渲染基础卡片
   * @param config 卡片配置
   * @param container 容器元素
   * @param options 渲染选项
   */
  render(
    config: BaseCardConfig,
    container: HTMLElement,
    options: RenderOptions
  ): Promise<void> | void;
}
