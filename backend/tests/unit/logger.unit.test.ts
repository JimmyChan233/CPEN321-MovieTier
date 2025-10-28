/**
 * Logger Utility Tests
 * Unit tests for custom logger utility
 */

import { logger } from '../../src/utils/logger';

describe('Logger Utility', () => {
  let consoleLogSpy: jest.SpyInstance;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe('info', () => {
    it('should log info message', () => {
      logger.info('Test info message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('INFO');
      expect(call).toContain('Test info message');
    });

    it('should log info message with arguments', () => {
      logger.info('User logged in', { userId: '123', email: 'test@example.com' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('INFO');
      expect(call).toContain('User logged in');
      expect(call).toContain('userId');
      expect(call).toContain('123');
    });

    it('should handle multiple arguments', () => {
      logger.info('Multiple args', 'arg1', 123, true);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('arg1');
      expect(call).toContain('123');
      expect(call).toContain('true');
    });
  });

  describe('success', () => {
    it('should log success message', () => {
      logger.success('Operation completed');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('SUCCESS');
      expect(call).toContain('Operation completed');
    });

    it('should log success with object data', () => {
      logger.success('Movie ranked', { movieId: 550, rank: 1 });

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('SUCCESS');
      expect(call).toContain('Movie ranked');
      expect(call).toContain('movieId');
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('API rate limit approaching');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('WARN');
      expect(call).toContain('API rate limit approaching');
    });

    it('should log warning with details', () => {
      logger.warn('Slow query detected', { duration: 5000, query: 'complex query' });

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('WARN');
      expect(call).toContain('Slow query detected');
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      logger.error('Database connection failed');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('ERROR');
      expect(call).toContain('Database connection failed');
    });

    it('should log error with error object', () => {
      const error = new Error('Something went wrong');
      logger.error('Unexpected error', { error: error.message, stack: 'stack trace' });

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('ERROR');
      expect(call).toContain('Unexpected error');
      expect(call).toContain('Something went wrong');
    });
  });

  describe('debug', () => {
    it('should log debug message in development mode', () => {
      process.env.NODE_ENV = 'development';

      logger.debug('Debug information');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('DEBUG');
      expect(call).toContain('Debug information');
    });

    it('should NOT log debug message in production mode', () => {
      process.env.NODE_ENV = 'production';

      logger.debug('Debug information');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should NOT log debug message when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';

      logger.debug('Debug information');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug with detailed data in development', () => {
      process.env.NODE_ENV = 'development';

      logger.debug('State dump', {
        user: { id: 1, name: 'Test' },
        session: { active: true }
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('DEBUG');
      expect(call).toContain('State dump');
    });
  });

  describe('http', () => {
    it('should log HTTP request with all parameters', () => {
      logger.http('GET', '/api/movies', 200, 45);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('GET');
      expect(call).toContain('/api/movies');
      expect(call).toContain('200');
      expect(call).toContain('45ms');
    });

    it('should log HTTP request without status code', () => {
      logger.http('POST', '/api/auth/signin');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('POST');
      expect(call).toContain('/api/auth/signin');
    });

    it('should log HTTP request without duration', () => {
      logger.http('DELETE', '/api/friends/123', 204);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('DELETE');
      expect(call).toContain('/api/friends/123');
      expect(call).toContain('204');
    });

    it('should handle successful status codes (200-399)', () => {
      logger.http('GET', '/api/users', 200, 10);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('200');
    });

    it('should handle error status codes (400+)', () => {
      logger.http('POST', '/api/movies', 404, 20);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('404');
    });

    it('should handle server error status codes (500+)', () => {
      logger.http('GET', '/api/recommendations', 500, 100);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('500');
      expect(call).toContain('100ms');
    });

    it('should handle various HTTP methods', () => {
      logger.http('PUT', '/api/profile', 200);
      logger.http('PATCH', '/api/movies/123', 200);
      logger.http('HEAD', '/api/health', 200);

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy.mock.calls[0][0]).toContain('PUT');
      expect(consoleLogSpy.mock.calls[1][0]).toContain('PATCH');
      expect(consoleLogSpy.mock.calls[2][0]).toContain('HEAD');
    });
  });

  describe('Timestamp formatting', () => {
    it('should include ISO timestamp in all log messages', () => {
      logger.info('Test message');

      const call = consoleLogSpy.mock.calls[0][0];
      // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });
  });

  describe('Argument formatting', () => {
    it('should format string arguments', () => {
      logger.info('Message', 'string arg');

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('string arg');
    });

    it('should format number arguments', () => {
      logger.info('Message', 42, 3.14);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('42');
      expect(call).toContain('3.14');
    });

    it('should format boolean arguments', () => {
      logger.info('Message', true, false);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('true');
      expect(call).toContain('false');
    });

    it('should format object arguments as JSON', () => {
      logger.info('Message', { key: 'value', nested: { data: 123 } });

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('"key"');
      expect(call).toContain('"value"');
      expect(call).toContain('"nested"');
    });

    it('should format array arguments', () => {
      logger.info('Message', [1, 2, 3]);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('[');
      expect(call).toContain('1');
      expect(call).toContain('2');
      expect(call).toContain('3');
    });

    it('should handle null and undefined arguments', () => {
      logger.info('Message', null, undefined);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('null');
      expect(call).toContain('undefined');
    });

    it('should handle empty object', () => {
      logger.info('Message', {});

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('{}');
    });

    it('should handle empty array', () => {
      logger.info('Message', []);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('[]');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle rapid sequential log calls', () => {
      logger.info('Message 1');
      logger.success('Message 2');
      logger.warn('Message 3');
      logger.error('Message 4');

      expect(consoleLogSpy).toHaveBeenCalledTimes(4);
    });

    it('should handle complex nested objects', () => {
      const complexObject = {
        user: {
          id: 123,
          profile: {
            name: 'Test User',
            preferences: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        timestamp: new Date().toISOString()
      };

      logger.info('Complex data', complexObject);

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('Complex data');
      expect(call).toContain('user');
      expect(call).toContain('profile');
    });
  });
});
