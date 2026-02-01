/**
 * 工具函数导出
 * @module utils
 */

// ID 工具
export { generateId, isValidId, generateUuid, isValidUuid, generateShortId } from './id';

// 路径工具
export {
  normalizePath,
  getExtension,
  getFileName,
  getBaseName,
  getDirPath,
  joinPath,
  isSafePath,
  isCardFile,
  isBoxFile,
  isChipsFile,
  getRelativePath,
  resolvePath,
} from './path';

// 验证工具
export {
  validateCardMetadata,
  validateBoxMetadata,
  validateProtocolVersion,
  validateTimestamp,
  validateTag,
  validateTags,
  validateResourcePath,
  validateFileSize,
  validateMimeType,
  validateUrl,
  validateEmail,
} from './validation';

// 异步工具
export {
  delay,
  withTimeout,
  retry,
  concurrent,
  debounce,
  throttle,
  createCancellable,
  sequence,
} from './async';

export type { RetryOptions } from './async';
