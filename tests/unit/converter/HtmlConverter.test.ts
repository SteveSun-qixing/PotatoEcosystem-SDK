/**
 * HtmlConverter 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HtmlConverter } from '../../../src/converter/HtmlConverter';
import { Logger } from '../../../src/core/logger';
import type { Card } from '../../../src/types';

describe('HtmlConverter', () => {
  let converter: HtmlConverter;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    converter = new HtmlConverter(logger);
  });

  describe('卡片转HTML', () => {
    it('应该成功转换简单卡片', async () => {
      const card: Card = {
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'a1B2c3D4e5',
          name: '测试卡片',
          created_at: '2026-01-30T00:00:00.000Z',
          modified_at: '2026-01-30T00:00:00.000Z',
          theme: '',
          tags: [],
        },
        structure: {
          structure: [
            {
              id: 'b1C2d3E4f5',
              type: 'RichTextCard',
            },
          ],
          manifest: {
            card_count: 1,
            resource_count: 0,
            resources: [],
          },
        },
        content: {
          b1C2d3E4f5: {
            card_type: 'RichTextCard',
            content_source: 'inline',
            content_text: '<p>测试内容</p>',
          },
        },
        resources: [],
      };

      const html = await converter.toHtml(card);

      expect(html).toContain('测试卡片');
      expect(html).toContain('测试内容');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('应该包含必要的HTML结构', async () => {
      const card: Card = {
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'a1B2c3D4e5',
          name: '测试',
          created_at: '2026-01-30T00:00:00.000Z',
          modified_at: '2026-01-30T00:00:00.000Z',
          theme: '',
          tags: [],
        },
        structure: {
          structure: [],
          manifest: {
            card_count: 0,
            resource_count: 0,
            resources: [],
          },
        },
        content: {},
        resources: [],
      };

      const html = await converter.toHtml(card);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('<meta charset');
    });

    it('应该支持自定义选项', async () => {
      const card: Card = {
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'a1B2c3D4e5',
          name: '测试',
          created_at: '2026-01-30T00:00:00.000Z',
          modified_at: '2026-01-30T00:00:00.000Z',
          theme: '',
          tags: [],
        },
        structure: {
          structure: [],
          manifest: {
            card_count: 0,
            resource_count: 0,
            resources: [],
          },
        },
        content: {},
        resources: [],
      };

      const html = await converter.toHtml(card, {
        includeStyles: true,
        standalone: true,
      });

      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });
  });

  describe('HTML转卡片', () => {
    it('应该能够从HTML创建卡片', async () => {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>测试卡片</title>
</head>
<body>
  <h1>标题</h1>
  <p>内容</p>
</body>
</html>
      `;

      const card = await converter.fromHtml(html);

      expect(card).toBeDefined();
      expect(card.metadata.name).toBeTruthy();
    });
  });
});
