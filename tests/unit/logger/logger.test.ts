/**
 * Logger 单元测试
 * @module tests/unit/logger/logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../../src/logger/logger';
import { LogEntry, LogTransport } from '../../../src/logger/types';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    // 禁用控制台输出以保持测试输出整洁
    logger = new Logger('TestModule', { enableConsole: false });
  });

  afterEach(() => {
    logger.clearHistory();
  });

  describe('日志级别过滤', () => {
    it('应该默认使用 info 级别', () => {
      expect(logger.getLevel()).toBe('info');
    });

    it('应该能够设置日志级别', () => {
      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');
    });

    it('当级别为 info 时，debug 日志不应被记录', () => {
      logger.setLevel('info');
      logger.debug('debug message');
      
      const history = logger.getHistory();
      expect(history.length).toBe(0);
    });

    it('当级别为 info 时，info 日志应被记录', () => {
      logger.setLevel('info');
      logger.info('info message');
      
      const history = logger.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].level).toBe('info');
    });

    it('当级别为 debug 时，所有日志都应被记录', () => {
      logger.setLevel('debug');
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      
      const history = logger.getHistory();
      expect(history.length).toBe(4);
    });

    it('当级别为 error 时，只有 error 日志被记录', () => {
      logger.setLevel('error');
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      
      const history = logger.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].level).toBe('error');
    });

    it('当级别为 warn 时，warn 和 error 日志应被记录', () => {
      logger.setLevel('warn');
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      
      const history = logger.getHistory();
      expect(history.length).toBe(2);
      expect(history.map(e => e.level)).toEqual(['warn', 'error']);
    });
  });

  describe('日志历史记录', () => {
    it('应该记录日志到历史', () => {
      logger.info('test message', { key: 'value' });
      
      const history = logger.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].message).toBe('test message');
      expect(history[0].data).toEqual({ key: 'value' });
      expect(history[0].module).toBe('TestModule');
      expect(history[0].timestamp).toBeDefined();
    });

    it('应该能够按级别过滤历史', () => {
      logger.setLevel('debug');
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      
      const infoHistory = logger.getHistory('info');
      expect(infoHistory.length).toBe(1);
      expect(infoHistory[0].level).toBe('info');
      
      const errorHistory = logger.getHistory('error');
      expect(errorHistory.length).toBe(1);
      expect(errorHistory[0].level).toBe('error');
    });

    it('应该能够限制历史数量', () => {
      logger.setLevel('debug');
      for (let i = 0; i < 10; i++) {
        logger.info(`message ${i}`);
      }
      
      const limitedHistory = logger.getHistory(undefined, 5);
      expect(limitedHistory.length).toBe(5);
      // 应该返回最后 5 条
      expect(limitedHistory[0].message).toBe('message 5');
      expect(limitedHistory[4].message).toBe('message 9');
    });

    it('应该能够清空历史', () => {
      logger.info('message 1');
      logger.info('message 2');
      expect(logger.getHistory().length).toBe(2);
      
      logger.clearHistory();
      expect(logger.getHistory().length).toBe(0);
    });

    it('历史记录应遵守 maxHistory 限制', () => {
      const smallLogger = new Logger('Test', { 
        enableConsole: false, 
        maxHistory: 5 
      });
      
      for (let i = 0; i < 10; i++) {
        smallLogger.info(`message ${i}`);
      }
      
      const history = smallLogger.getHistory();
      expect(history.length).toBe(5);
      // 应该只保留最后 5 条
      expect(history[0].message).toBe('message 5');
    });

    it('getHistory 应返回副本而不是原数组引用', () => {
      logger.info('test');
      const history1 = logger.getHistory();
      const history2 = logger.getHistory();
      
      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe('子 Logger 创建', () => {
    it('应该能够创建子 Logger', () => {
      const child = logger.createChild('SubModule');
      
      expect(child.module).toBe('TestModule:SubModule');
    });

    it('子 Logger 应继承父级选项', () => {
      logger.setLevel('debug');
      const child = logger.createChild('SubModule');
      
      expect(child.getLevel()).toBe('debug');
    });

    it('子 Logger 应共享处理器', () => {
      const handler = vi.fn();
      logger.addHandler(handler);
      
      const child = logger.createChild('SubModule');
      child.info('child message');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'TestModule:SubModule',
          message: 'child message',
        })
      );
    });

    it('子 Logger 应共享传输器', () => {
      const transport: LogTransport = {
        name: 'test-transport',
        log: vi.fn(),
      };
      logger.addTransport(transport);
      
      const child = logger.createChild('SubModule');
      child.info('child message');
      
      expect(transport.log).toHaveBeenCalledTimes(1);
    });

    it('多级嵌套子 Logger 应正确拼接模块名', () => {
      const child1 = logger.createChild('Level1');
      const child2 = child1.createChild('Level2');
      
      expect(child2.module).toBe('TestModule:Level1:Level2');
    });
  });

  describe('处理器和传输器', () => {
    it('应该能够添加处理器', () => {
      const handler = vi.fn();
      logger.addHandler(handler);
      logger.info('test message');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: 'test message',
        })
      );
    });

    it('应该能够移除处理器', () => {
      const handler = vi.fn();
      logger.addHandler(handler);
      logger.info('message 1');
      
      logger.removeHandler(handler);
      logger.info('message 2');
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('处理器错误不应影响其他处理器', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorHandler = vi.fn(() => {
        throw new Error('handler error');
      });
      const normalHandler = vi.fn();
      
      logger.addHandler(errorHandler);
      logger.addHandler(normalHandler);
      logger.info('test');
      
      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });

    it('应该能够添加传输器', () => {
      const transport: LogTransport = {
        name: 'test-transport',
        log: vi.fn(),
      };
      
      logger.addTransport(transport);
      logger.info('test message');
      
      expect(transport.log).toHaveBeenCalledTimes(1);
      expect(transport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: 'test message',
        })
      );
    });

    it('应该能够移除传输器', () => {
      const transport: LogTransport = {
        name: 'test-transport',
        log: vi.fn(),
      };
      
      logger.addTransport(transport);
      logger.info('message 1');
      
      logger.removeTransport('test-transport');
      logger.info('message 2');
      
      expect(transport.log).toHaveBeenCalledTimes(1);
    });

    it('传输器错误不应影响其他传输器', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorTransport: LogTransport = {
        name: 'error-transport',
        log: vi.fn(() => {
          throw new Error('transport error');
        }),
      };
      const normalTransport: LogTransport = {
        name: 'normal-transport',
        log: vi.fn(),
      };
      
      logger.addTransport(errorTransport);
      logger.addTransport(normalTransport);
      logger.info('test');
      
      expect(errorTransport.log).toHaveBeenCalled();
      expect(normalTransport.log).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });

    it('相同名称的传输器应被覆盖', () => {
      const transport1: LogTransport = {
        name: 'same-name',
        log: vi.fn(),
      };
      const transport2: LogTransport = {
        name: 'same-name',
        log: vi.fn(),
      };
      
      logger.addTransport(transport1);
      logger.addTransport(transport2);
      logger.info('test');
      
      expect(transport1.log).not.toHaveBeenCalled();
      expect(transport2.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('日志方法', () => {
    it('debug 方法应记录 debug 级别日志', () => {
      logger.setLevel('debug');
      logger.debug('debug message');
      
      const history = logger.getHistory();
      expect(history[0].level).toBe('debug');
    });

    it('info 方法应记录 info 级别日志', () => {
      logger.info('info message');
      
      const history = logger.getHistory();
      expect(history[0].level).toBe('info');
    });

    it('warn 方法应记录 warn 级别日志', () => {
      logger.warn('warn message');
      
      const history = logger.getHistory();
      expect(history[0].level).toBe('warn');
    });

    it('error 方法应记录 error 级别日志', () => {
      logger.error('error message');
      
      const history = logger.getHistory();
      expect(history[0].level).toBe('error');
    });

    it('日志方法应支持附加数据', () => {
      logger.info('test', { foo: 'bar', count: 42 });
      
      const history = logger.getHistory();
      expect(history[0].data).toEqual({ foo: 'bar', count: 42 });
    });

    it('日志条目应包含时间戳', () => {
      logger.info('test');
      
      const history = logger.getHistory();
      expect(history[0].timestamp).toBeDefined();
      // 验证 ISO 8601 格式
      expect(new Date(history[0].timestamp).toISOString()).toBe(history[0].timestamp);
    });
  });

  describe('控制台输出', () => {
    it('启用 enableConsole 时应输出到控制台', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const consoleLogger = new Logger('Test', { enableConsole: true });
      
      consoleLogger.info('test message');
      
      expect(infoSpy).toHaveBeenCalled();
      infoSpy.mockRestore();
    });

    it('禁用 enableConsole 时不应输出到控制台', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      
      logger.info('test message');
      
      expect(infoSpy).not.toHaveBeenCalled();
      infoSpy.mockRestore();
    });

    it('不同级别应调用对应的 console 方法', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const consoleLogger = new Logger('Test', { 
        enableConsole: true, 
        level: 'debug' 
      });
      
      consoleLogger.debug('debug');
      consoleLogger.info('info');
      consoleLogger.warn('warn');
      consoleLogger.error('error');
      
      expect(debugSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      
      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('构造函数选项', () => {
    it('应使用自定义前缀', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const customLogger = new Logger('Module', { 
        enableConsole: true, 
        prefix: 'CustomPrefix' 
      });
      
      customLogger.info('test');
      
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CustomPrefix]'),
        // 可能有 data 参数，也可能没有
      );
      
      infoSpy.mockRestore();
    });

    it('应使用自定义 maxHistory', () => {
      const customLogger = new Logger('Module', { 
        enableConsole: false, 
        maxHistory: 3 
      });
      
      for (let i = 0; i < 5; i++) {
        customLogger.info(`message ${i}`);
      }
      
      expect(customLogger.getHistory().length).toBe(3);
    });
  });
});
