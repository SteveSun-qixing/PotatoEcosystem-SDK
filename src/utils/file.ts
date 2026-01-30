/**
 * 文件处理工具函数
 */

/**
 * 规范化文件路径
 * @param path 原始路径
 * @returns 规范化的路径
 */
export function normalizePath(path: string): string {
  // 统一使用正斜杠
  return path.replace(/\\/g, '/');
}

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 扩展名（包含点）
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot);
}

/**
 * 获取文件名（不含扩展名）
 * @param filename 文件名
 * @returns 文件名（不含扩展名）
 */
export function getBaseName(filename: string): string {
  const lastSlash = Math.max(
    filename.lastIndexOf('/'),
    filename.lastIndexOf('\\')
  );

  // 获取文件名部分（不含路径）
  const nameWithExt = filename.substring(lastSlash + 1);

  // 去除扩展名
  const lastDot = nameWithExt.lastIndexOf('.');
  return lastDot === -1 ? nameWithExt : nameWithExt.substring(0, lastDot);
}

/**
 * 判断是否为相对路径
 * @param path 路径
 * @returns 是否为相对路径
 */
export function isRelativePath(path: string): boolean {
  // 相对路径不以 / 或驱动器字母开头，也不是URL
  return !path.startsWith('/') && !/^[a-zA-Z]:/.test(path) && !isURL(path);
}

/**
 * 判断是否为URL
 * @param path 路径
 * @returns 是否为URL
 */
export function isURL(path: string): boolean {
  return /^https?:\/\//.test(path) || /^[a-z]+:\/\//.test(path);
}

/**
 * 处理文件名冲突
 * @param baseName 基础文件名
 * @param existingNames 已存在的文件名集合
 * @returns 不冲突的文件名
 */
export function resolveNameConflict(
  baseName: string,
  existingNames: Set<string>
): string {
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  const ext = getFileExtension(baseName);
  const name = getBaseName(baseName);

  let counter = 2;
  let newName: string;

  do {
    newName = `${name}-${counter}${ext}`;
    counter++;
  } while (existingNames.has(newName));

  return newName;
}

/**
 * 确保路径安全（防止路径遍历攻击）
 * @param path 待检查的路径
 * @param _baseDir 基础目录（保留用于未来扩展）
 * @returns 是否安全
 */
export function isPathSafe(path: string, _baseDir: string): boolean {
  const normalized = normalizePath(path);

  // 检查是否包含 ../
  if (normalized.includes('../') || normalized.includes('..\\')) {
    return false;
  }

  // 检查是否尝试访问父目录
  if (normalized.startsWith('../') || normalized.startsWith('..\\')) {
    return false;
  }

  return true;
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化的大小字符串
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
