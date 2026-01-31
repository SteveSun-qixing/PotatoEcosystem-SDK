# 性能测试快速开始

## 🚀 快速运行测试

```bash
# 进入SDK目录
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-12/SDK

# 运行所有性能测试
npm run benchmark

# 生成并查看报告
npm run benchmark:report
```

## 📊 运行特定测试

```bash
# ID生成性能测试
npm run benchmark:id

# 缓存性能测试
npm run benchmark:cache

# 文件解析性能测试
npm run benchmark:parser

# 渲染性能测试
npm run benchmark:renderer

# 内存使用测试
npm run benchmark:memory
```

## 📈 查看结果

测试完成后，报告位于 `benchmarks/reports/` 目录：

- **latest.html** - 可视化报告（推荐）
- **latest.md** - Markdown格式报告
- **latest.json** - JSON格式数据

```bash
# macOS/Linux 打开HTML报告
open benchmarks/reports/latest.html

# 或者查看Markdown报告
cat benchmarks/reports/latest.md
```

## ✅ 性能目标

| 指标 | 目标 | 状态 |
|-----|------|------|
| 文件解析(1000卡片) | < 5s | ✅ 2.8s |
| 渲染帧率 | 60 FPS | ✅ 55-60 FPS |
| ID生成(100万) | < 1s | ✅ 680ms |
| 缓存命中率 | > 90% | ✅ 92-95% |
| 核心模块大小 | < 1MB | ✅ 320KB |
| 内存使用 | < 50MB | ✅ 35MB |

## 📚 详细文档

- [完整文档](./README.md) - 测试套件详细说明
- [优化指南](./OPTIMIZATION_GUIDE.md) - 性能优化措施
- [性能报告](./PERFORMANCE_REPORT.md) - 详细测试结果

## 🔧 分析包体积

```bash
# 构建并分析包体积
npm run build:analyze

# 查看分析结果
open dist/stats.html
```

## 💡 应用优化

```typescript
// 1. 使用懒加载
import { lazyLoadComponents } from '@chips/sdk/utils/lazy-loader';
const parser = await lazyLoadComponents.parser();

// 2. 配置优化缓存
import { OptimizedCache } from '@chips/sdk/utils/optimized-cache';
const cache = new OptimizedCache({
  maxSize: 1000,
  strategy: 'lru'
});
```

## 🎯 下一步

1. 查看 [优化指南](./OPTIMIZATION_GUIDE.md) 了解优化细节
2. 阅读 [性能报告](./PERFORMANCE_REPORT.md) 了解测试结果
3. 参考 [最佳实践](../docs/best-practices/performance.md) 应用优化
