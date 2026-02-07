import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CoreConnector } from '../../../src/core/connector';
import { ConnectionError, TimeoutError } from '../../../src/core/errors';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  // 测试辅助方法
  triggerOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  triggerMessage(data: string): void {
    this.onmessage?.({ data });
  }

  triggerError(): void {
    this.onerror?.(new Event('error'));
  }

  triggerClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

describe('CoreConnector', () => {
  let connector: CoreConnector;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    vi.stubGlobal('WebSocket', vi.fn(() => mockWs));
    connector = new CoreConnector({ reconnect: false });
  });

  afterEach(() => {
    connector.disconnect();
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('应该创建连接器实例', () => {
      expect(connector).toBeInstanceOf(CoreConnector);
      expect(connector.isConnected).toBe(false);
      expect(connector.clientId).toMatch(/^sdk-[a-f0-9]{8}$/);
    });

    it('应该使用自定义配置', () => {
      const customConnector = new CoreConnector({
        url: 'ws://custom:8080',
        timeout: 5000,
      });
      expect(customConnector).toBeInstanceOf(CoreConnector);
    });
  });

  describe('connect', () => {
    it('应该成功连接', async () => {
      const connectPromise = connector.connect();
      mockWs.triggerOpen();

      await expect(connectPromise).resolves.toBeUndefined();
      expect(connector.isConnected).toBe(true);
    });

    it('应该在连接失败时抛出错误', async () => {
      const connectPromise = connector.connect();
      mockWs.triggerError();

      await expect(connectPromise).rejects.toThrow(ConnectionError);
      expect(connector.isConnected).toBe(false);
    });

    it('应该防止重复连接', async () => {
      const connectPromise = connector.connect();
      mockWs.triggerOpen();
      await connectPromise;

      // 再次调用 connect 应该立即返回
      await expect(connector.connect()).resolves.toBeUndefined();
    });

    it('应该在正在连接时抛出错误', async () => {
      connector.connect(); // 不等待

      await expect(connector.connect()).rejects.toThrow('Connection already in progress');
    });
  });

  describe('disconnect', () => {
    it('应该断开连接', async () => {
      const connectPromise = connector.connect();
      mockWs.triggerOpen();
      await connectPromise;

      connector.disconnect();

      expect(connector.isConnected).toBe(false);
      expect(mockWs.close).toHaveBeenCalled();
    });

    it('应该清理待处理请求', async () => {
      const connectPromise = connector.connect();
      mockWs.triggerOpen();
      await connectPromise;

      // 发起一个请求但不响应
      const requestPromise = connector.request({
        service: 'test',
        method: 'slow',
        payload: {},
        timeout: 10000,
      }).catch((e) => e); // 捕获错误防止未处理的 rejection

      // 立即断开
      connector.disconnect();

      const error = await requestPromise;
      expect(error).toBeInstanceOf(ConnectionError);
    });
  });

  describe('request', () => {
    beforeEach(async () => {
      const connectPromise = connector.connect();
      mockWs.triggerOpen();
      await connectPromise;
    });

    it('应该发送请求并接收响应', async () => {
      const requestPromise = connector.request({
        service: 'test',
        method: 'echo',
        payload: { message: 'hello' },
      });

      // 获取发送的消息
      expect(mockWs.send).toHaveBeenCalled();
      const sentData = mockWs.send.mock.calls[0][0] as string;
      const sentMessage = JSON.parse(sentData.replace('\n', ''));

      // 模拟响应
      mockWs.triggerMessage(
        JSON.stringify({
          request_id: sentMessage.id,
          success: true,
          data: { result: 'hello' },
          timestamp: new Date().toISOString(),
        })
      );

      const response = await requestPromise;
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ result: 'hello' });
    });

    it('应该处理错误响应', async () => {
      const requestPromise = connector.request({
        service: 'test',
        method: 'fail',
        payload: {},
      });

      const sentData = mockWs.send.mock.calls[0][0] as string;
      const sentMessage = JSON.parse(sentData.replace('\n', ''));

      mockWs.triggerMessage(
        JSON.stringify({
          request_id: sentMessage.id,
          success: false,
          error: 'Something went wrong',
          timestamp: new Date().toISOString(),
        })
      );

      const response = await requestPromise;
      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });

    it('应该在超时时抛出错误', async () => {
      const requestPromise = connector.request({
        service: 'test',
        method: 'slow',
        payload: {},
        timeout: 50,
      });

      await expect(requestPromise).rejects.toThrow(TimeoutError);
    });

    it('应该在未连接时抛出错误', async () => {
      connector.disconnect();

      await expect(
        connector.request({
          service: 'test',
          method: 'echo',
          payload: {},
        })
      ).rejects.toThrow(ConnectionError);
    });

    it('应该正确格式化请求', async () => {
      const requestPromise = connector.request({
        service: 'file',
        method: 'read',
        payload: { path: '/test/file.card' },
      });

      const sentData = mockWs.send.mock.calls[0][0] as string;
      const sentMessage = JSON.parse(sentData.replace('\n', ''));

      expect(sentMessage.message_type).toBe('Route');
      expect(sentMessage.payload.action).toBe('file.read');
      expect(sentMessage.payload.params).toEqual({ path: '/test/file.card' });
      expect(sentMessage.payload.sender).toMatch(/^sdk-/);

      mockWs.triggerMessage(
        JSON.stringify({
          request_id: sentMessage.id,
          success: true,
          data: { ok: true },
          timestamp: new Date().toISOString(),
        })
      );

      await expect(requestPromise).resolves.toMatchObject({ success: true });
    });
  });

  describe('事件订阅', () => {
    beforeEach(async () => {
      const connectPromise = connector.connect();
      mockWs.triggerOpen();
      await connectPromise;
    });

    it('应该订阅事件', () => {
      const handler = vi.fn();
      connector.on('test:event', handler);

      // 检查是否发送了订阅请求
      const calls = mockWs.send.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      const message = JSON.parse(lastCall.replace('\n', ''));

      expect(message.message_type).toBe('Subscribe');
      expect(message.payload.event_type).toBe('test:event');
    });

    it('应该接收事件', () => {
      const handler = vi.fn();
      connector.on('test:event', handler);

      // 模拟事件推送
      mockWs.triggerMessage(
        JSON.stringify({
          type: 'event',
          event_type: 'test:event',
          data: { value: 123 },
        })
      );

      expect(handler).toHaveBeenCalledWith({ value: 123 });
    });

    it('应该取消订阅', () => {
      const handler = vi.fn();
      connector.on('test:event', handler);
      connector.off('test:event', handler);

      // 模拟事件推送
      mockWs.triggerMessage(
        JSON.stringify({
          type: 'event',
          event_type: 'test:event',
          data: { value: 123 },
        })
      );

      expect(handler).not.toHaveBeenCalled();
    });

    it('应该支持通配符订阅', () => {
      const handler = vi.fn();
      connector.on('*', handler);

      mockWs.triggerMessage(
        JSON.stringify({
          type: 'event',
          event_type: 'any:event',
          data: { value: 456 },
        })
      );

      // 通配符接收包含 event_type 和 data 的对象
      expect(handler).toHaveBeenCalledWith({
        event_type: 'any:event',
        data: { value: 456 },
      });
    });

    it('应该支持一次性订阅', () => {
      const handler = vi.fn();
      connector.once('test:event', handler);

      // 第一次事件
      mockWs.triggerMessage(
        JSON.stringify({
          type: 'event',
          event_type: 'test:event',
          data: { count: 1 },
        })
      );

      // 第二次事件
      mockWs.triggerMessage(
        JSON.stringify({
          type: 'event',
          event_type: 'test:event',
          data: { count: 2 },
        })
      );

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ count: 1 });
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      const connectPromise = connector.connect();
      mockWs.triggerOpen();
      await connectPromise;
    });

    it('应该发布事件', () => {
      connector.publish('custom:event', { message: 'hello' });

      const calls = mockWs.send.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      const message = JSON.parse(lastCall.replace('\n', ''));

      expect(message.message_type).toBe('Publish');
      expect(message.payload.event_type).toBe('custom:event');
      expect(message.payload.data).toEqual({ message: 'hello' });
    });

    it('应该在未连接时抛出错误', () => {
      connector.disconnect();

      expect(() => {
        connector.publish('test:event', {});
      }).toThrow(ConnectionError);
    });
  });

  describe('属性', () => {
    it('应该返回正确的 pendingCount', async () => {
      const connectPromise = connector.connect();
      mockWs.triggerOpen();
      await connectPromise;

      expect(connector.pendingCount).toBe(0);

      // 发起请求但捕获错误
      const requestPromise = connector.request({
        service: 'test',
        method: 'slow',
        payload: {},
        timeout: 10000,
      }).catch(() => {}); // 防止未处理的 rejection

      expect(connector.pendingCount).toBe(1);

      // 清理
      connector.disconnect();
      await requestPromise;
    });
  });

  describe('NDJSON 处理', () => {
    beforeEach(async () => {
      const connectPromise = connector.connect();
      mockWs.triggerOpen();
      await connectPromise;
    });

    it('应该处理多行消息', async () => {
      const request1 = connector.request({
        service: 'test',
        method: 'one',
        payload: {},
      });
      const request2 = connector.request({
        service: 'test',
        method: 'two',
        payload: {},
      });

      const sent1 = JSON.parse((mockWs.send.mock.calls[0][0] as string).replace('\n', ''));
      const sent2 = JSON.parse((mockWs.send.mock.calls[1][0] as string).replace('\n', ''));

      // 模拟一次性返回两个响应（NDJSON）
      const response1 = JSON.stringify({
        request_id: sent1.id,
        success: true,
        data: { result: 1 },
        timestamp: new Date().toISOString(),
      });
      const response2 = JSON.stringify({
        request_id: sent2.id,
        success: true,
        data: { result: 2 },
        timestamp: new Date().toISOString(),
      });

      mockWs.triggerMessage(`${response1}\n${response2}`);

      const [result1, result2] = await Promise.all([request1, request2]);
      expect(result1.data).toEqual({ result: 1 });
      expect(result2.data).toEqual({ result: 2 });
    });
  });
});
