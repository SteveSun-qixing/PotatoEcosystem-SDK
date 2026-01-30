/**
 * 十位62进制ID生成器
 *
 * 完全遵循《十位62进制ID生成规范》
 * 使用加密安全的随机数生成器，确保全局唯一性
 */

const BASE62_CHARS =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * ID生成器类
 */
export class IdGenerator {
  /**
   * 生成单个10位62进制ID
   * @returns 10位62进制字符串
   */
  static generate(): string {
    // 使用加密安全的随机数生成器
    let bytes: Uint8Array;

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // 浏览器环境
      bytes = crypto.getRandomValues(new Uint8Array(8));
    } else {
      // Node.js环境
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cryptoNode = require('crypto') as {
        randomBytes: (size: number) => Buffer;
      };
      bytes = new Uint8Array(cryptoNode.randomBytes(8));
    }

    // 将字节数组转换为BigInt
    let value = 0n;
    for (const byte of bytes) {
      value = (value << 8n) | BigInt(byte);
    }

    // 编码为62进制
    return this.encodeBase62(value, 10);
  }

  /**
   * 批量生成唯一ID
   * @param count 生成数量
   * @returns ID数组
   */
  static generateBatch(count: number): string[] {
    const ids = new Set<string>();

    while (ids.size < count) {
      ids.add(this.generate());
    }

    return Array.from(ids);
  }

  /**
   * 生成唯一ID（检查已存在ID集合）
   * @param existingIds 已存在的ID集合
   * @returns 唯一ID
   */
  static generateUnique(existingIds: Set<string>): string {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const id = this.generate();

      if (!existingIds.has(id)) {
        return id;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique ID after multiple attempts');
  }

  /**
   * 验证ID格式
   * @param id 待验证的ID
   * @returns 是否有效
   */
  static validate(id: string): boolean {
    // 长度检查
    if (id.length !== 10) {
      return false;
    }

    // 字符集检查
    const pattern = /^[0-9a-zA-Z]{10}$/;
    if (!pattern.test(id)) {
      return false;
    }

    // 非全0检查
    if (id === '0000000000') {
      return false;
    }

    return true;
  }

  /**
   * 编码为62进制
   * @param value 数值
   * @param length 目标长度
   * @returns 62进制字符串
   */
  static encodeBase62(value: bigint, length: number): string {
    if (value === 0n) {
      return '0'.repeat(length);
    }

    let result = '';
    let remaining = value;

    while (remaining > 0n) {
      const remainder = Number(remaining % 62n);
      result = BASE62_CHARS[remainder] + result;
      remaining = remaining / 62n;
    }

    // 截断到指定长度（从右边开始取）
    if (result.length > length) {
      result = result.substring(result.length - length);
    } else if (result.length < length) {
      result = result.padStart(length, '0');
    }

    return result;
  }

  /**
   * 解码62进制
   * @param str 62进制字符串
   * @returns 数值
   */
  static decodeBase62(str: string): bigint {
    let value = 0n;

    for (const char of str) {
      const index = BASE62_CHARS.indexOf(char);

      if (index === -1) {
        throw new Error(`Invalid character: ${char}`);
      }

      value = value * 62n + BigInt(index);
    }

    return value;
  }
}

/**
 * ID池 - 预生成ID以提升性能
 */
export class IdPool {
  private pool: string[] = [];
  private readonly minSize: number;
  private readonly maxSize: number;

  constructor(minSize = 100, maxSize = 1000) {
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.refill();
  }

  /**
   * 从池中获取ID
   */
  getId(): string {
    if (this.pool.length < this.minSize) {
      this.refill();
    }

    const id = this.pool.pop();
    if (!id) {
      // 池为空，立即生成
      return IdGenerator.generate();
    }

    return id;
  }

  /**
   * 重新填充ID池
   */
  private refill(): void {
    const count = this.maxSize - this.pool.length;
    const newIds = IdGenerator.generateBatch(count);
    this.pool.push(...newIds);
  }

  /**
   * 获取池状态
   */
  getStats() {
    return {
      size: this.pool.length,
      minSize: this.minSize,
      maxSize: this.maxSize,
    };
  }
}
