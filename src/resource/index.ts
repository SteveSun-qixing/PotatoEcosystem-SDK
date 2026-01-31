/**
 * 资源管理模块
 *
 * 导出所有资源管理相关的类和接口
 */

export { ResourceLoader } from './ResourceLoader';
export { ImageProcessor } from './ImageProcessor';
export { MediaMetadataExtractor } from './MediaMetadata';
export { ResourceManager } from './ResourceManager';

export type {
  ResourceProtocol,
  ResourceLoadOptions,
  ResourceLoadResult,
} from './ResourceLoader';

export type {
  ImageProcessOptions,
} from './ImageProcessor';

export type {
  ImageMetadata,
  VideoMetadata,
  AudioMetadata,
  MediaMetadata,
  MediaType,
} from './MediaMetadata';

export type { ResourceInfo } from './ResourceManager';
