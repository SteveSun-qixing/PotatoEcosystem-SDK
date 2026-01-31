# Chips SDK CLI工具

Chips SDK的命令行工具，提供卡片文件的创建、转换、查看和验证功能。

## 安装

```bash
npm install -g @chips/sdk
```

或者使用本地安装：

```bash
npm install @chips/sdk
npx chips --help
```

## 命令概览

- [`chips create`](#chips-create) - 创建新卡片
- [`chips convert`](#chips-convert) - 格式转换
- [`chips info`](#chips-info) - 查看卡片信息
- [`chips validate`](#chips-validate) - 验证文件格式
- [`chips list`](#chips-list) - 列出目录中的卡片

## 命令详情

### chips create

创建新的卡片文件。

**语法：**
```bash
chips create <output> [options]
```

**参数：**
- `output` - 输出文件路径（必须是`.card`格式）

**选项：**
- `-n, --name <name>` - 卡片名称（默认: "New Card"）
- `-t, --type <type>` - 卡片类型：`markdown`、`html`、`empty`（默认: `empty`）
- `-i, --input <file>` - 输入文件路径（用于markdown/html类型）
- `-c, --content <text>` - 直接指定内容文本
- `-f, --force` - 覆盖已存在的文件

**示例：**

```bash
# 创建空卡片
chips create my-card.card --name "我的卡片"

# 从Markdown文件创建卡片
chips create doc.card --type markdown --input README.md --name "文档卡片"

# 从HTML内容创建卡片
chips create page.card --type html --content "<h1>Hello</h1><p>World</p>" --name "页面卡片"

# 使用直接文本内容创建Markdown卡片
chips create note.card --type markdown --content "# 笔记\n\n这是内容" --name "笔记卡片"
```

### chips convert

转换卡片文件格式。

**语法：**
```bash
chips convert <input> <output> [options]
```

**参数：**
- `input` - 输入文件路径（.card文件）
- `output` - 输出文件路径

**选项：**
- `-f, --format <format>` - 输出格式：`markdown`、`html`、`card`（默认: `markdown`）
- `--from-format <format>` - 输入格式（用于从markdown/html转换为card）
- `--from-input <file>` - 输入文件（用于从markdown/html转换为card）

**示例：**

```bash
# 将卡片转换为Markdown
chips convert my-card.card output.md

# 将卡片转换为HTML
chips convert my-card.card output.html --format html

# 从Markdown文件创建卡片
chips convert input.md output.card --from-format markdown --from-input input.md

# 从HTML文件创建卡片
chips convert input.html output.card --from-format html --from-input input.html
```

### chips info

查看卡片文件的详细信息。

**语法：**
```bash
chips info <file> [options]
```

**参数：**
- `file` - 卡片文件路径（.card文件）

**选项：**
- `-j, --json` - 以JSON格式输出
- `-v, --verbose` - 显示详细信息（包括内容预览和资源列表）

**示例：**

```bash
# 查看基本信息
chips info my-card.card

# 查看详细信息
chips info my-card.card --verbose

# JSON格式输出
chips info my-card.card --json

# JSON格式输出（包含详细信息）
chips info my-card.card --json --verbose
```

**输出示例：**

```
📋 卡片信息
══════════════════════════════════════════════════
文件路径: my-card.card
文件大小: 2.45 KB
创建时间: 2026-01-31 10:30:00
修改时间: 2026-01-31 10:35:00

📝 元数据
──────────────────────────────────────────────────
卡片ID: card_abc123
卡片名称: 我的卡片
标准版本: 1.0.0
创建时间: 2026-01-31T10:30:00.000Z
修改时间: 2026-01-31T10:35:00.000Z

🏗️  结构信息
──────────────────────────────────────────────────
基础卡片数量: 1
资源文件数量: 0
```

### chips validate

验证卡片文件格式是否正确。

**语法：**
```bash
chips validate <file> [options]
```

**参数：**
- `file` - 卡片文件路径（.card文件）或目录路径

**选项：**
- `-r, --recursive` - 递归验证目录中的所有文件
- `-j, --json` - 以JSON格式输出
- `--strict` - 严格模式：遇到错误立即退出

**示例：**

```bash
# 验证单个文件
chips validate my-card.card

# 验证目录中的所有.card文件
chips validate ./cards/

# 递归验证目录
chips validate ./cards/ --recursive

# JSON格式输出
chips validate ./cards/ --json

# 严格模式（遇到错误立即退出）
chips validate ./cards/ --strict
```

**输出示例：**

```
✓ ./cards/card1.card
✓ ./cards/card2.card
✗ ./cards/card3.card
  错误: Invalid YAML format

══════════════════════════════════════════════════
总计: 3 个文件
✓ 有效: 2
✗ 无效: 1
```

### chips list

列出目录中的卡片文件。

**语法：**
```bash
chips list [directory] [options]
```

**参数：**
- `directory` - 目录路径（默认: 当前目录）

**选项：**
- `-r, --recursive` - 递归搜索子目录
- `-j, --json` - 以JSON格式输出
- `-s, --sort <field>` - 排序字段：`name`、`size`、`date`（默认: `name`）
- `--reverse` - 反向排序

**示例：**

```bash
# 列出当前目录中的卡片
chips list

# 列出指定目录中的卡片
chips list ./cards/

# 递归列出所有子目录中的卡片
chips list ./cards/ --recursive

# 按大小排序
chips list --sort size

# 按修改日期倒序排列
chips list --sort date --reverse

# JSON格式输出
chips list --json
```

**输出示例：**

```
📂 目录: ./cards/
════════════════════════════════════════════════════════════════════════════════
找到 3 个卡片文件

文件路径                                    卡片名称              大小        修改时间            
────────────────────────────────────────────────────────────────────────────────
card1.card                                我的卡片              2.45 KB     2026-01-31 10:30
card2.card                                测试卡片              1.85 KB     2026-01-31 11:15
card3.card                                文档卡片              3.12 KB     2026-01-31 14:20
```

## 使用场景

### 场景1：批量转换Markdown文档为卡片

```bash
# 创建转换脚本
for file in docs/*.md; do
  name=$(basename "$file" .md)
  chips create "cards/${name}.card" --type markdown --input "$file" --name "$name"
done
```

### 场景2：验证卡片库

```bash
# 验证整个卡片库
chips validate ./card-library/ --recursive --json > validation-report.json
```

### 场景3：导出卡片为HTML用于预览

```bash
# 批量导出为HTML
for file in cards/*.card; do
  name=$(basename "$file" .card)
  chips convert "$file" "previews/${name}.html" --format html
done
```

### 场景4：查看卡片信息并生成报告

```bash
# 生成JSON报告
for file in cards/*.card; do
  chips info "$file" --json >> card-info.json
done
```

### 场景5：浏览卡片库

```bash
# 快速浏览卡片库
chips list ./my-cards/ --recursive

# 查找最大的卡片文件
chips list --sort size --reverse | head -n 5

# 查找最近修改的卡片
chips list --sort date --reverse | head -n 10
```

### 场景6：生成卡片库报告

```bash
# 生成JSON格式的卡片库清单
chips list ./cards/ --recursive --json > card-inventory.json

# 统计卡片数量
chips list ./cards/ --recursive | grep "找到" 
```

## 错误处理

CLI工具会在遇到错误时：
1. 输出错误信息到标准错误流
2. 以非零退出码退出（便于脚本检测）

常见错误：
- `文件已存在` - 使用 `--force` 选项覆盖
- `文件格式错误` - 检查文件是否为有效的.card格式
- `文件不存在` - 检查文件路径是否正确

## 开发

### 本地开发

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 测试CLI（使用本地构建）
node dist/cli/index.js --help
```

### 链接到全局

```bash
# 在SDK目录下
npm link

# 现在可以在任何地方使用chips命令
chips --help
```

## 许可证

MIT License
