# Chips SDK - 平台适配器示例

本目录包含针对不同平台的Chips SDK适配器使用示例。

## 概述

Chips SDK提供了跨平台的统一文件系统API，支持以下平台：

- **Web** - 基于IndexedDB的浏览器环境
- **Node.js** - 使用原生文件系统的Node.js环境
- **Electron** - 结合Node.js和浏览器特性的桌面应用环境

## 示例文件

### 1. Web平台示例 (`web-example.html`)

**适用场景**: 浏览器环境、渐进式Web应用（PWA）

**特性**:
- 使用IndexedDB存储文件数据
- 支持从HTTP(S) URL加载文件
- 纯前端实现，无需服务器

**运行方式**:
```bash
# 使用任何静态服务器运行
# 例如使用Python:
python3 -m http.server 8000

# 或使用Node.js的http-server:
npx http-server

# 然后在浏览器中打开:
# http://localhost:8000/examples/platform/web-example.html
```

**示例功能**:
- ✅ 初始化Web适配器
- ✅ 文件读写操作
- ✅ 文件存在性检查
- ✅ 列出存储的文件
- ✅ 从URL加载远程文件
- ✅ 显示平台信息和特性支持

### 2. Node.js平台示例 (`node-example.ts`)

**适用场景**: Node.js应用、命令行工具、服务器端应用

**特性**:
- 完整的文件系统访问权限
- 支持大文件处理
- 高性能文件操作
- 递归目录操作

**运行方式**:
```bash
# 使用ts-node直接运行
npx ts-node examples/platform/node-example.ts

# 或先编译后运行
npm run build
node dist/examples/platform/node-example.js
```

**示例功能**:
- ✅ 初始化Node适配器
- ✅ 创建和管理目录
- ✅ 文件读写操作
- ✅ 文件状态查询
- ✅ 批量文件操作
- ✅ 嵌套目录处理
- ✅ 二进制数据处理
- ✅ 大文件操作（1MB+）
- ✅ 性能测试
- ✅ 自动清理测试文件

### 3. Electron平台示例 (`electron-example.ts`)

**适用场景**: Electron桌面应用

**特性**:
- 完整的文件系统访问
- 应用数据路径管理
- 系统集成功能（文件管理器、默认应用打开）
- 临时文件处理

**运行方式**:

在Electron应用中导入并调用:

```typescript
import { runElectronExample } from './examples/platform/electron-example';

// 在主进程或渲染进程中调用
runElectronExample().then(result => {
  console.log('示例执行结果:', result);
});
```

**示例功能**:
- ✅ 初始化Electron适配器
- ✅ 获取应用数据路径
- ✅ 获取临时文件路径
- ✅ 配置文件管理
- ✅ 用户数据管理
- ✅ 缓存管理
- ✅ 文件系统遍历
- ✅ 日志系统
- ✅ 性能测试
- ✅ 数据导出
- ✅ 系统集成功能（如果可用）

## 平台适配器API

所有平台适配器实现相同的接口：

```typescript
interface IPlatformAdapter {
  // 平台类型
  readonly platform: Platform;
  
  // 读取文件
  readFile(path: string): Promise<ArrayBuffer>;
  
  // 写入文件
  writeFile(path: string, data: ArrayBuffer): Promise<void>;
  
  // 检查文件是否存在
  exists(path: string): Promise<boolean>;
  
  // 列出目录中的文件
  listFiles(path: string): Promise<string[]>;
  
  // 删除文件
  deleteFile(path: string): Promise<void>;
  
  // 获取文件系统接口
  getFileSystem(): IFileSystem;
}
```

## 自动平台检测

SDK会自动检测运行环境并选择合适的适配器：

```typescript
import { createPlatformAdapter } from '@chips/sdk';

// 自动检测平台
const adapter = createPlatformAdapter();

// 或手动指定平台
const webAdapter = createPlatformAdapter(Platform.Web);
const nodeAdapter = createPlatformAdapter(Platform.Node);
const electronAdapter = createPlatformAdapter(Platform.Electron);
```

## 平台特性检测

使用`supportsFeature`检测特定功能是否可用：

```typescript
import { supportsFeature } from '@chips/sdk';

if (supportsFeature('filesystem')) {
  console.log('支持文件系统访问');
}

if (supportsFeature('indexeddb')) {
  console.log('支持IndexedDB');
}

if (supportsFeature('webgl')) {
  console.log('支持WebGL');
}
```

## 平台信息

获取详细的平台信息：

```typescript
import { getPlatformInfo } from '@chips/sdk';

const info = getPlatformInfo();
console.log('平台:', info.platform);
console.log('特性支持:', info.features);
console.log('User Agent:', info.userAgent);
console.log('Node版本:', info.nodeVersion);
```

## 常见使用场景

### 场景1: 保存用户配置

```typescript
const adapter = createPlatformAdapter();
const config = { theme: 'dark', language: 'zh-CN' };
const data = new TextEncoder().encode(JSON.stringify(config));
await adapter.writeFile('config.json', data.buffer);
```

### 场景2: 加载资源文件

```typescript
const adapter = createPlatformAdapter();
const imageData = await adapter.readFile('images/logo.png');
const blob = new Blob([imageData], { type: 'image/png' });
const url = URL.createObjectURL(blob);
```

### 场景3: 批量处理文件

```typescript
const adapter = createPlatformAdapter();
const files = await adapter.listFiles('data/');

for (const file of files) {
  const data = await adapter.readFile(file);
  // 处理文件数据
}
```

### 场景4: 缓存管理

```typescript
const adapter = createPlatformAdapter();
const cacheKey = 'cache/data.json';

// 检查缓存是否存在
if (await adapter.exists(cacheKey)) {
  const cached = await adapter.readFile(cacheKey);
  // 使用缓存数据
} else {
  // 获取新数据并缓存
  const data = await fetchData();
  await adapter.writeFile(cacheKey, data);
}
```

## 最佳实践

### 1. 错误处理

始终使用try-catch处理文件操作：

```typescript
try {
  const data = await adapter.readFile('file.txt');
  // 处理数据
} catch (error) {
  console.error('读取文件失败:', error);
  // 错误处理逻辑
}
```

### 2. 资源清理

操作完成后及时清理不需要的文件：

```typescript
try {
  // 使用临时文件
  await adapter.writeFile('temp.dat', data);
  // ... 处理
} finally {
  // 清理临时文件
  await adapter.deleteFile('temp.dat').catch(() => {});
}
```

### 3. 路径规范化

使用平台无关的路径分隔符：

```typescript
import * as path from 'path';

// ✅ 推荐
const filePath = path.join('data', 'users', 'profile.json');

// ❌ 避免
const filePath = 'data/users/profile.json'; // Unix风格
const filePath = 'data\\users\\profile.json'; // Windows风格
```

### 4. 数据编码

使用TextEncoder/TextDecoder处理文本数据：

```typescript
// 写入文本
const text = 'Hello, World!';
const data = new TextEncoder().encode(text);
await adapter.writeFile('hello.txt', data.buffer);

// 读取文本
const buffer = await adapter.readFile('hello.txt');
const text = new TextDecoder().decode(buffer);
```

### 5. 大文件处理

对于大文件，考虑分块处理：

```typescript
const chunkSize = 1024 * 1024; // 1MB chunks
const totalSize = largeData.byteLength;

for (let offset = 0; offset < totalSize; offset += chunkSize) {
  const chunk = largeData.slice(offset, offset + chunkSize);
  await processChunk(chunk);
}
```

## 性能优化

### 1. 批量操作

使用Promise.all并行处理多个文件：

```typescript
const files = ['file1.txt', 'file2.txt', 'file3.txt'];
const results = await Promise.all(
  files.map(file => adapter.readFile(file))
);
```

### 2. 缓存策略

实现智能缓存减少文件系统访问：

```typescript
const cache = new Map<string, ArrayBuffer>();

async function readWithCache(path: string): Promise<ArrayBuffer> {
  if (cache.has(path)) {
    return cache.get(path)!;
  }
  
  const data = await adapter.readFile(path);
  cache.set(path, data);
  return data;
}
```

### 3. 延迟写入

对于频繁更新的数据，使用防抖策略：

```typescript
let writeTimer: NodeJS.Timeout;
const debouncedWrite = (path: string, data: ArrayBuffer) => {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    adapter.writeFile(path, data);
  }, 1000);
};
```

## 测试

运行平台适配器测试：

```bash
# 运行所有平台测试
npm test

# 运行特定平台测试
npm test -- --grep "WebAdapter"
npm test -- --grep "NodeAdapter"
npm test -- --grep "ElectronAdapter"

# 查看测试覆盖率
npm run test:coverage
```

## 故障排除

### Web平台

**问题**: IndexedDB不可用
**解决**: 检查浏览器支持和隐私设置，某些隐私模式会禁用IndexedDB

**问题**: 跨域错误
**解决**: 确保CORS配置正确，或使用同源URL

### Node.js平台

**问题**: 权限错误
**解决**: 检查文件和目录权限，确保应用有读写权限

**问题**: 路径不存在
**解决**: 使用`exists`检查路径，使用`mkdir`创建目录

### Electron平台

**问题**: 渲染进程无法访问文件系统
**解决**: 在主进程中使用适配器，或启用nodeIntegration

**问题**: 应用数据路径不正确
**解决**: 确保在Electron环境中运行，使用`getAppDataPath()`

## 更多资源

- [Chips SDK文档](../../docs/README.md)
- [平台适配器设计](../../docs/platform-adapter.md)
- [API参考](../../docs/api-reference.md)
- [常见问题](../../docs/faq.md)

## 许可证

本示例代码遵循与Chips SDK相同的许可证。
