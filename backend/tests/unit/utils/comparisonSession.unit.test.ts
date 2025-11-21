/**
 * @unit Unit tests for comparison session management
 */

/**
 * Comparison Session Utility Tests
 * Unit tests for comparison session management
 */

import {
  startSession,
  getSession,
  updateSession,
  endSession,
} from "../../../src/utils/comparisonSession";

describe("Comparison Session Utility", () => {
  const userId = "user-123";
  const movie = {
    movieId: 550,
    title: "Fight Club",
    posterPath: "/poster.jpg",
  };

  afterEach(() => {
    // Clean up any existing sessions
    endSession(userId);
    endSession("user-456");
  });

  describe("startSession", () => {
    it("should create a new session with provided movie and bounds", () => {
      startSession(userId, movie, 10);

      const session = getSession(userId);
      expect(session).toBeDefined();
      expect(session?.newMovie.movieId).toBe(movie.movieId);
      expect(session?.newMovie.title).toBe(movie.title);
      expect(session?.high).toBe(10);
    });

    it("should initialize low bound to 0", () => {
      startSession(userId, movie, 5);

      const session = getSession(userId);
      expect(session?.low).toBe(0);
    });

    it("should handle multiple concurrent sessions for different users", () => {
      const user1 = "user-1";
      const user2 = "user-2";
      const movie1 = { movieId: 1, title: "Movie 1", posterPath: "/1.jpg" };
      const movie2 = { movieId: 2, title: "Movie 2", posterPath: "/2.jpg" };

      startSession(user1, movie1, 10);
      startSession(user2, movie2, 15);

      const session1 = getSession(user1);
      const session2 = getSession(user2);

      expect(session1?.newMovie.movieId).toBe(1);
      expect(session2?.newMovie.movieId).toBe(2);
    });
  });

  describe("getSession", () => {
    it("should return undefined for non-existent session", () => {
      const session = getSession("non-existent-user");
      expect(session).toBeUndefined();
    });

    it("should return session after it has been started", () => {
      startSession(userId, movie, 10);

      const session = getSession(userId);
      expect(session).toBeDefined();
      expect(session?.newMovie.movieId).toBe(movie.movieId);
    });

    it("should return session with correct bounds", () => {
      startSession(userId, movie, 8);

      const session = getSession(userId);
      expect(session).toEqual(
        expect.objectContaining({
          newMovie: expect.objectContaining({
            movieId: movie.movieId,
            title: movie.title,
          }),
          low: 0,
          high: 8,
        }),
      );
    });
  });

  describe("updateSession", () => {
    beforeEach(() => {
      startSession(userId, movie, 10);
    });

    it("should update session bounds when session exists", () => {
      updateSession(userId, 3, 7);

      const session = getSession(userId);
      expect(session?.low).toBe(3);
      expect(session?.high).toBe(7);
    });

    it("should return early when session does not exist", () => {
      const nonExistentUserId = "user-does-not-exist";

      // This should hit the early return
      updateSession(nonExistentUserId, 5, 10);

      // Session should not be created
      const session = getSession(nonExistentUserId);
      expect(session).toBeUndefined();
    });

    it("should preserve movie data when updating bounds", () => {
      updateSession(userId, 2, 5);

      const session = getSession(userId);
      expect(session?.newMovie.movieId).toBe(movie.movieId);
      expect(session?.newMovie.title).toBe(movie.title);
    });
  });

  describe("endSession", () => {
    it("should remove existing session", () => {
      startSession(userId, movie, 10);
      expect(getSession(userId)).toBeDefined();

      endSession(userId);
      expect(getSession(userId)).toBeUndefined();
    });

    it("should handle ending non-existent session gracefully", () => {
      // Should not throw error
      expect(() => {
        endSession("non-existent-user");
      }).not.toThrow();
    });

    it("should only affect the specified user's session", () => {
      const user1 = "user-1";
      const user2 = "user-2";
      const movie1 = { movieId: 1, title: "Movie 1", posterPath: "/1.jpg" };
      const movie2 = { movieId: 2, title: "Movie 2", posterPath: "/2.jpg" };

      startSession(user1, movie1, 10);
      startSession(user2, movie2, 10);

      endSession(user1);

      expect(getSession(user1)).toBeUndefined();
      expect(getSession(user2)).toBeDefined();
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete session lifecycle", () => {
      // Start session
      startSession(userId, movie, 10);
      let session = getSession(userId);
      expect(session).toBeDefined();

      // Update session
      updateSession(userId, 3, 5);
      session = getSession(userId);
      expect(session?.low).toBe(3);
      expect(session?.high).toBe(5);

      // End session
      endSession(userId);
      session = getSession(userId);
      expect(session).toBeUndefined();
    });

    it("should handle session replacement", () => {
      const firstMovie = { movieId: 1, title: "First", posterPath: "/1.jpg" };
      const secondMovie = { movieId: 2, title: "Second", posterPath: "/2.jpg" };

      startSession(userId, firstMovie, 10);
      expect(getSession(userId)?.newMovie.movieId).toBe(1);

      // Start new session (should replace old one)
      startSession(userId, secondMovie, 15);
      const session = getSession(userId);
      expect(session?.newMovie.movieId).toBe(2);
      expect(session?.high).toBe(15);
    });
  });
});
