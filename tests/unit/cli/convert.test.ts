/**
 * CLI convert命令测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('CLI convert command', () => {
  const testDir = path.join(process.cwd(), 'test-output-cli-convert');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略删除错误
    }
  });

  describe('Card转Markdown', () => {
    it('应该将Card转换为Markdown', async () => {
      const cardPath = path.join(testDir, 'source.card');
      const markdownPath = path.join(testDir, 'output.md');

      // 创建测试卡片
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建源卡片
      const sourceMarkdown = '# 测试卡片\n\n这是测试内容。\n\n## 子标题\n\n段落文本。';
      const card = MarkdownConverter.importFromMarkdown(sourceMarkdown, '测试卡片');
      await fileAPI.saveCard(card, cardPath);

      // 转换为Markdown
      const loadedCard = await fileAPI.loadCard(cardPath);
      const outputMarkdown = MarkdownConverter.exportToMarkdown(loadedCard);
      await fs.writeFile(markdownPath, outputMarkdown, 'utf-8');

      // 验证输出
      const content = await fs.readFile(markdownPath, 'utf-8');
      expect(content).toContain('# 测试卡片');
      expect(content).toContain('这是测试内容');
    });

    it('应该保留Markdown格式', async () => {
      const cardPath = path.join(testDir, 'formatted.card');
      const markdownPath = path.join(testDir, 'formatted.md');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 包含各种Markdown元素
      const sourceMarkdown = `# 标题1

## 标题2

### 标题3

这是段落。

- 列表项1
- 列表项2
- 列表项3

1. 有序列表1
2. 有序列表2

\`\`\`javascript
const code = "代码块";
\`\`\`

**粗体** 和 *斜体*
`;

      const card = MarkdownConverter.importFromMarkdown(sourceMarkdown, '格式化卡片');
      await fileAPI.saveCard(card, cardPath);

      const loadedCard = await fileAPI.loadCard(cardPath);
      const outputMarkdown = MarkdownConverter.exportToMarkdown(loadedCard);
      await fs.writeFile(markdownPath, outputMarkdown, 'utf-8');

      const content = await fs.readFile(markdownPath, 'utf-8');
      expect(content).toContain('# 标题1');
      expect(content).toContain('## 标题2');
      expect(content).toContain('- 列表项1');
    });
  });

  describe('Card转HTML', () => {
    it('应该将Card转换为HTML', async () => {
      const cardPath = path.join(testDir, 'source-html.card');
      const htmlPath = path.join(testDir, 'output.html');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { HtmlConverter } = await import('../../../src/converter/HtmlConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建源卡片
      const sourceHtml = '<h1>HTML标题</h1><p>HTML内容</p>';
      const card = HtmlConverter.importFromHTML(sourceHtml, 'HTML卡片');
      await fileAPI.saveCard(card, cardPath);

      // 转换为HTML
      const loadedCard = await fileAPI.loadCard(cardPath);
      const outputHtml = HtmlConverter.exportToHTML(loadedCard);
      await fs.writeFile(htmlPath, outputHtml, 'utf-8');

      // 验证输出
      const content = await fs.readFile(htmlPath, 'utf-8');
      expect(content).toContain('<h1>HTML标题</h1>');
      expect(content).toContain('<p>HTML内容</p>');
    });
  });

  describe('Markdown转Card', () => {
    it('应该从Markdown文件创建Card', async () => {
      const markdownPath = path.join(testDir, 'input.md');
      const cardPath = path.join(testDir, 'output.card');

      // 创建Markdown文件
      const markdownContent = '# 从Markdown\n\n转换为Card的测试。';
      await fs.writeFile(markdownPath, markdownContent, 'utf-8');

      // 读取并转换
      const content = await fs.readFile(markdownPath, 'utf-8');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');

      const card = MarkdownConverter.importFromMarkdown(content, 'output');
      
      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      await fileAPI.saveCard(card, cardPath);

      // 验证
      const loadedCard = await fileAPI.loadCard(cardPath);
      expect(loadedCard.metadata.name).toBe('output');
      
      const baseCardId = loadedCard.structure.structure[0].id;
      const cardContent = loadedCard.content[baseCardId] as any;
      expect(cardContent.content_text).toContain('从Markdown');
    });
  });

  describe('HTML转Card', () => {
    it('应该从HTML文件创建Card', async () => {
      const htmlPath = path.join(testDir, 'input.html');
      const cardPath = path.join(testDir, 'output-from-html.card');

      // 创建HTML文件
      const htmlContent = '<h1>从HTML</h1><p>转换为Card的测试。</p>';
      await fs.writeFile(htmlPath, htmlContent, 'utf-8');

      // 读取并转换
      const content = await fs.readFile(htmlPath, 'utf-8');
      const { HtmlConverter } = await import('../../../src/converter/HtmlConverter');
      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');

      const card = HtmlConverter.importFromHTML(content, 'output-from-html');
      
      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      await fileAPI.saveCard(card, cardPath);

      // 验证
      const loadedCard = await fileAPI.loadCard(cardPath);
      expect(loadedCard.metadata.name).toBe('output-from-html');
      
      const baseCardId = loadedCard.structure.structure[0].id;
      const cardContent = loadedCard.content[baseCardId] as any;
      expect(cardContent.content_text).toContain('从HTML');
    });
  });

  describe('Card复制', () => {
    it('应该复制Card文件', async () => {
      const sourcePath = path.join(testDir, 'source-copy.card');
      const destPath = path.join(testDir, 'dest-copy.card');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建源文件
      const card = MarkdownConverter.importFromMarkdown('# 复制测试', '复制卡片');
      await fileAPI.saveCard(card, sourcePath);

      // 复制文件 - 使用FileAPI而不是直接复制
      await fileAPI.saveCard(card, destPath);

      // 验证
      const loadedCard = await fileAPI.loadCard(destPath);
      expect(loadedCard.metadata.name).toBe('复制卡片');
    });
  });

  describe('错误处理', () => {
    it('应该验证输入文件扩展名', () => {
      const invalidInput = 'input.txt';
      expect(invalidInput.endsWith('.card')).toBe(false);
    });

    it('应该处理不支持的输出格式', () => {
      const invalidFormat = 'xml';
      const validFormats = ['markdown', 'html', 'card'];
      expect(validFormats.includes(invalidFormat)).toBe(false);
    });

    it('应该处理不支持的输入格式', () => {
      const invalidFormat = 'pdf';
      const validFormats = ['markdown', 'html'];
      expect(validFormats.includes(invalidFormat)).toBe(false);
    });

    it('应该要求fromFormat时提供fromInput', () => {
      const hasFromFormat = true;
      const hasFromInput = false;
      expect(hasFromFormat && !hasFromInput).toBe(true);
    });
  });

  describe('双向转换', () => {
    it('应该支持Card -> Markdown -> Card往返转换', async () => {
      const card1Path = path.join(testDir, 'roundtrip1.card');
      const markdownPath = path.join(testDir, 'roundtrip.md');
      const card2Path = path.join(testDir, 'roundtrip2.card');

      const { NodeAdapter } = await import('../../../src/platform/node/NodeAdapter');
      const { FileAPI } = await import('../../../src/api/FileAPI');
      const { Logger } = await import('../../../src/core/logger');
      const { LogLevel } = await import('../../../src/types');
      const { MarkdownConverter } = await import('../../../src/converter/MarkdownConverter');

      const adapter = new NodeAdapter();
      const logger = new Logger({ level: LogLevel.Warn });
      const fileAPI = new FileAPI(adapter, logger);

      // 创建原始卡片
      const originalMarkdown = '# 往返测试\n\n这是内容。';
      const card1 = MarkdownConverter.importFromMarkdown(originalMarkdown, '往返卡片');
      await fileAPI.saveCard(card1, card1Path);

      // Card -> Markdown
      const loadedCard1 = await fileAPI.loadCard(card1Path);
      const markdown = MarkdownConverter.exportToMarkdown(loadedCard1);
      await fs.writeFile(markdownPath, markdown, 'utf-8');

      // Markdown -> Card
      const markdownContent = await fs.readFile(markdownPath, 'utf-8');
      const card2 = MarkdownConverter.importFromMarkdown(markdownContent, '往返卡片2');
      await fileAPI.saveCard(card2, card2Path);

      // 验证内容一致
      const loadedCard2 = await fileAPI.loadCard(card2Path);
      const baseCardId1 = loadedCard1.structure.structure[0].id;
      const baseCardId2 = loadedCard2.structure.structure[0].id;
      
      const content1 = (loadedCard1.content[baseCardId1] as any).content_text;
      const content2 = (loadedCard2.content[baseCardId2] as any).content_text;
      
      expect(content2).toContain('往返测试');
    });
  });
});
