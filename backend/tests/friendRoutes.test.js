const { __test__ } = require('../dist/routes/friendRoutes');

describe('Rate limiter', () => {
  beforeEach(() => {
    __test__.requestTimestamps.clear();
  });

  test('allows up to RATE_LIMIT_MAX within window', () => {
    const user = 'user1';
    let okCount = 0;
    for (let i = 0; i < __test__.RATE_LIMIT_MAX; i++) {
      if (__test__.checkRateLimit(user)) okCount++;
    }
    expect(okCount).toBe(__test__.RATE_LIMIT_MAX);
    // Next one should be blocked
    expect(__test__.checkRateLimit(user)).toBe(false);
  });

  test('resets after window passes', () => {
    jest.useFakeTimers();
    const user = 'user2';
    for (let i = 0; i < __test__.RATE_LIMIT_MAX; i++) {
      expect(__test__.checkRateLimit(user)).toBe(true);
    }
    expect(__test__.checkRateLimit(user)).toBe(false);
    jest.advanceTimersByTime(__test__.RATE_LIMIT_WINDOW_MS + 1);
    expect(__test__.checkRateLimit(user)).toBe(true);
    jest.useRealTimers();
  });
});

