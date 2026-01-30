# SDK开发指南

本文档指导开发者如何参与 Chips SDK 的开发和扩展。

## 1. 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/chips/chips-sdk.git
cd chips-sdk

# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm test

# 启动开发服务器
npm run dev
```

## 2. 项目结构

```
chips-sdk/
├── src/               # 源代码
├── tests/             # 测试
├── docs/              # 文档
├── examples/          # 示例
├── scripts/           # 构建脚本
└── packages/          # 分包（monorepo）
```

## 3. 开发规范

### 3.1 代码风格

遵循 TypeScript 和 ESLint 规范：

```bash
npm run lint
npm run format
```

### 3.2 提交规范

使用 Conventional Commits：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
refactor: 重构代码
test: 添加测试
```

### 3.3 测试要求

- 单元测试覆盖率 > 80%
- 所有公开 API 必须有测试
- 提交 PR 前确保测试通过

## 4. 扩展 SDK

### 4.1 添加新的卡片类型

```typescript
// 1. 定义渲染器
class MyCardRenderer implements ICardRenderer {
  render(card: Card, container: HTMLElement): RenderResult {
    // 实现渲染逻辑
  }
}

// 2. 注册渲染器
chips.registerCardType('my-card', new MyCardRenderer());
```

### 4.2 开发插件

```typescript
const MyPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  
  install(context: PluginContext) {
    // 插件初始化
    context.registerCommand('myCommand', () => {
      // 命令实现
    });
  }
};

chips.use(MyPlugin);
```

## 5. 发布流程

1. 更新版本号
2. 生成 CHANGELOG
3. 构建和测试
4. 发布到 NPM
5. 打标签并推送

```bash
npm version patch|minor|major
npm run build
npm test
npm publish
git push --tags
```

## 6. 贡献指南

欢迎贡献代码、文档、测试和示例。请阅读 CONTRIBUTING.md 了解详细信息。
