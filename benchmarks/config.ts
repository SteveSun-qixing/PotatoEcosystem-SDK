/**
 * 性能基准测试配置
 */

export interface BenchmarkConfig {
  /** 测试运行次数 */
  iterations: number;
  /** 预热次数 */
  warmup: number;
  /** 超时时间(ms) */
  timeout: number;
  /** 是否收集内存信息 */
  collectMemory: boolean;
  /** 是否收集CPU信息 */
  collectCPU: boolean;
  /** 报告输出目录 */
  reportDir: string;
  /** 测试数据目录 */
  fixturesDir: string;
}

export const defaultConfig: BenchmarkConfig = {
  iterations: 100,
  warmup: 10,
  timeout: 30000,
  collectMemory: true,
  collectCPU: true,
  reportDir: './benchmarks/reports',
  fixturesDir: './benchmarks/fixtures',
};

/** 性能目标 */
export const performanceTargets = {
  parser: {
    /** 1000个卡片解析时间(ms) */
    batchParse: 5000,
    /** 单个卡片解析时间(ms) */
    singleParse: 10,
  },
  renderer: {
    /** 目标帧率 */
    targetFPS: 60,
    /** 单帧渲染时间(ms) */
    frameTime: 16.67,
    /** 渲染1000个卡片时间(ms) */
    batch1000: 1000,
  },
  idGeneration: {
    /** 100万个ID生成时间(ms) */
    million: 1000,
    /** 单个ID生成时间(ms) */
    single: 0.001,
  },
  cache: {
    /** 缓存命中率 */
    hitRate: 0.9,
    /** 缓存读取时间(ms) */
    readTime: 1,
    /** 缓存写入时间(ms) */
    writeTime: 2,
  },
  memory: {
    /** 核心模块内存占用(MB) */
    coreModule: 50,
    /** 解析器内存占用(MB) */
    parser: 30,
    /** 渲染器内存占用(MB) */
    renderer: 40,
  },
  bundle: {
    /** 核心模块大小(KB) */
    coreSize: 1024,
    /** gzip后大小(KB) */
    gzipSize: 300,
  },
};

/** 测试场景配置 */
export const testScenarios = {
  /** 小规模测试 */
  small: {
    cardCount: 10,
    renderCount: 50,
  },
  /** 中等规模测试 */
  medium: {
    cardCount: 100,
    renderCount: 500,
  },
  /** 大规模测试 */
  large: {
    cardCount: 1000,
    renderCount: 5000,
  },
  /** 压力测试 */
  stress: {
    cardCount: 10000,
    renderCount: 50000,
  },
};
