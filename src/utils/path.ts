/**
 * 路径处理工具
 * @module utils/path
 */

/**
 * 规范化路径（统一使用正斜杠，去除多余斜杠）
 * @param path - 原始路径
 * @returns 规范化后的路径
 * @example
 * ```ts
 * normalizePath('a\\b//c'); // => "a/b/c"
 * ```
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

/**
 * 获取文件扩展名（不含点号，小写）
 * @param path - 文件路径
 * @returns 扩展名
 * @example
 * ```ts
 * getExtension('file.Card'); // => "card"
 * getExtension('noext'); // => ""
 * ```
 */
export function getExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1 || lastDot === path.length - 1) return '';
  return path.slice(lastDot + 1).toLowerCase();
}

/**
 * 获取文件名（含扩展名）
 * @param path - 文件路径
 * @returns 文件名
 * @example
 * ```ts
 * getFileName('/path/to/file.card'); // => "file.card"
 * ```
 */
export function getFileName(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
}

/**
 * 获取文件基名（不含扩展名）
 * @param path - 文件路径
 * @returns 基名
 * @example
 * ```ts
 * getBaseName('/path/to/file.card'); // => "file"
 * ```
 */
export function getBaseName(path: string): string {
  const fileName = getFileName(path);
  const lastDot = fileName.lastIndexOf('.');
  return lastDot === -1 ? fileName : fileName.slice(0, lastDot);
}

/**
 * 获取目录路径
 * @param path - 文件路径
 * @returns 目录路径
 * @example
 * ```ts
 * getDirPath('/path/to/file.card'); // => "/path/to"
 * ```
 */
export function getDirPath(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? '' : normalized.slice(0, lastSlash);
}

/**
 * 连接路径
 * @param parts - 路径片段
 * @returns 连接后的路径
 * @example
 * ```ts
 * joinPath('path', 'to', 'file.card'); // => "path/to/file.card"
 * ```
 */
export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join('/'));
}

/**
 * 检查是否为安全路径（防止路径遍历攻击）
 * @param path - 要检查的路径
 * @returns 是否安全
 * @example
 * ```ts
 * isSafePath('normal/path'); // => true
 * isSafePath('../parent'); // => false
 * isSafePath('/absolute'); // => false
 * ```
 */
export function isSafePath(path: string): boolean {
  const normalized = normalizePath(path);
  // 不允许路径遍历
  if (normalized.includes('..')) return false;
  // 不允许绝对路径
  if (normalized.startsWith('/')) return false;
  // 不允许协议前缀
  if (/^[a-zA-Z]+:/.test(normalized)) return false;
  return true;
}

/**
 * 检查是否为卡片文件
 * @param path - 文件路径
 * @returns 是否为 .card 文件
 */
export function isCardFile(path: string): boolean {
  return getExtension(path) === 'card';
}

/**
 * 检查是否为箱子文件
 * @param path - 文件路径
 * @returns 是否为 .box 文件
 */
export function isBoxFile(path: string): boolean {
  return getExtension(path) === 'box';
}

/**
 * 检查是否为薯片文件（.card 或 .box）
 * @param path - 文件路径
 * @returns 是否为薯片文件
 */
export function isChipsFile(path: string): boolean {
  const ext = getExtension(path);
  return ext === 'card' || ext === 'box';
}

/**
 * 获取相对路径
 * @param from - 起始路径
 * @param to - 目标路径
 * @returns 相对路径
 */
export function getRelativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split('/').filter(Boolean);
  const toParts = normalizePath(to).split('/').filter(Boolean);

  // 找到公共前缀长度
  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  // 构建相对路径
  const upCount = fromParts.length - commonLength;
  const relativeParts = [...Array(upCount).fill('..'), ...toParts.slice(commonLength)];

  return relativeParts.join('/') || '.';
}

/**
 * 解析路径中的变量
 * @param path - 包含变量的路径
 * @param variables - 变量映射
 * @returns 解析后的路径
 * @example
 * ```ts
 * resolvePath('{base}/file.card', { base: '/root' }); // => "/root/file.card"
 * ```
 */
export function resolvePath(path: string, variables: Record<string, string>): string {
  return path.replace(/\{(\w+)\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}
