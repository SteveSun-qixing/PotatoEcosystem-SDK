# SDK - ConversionAPI 设计

**版本**: 1.0.0  
**更新日期**: 2026-02-03  
**状态**: 正式版

---

## 1. 设计思路

### 1.1 定位与职责

ConversionAPI 是薯片 SDK 中负责文件格式转换的模块，为应用层提供统一、简洁的转换接口。它的核心职责是封装与公共基础层文件转换接口模块的通信，屏蔽底层转换插件的复杂性，让开发者能够用最少的代码完成卡片到各种格式的转换。

从架构角度来看，ConversionAPI 处于 SDK 的业务层，与 FileAPI、CardAPI 等模块平级。它不直接实现任何转换逻辑，而是作为转换请求的发起者和结果的接收者，通过 CoreConnector 与微内核通信，由微内核将请求路由到公共基础层的文件转换接口模块，再由接口模块分发到具体的转换插件执行。

### 1.2 设计原则

ConversionAPI 的设计遵循 SDK 整体的 API 设计原则。简洁优先意味着常见的转换操作只需一行代码，开发者无需关心底层插件的存在。异步优先确保所有转换操作都返回 Promise，支持 async/await 语法，转换过程不会阻塞主线程。类型安全通过完整的 TypeScript 类型定义实现，编译期即可发现参数错误。可扩展性体现在选项参数的设计上，通过 options 对象传递可选配置，既满足当前需求又为未来扩展预留空间。

### 1.3 与现有模块的关系

ConversionAPI 与 FileAPI 存在互补关系。FileAPI 负责卡片文件的加载和保存，处理的是卡片文件格式本身；ConversionAPI 负责将卡片转换为其他格式，是对 FileAPI 功能的延伸。两者共同构成完整的文件处理能力。

ConversionAPI 也与 RendererEngine 存在协作关系。部分转换（如转图片）需要先渲染卡片内容再截取图像，这时 ConversionAPI 会通过转换插件间接使用渲染能力。但 ConversionAPI 本身不直接依赖 RendererEngine，这种依赖封装在转换插件内部。

---

## 2. 核心接口

### 2.1 ConversionAPI 类

ConversionAPI 类是转换功能的主入口，挂载在 ChipsSDK 实例的 `conversion` 属性上。它提供转换执行、进度查询、转换器管理等功能。

```typescript
class ConversionAPI {
  private _coreConnector: CoreConnector;
  private _converters: Map<string, Converter>;
  private _tasks: Map<string, ConversionTask>;
  
  constructor(coreConnector: CoreConnector) {
    this._coreConnector = coreConnector;
    this._converters = new Map();
    this._tasks = new Map();
  }
}
```

ConversionAPI 持有 CoreConnector 的引用用于与微内核通信，同时维护本地注册的转换器映射和正在执行的任务映射。

### 2.2 convert 方法

convert 方法是最核心的转换接口，接受源数据、目标格式和可选配置，返回转换结果。

```typescript
async convert(
  source: string | Card | Box,
  targetFormat: string,
  options?: ConversionOptions
): Promise<ConversionResult>
```

source 参数支持三种形式：文件路径字符串、Card 对象、Box 对象。ConversionAPI 会自动识别源类型，如果是路径则先加载文件再转换，如果是对象则直接转换。这种灵活性让开发者可以根据场景选择最方便的调用方式。

targetFormat 指定目标格式，如 `'html'`、`'png'`、`'pdf'` 等。ConversionAPI 会根据源类型和目标格式查找能够处理该转换的插件。

options 是可选的配置对象，包含通用选项（如输出路径、进度回调）和格式特定选项（如图片质量、PDF 页面大小）。格式特定选项放在各自的子对象中，结构清晰且易于扩展。

### 2.3 registerConverter 方法

registerConverter 方法用于注册转换器到系统中。转换器可以是内置的，也可以是第三方开发的转换插件。

```typescript
async registerConverter(converter: Converter): Promise<void>
```

注册过程首先验证转换器的元数据是否完整，然后检查是否存在 ID 冲突，最后将转换器存储到本地映射，并通过 CoreConnector 通知公共基础层的文件转换接口模块。转换器注册后，其支持的转换类型立即可用。

Converter 接口定义了转换器必须实现的方法：

```typescript
interface Converter {
  metadata: ConverterMetadata;
  convert(source: any, options: any): Promise<any>;
  getCapabilities(): ConversionCapability[];
}
```

metadata 包含转换器的基本信息。convert 方法执行实际的转换逻辑。getCapabilities 返回该转换器支持的转换类型列表，用于路由转换请求。

---

## 3. 与公共基础层的关系

### 3.1 文件转换接口模块

公共基础层的文件转换接口模块（file-converter）是转换系统的核心路由器。它不实现任何具体的转换逻辑，而是管理所有已注册的转换插件，根据请求的源类型和目标格式将请求分发到对应的插件。

ConversionAPI 与 file-converter 的关系是调用者与服务者的关系。ConversionAPI 通过 CoreConnector 向微内核发送转换请求，微内核将请求路由到 file-converter，file-converter 再路由到具体的转换插件。这种间接的通信方式保持了层次分离，SDK 层不直接依赖公共基础层的实现细节。

### 3.2 通信协议

ConversionAPI 与 file-converter 之间的通信遵循标准的请求-响应协议。请求包含以下字段：

```typescript
interface ConversionRequest {
  service: 'file-converter';
  method: 'convert' | 'getCapabilities' | 'registerConverter';
  payload: {
    source: any;           // 源数据或路径
    sourceType: string;    // 源类型
    targetFormat: string;  // 目标格式
    options: any;          // 转换选项
    taskId: string;        // 任务标识
  };
}
```

响应包含转换结果或错误信息：

```typescript
interface ConversionResponse {
  status: 'success' | 'error';
  data?: {
    outputPath?: string;
    outputData?: ArrayBuffer;
    duration: number;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

### 3.3 进度通知

转换过程可能耗时较长，file-converter 通过事件机制向 SDK 推送进度更新。ConversionAPI 监听这些事件，更新本地任务状态，并调用开发者提供的进度回调函数。

```typescript
// 监听转换进度事件
this._coreConnector.on('conversion:progress', (data) => {
  const task = this._tasks.get(data.taskId);
  if (task) {
    task.progress = data.progress;
    task.currentStep = data.currentStep;
    task.options.onProgress?.(data);
  }
});
```

---

## 4. 与转换插件的交互

### 4.1 插件发现

ConversionAPI 初始化时会查询 file-converter 已注册的所有转换插件，构建转换能力映射表。这个映射表用于快速判断是否支持某种转换，以及将转换请求路由到正确的插件。

```typescript
async initialize(): Promise<void> {
  const response = await this._coreConnector.request({
    service: 'file-converter',
    method: 'getCapabilities',
    payload: {}
  });
  
  this._capabilities = response.data.capabilities;
}
```

### 4.2 卡片转换插件

Chips-CardConversionPlugin 项目包含三个核心转换插件：CardtoHTMLPlugin、CardtoImagePlugin、CardtoPDFPlugin。这些插件注册到 file-converter 后，ConversionAPI 就可以发起对应的转换请求。

CardtoHTMLPlugin 将卡片转换为完整的 HTML 网页目录。转换时遍历卡片的所有基础卡片，获取每个基础卡片的前端渲染代码，生成独立的 HTML 文件。主入口页面使用 iframe 嵌套所有基础卡片，完整还原卡片的层级结构。资源文件复制到 assets 目录，主题样式提取到 theme.css。

CardtoImagePlugin 将卡片渲染为图片文件。它在内存中渲染卡片内容，然后截取渲染结果输出为 PNG 或 JPG 格式。支持配置图片质量、分辨率和缩放比例。

CardtoPDFPlugin 将卡片转换为 PDF 文档。它先渲染卡片内容，然后转换为 PDF 格式。支持配置页面大小、方向、边距，可以选择是否包含封面和目录。

### 4.3 插件扩展

转换系统设计为高度可扩展。第三方开发者可以开发自己的转换插件，只要遵循 Converter 接口标准即可注册到系统中使用。例如可以开发将 Markdown 转换为卡片的插件，或者将卡片导出为 Markdown 的插件。

```typescript
// 第三方转换插件示例
const markdownToCardConverter: Converter = {
  metadata: {
    id: 'markdown-to-card',
    name: 'Markdown to Card Converter',
    version: '1.0.0'
  },
  
  async convert(source, options) {
    // 解析 Markdown 内容
    // 创建卡片结构
    // 返回 Card 对象
  },
  
  getCapabilities() {
    return [{
      sourceType: 'markdown',
      targetFormat: 'card'
    }];
  }
};

// 注册到系统
await sdk.conversion.registerConverter(markdownToCardConverter);
```

---

## 5. 转换流程

### 5.1 完整流程

一次完整的转换请求经历以下步骤。首先，应用层调用 `sdk.conversion.convert()` 方法，传入源数据、目标格式和配置选项。ConversionAPI 接收到请求后，生成唯一的任务 ID，创建任务记录，解析源数据类型。

```
应用层: sdk.conversion.convert(card, 'html', options)
          ↓
ConversionAPI: 生成任务ID，创建任务记录
          ↓
ConversionAPI: 构造转换请求
          ↓
CoreConnector: 发送请求到微内核
          ↓
Chips Core: 路由到 file-converter 模块
          ↓
file-converter: 查找对应的转换插件
          ↓
CardtoHTMLPlugin: 执行转换逻辑
          ↓ (转换过程中)
CardtoHTMLPlugin: 发送进度事件
          ↓
file-converter: 转发进度事件
          ↓
Chips Core: 转发进度事件
          ↓
CoreConnector: 触发进度回调
          ↓
ConversionAPI: 更新任务状态，调用 onProgress
          ↓ (转换完成)
CardtoHTMLPlugin: 返回转换结果
          ↓
file-converter: 包装响应
          ↓
Chips Core: 返回响应
          ↓
CoreConnector: 解析响应
          ↓
ConversionAPI: 构造 ConversionResult
          ↓
应用层: 获得转换结果
```

### 5.2 错误处理

转换过程中可能出现多种错误：源文件不存在、格式不支持、转换插件执行失败、输出路径无权限等。ConversionAPI 捕获所有错误，将其包装为统一的 ConversionResult 格式返回。

```typescript
async convert(source, targetFormat, options): Promise<ConversionResult> {
  const taskId = generateTaskId();
  const startTime = Date.now();
  
  try {
    // 检查是否支持该转换
    if (!this.canConvert(getSourceType(source), targetFormat)) {
      throw new ConversionError(
        'UNSUPPORTED_CONVERSION',
        `不支持从 ${getSourceType(source)} 转换到 ${targetFormat}`
      );
    }
    
    // 执行转换
    const response = await this._coreConnector.request({
      service: 'file-converter',
      method: 'convert',
      payload: { source, targetFormat, options, taskId }
    });
    
    return {
      success: true,
      taskId,
      outputPath: response.data.outputPath,
      outputData: response.data.outputData,
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      success: false,
      taskId,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
```

---

## 6. 使用示例

### 6.1 基础转换

最简单的转换只需要指定源和目标格式。ConversionAPI 会使用合理的默认值处理其他细节。

```typescript
// 初始化 SDK
const sdk = new ChipsSDK();
await sdk.initialize();

// 加载卡片
const card = await sdk.loadCard('./my-card.card');

// 转换为 HTML
const result = await sdk.conversion.convert(card, 'html');

if (result.success) {
  console.log('转换完成，输出路径:', result.outputPath);
} else {
  console.error('转换失败:', result.error);
}
```

### 6.2 带选项的转换

通过 options 参数可以精细控制转换行为。

```typescript
// 转换为高质量图片
const result = await sdk.conversion.convert(card, 'png', {
  outputPath: './exports/card-preview.png',
  image: {
    format: 'png',
    quality: 100,
    scale: 2  // 2倍分辨率，适合 Retina 显示
  }
});

// 转换为 PDF，包含封面和目录
const pdfResult = await sdk.conversion.convert(card, 'pdf', {
  outputPath: './exports/document.pdf',
  pdf: {
    pageSize: 'A4',
    orientation: 'portrait',
    margin: { top: 20, right: 15, bottom: 20, left: 15 },
    includeCover: true,
    includeTableOfContents: true
  }
});
```

### 6.3 进度监控

对于耗时较长的转换，可以通过进度回调获取实时状态。

```typescript
const result = await sdk.conversion.convert(card, 'html', {
  outputPath: './output',
  onProgress: (progress) => {
    // 更新进度条
    progressBar.value = progress.progress;
    statusText.textContent = progress.currentStep || '正在转换...';
    
    // 处理各种状态
    if (progress.status === 'completed') {
      showNotification('转换完成！');
    } else if (progress.status === 'failed') {
      showError(progress.error);
    }
  }
});
```

### 6.4 批量转换

批量转换多个卡片时，ConversionAPI 会并行执行以提高效率。

```typescript
// 加载多个卡片
const cards = await sdk.loadCards([
  './cards/card1.card',
  './cards/card2.card',
  './cards/card3.card'
]);

// 批量转换为 PNG
const results = await sdk.conversion.convertBatch(cards, 'png', {
  outputPath: './previews',
  image: { format: 'png', scale: 1 }
});

// 统计结果
const succeeded = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;
console.log(`转换完成: ${succeeded} 成功, ${failed} 失败`);
```

### 6.5 查询转换能力

在执行转换前，可以先查询系统支持的转换类型。

```typescript
// 获取所有支持的转换类型
const capabilities = sdk.conversion.getSupportedConversions();
console.log('支持的转换类型:', capabilities);
// => [
//   { sourceType: 'card', targetFormat: 'html' },
//   { sourceType: 'card', targetFormat: 'png' },
//   { sourceType: 'card', targetFormat: 'pdf' },
//   ...
// ]

// 检查是否支持特定转换
if (sdk.conversion.canConvert('card', 'docx')) {
  await sdk.conversion.convert(card, 'docx');
} else {
  console.log('暂不支持转换为 Word 文档');
}

// 列出已注册的转换器
const converters = sdk.conversion.listConverters();
converters.forEach(c => {
  console.log(`${c.name} v${c.version}: ${c.capabilities.length} 种转换`);
});
```

---

**文档维护者**: Chips 生态核心团队  
**反馈渠道**: 提交 Issue 到官方仓库
