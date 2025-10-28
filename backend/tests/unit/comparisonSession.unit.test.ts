/**
 * Comparison Session Utility Tests
 * Unit tests for comparison session management
 */

import {
  startSession,
  getSession,
  updateSession,
  endSession
} from '../../src/utils/comparisonSession';

describe('Comparison Session Utility', () => {
  const userId = 'user-123';
  const movie = {
    movieId: 550,
    title: 'Fight Club',
    posterPath: '/poster.jpg'
  };

  afterEach(() => {
    // Clean up any existing sessions
    endSession(userId);
    endSession('user-456');
  });

  describe('startSession', () => {
    it('should create a new session with correct initial values', () => {
      startSession(userId, movie, 10);

      const session = getSession(userId);
      expect(session).toBeDefined();
      expect(session?.newMovie.movieId).toBe(550);
      expect(session?.newMovie.title).toBe('Fight Club');
      expect(session?.newMovie.posterPath).toBe('/poster.jpg');
      expect(session?.low).toBe(0);
      expect(session?.high).toBe(10);
    });

    it('should overwrite existing session for same user', () => {
      startSession(userId, movie, 10);

      const newMovie = {
        movieId: 680,
        title: 'Pulp Fiction'
      };
      startSession(userId, newMovie, 20);

      const session = getSession(userId);
      expect(session?.newMovie.movieId).toBe(680);
      expect(session?.high).toBe(20);
    });

    it('should handle movie without posterPath', () => {
      const movieNoPoster = {
        movieId: 155,
        title: 'The Dark Knight'
      };

      startSession(userId, movieNoPoster, 5);

      const session = getSession(userId);
      expect(session?.newMovie.posterPath).toBeUndefined();
    });
  });

  describe('getSession', () => {
    it('should return session for existing user', () => {
      startSession(userId, movie, 10);

      const session = getSession(userId);
      expect(session).toBeDefined();
    });

    it('should return undefined for non-existent user', () => {
      const session = getSession('non-existent-user');
      expect(session).toBeUndefined();
    });
  });

  describe('updateSession', () => {
    beforeEach(() => {
      startSession(userId, movie, 10);
    });

    it('should update session low and high values', () => {
      updateSession(userId, 3, 7);

      const session = getSession(userId);
      expect(session?.low).toBe(3);
      expect(session?.high).toBe(7);
    });

    it('should not affect newMovie when updating', () => {
      updateSession(userId, 5, 8);

      const session = getSession(userId);
      expect(session?.newMovie.movieId).toBe(550);
      expect(session?.newMovie.title).toBe('Fight Club');
    });

    it('should handle updating to same values', () => {
      updateSession(userId, 0, 10);

      const session = getSession(userId);
      expect(session?.low).toBe(0);
      expect(session?.high).toBe(10);
    });

    it('should handle non-existent session gracefully', () => {
      // Should not throw error
      expect(() => {
        updateSession('non-existent-user', 5, 10);
      }).not.toThrow();

      // Session should still not exist
      const session = getSession('non-existent-user');
      expect(session).toBeUndefined();
    });

    it('should return early when session does not exist', () => {
      const nonExistentUserId = 'user-does-not-exist';

      // This should hit the early return
      updateSession(nonExistentUserId, 5, 10);

      // Session should not be created
      const session = getSession(nonExistentUserId);
      expect(session).toBeUndefined();
    });
  });

  describe('endSession', () => {
    it('should delete existing session', () => {
      startSession(userId, movie, 10);
      expect(getSession(userId)).toBeDefined();

      endSession(userId);
      expect(getSession(userId)).toBeUndefined();
    });

    it('should handle deleting non-existent session gracefully', () => {
      expect(() => {
        endSession('non-existent-user');
      }).not.toThrow();
    });

    it('should only delete specified user session', () => {
      const userId2 = 'user-456';

      startSession(userId, movie, 10);
      startSession(userId2, movie, 20);

      endSession(userId);

      expect(getSession(userId)).toBeUndefined();
      expect(getSession(userId2)).toBeDefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete comparison workflow', () => {
      // Start session
      startSession(userId, movie, 10);
      let session = getSession(userId);
      expect(session?.low).toBe(0);
      expect(session?.high).toBe(10);

      // Update session multiple times (binary search simulation)
      updateSession(userId, 6, 10);
      session = getSession(userId);
      expect(session?.low).toBe(6);

      updateSession(userId, 6, 8);
      session = getSession(userId);
      expect(session?.high).toBe(8);

      updateSession(userId, 7, 8);
      session = getSession(userId);
      expect(session?.low).toBe(7);
      expect(session?.high).toBe(8);

      // End session
      endSession(userId);
      expect(getSession(userId)).toBeUndefined();
    });

    it('should handle multiple concurrent users', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const user3 = 'user-3';

      const movie1 = { movieId: 1, title: 'Movie 1' };
      const movie2 = { movieId: 2, title: 'Movie 2' };
      const movie3 = { movieId: 3, title: 'Movie 3' };

      startSession(user1, movie1, 5);
      startSession(user2, movie2, 10);
      startSession(user3, movie3, 15);

      expect(getSession(user1)?.newMovie.movieId).toBe(1);
      expect(getSession(user2)?.newMovie.movieId).toBe(2);
      expect(getSession(user3)?.newMovie.movieId).toBe(3);

      updateSession(user1, 2, 3);
      updateSession(user2, 7, 9);

      expect(getSession(user1)?.low).toBe(2);
      expect(getSession(user2)?.low).toBe(7);
      expect(getSession(user3)?.low).toBe(0); // Not updated

      endSession(user2);

      expect(getSession(user1)).toBeDefined();
      expect(getSession(user2)).toBeUndefined();
      expect(getSession(user3)).toBeDefined();
    });
  });
});
