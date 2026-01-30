# 贡献指南

感谢你考虑为Chips SDK做出贡献！

---

## 如何贡献

### 报告Bug

在 [Issues](https://github.com/chips/chips-sdk/issues) 中提交bug报告，请包含：
- 问题描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息（SDK版本、平台、浏览器等）

### 提出功能建议

在 [Issues](https://github.com/chips/chips-sdk/issues) 中提交功能建议，请说明：
- 功能描述
- 使用场景
- 预期实现方式

### 提交代码

1. Fork仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 编写代码和测试
4. 运行测试 (`npm test`)
5. 运行代码检查 (`npm run lint`)
6. 提交更改 (`git commit -m 'feat: add amazing feature'`)
7. 推送到分支 (`git push origin feature/amazing-feature`)
8. 创建Pull Request

---

## 开发流程

### 环境设置

```bash
# 克隆仓库
git clone https://github.com/chips/chips-sdk.git
cd chips-sdk

# 安装依赖
npm install

# 运行测试
npm test

# 启动开发模式
npm run dev
```

### 代码规范

- 使用TypeScript
- 遵循ESLint规则
- 使用Prettier格式化
- 编写JSDoc注释
- 编写单元测试（覆盖率≥80%）

### 提交规范

使用Conventional Commits格式：

```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
refactor: 重构代码
test: 添加测试
chore: 构建/工具变更
```

---

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- tests/unit/core/

# 生成覆盖率报告
npm run test:coverage
```

### 编写测试

每个新功能都需要相应的测试：

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('should work correctly', () => {
    // 测试代码
    expect(result).toBe(expected);
  });
});
```

---

## 文档

### 更新文档

- API文档：`docs/api/`
- 指南文档：`docs/guides/`
- 示例代码：`examples/`

### 文档格式

- 使用Markdown
- 包含代码示例
- 保持简洁清晰

---

## 发布流程

（仅核心维护者）

1. 更新版本号 (`npm version patch|minor|major`)
2. 更新CHANGELOG.md
3. 运行完整测试
4. 构建 (`npm run build`)
5. 发布 (`npm publish`)
6. 推送标签 (`git push --tags`)

---

## 行为准则

- 尊重他人
- 友善沟通
- 接受建设性反馈
- 关注代码质量

---

## 许可证

贡献的代码将采用MIT许可证。

---

## 联系方式

- GitHub Issues: [提交Issue](https://github.com/chips/chips-sdk/issues)
- 讨论区: [GitHub Discussions](https://github.com/chips/chips-sdk/discussions)
- 邮件: chips-dev@example.com
