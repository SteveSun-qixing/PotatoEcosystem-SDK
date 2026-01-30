/**
 * 文件API测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileAPI } from '@/api/FileAPI';
import { Logger } from '@/core/logger';
import { createPlatformAdapter } from '@/platform';
import { IdGenerator } from '@/core/id';
import type { Card } from '@/types';

describe('FileAPI', () => {
  let fileAPI: FileAPI;
  let card: Card;

  beforeEach(() => {
    const adapter = createPlatformAdapter();
    const logger = new Logger({ enableConsole: false });
    fileAPI = new FileAPI(adapter, logger);

    // 创建测试卡片
    const cardId = IdGenerator.generate();
    const baseCardId = IdGenerator.generate();

    card = {
      metadata: {
        chip_standards_version: '1.0.0',
        card_id: cardId,
        name: '测试卡片',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      },
      structure: {
        structure: [
          {
            id: baseCardId,
            type: 'RichTextCard',
          },
        ],
        manifest: {
          card_count: 1,
          resource_count: 0,
        },
      },
      content: {
        [baseCardId]: {
          card_type: 'RichTextCard',
          content_source: 'inline',
          content_text: '<p>测试内容</p>',
        },
      },
    };
  });

  describe('saveCard and loadCard', () => {
    it('应该保存和加载卡片', async () => {
      const testPath = 'test-card.card';

      // 保存卡片
      await fileAPI.saveCard(card, testPath, { overwrite: true });

      // 加载卡片
      const loadedCard = await fileAPI.loadCard(testPath);

      expect(loadedCard.metadata.card_id).toBe(card.metadata.card_id);
      expect(loadedCard.metadata.name).toBe(card.metadata.name);
      expect(loadedCard.structure.structure).toHaveLength(1);
    });

    it('应该使用缓存', async () => {
      const testPath = 'cached-card.card';

      await fileAPI.saveCard(card, testPath, { overwrite: true });

      // 第一次加载
      const loaded1 = await fileAPI.loadCard(testPath);

      // 第二次加载（应该从缓存）
      const loaded2 = await fileAPI.loadCard(testPath);

      expect(loaded1).toBe(loaded2); // 同一个对象引用
    });

    it('应该支持禁用缓存', async () => {
      const testPath = 'no-cache-card.card';

      await fileAPI.saveCard(card, testPath, { overwrite: true });

      const loaded1 = await fileAPI.loadCard(testPath, { cache: false });
      const loaded2 = await fileAPI.loadCard(testPath, { cache: false });

      // 不使用缓存，每次都是新对象
      expect(loaded1).not.toBe(loaded2);
    });
  });

  describe('saveCardAsBlob', () => {
    it('应该保存卡片为Blob', async () => {
      const blob = await fileAPI.saveCardAsBlob(card);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/x-card');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('Blob应该可以重新加载', async () => {
      const blob = await fileAPI.saveCardAsBlob(card);
      const loadedCard = await fileAPI.loadCard(blob);

      expect(loadedCard.metadata.card_id).toBe(card.metadata.card_id);
    });
  });

  describe('exists', () => {
    it('应该检查文件是否存在', async () => {
      const testPath = `exists-test-${Date.now()}.card`;

      const beforeSave = await fileAPI.exists(testPath);
      expect(beforeSave).toBe(false);

      await fileAPI.saveCard(card, testPath, { overwrite: true });

      const afterSave = await fileAPI.exists(testPath);
      expect(afterSave).toBe(true);
    });
  });

  describe('deleteFile', () => {
    it('应该删除文件', async () => {
      const testPath = 'delete-test.card';

      await fileAPI.saveCard(card, testPath, { overwrite: true });
      expect(await fileAPI.exists(testPath)).toBe(true);

      await fileAPI.deleteFile(testPath);
      expect(await fileAPI.exists(testPath)).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('应该清除缓存', async () => {
      const testPath = 'cache-clear-test.card';

      await fileAPI.saveCard(card, testPath, { overwrite: true });
      await fileAPI.loadCard(testPath);

      const statsBefore = fileAPI.getCacheStats();
      expect(statsBefore.total).toBeGreaterThan(0);

      fileAPI.clearCache();

      const statsAfter = fileAPI.getCacheStats();
      expect(statsAfter.total).toBe(0);
    });
  });
});
