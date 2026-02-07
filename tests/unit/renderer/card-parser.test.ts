import { describe, it, expect } from 'vitest';
import { CardParser } from '../../../src/renderer/card-parser';

/**
 * 创建测试用的文件映射
 */
function createTestFileMap(overrides?: {
  metadata?: Record<string, unknown>;
  structure?: Record<string, unknown>;
  baseCards?: Array<{ id: string; type: string; data: Record<string, unknown> }>;
}): Map<string, Uint8Array> {
  const encoder = new TextEncoder();
  const files = new Map<string, Uint8Array>();

  // metadata.yaml
  const metadata = overrides?.metadata ?? {
    chip_standards_version: '1.0.0',
    card_id: 'a1B2c3D4e5',
    name: 'Test Card',
    created_at: '2026-01-01T00:00:00Z',
    modified_at: '2026-01-01T00:00:00Z',
  };
  files.set('.card/metadata.yaml', encoder.encode(objectToYaml(metadata)));

  // structure.yaml
  const baseCards = overrides?.baseCards ?? [
    { id: 'bc1234567a', type: 'RichTextCard', data: { content_text: '<p>Hello</p>' } },
    { id: 'bc1234567b', type: 'ImageCard', data: { images: [] } },
  ];
  const structure = overrides?.structure ?? {
    structure: baseCards.map((bc) => ({ id: bc.id, type: bc.type })),
  };
  files.set('.card/structure.yaml', encoder.encode(objectToYaml(structure)));

  // content/{id}.yaml
  for (const bc of baseCards) {
    const content = { type: bc.type, data: bc.data };
    files.set(`content/${bc.id}.yaml`, encoder.encode(objectToYaml(content)));
  }

  return files;
}

/**
 * 简易对象转 YAML（测试辅助函数）
 */
function objectToYaml(obj: Record<string, unknown>, indent: number = 0): string {
  const prefix = '  '.repeat(indent);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${prefix}${key}: []`);
      } else if (typeof value[0] === 'object' && value[0] !== null) {
        lines.push(`${prefix}${key}:`);
        for (const item of value) {
          const entries = Object.entries(item as Record<string, unknown>);
          if (entries.length > 0) {
            const [firstKey, firstVal] = entries[0];
            lines.push(`${prefix}  - ${firstKey}: ${valueToString(firstVal)}`);
            for (let i = 1; i < entries.length; i++) {
              const [k, v] = entries[i];
              lines.push(`${prefix}    ${k}: ${valueToString(v)}`);
            }
          }
        }
      } else {
        lines.push(`${prefix}${key}:`);
        for (const item of value) {
          lines.push(`${prefix}  - ${valueToString(item)}`);
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${prefix}${key}:`);
      lines.push(objectToYaml(value as Record<string, unknown>, indent + 1));
    } else {
      lines.push(`${prefix}${key}: ${valueToString(value)}`);
    }
  }

  return lines.join('\n');
}

function valueToString(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') {
    if (v.includes(':') || v.includes('#') || v.includes('<')) return `"${v}"`;
    return v;
  }
  return String(v);
}

describe('CardParser', () => {
  describe('constructor', () => {
    it('should create parser with default options', () => {
      const parser = new CardParser();
      expect(parser).toBeInstanceOf(CardParser);
    });

    it('should create parser with custom options', () => {
      const parser = new CardParser({ strict: true, keepRawFiles: true });
      expect(parser).toBeInstanceOf(CardParser);
    });
  });

  describe('parse from files', () => {
    it('should parse valid card file map', async () => {
      const parser = new CardParser();
      const files = createTestFileMap();

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.metadata.id).toBe('a1B2c3D4e5');
      expect(result.data!.metadata.name).toBe('Test Card');
      expect(result.data!.structure.baseCardIds).toHaveLength(2);
      expect(result.data!.baseCards).toHaveLength(2);
    });

    it('should parse metadata correctly', async () => {
      const parser = new CardParser();
      const files = createTestFileMap({
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'x1Y2z3A4b5',
          name: 'My Card',
          description: 'A description',
          created_at: '2026-02-01T00:00:00Z',
          modified_at: '2026-02-07T00:00:00Z',
          theme_id: 'dark-theme',
        },
      });

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(true);
      expect(result.data!.metadata.id).toBe('x1Y2z3A4b5');
      expect(result.data!.metadata.name).toBe('My Card');
      expect(result.data!.metadata.description).toBe('A description');
      expect(result.data!.metadata.themeId).toBe('dark-theme');
      expect(result.data!.metadata.chipsStandardsVersion).toBe('1.0.0');
    });

    it('should parse structure correctly', async () => {
      const parser = new CardParser();
      const files = createTestFileMap({
        baseCards: [
          { id: 'card001', type: 'RichTextCard', data: { content_text: 'Hello' } },
          { id: 'card002', type: 'ImageCard', data: { images: [] } },
          { id: 'card003', type: 'VideoCard', data: { video_file: 'video.mp4' } },
        ],
      });

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(true);
      expect(result.data!.structure.baseCardIds).toEqual(['card001', 'card002', 'card003']);
    });

    it('should parse base card configs correctly', async () => {
      const parser = new CardParser();
      const files = createTestFileMap({
        baseCards: [
          {
            id: 'rtCard01',
            type: 'RichTextCard',
            data: { content_text: '<p>Hello World</p>' },
          },
        ],
      });

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(true);
      expect(result.data!.baseCards).toHaveLength(1);
      expect(result.data!.baseCards[0].id).toBe('rtCard01');
      expect(result.data!.baseCards[0].type).toBe('RichTextCard');
      expect(result.data!.baseCards[0].config.content_text).toBe('<p>Hello World</p>');
    });

    it('should fail when metadata.yaml is missing', async () => {
      const parser = new CardParser();
      const files = new Map<string, Uint8Array>();
      files.set('.card/structure.yaml', new TextEncoder().encode('structure: []'));

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(false);
      expect(result.error).toContain('metadata.yaml');
    });

    it('should fail when structure.yaml is missing', async () => {
      const parser = new CardParser();
      const files = new Map<string, Uint8Array>();
      files.set(
        '.card/metadata.yaml',
        new TextEncoder().encode('card_id: abc\nname: Test')
      );

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(false);
      expect(result.error).toContain('structure.yaml');
    });

    it('should fail when metadata.yaml lacks required fields', async () => {
      const parser = new CardParser();
      const files = new Map<string, Uint8Array>();
      files.set('.card/metadata.yaml', new TextEncoder().encode('version: 1.0.0'));
      files.set('.card/structure.yaml', new TextEncoder().encode('structure: []'));

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required fields');
    });

    it('should warn on missing base card config files', async () => {
      const parser = new CardParser();
      const encoder = new TextEncoder();
      const files = new Map<string, Uint8Array>();
      files.set(
        '.card/metadata.yaml',
        encoder.encode('card_id: testId123\nname: Test')
      );
      files.set(
        '.card/structure.yaml',
        encoder.encode('structure:\n  - id: missing01\n    type: RichTextCard')
      );
      // Intentionally don't add content/missing01.yaml

      const result = await parser.parse({ type: 'files', files });

      // Non-strict mode: succeeds with warnings
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.data!.baseCards).toHaveLength(0);
    });

    it('should fail in strict mode on missing base card config', async () => {
      const parser = new CardParser({ strict: true });
      const encoder = new TextEncoder();
      const files = new Map<string, Uint8Array>();
      files.set(
        '.card/metadata.yaml',
        encoder.encode('card_id: testId123\nname: Test')
      );
      files.set(
        '.card/structure.yaml',
        encoder.encode('structure:\n  - id: missing01\n    type: RichTextCard')
      );

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(false);
    });

    it('should keep raw files when option is set', async () => {
      const parser = new CardParser({ keepRawFiles: true });
      const files = createTestFileMap();

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(true);
      expect(result.data!.rawFiles).toBeDefined();
      expect(result.data!.rawFiles!.size).toBeGreaterThan(0);
    });

    it('should not keep raw files by default', async () => {
      const parser = new CardParser();
      const files = createTestFileMap();

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(true);
      expect(result.data!.rawFiles).toBeUndefined();
    });
  });

  describe('parse with invalid source', () => {
    it('should fail with invalid source type', async () => {
      const parser = new CardParser();

      const result = await parser.parse({ type: 'files' } as never);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('YAML parser', () => {
    it('should parse string values', async () => {
      const parser = new CardParser();
      const encoder = new TextEncoder();
      const files = new Map<string, Uint8Array>();
      files.set(
        '.card/metadata.yaml',
        encoder.encode('card_id: abc123\nname: "My Card"\nversion: 1.0.0')
      );
      files.set('.card/structure.yaml', encoder.encode('structure: []'));

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(true);
      expect(result.data!.metadata.id).toBe('abc123');
      expect(result.data!.metadata.name).toBe('My Card');
    });

    it('should parse boolean and null values', async () => {
      const parser = new CardParser();
      const encoder = new TextEncoder();
      const files = new Map<string, Uint8Array>();
      files.set(
        '.card/metadata.yaml',
        encoder.encode('card_id: test01\nname: Test')
      );
      files.set(
        '.card/structure.yaml',
        encoder.encode('structure:\n  - id: bc001\n    type: VideoCard')
      );
      files.set(
        'content/bc001.yaml',
        encoder.encode('type: VideoCard\ndata:\n  video_file: video.mp4\n  autoplay: true\n  loop: false\n  muted: true')
      );

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(true);
      expect(result.data!.baseCards[0].config.autoplay).toBe(true);
      expect(result.data!.baseCards[0].config.loop).toBe(false);
      expect(result.data!.baseCards[0].config.muted).toBe(true);
    });

    it('should handle comments in YAML', async () => {
      const parser = new CardParser();
      const encoder = new TextEncoder();
      const files = new Map<string, Uint8Array>();
      files.set(
        '.card/metadata.yaml',
        encoder.encode('# This is a comment\ncard_id: test01\nname: Test\n# Another comment')
      );
      files.set('.card/structure.yaml', encoder.encode('structure: []'));

      const result = await parser.parse({ type: 'files', files });

      expect(result.success).toBe(true);
      expect(result.data!.metadata.id).toBe('test01');
    });
  });
});
