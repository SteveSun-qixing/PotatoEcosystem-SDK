# Chips SDK 性能基准测试套件

## 概述

本目录包含 Chips SDK 的性能基准测试套件，用于测试和优化核心功能的性能。

## 目录结构

```
benchmarks/
├── core/           # 核心功能性能测试
│   ├── id-generation.bench.ts      # ID生成性能测试
│   └── cache.bench.ts              # 缓存性能测试
├── parser/         # 解析器性能测试
│   ├── card-parser.bench.ts        # 卡片解析性能测试
│   └── batch-parser.bench.ts       # 批量解析性能测试
├── renderer/       # 渲染引擎性能测试
│   ├── render-performance.bench.ts # 渲染性能测试
│   └── fps.bench.ts                # FPS测试
├── utils/          # 工具函数
│   ├── metrics.ts                  # 性能指标收集
│   └── reporter.ts                 # 报告生成器
├── fixtures/       # 测试数据
│   └── cards/                      # 测试卡片文件
├── reports/        # 性能报告输出目录
└── config.ts       # 测试配置
```

## 性能目标

- **文件解析**: 1000个卡片 < 5秒
- **渲染性能**: 保持 60 FPS
- **ID生成**: 100万个ID < 1秒
- **缓存命中率**: > 90%
- **内存使用**: 核心模块 < 50MB
- **包体积**: 核心模块 < 1MB

## 运行测试

```bash
# 运行所有性能测试
npm run benchmark

# 运行特定测试
npm run benchmark:parser
npm run benchmark:renderer
npm run benchmark:cache

# 生成性能报告
npm run benchmark:report

# 内存分析
npm run benchmark:memory
```

## 测试结果

测试结果将保存在 `reports/` 目录下，包括:
- 性能指标JSON文件
- 可视化报告HTML
- 对比分析结果

## 优化记录

### 版本 0.1.0
- 初始基准测试建立
- 优化文件解析性能
- 实现代码分割
- Tree-shaking优化

## 注意事项

1. 测试前确保没有其他资源密集型进程运行
2. 多次运行取平均值以获得准确结果
3. 关注性能趋势而非绝对值
4. 定期更新基准数据

## 参考资料

- [性能优化指南](../docs/best-practices/performance.md)
- [基准测试最佳实践](./docs/benchmark-best-practices.md)
