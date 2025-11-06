/**
 * Movie Comparison Controller Tests - Mocked
 * Tests for interactive movie ranking with binary search comparison
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import FeedActivity from '../../src/models/feed/FeedActivity';
import WatchlistItem from '../../src/models/watch/WatchlistItem';
import { Friendship } from '../../src/models/friend/Friend';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';
import {
  startSession,
  getSession,
  updateSession,
  endSession,
} from '../../src/utils/comparisonSession';

// Mock TMDB client
const mockTmdbGet = jest.fn();
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet
  })
}));

// Mock SSE service
jest.mock('../../src/services/sse/sseService', () => ({
  sseService: {
    send: jest.fn()
  }
}));

import { sseService } from '../../src/services/sse/sseService';

// Mock notification service
jest.mock('../../src/services/notification.service', () => ({
  __esModule: true,
  default: {
    sendFeedNotification: jest.fn()
  }
}));

import notificationService from '../../src/services/notification.service';

describe('Movie Comparison Controller - Mocked Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/movies', movieRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RankedMovie.deleteMany({});
    await FeedActivity.deleteMany({});
    await WatchlistItem.deleteMany({});
    await Friendship.deleteMany({});

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());

    jest.clearAllMocks();
    mockTmdbGet.mockResolvedValue({
      data: {
        overview: 'TMDB overview',
        poster_path: '/tmdb_poster.jpg'
      }
    });
  });

  // ==================== POST /add Tests ====================

  describe('POST /add', () => {
    it('should return 401 when userId is missing from token', async () => {
      // Create a malformed token without userId
      const malformedToken = generateTestJWT('');

      const res = await request(app)
        .post('/api/movies/add')
        .set('Authorization', `Bearer ${malformedToken}`)
        .send({
          movieId: 550,
          title: 'Fight Club',
          posterPath: '/poster.jpg',
          overview: 'A ticking-time-bomb insomniac...'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User ID not found');
    });

    it('should return 400 when movieId is missing', async () => {
      const res = await request(app)
        .post('/api/movies/add')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Fight Club'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('movieId and title are required');
    });


    describe('Case 1: First movie (empty ranking)', () => {








      it('should handle TMDB returning null poster_path and overview', async () => {
        mockTmdbGet.mockReset();
        mockTmdbGet.mockResolvedValueOnce({
          data: {
            overview: null,
            poster_path: null
          }
        });

        const res = await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club'
          });

        expect(res.status).toBe(200);

        const activity = await FeedActivity.findOne({ movieId: 550 });
        expect(activity?.posterPath).toBeUndefined();
        expect(activity?.overview).toBeUndefined();
      });


      it('should handle FCM notification failure gracefully', async () => {
        const friend = await User.create({
          googleId: 'friend123',
          email: 'friend@example.com',
          name: 'Test Friend',
          displayName: 'Test Friend',
          fcmToken: 'test_fcm_token_123'
        });

        await Friendship.create({
          userId: (user as any)._id.toString(),
          friendId: (friend as any)._id
        });

        (notificationService.sendFeedNotification as jest.Mock).mockRejectedValueOnce(new Error('FCM error'));

        const res = await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club',
            posterPath: '/poster.jpg'
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('Case 2: Duplicate movie', () => {

      it('should remove from watchlist even when rejecting duplicate', async () => {
        await RankedMovie.create({
          userId: (user as any)._id,
          movieId: 550,
          title: 'Fight Club',
          rank: 1
        });

        await WatchlistItem.create({
          userId: (user as any)._id,
          movieId: 550,
          title: 'Fight Club'
        });

        await request(app)
          .post('/api/movies/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieId: 550,
            title: 'Fight Club'
          });

        const watchlistItem = await WatchlistItem.findOne({ movieId: 550 });
        expect(watchlistItem).toBeNull();
      });
    });

    describe('Case 3: Begin comparison', () => {


    });

    describe('Error handling', () => {

    });
  });

  // ==================== POST /compare Tests ====================

  describe('POST /compare', () => {
    beforeEach(async () => {
      // Create some ranked movies for comparison tests
      for (let i = 1; i <= 5; i++) {
        await RankedMovie.create({
          userId: (user as any)._id,
          movieId: i * 100,
          title: `Movie ${i}`,
          posterPath: `/poster${i}.jpg`,
          rank: i
        });
      }
    });

    it('should return 401 when userId is missing from token in compareMovies', async () => {
      // Create a malformed token without userId
      const malformedToken = generateTestJWT('');

      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${malformedToken}`)
        .send({
          preferredMovieId: 999
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication required');
    });

    it('should return 400 when preferredMovieId is missing', async () => {
      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 300
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('preferredMovieId is required');
    });

    it('should return error when no active session', async () => {
      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 300,
          preferredMovieId: 999
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No active comparison session');
    });




    it('should insert movie at correct position (prefer existing)', async () => {
      // Start session
      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 4);

      // Always prefer existing movies to push new movie to bottom
      let res;
      let count = 0;
      do {
        res = await request(app)
          .post('/api/movies/compare')
          .set('Authorization', `Bearer ${token}`)
          .send({
            comparedMovieId: res?.body?.data?.compareWith?.movieId || 300,
            preferredMovieId: res?.body?.data?.compareWith?.movieId || 300 // Always prefer existing
          });
        count++;
      } while (res.body.status === 'compare' && count < 10);

      expect(res.body.status).toBe('added');
      expect(res.body.data.rank).toBe(6); // Should be last (after 5 existing movies)
    });



    it('should create feed activity when finalizing', async () => {
      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 0);

      await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      const activity = await FeedActivity.findOne({
        userId: (user as any)._id.toString(),
        movieId: 999
      });

      expect(activity).toBeDefined();
      expect(activity?.activityType).toBe('ranked_movie');
      expect(activity?.movieTitle).toBe('New Movie');
    });


    it('should send FCM notification when finalizing', async () => {
      const friend = await User.create({
        googleId: 'friend123',
        email: 'friend@example.com',
        name: 'Test Friend',
        displayName: 'Test Friend',
        fcmToken: 'test_fcm_token_123'
      });

      await Friendship.create({
        userId: (user as any)._id.toString(),
        friendId: (friend as any)._id
      });

      (notificationService.sendFeedNotification as jest.Mock).mockResolvedValueOnce(undefined);

      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 0);

      await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      expect(notificationService.sendFeedNotification).toHaveBeenCalledWith(
        'test_fcm_token_123',
        mockUsers.validUser.name,
        'New Movie',
        expect.any(String)
      );
    });


    it('should handle FCM notification failure when finalizing', async () => {
      const friend = await User.create({
        googleId: 'friend123',
        email: 'friend@example.com',
        name: 'Test Friend',
        displayName: 'Test Friend',
        fcmToken: 'test_fcm_token_123'
      });

      await Friendship.create({
        userId: (user as any)._id.toString(),
        friendId: (friend as any)._id
      });

      (notificationService.sendFeedNotification as jest.Mock).mockRejectedValueOnce(new Error('FCM error'));

      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie',
        posterPath: '/new.jpg'
      }, 0);

      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });


    // Uncovered line: 332 - Unable to find next comparison movie


    it('should handle TMDB returning null poster_path and overview when finalizing', async () => {
      mockTmdbGet.mockReset();
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          overview: null,
          poster_path: null
        }
      });

      startSession((user as any)._id.toString(), {
        movieId: 999,
        title: 'New Movie'
      }, 0);

      const res = await request(app)
        .post('/api/movies/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          comparedMovieId: 100,
          preferredMovieId: 999
        });

      expect(res.status).toBe(200);

      const activity = await FeedActivity.findOne({ movieId: 999 });
      expect(activity?.posterPath).toBeUndefined();
      expect(activity?.overview).toBeUndefined();
    });

  });

  describe('Mocked: POST /add error handling', () => {
    // Uncovered line: 36 - Unauthorized check in addMovie

    // Uncovered line: 23, 26 - watchlist removal error handling
    it('should handle watchlist removal errors gracefully', async () => {
      jest.spyOn(WatchlistItem, 'deleteOne').mockRejectedValueOnce(new Error('DB connection error'));

      const res = await request(app)
        .post('/api/movies/add')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 456,
          title: 'New Movie',
          posterPath: '/new.jpg'
        });

      // Should succeed even if watchlist removal fails
      expect(res.status).toStrictEqual(200);
      expect(res.body.success).toBe(true);
    });

    // Uncovered line: 163 - Unable to find comparison movie on initial add
    it('should handle case when no comparison movie found on initial add', async () => {
      // Setup: create a ranked movie that gets deleted before comparison
      jest.spyOn(RankedMovie, 'find').mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/movies/add')
        .set('Authorization', `Bearer ${token}`)
        .send({
          movieId: 789,
          title: 'Another Movie',
          posterPath: '/another.jpg'
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to add movie to ranking');
    });
  });

  describe('Mocked: POST /compare error handling', () => {
    // Uncovered line: 192 - Unauthorized check in compareMovies
  });
  // Add these tests to your mocked test file

  describe('Mocked: Edge cases and error handling', () => {
  it('should log warning when watchlist removal fails with string userId', async () => {
  const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'warn');
  
  // Mock to fail on second call (string userId path)
  let callCount = 0;
  jest.spyOn(WatchlistItem, 'deleteOne').mockImplementation((filter: any) => {
    callCount++;
    if (callCount === 2) {
      // Second call (string userId) should fail
      return Promise.reject(new Error('Database error on string userId')) as any;
    }
    // First call succeeds
    return Promise.resolve({ deletedCount: 0 }) as any;
  });

  const res = await request(app)
    .post('/api/movies/add')
    .set('Authorization', `Bearer ${token}`)
    .send({
      movieId: 456,
      title: 'Test Movie',
      posterPath: '/test.jpg'
    });

  expect(res.status).toBe(200);
  expect(loggerSpy).toHaveBeenCalledWith(
    'Failed to remove watchlist item (string)',
    { error: 'Database error on string userId' }
  );

  loggerSpy.mockRestore();
  jest.restoreAllMocks();
});


  it('should return 500 when compareWith is undefined in addMovie', async () => {
    // Create at least one ranked movie first so we enter the comparison path
    await RankedMovie.create({
      userId: (user as any)._id,
      movieId: 100,
      title: 'Existing Movie',
      rank: 1,
      posterPath: '/existing.jpg'
    });

    // Mock the find to return an array with some method but .at() returns undefined
    const mockArray = {
      length: 5,
      some: jest.fn(() => false),
      at: jest.fn(() => undefined)
    };
    
    jest.spyOn(RankedMovie, 'find').mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockArray)
    } as any);

    const res = await request(app)
      .post('/api/movies/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 789,
        title: 'Another Movie',
        posterPath: '/another.jpg'
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Unable to find comparison movie');

    jest.restoreAllMocks();
  });


  it('should return 500 when nextCompare is undefined in compareMovies', async () => {
    // Start a comparison session
    startSession((user as any)._id.toString(), {
      movieId: 999,
      title: 'New Movie',
      posterPath: '/new.jpg'
    }, 4);

    // Mock to return array where .at(nextIndex) returns undefined
    const mockArray = {
      length: 5,
      at: jest.fn(() => undefined)
    };

    jest.spyOn(RankedMovie, 'find').mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockArray)
    } as any);

    const res = await request(app)
      .post('/api/movies/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: 100
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Unable to find comparison movie');

    jest.restoreAllMocks();
  });

});


});
